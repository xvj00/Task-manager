<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Folder;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    // Список ожидающих приглашений для текущего пользователя
    public function index(Request $request)
    {
        $invitations = Invitation::with('inviter')
            ->where('invitee_id', $request->user()->id)
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(function ($inv) {
                // Добавляем название сущности
                if ($inv->type === 'project') {
                    $entity = Project::find($inv->entity_id);
                    $inv->entity_name = $entity?->name ?? 'Удалённый проект';
                } else {
                    $entity = Folder::find($inv->entity_id);
                    $inv->entity_name = $entity?->name ?? 'Удалённая папка';
                }
                return $inv;
            });

        return response()->json($invitations);
    }

    // Принять приглашение
    public function accept(Request $request, Invitation $invitation)
    {
        $this->checkOwner($request->user(), $invitation);

        $invitation->update(['status' => 'accepted']);

        // Добавляем в участники
        if ($invitation->type === 'project') {
            $project = Project::findOrFail($invitation->entity_id);
            if (!$project->members()->where('user_id', $invitation->invitee_id)->exists()) {
                $project->members()->attach($invitation->invitee_id, ['role' => $invitation->role]);
            }
            // Уведомить пригласившего
            Notification::create([
                'user_id' => $invitation->inviter_id,
                'type'    => 'invite_accepted',
                'data'    => [
                    'entity_type' => 'project',
                    'entity_id'   => $project->id,
                    'entity_name' => $project->name,
                    'user_name'   => $request->user()->name,
                ],
            ]);
        } else {
            $folder = Folder::findOrFail($invitation->entity_id);
            if (!$folder->members()->where('user_id', $invitation->invitee_id)->exists()) {
                $folder->members()->attach($invitation->invitee_id, ['role' => $invitation->role]);
            }
            // Автоматически добавляем в проекты папки
            foreach ($folder->projects as $project) {
                if (!$project->members()->where('user_id', $invitation->invitee_id)->exists()) {
                    $project->members()->attach($invitation->invitee_id, ['role' => $invitation->role]);
                }
            }
            Notification::create([
                'user_id' => $invitation->inviter_id,
                'type'    => 'invite_accepted',
                'data'    => [
                    'entity_type' => 'folder',
                    'entity_id'   => $folder->id,
                    'entity_name' => $folder->name,
                    'user_name'   => $request->user()->name,
                ],
            ]);
        }

        return response()->json(['message' => 'Приглашение принято.']);
    }

    // Отклонить приглашение
    public function decline(Request $request, Invitation $invitation)
    {
        $this->checkOwner($request->user(), $invitation);
        $invitation->update(['status' => 'declined']);

        Notification::create([
            'user_id' => $invitation->inviter_id,
            'type'    => 'invite_declined',
            'data'    => [
                'entity_name' => $invitation->type === 'project'
                    ? Project::find($invitation->entity_id)?->name
                    : Folder::find($invitation->entity_id)?->name,
                'user_name' => $request->user()->name,
            ],
        ]);

        return response()->json(['message' => 'Приглашение отклонено.']);
    }

    private function checkOwner($user, Invitation $invitation): void
    {
        if ($invitation->invitee_id !== $user->id) abort(403, 'Это приглашение не для вас.');
        if ($invitation->status !== 'pending') abort(422, 'Приглашение уже обработано.');
    }
}
