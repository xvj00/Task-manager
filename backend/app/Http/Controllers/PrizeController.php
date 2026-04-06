<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Prize;
use App\Models\PrizeRequest;
use App\Models\Transaction;
use Illuminate\Http\Request;

class PrizeController extends Controller
{
    public function index()
    {
        return response()->json(Prize::where('is_active', true)->with('creator')->get());
    }

    public function store(Request $request)
    {
        if (!$request->user()->isCreator()) abort(403);

        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'cost_points' => 'required|integer|min:1',
            'quantity'    => 'nullable|integer|min:-1',
        ]);

        $prize = Prize::create([...$data, 'created_by' => $request->user()->id]);
        return response()->json($prize, 201);
    }

    public function update(Request $request, Prize $prize)
    {
        if (!$request->user()->isCreator()) abort(403);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'cost_points' => 'sometimes|integer|min:1',
            'quantity'    => 'nullable|integer|min:-1',
            'is_active'   => 'sometimes|boolean',
        ]);

        $prize->update($data);
        return response()->json($prize);
    }

    public function destroy(Request $request, Prize $prize)
    {
        if (!$request->user()->isCreator()) abort(403);
        $prize->delete();
        return response()->json(null, 204);
    }

    // Запросить приз (исполнитель)
    public function request(Request $request, Prize $prize)
    {
        $user = $request->user();

        if ($user->balance < $prize->cost_points) {
            abort(422, 'Недостаточно баллов.');
        }

        if ($prize->quantity === 0) {
            abort(422, 'Приз закончился.');
        }

        $prizeRequest = PrizeRequest::create([
            'prize_id' => $prize->id,
            'user_id'  => $user->id,
            'status'   => 'pending',
        ]);

        // Уведомить создателя
        foreach (\App\Models\User::where('role', 'creator')->get() as $creator) {
            Notification::create([
                'user_id' => $creator->id,
                'type'    => 'prize_requested',
                'data'    => ['prize_name' => $prize->name, 'user_name' => $user->name, 'request_id' => $prizeRequest->id],
            ]);
        }

        return response()->json($prizeRequest->load('prize'), 201);
    }

    // Все запросы (создатель)
    public function requests(Request $request)
    {
        if (!$request->user()->isCreator()) abort(403);

        $requests = PrizeRequest::with(['prize', 'user'])
            ->orderByDesc('created_at')->get();

        return response()->json($requests);
    }

    // Мои запросы
    public function myRequests(Request $request)
    {
        return response()->json(
            $request->user()->prizeRequests()->with('prize')->orderByDesc('created_at')->get()
        );
    }

    // Подтвердить/отклонить запрос (создатель)
    public function handleRequest(Request $request, PrizeRequest $prizeRequest)
    {
        if (!$request->user()->isCreator()) abort(403);

        $data = $request->validate([
            'action' => 'required|in:approve,reject',
            'reason' => 'nullable|string',
        ]);

        if ($data['action'] === 'approve') {
            $user  = $prizeRequest->user;
            $prize = $prizeRequest->prize;

            if ($user->balance < $prize->cost_points) {
                abort(422, 'У пользователя недостаточно баллов.');
            }

            $user->decrement('balance', $prize->cost_points);

            Transaction::create([
                'user_id'     => $user->id,
                'amount'      => $prize->cost_points,
                'type'        => 'debit',
                'description' => "Обмен на приз: «{$prize->name}»",
                'created_by'  => $request->user()->id,
            ]);

            if ($prize->quantity > 0) $prize->decrement('quantity');

            $prizeRequest->update(['status' => 'approved']);

            Notification::create([
                'user_id' => $user->id,
                'type'    => 'prize_approved',
                'data'    => ['prize_name' => $prize->name, 'cost' => $prize->cost_points],
            ]);
        } else {
            $prizeRequest->update(['status' => 'rejected', 'rejection_reason' => $data['reason'] ?? null]);

            Notification::create([
                'user_id' => $prizeRequest->user_id,
                'type'    => 'prize_rejected',
                'data'    => ['prize_name' => $prizeRequest->prize->name, 'reason' => $data['reason'] ?? ''],
            ]);
        }

        return response()->json($prizeRequest->load('prize', 'user'));
    }
}
