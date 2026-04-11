<?php

namespace App\Http\Controllers;

use App\Http\Requests\HandlePrizeRequestRequest;
use App\Http\Requests\StorePrizeRequest;
use App\Http\Requests\UpdatePrizeRequest;
use App\Models\Notification;
use App\Models\Prize;
use App\Models\PrizeRequest;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class PrizeController extends Controller
{
    public function index()
    {
        return response()->json(Prize::where('is_active', true)->with('creator')->get());
    }

    public function store(StorePrizeRequest $request)
    {
        $data  = $request->validated();
        $prize = Prize::create([...$data, 'created_by' => $request->user()->id]);
        return response()->json($prize, 201);
    }

    public function update(UpdatePrizeRequest $request, Prize $prize)
    {
        $prize->update($request->validated());
        return response()->json($prize);
    }

    public function destroy(Request $request, Prize $prize)
    {
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
        foreach (User::where('role', 'admin')->get() as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type'    => 'prize_requested',
                'data'    => ['prize_name' => $prize->name, 'user_name' => $user->name, 'request_id' => $prizeRequest->id],
            ]);
        }

        return response()->json($prizeRequest->load('prize'), 201);
    }

    // Все запросы (создатель)
    public function requests(Request $request)
    {
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
    public function handleRequest(HandlePrizeRequestRequest $request, PrizeRequest $prizeRequest)
    {
        $data = $request->validated();

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
