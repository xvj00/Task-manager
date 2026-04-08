<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Folder::with(['owner', 'members'])->withCount('projects');

        if (!$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn($m) => $m->where('user_id', $user->id));
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ], [
            'name.required' => 'Название папки обязательно.',
            'name.max'      => 'Название не должно превышать 255 символов.',
        ]);

        $folder = Folder::create([...$data, 'owner_id' => $request->user()->id]);
        $folder->members()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json($folder->load('owner'), 201);
    }

    public function show(Request $request, Folder $folder)
    {
        $this->checkAccess($request->user(), $folder);
        return response()->json($folder->load(['owner', 'members', 'projects.owner']));
    }

    public function update(Request $request, Folder $folder)
    {
        $this->checkRole($request->user(), $folder, ['owner', 'editor']);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ], [
            'name.max' => 'Название не должно превышать 255 символов.',
        ]);

        $folder->update($data);
        return response()->json($folder);
    }

    public function destroy(Request $request, Folder $folder)
    {
        $this->checkRole($request->user(), $folder, ['owner']);
        $folder->delete();
        return response()->json(null, 204);
    }

    public function invite(Request $request, Folder $folder)
    {
        $this->checkRole($request->user(), $folder, ['owner', 'editor']);

        $data = $request->validate([
            'username' => 'required|string|exists:users,username',
            'role'     => 'required|in:editor,member',
        ], [
            'username.required' => 'Юзернейм обязателен.',
            'username.exists'   => 'Пользователь с таким юзернеймом не найден.',
            'role.required'     => 'Роль обязательна.',
            'role.in'           => 'Роль должна быть: editor или member.',
        ]);

        $invitee = \App\Models\User::where('username', $data['username'])->first();

        if ($folder->members()->where('user_id', $invitee->id)->exists()) {
            abort(422, 'Пользователь уже является участником папки.');
        }

        $exists = \App\Models\Invitation::where('type', 'folder')
            ->where('entity_id', $folder->id)
            ->where('invitee_id', $invitee->id)
            ->where('status', 'pending')
            ->exists();
        if ($exists) abort(422, 'Приглашение уже отправлено, ожидается ответ.');

        \App\Models\Invitation::create([
            'type'       => 'folder',
            'entity_id'  => $folder->id,
            'inviter_id' => $request->user()->id,
            'invitee_id' => $invitee->id,
            'role'       => $data['role'],
        ]);

        \App\Models\Notification::create([
            'user_id' => $invitee->id,
            'type'    => 'folder_invite',
            'data'    => [
                'folder_id'    => $folder->id,
                'folder_name'  => $folder->name,
                'inviter_name' => $request->user()->name,
                'role'         => $data['role'],
            ],
        ]);

        return response()->json(['message' => 'Приглашение отправлено.']);
    }

    public function removeMember(Request $request, Folder $folder, \App\Models\User $user)
    {
        $this->checkRole($request->user(), $folder, ['owner']);
        if ($user->id === $folder->owner_id) abort(422, 'Нельзя удалить владельца папки.');
        $folder->members()->detach($user->id);
        return response()->json(null, 204);
    }

    private function checkAccess($user, Folder $folder): void
    {
        if ($user->isAdmin()) return;
        if ($folder->owner_id === $user->id) return;
        if (!$folder->members()->where('user_id', $user->id)->exists()) abort(403, 'Нет доступа к этой папке.');
    }

    private function checkRole($user, Folder $folder, array $roles): void
    {
        if ($user->isAdmin()) return;
        $role = $folder->userRole($user->id);
        if (!in_array($role, $roles)) abort(403, 'Недостаточно прав.');
    }
}
