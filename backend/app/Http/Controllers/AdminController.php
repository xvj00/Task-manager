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
        $onlineThreshold = now()->subMinutes(5);
        return response()->json([
            'users'         => User::where('role', 'user')->count(),
            'users_online'  => User::where('last_seen_at', '>=', $onlineThreshold)->count(),
            'projects'      => Project::count(),
            'folders'       => Folder::count(),
            'tasks_total'   => Task::count(),
            'tasks_review'  => Task::where('status', 'review')->count(),
            'tasks_done'    => Task::where('status', 'done')->count(),
            'points_issued' => Transaction::where('type', 'credit')->sum('amount'),
        ]);
    }

    public function onlineUsers(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $threshold = now()->subMinutes(5);
        return response()->json(
            User::where('last_seen_at', '>=', $threshold)
                ->select('id', 'name', 'username', 'role', 'last_seen_at')
                ->orderByDesc('last_seen_at')
                ->get()
        );
    }

    public function users(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        return response()->json(
            User::withCount([
                'tasks as completed_tasks' => fn($q) => $q->where('status', 'done'),
            ])->get()
        );
    }

    public function updateUser(UpdateUserRequest $request, User $user)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $user->update($request->validated());
        return response()->json($user);
    }

    public function destroyUser(Request $request, User $user)
    {
        if (!$request->user()->isAdmin()) abort(403);
        if ($user->id === $request->user()->id) abort(422, 'Нельзя удалить себя.');
        $user->delete();
        return response()->json(null, 204);
    }
}
