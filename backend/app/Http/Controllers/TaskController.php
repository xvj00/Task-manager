<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApproveTaskRequest;
use App\Http\Requests\RejectTaskRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Notification;
use App\Models\Task;
use App\Models\TaskLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Task::with(['creator', 'assignee']);

        if (!$user->isAdmin()) {
            // Проекты, в которых состоит пользователь
            $projectIds = $user->projects()->pluck('projects.id');

            $query->where(function ($q) use ($user, $projectIds) {
                // Задачи, назначенные лично пользователю
                $q->where('assignee_id', $user->id)
                // Открытые задачи в проектах пользователя
                  ->orWhere(function ($q2) use ($projectIds) {
                      $q2->where('status', 'open')->whereIn('project_id', $projectIds);
                  })
                // Открытые задачи вне проектов (глобальные)
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'open')->whereNull('project_id');
                  });
            });
        }
        if ($request->filled('status'))   $query->where('status', $request->status);
        if ($request->filled('priority')) $query->where('priority', $request->priority);
        if ($request->filled('assignee_id')) $query->where('assignee_id', $request->assignee_id);
        if ($request->filled('category')) $query->where('category', $request->category);
        if ($request->filled('search'))   $query->where(function ($q) use ($request) {
            $q->where('title', 'like', "%{$request->search}%")
              ->orWhere('description', 'like', "%{$request->search}%");
        });

        $sort = $request->get('sort', 'created_at');
        $dir  = $request->get('dir', 'desc');
        $allowed = ['created_at', 'deadline', 'priority', 'reward_points'];
        if (in_array($sort, $allowed)) $query->orderBy($sort, $dir);

        return response()->json($query->get());
    }

    public function store(StoreTaskRequest $request)
    {
        $this->requireTaskManager($request, $request->input('project_id'));

        $data = $request->validated();

        $task = Task::create([...$data, 'creator_id' => $request->user()->id]);

        TaskLog::create([
            'task_id'    => $task->id,
            'user_id'    => $request->user()->id,
            'old_status' => null,
            'new_status' => 'open',
            'comment'    => 'Задача создана',
        ]);

        if (!empty($data['assignee_id'])) {
            $this->notify($data['assignee_id'], 'task_assigned', [
                'task_id'    => $task->id,
                'task_title' => $task->title,
                'deadline'   => $task->deadline?->toISOString(),
            ]);
        }

        return response()->json($task->load('creator', 'assignee'), 201);
    }

    public function show(Request $request, Task $task)
    {
        $user = $request->user();
        $canView = $user->isAdmin()
            || $task->assignee_id === $user->id
            || $task->status === 'open'
            || ($task->project_id && \App\Models\Project::find($task->project_id)?->members()->where('user_id', $user->id)->exists());
        if (!$canView) abort(403);
        return response()->json($task->load('creator', 'assignee', 'logs.user', 'subtasks', 'comments.user', 'attachments.user'));
    }

    public function update(UpdateTaskRequest $request, Task $task)
    {
        $this->requireTaskManager($request, $task->project_id);

        $data        = $request->validated();
        $oldAssignee = $task->assignee_id;
        $task->update($data);

        if (isset($data['assignee_id']) && $data['assignee_id'] !== $oldAssignee && $data['assignee_id']) {
            $this->notify($data['assignee_id'], 'task_assigned', [
                'task_id'    => $task->id,
                'task_title' => $task->title,
                'deadline'   => $task->deadline?->toISOString(),
            ]);
        }

        return response()->json($task->load('creator', 'assignee'));
    }

    public function destroy(Request $request, Task $task)
    {
        $this->requireTaskManager($request, $task->project_id);
        $task->delete();
        return response()->json(null, 204);
    }

    // Взять задачу в работу (исполнитель)
    public function take(Request $request, Task $task)
    {
        $user = $request->user();
        if ($task->status !== 'open') abort(422, 'Задача не в статусе "Открыта".');

        $oldStatus = $task->status;
        $task->update(['status' => 'in_progress', 'assignee_id' => $user->id]);

        TaskLog::create([
            'task_id' => $task->id, 'user_id' => $user->id,
            'old_status' => $oldStatus, 'new_status' => 'in_progress',
            'comment' => "{$user->name} взял задачу в работу",
        ]);

        // Уведомить создателя
        $this->notify($task->creator_id, 'task_taken', [
            'task_id' => $task->id, 'task_title' => $task->title, 'executor' => $user->name,
        ]);

        return response()->json($task->load('creator', 'assignee'));
    }

    // Отметить как выполненную (исполнитель → на проверку)
    public function submit(Request $request, Task $task)
    {
        $user = $request->user();
        if ($task->assignee_id !== $user->id) abort(403);
        if ($task->status !== 'in_progress') abort(422, 'Задача не в процессе.');

        $oldStatus = $task->status;
        $task->update(['status' => 'review']);

        TaskLog::create([
            'task_id' => $task->id, 'user_id' => $user->id,
            'old_status' => $oldStatus, 'new_status' => 'review',
            'comment' => 'Исполнитель отметил задачу выполненной',
        ]);

        // Уведомить создателя
        $this->notify($task->creator_id, 'task_review', [
            'task_id' => $task->id, 'task_title' => $task->title,
        ]);

        return response()->json($task->load('creator', 'assignee'));
    }

    // Подтвердить выполнение (создатель)
    public function approve(ApproveTaskRequest $request, Task $task)
    {
        $this->requireTaskManager($request, $task->project_id);
        if ($task->status !== 'review') abort(422, 'Задача не на проверке.');

        $data   = $request->validated();
        $points = $data['reward_points'] ?? $task->reward_points;

        $task->update(['status' => 'done', 'reward_points' => $points]);

        TaskLog::create([
            'task_id' => $task->id, 'user_id' => $request->user()->id,
            'old_status' => 'review', 'new_status' => 'done',
            'comment' => "Подтверждено. Начислено {$points} баллов.",
        ]);

        // Начислить баллы
        if ($task->assignee_id && $points > 0) {
            $assignee = User::find($task->assignee_id);
            $assignee->increment('balance', $points);

            Transaction::create([
                'user_id'     => $task->assignee_id,
                'amount'      => $points,
                'type'        => 'credit',
                'description' => "Задача выполнена: «{$task->title}»",
                'task_id'     => $task->id,
                'created_by'  => $request->user()->id,
            ]);

            $this->notify($task->assignee_id, 'task_approved', [
                'task_id'    => $task->id,
                'task_title' => $task->title,
                'points'     => $points,
            ]);
        }

        return response()->json($task->load('creator', 'assignee'));
    }

    // Отклонить (создатель)
    public function reject(RejectTaskRequest $request, Task $task)
    {
        $this->requireTaskManager($request, $task->project_id);
        if ($task->status !== 'review') abort(422, 'Задача не на проверке.');

        $data = $request->validated();

        $task->update(['status' => 'in_progress', 'rejection_reason' => $data['reason'] ?? null]);

        TaskLog::create([
            'task_id' => $task->id, 'user_id' => $request->user()->id,
            'old_status' => 'review', 'new_status' => 'in_progress',
            'comment' => 'Отклонено. ' . ($data['reason'] ?? ''),
        ]);

        if ($task->assignee_id) {
            $this->notify($task->assignee_id, 'task_rejected', [
                'task_id' => $task->id, 'task_title' => $task->title,
                'reason'  => $data['reason'] ?? '',
            ]);
        }

        return response()->json($task->load('creator', 'assignee'));
    }

    // Архивировать
    public function archive(Request $request, Task $task)
    {
        $this->requireTaskManager($request, $task->project_id);
        $old = $task->status;
        $task->update(['status' => 'archive']);

        TaskLog::create([
            'task_id' => $task->id, 'user_id' => $request->user()->id,
            'old_status' => $old, 'new_status' => 'archive', 'comment' => 'Задача архивирована',
        ]);

        return response()->json($task);
    }

    /**
     * Проверяет право управлять задачами:
     * — глобальный admin всегда может
     * — owner/editor проекта могут (если задача привязана к проекту)
     * — иначе 403
     */
    private function requireTaskManager(Request $request, ?int $projectId = null): void
    {
        $user = $request->user();
        if ($user->isAdmin()) return;

        if ($projectId) {
            $project = \App\Models\Project::find($projectId);
            if ($project) {
                $role = $project->userRole($user->id);
                if (in_array($role, ['owner', 'editor'])) return;
            }
        }

        abort(403, 'Только владелец или редактор проекта может выполнить это действие.');
    }

    private function notify(int $userId, string $type, array $data)
    {
        Notification::create(['user_id' => $userId, 'type' => $type, 'data' => $data]);
    }
}
