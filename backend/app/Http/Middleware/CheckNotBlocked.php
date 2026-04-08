<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckNotBlocked
{
    // Пути, доступные даже заблокированному пользователю
    private const ALLOWED = ['api/me', 'api/logout', 'api/appeal'];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && $user->is_blocked) {
            if (!in_array($request->path(), self::ALLOWED)) {
                return response()->json([
                    'blocked'          => true,
                    'reason'           => $user->block_reason,
                    'appeal_submitted' => !is_null($user->appeal_at),
                ], 403);
            }
        }
        return $next($request);
    }
}
