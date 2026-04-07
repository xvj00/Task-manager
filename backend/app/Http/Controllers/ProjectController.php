<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $projects = Project::with(['owner', 'folder'])
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn($m) => $m->where('user_id', $user->id));
                if ($user->isAdmin()) $q->orWhereNotNull('id'); // admin видит все
            })
            ->withCount('tasks')
            ->get();

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        // Любой авторизованный пользователь может создать проект
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'folder_id'   => 'nullable|exists:folders,id',
        ], [
            'name.required'    => 'Название проекта обязательно.',
            'name.max'         => 'Название не должно превышать 255 символов.',
            'folder_id.exists' => 'Папка не найдена.',
        ]);

        $project = Project::create([
            ...$data,
            'owner_id'     => $request->user()->id,
            'invite_token' => Str::uuid(),
        ]);

        // Создатель автоматически становится владельцем
        $project->members()->attach($request->user()->id, ['role' => 'owner']);

        // Если создаём в папке — добавляем всех участников папки
        if (!empty($data['folder_id'])) {
            $folder = \App\Models\Folder::find($data['folder_id']);
            foreach ($folder->members as $member) {
                if ($member->id !== $request->user()->id) {
                    $project->members()->attach($member->id, ['role' => $member->pivot->role]);
                }
            }
        }

        return response()->json($project->load(['owner', 'folder']), 201);
    }

    public function show(Request $request, Project $project)
    {
        $this->checkAccess($request->user(), $project);
        return response()->json($project->load(['owner', 'folder', 'members', 'tasks.assignee']));
    }

    public function update(Request $request, Project $project)
    {
        $this->checkRole($request->user(), $project, ['owner', 'editor']);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'folder_id'   => 'nullable|exists:folders,id',
        ], [
            'name.max'         => 'Название не должно превышать 255 символов.',
            'folder_id.exists' => 'Папка не найдена.',
        ]);

        $project->update($data);
        return response()->json($project->load(['owner', 'folder']));
    }

    public function destroy(Request $request, Project $project)
    {
        $this->checkRole($request->user(), $project, ['owner']);
        $project->delete();
        return response()->json(null, 204);
    }

    // Пригласить по юзернейму
    public function invite(Request $request, Project $project)
    {
        $this->checkRole($request->user(), $project, ['owner', 'editor']);

        $data = $request->validate([
            'username' => 'required|string|exists:users,username',
            'role'     => 'required|in:editor,member',
        ], [
            'username.required' => 'Юзернейм обязателен.',
            'username.exists'   => 'Пользователь с таким юзернеймом не найден.',
            'role.required'     => 'Роль обязательна.',
            'role.in'           => 'Роль должна быть: editor или member.',
        ]);

        $invitee = User::where('username', $data['username'])->first();

        if ($project->members()->where('user_id', $invitee->id)->exists()) {
            abort(422, 'Пользователь уже является участником проекта.');
        }

        $project->members()->attach($invitee->id, ['role' => $data['role']]);

        Notification::create([
            'user_id' => $invitee->id,
            'type'    => 'project_invited',
            'data'    => ['project_id' => $project->id, 'project_name' => $project->name],
        ]);

        return response()->json(['message' => "Пользователь @{$invitee->username} приглашён в проект."]);
    }

    // Получить/сбросить ссылку-приглашение
    public function inviteLink(Request $request, Project $project)
    {
        $this->checkRole($request->user(), $project, ['owner', 'editor']);

        if ($request->method() === 'DELETE') {
            $project->update(['invite_token' => Str::uuid()]);
            return response()->json(['message' => 'Ссылка сброшена.']);
        }

        return response()->json(['invite_token' => $project->invite_token]);
    }

    // Вступить по ссылке-приглашению
    public function joinByToken(Request $request, string $token)
    {
        $project = Project::where('invite_token', $token)->firstOrFail();
        $user    = $request->user();

        if ($project->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Вы уже участник этого проекта.', 'project' => $project]);
        }

        $project->members()->attach($user->id, ['role' => 'member']);

        Notification::create([
            'user_id' => $project->owner_id,
            'type'    => 'project_joined',
            'data'    => ['project_id' => $project->id, 'project_name' => $project->name, 'user' => $user->name],
        ]);

        return response()->json(['message' => "Вы вступили в проект «{$project->name}».", 'project' => $project]);
    }

    public function removeMember(Request $request, Project $project, User $user)
    {
        $this->checkRole($request->user(), $project, ['owner']);
        if ($user->id === $project->owner_id) abort(422, 'Нельзя удалить владельца проекта.');
        $project->members()->detach($user->id);
        return response()->json(null, 204);
    }

    private function checkAccess($user, Project $project): void
    {
        if ($user->isAdmin()) return;
        if ($project->owner_id === $user->id) return;
        if (!$project->members()->where('user_id', $user->id)->exists()) abort(403, 'Нет доступа к этому проекту.');
    }

    private function checkRole($user, Project $project, array $roles): void
    {
        if ($user->isAdmin()) return;
        $role = $project->userRole($user->id);
        if (!in_array($role, $roles)) abort(403, 'Недостаточно прав.');
    }
}
