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
        // Явно используем sanctum-гард, т.к. middleware запускается до auth:sanctum
        $user = $request->user('sanctum');
        if ($user) {
            if (!$user->last_seen_at || now()->diffInSeconds($user->last_seen_at) > 60) {
                $user->updateQuietly(['last_seen_at' => now()]);
            }
        }
        return $next($request);
    }
}
