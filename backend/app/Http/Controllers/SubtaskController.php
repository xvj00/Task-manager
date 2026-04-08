<?php

namespace App\Http\Controllers;

use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\Request;

class SubtaskController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
        ], [
            'title.required' => 'Название подзадачи обязательно.',
            'title.max'      => 'Название не должно превышать 255 символов.',
        ]);

        $order   = $task->subtasks()->max('order') + 1;
        $subtask = $task->subtasks()->create([...$data, 'order' => $order]);

        return response()->json($subtask, 201);
    }

    public function update(Request $request, Task $task, Subtask $subtask)
    {
        $data = $request->validate([
            'title'   => 'sometimes|string|max:255',
            'is_done' => 'sometimes|boolean',
            'order'   => 'sometimes|integer|min:0',
        ], [
            'title.max'      => 'Название не должно превышать 255 символов.',
            'is_done.boolean'=> 'Поле выполнения должно быть true или false.',
        ]);

        $subtask->update($data);
        return response()->json($subtask);
    }

    public function reorder(Request $request, Task $task)
    {
        $data = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer',
        ]);

        foreach ($data['ids'] as $index => $subtaskId) {
            $task->subtasks()->where('id', $subtaskId)->update(['order' => $index]);
        }

        return response()->json($task->subtasks()->orderBy('order')->get());
    }

    public function destroy(Task $task, Subtask $subtask)
    {
        $subtask->delete();
        return response()->json(null, 204);
    }
}
