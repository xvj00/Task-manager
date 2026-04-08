<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastSeen
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($user = $request->user()) {
            // Обновляем не чаще раза в минуту чтобы не нагружать БД
            if (!$user->last_seen_at || now()->diffInSeconds($user->last_seen_at) > 60) {
                $user->updateQuietly(['last_seen_at' => now()]);
            }
        }
        return $next($request);
    }
}
