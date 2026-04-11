<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateUserRequest;
use App\Models\Folder;
use App\Models\Project;
use App\Models\Task;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function stats()
    {
        return response()->json([
            'users'         => User::where('role', 'user')->count(),
            'projects'      => Project::count(),
            'folders'       => Folder::count(),
            'tasks_total'   => Task::count(),
            'tasks_review'  => Task::where('status', 'review')->count(),
            'tasks_done'    => Task::where('status', 'done')->count(),
            'points_issued' => Transaction::where('type', 'credit')->sum('amount'),
        ]);
    }

    public function users(Request $request)
    {
        return response()->json(
            User::withCount([
                'tasks as completed_tasks' => fn($q) => $q->where('status', 'done'),
            ])->get()
        );
    }

    public function updateUser(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());
        return response()->json($user);
    }

    public function blockUser(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) abort(422, 'Нельзя заблокировать себя.');
        $data = $request->validate([
            'reason' => 'required|string|max:1000',
        ], [
            'reason.required' => 'Укажите причину блокировки.',
        ]);
        $user->update(['is_blocked' => true, 'block_reason' => $data['reason']]);
        return response()->json($user);
    }

    public function unblockUser(Request $request, User $user)
    {
        $user->update([
            'is_blocked'   => false,
            'block_reason' => null,
            'appeal_text'  => null,
            'appeal_at'    => null,
        ]);
        return response()->json($user);
    }

    public function appeals(Request $request)
    {
        $users = User::whereNotNull('appeal_text')
            ->select('id', 'name', 'username', 'email', 'is_blocked', 'block_reason', 'appeal_text', 'appeal_at', 'created_at')
            ->get();
        return response()->json($users);
    }

    public function submitAppeal(Request $request)
    {
        $user = $request->user();
        if (!$user->is_blocked) abort(422, 'Вы не заблокированы.');
        if ($user->appeal_at)   abort(422, 'Апелляция уже была подана.');

        $data = $request->validate([
            'text' => 'required|string|min:20|max:3000',
        ], [
            'text.required' => 'Текст апелляции обязателен.',
            'text.min'      => 'Апелляция должна содержать не менее 20 символов.',
            'text.max'      => 'Апелляция не должна превышать 3000 символов.',
        ]);

        $user->update(['appeal_text' => $data['text'], 'appeal_at' => now()]);
        return response()->json(['message' => 'Апелляция подана. Ожидайте решения администратора.']);
    }
}
