<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $data = $request->validate([
            'content' => 'required|string',
        ], [
            'content.required' => 'Текст комментария обязателен.',
        ]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'content' => $data['content'],
        ]);

        // Уведомить создателя задачи и исполнителя
        $notifyIds = array_unique(array_filter([
            $task->creator_id,
            $task->assignee_id,
        ]));

        foreach ($notifyIds as $uid) {
            if ($uid !== $request->user()->id) {
                Notification::create([
                    'user_id' => $uid,
                    'type'    => 'task_comment',
                    'data'    => [
                        'task_id'    => $task->id,
                        'task_title' => $task->title,
                        'author'     => $request->user()->name,
                    ],
                ]);
            }
        }

        return response()->json($comment->load('user'), 201);
    }

    public function destroy(Request $request, Task $task, TaskComment $comment)
    {
        if ($comment->user_id !== $request->user()->id && !$request->user()->isCreator()) {
            abort(403, 'Нельзя удалить чужой комментарий.');
        }
        $comment->delete();
        return response()->json(null, 204);
    }
}
