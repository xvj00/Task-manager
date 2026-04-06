<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    // История транзакций пользователя
    public function index(Request $request)
    {
        $user = $request->user();
        $targetId = $user->isCreator() && $request->filled('user_id')
            ? $request->user_id
            : $user->id;

        $transactions = Transaction::where('user_id', $targetId)
            ->with(['task', 'creator'])
            ->orderByDesc('created_at')
            ->get();

        $balance = User::find($targetId)->balance;

        return response()->json(['balance' => $balance, 'transactions' => $transactions]);
    }

    // Ручное начисление/списание (создатель)
    public function manual(Request $request)
    {
        if (!$request->user()->isCreator()) abort(403);

        $data = $request->validate([
            'user_id'     => 'required|exists:users,id',
            'amount'      => 'required|integer|min:1',
            'type'        => 'required|in:credit,debit',
            'description' => 'required|string|max:255',
        ]);

        $target = User::findOrFail($data['user_id']);
        $signed = $data['type'] === 'credit' ? $data['amount'] : -$data['amount'];

        if ($data['type'] === 'debit' && $target->balance < $data['amount']) {
            abort(422, 'Недостаточно баллов на балансе.');
        }

        $target->increment('balance', $signed);

        $tx = Transaction::create([
            'user_id'     => $target->id,
            'amount'      => $data['amount'],
            'type'        => $data['type'],
            'description' => $data['description'],
            'created_by'  => $request->user()->id,
        ]);

        $notifyType = $data['type'] === 'credit' ? 'points_credited' : 'points_debited';
        Notification::create([
            'user_id' => $target->id,
            'type'    => $notifyType,
            'data'    => ['amount' => $data['amount'], 'description' => $data['description']],
        ]);

        return response()->json($tx->load('creator'), 201);
    }

    // Балансы всех пользователей (создатель)
    public function allBalances(Request $request)
    {
        if (!$request->user()->isCreator()) abort(403);

        $users = User::where('role', 'executor')
            ->withCount(['tasks as completed_tasks' => fn($q) => $q->where('status', 'done')])
            ->orderByDesc('balance')
            ->get(['id', 'name', 'email', 'balance']);

        return response()->json($users);
    }
}
