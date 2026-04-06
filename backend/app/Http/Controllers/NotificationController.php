<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->notifications()->orderByDesc('created_at')->limit(50)->get()
        );
    }

    public function markAllRead(Request $request)
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['message' => 'Прочитано']);
    }

    public function markRead(Request $request, $id)
    {
        $n = $request->user()->notifications()->findOrFail($id);
        $n->update(['read_at' => now()]);
        return response()->json($n);
    }
}
