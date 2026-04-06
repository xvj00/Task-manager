<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index()
    {
        $users = User::where('role', 'executor')
            ->withCount(['tasks as completed_tasks' => fn($q) => $q->where('status', 'done')])
            ->orderByDesc('balance')
            ->get(['id', 'name', 'balance']);

        return response()->json($users);
    }
}
