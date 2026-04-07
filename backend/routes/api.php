<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PrizeController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get ('/me',     [AuthController::class, 'me']);

    // Folders
    Route::get   ('/folders',                              [FolderController::class, 'index']);
    Route::post  ('/folders',                              [FolderController::class, 'store']);
    Route::get   ('/folders/{folder}',                     [FolderController::class, 'show']);
    Route::put   ('/folders/{folder}',                     [FolderController::class, 'update']);
    Route::delete('/folders/{folder}',                     [FolderController::class, 'destroy']);
    Route::post  ('/folders/{folder}/invite',              [FolderController::class, 'invite']);
    Route::delete('/folders/{folder}/members/{user}',      [FolderController::class, 'removeMember']);

    // Projects
    Route::get   ('/projects',                             [ProjectController::class, 'index']);
    Route::post  ('/projects',                             [ProjectController::class, 'store']);
    Route::get   ('/projects/{project}',                   [ProjectController::class, 'show']);
    Route::put   ('/projects/{project}',                   [ProjectController::class, 'update']);
    Route::delete('/projects/{project}',                   [ProjectController::class, 'destroy']);
    Route::post  ('/projects/{project}/invite',            [ProjectController::class, 'invite']);
    Route::get   ('/projects/{project}/invite-link',       [ProjectController::class, 'inviteLink']);
    Route::delete('/projects/{project}/invite-link',       [ProjectController::class, 'inviteLink']);
    Route::post  ('/projects/join/{token}',                [ProjectController::class, 'joinByToken']);
    Route::delete('/projects/{project}/members/{user}',    [ProjectController::class, 'removeMember']);

    // Tasks
    Route::get   ('/tasks',                    [TaskController::class, 'index']);
    Route::post  ('/tasks',                    [TaskController::class, 'store']);
    Route::get   ('/tasks/{task}',             [TaskController::class, 'show']);
    Route::put   ('/tasks/{task}',             [TaskController::class, 'update']);
    Route::delete('/tasks/{task}',             [TaskController::class, 'destroy']);
    Route::post  ('/tasks/{task}/take',        [TaskController::class, 'take']);
    Route::post  ('/tasks/{task}/submit',      [TaskController::class, 'submit']);
    Route::post  ('/tasks/{task}/approve',     [TaskController::class, 'approve']);
    Route::post  ('/tasks/{task}/reject',      [TaskController::class, 'reject']);
    Route::post  ('/tasks/{task}/archive',     [TaskController::class, 'archive']);

    // Subtasks
    Route::post  ('/tasks/{task}/subtasks',                        [SubtaskController::class, 'store']);
    Route::put   ('/tasks/{task}/subtasks/{subtask}',              [SubtaskController::class, 'update']);
    Route::delete('/tasks/{task}/subtasks/{subtask}',              [SubtaskController::class, 'destroy']);

    // Comments
    Route::post  ('/tasks/{task}/comments',                        [TaskCommentController::class, 'store']);
    Route::delete('/tasks/{task}/comments/{comment}',              [TaskCommentController::class, 'destroy']);

    // Attachments
    Route::post  ('/tasks/{task}/attachments',                     [TaskAttachmentController::class, 'store']);
    Route::delete('/tasks/{task}/attachments/{attachment}',        [TaskAttachmentController::class, 'destroy']);

    // Transactions & Balance
    Route::get ('/transactions',        [TransactionController::class, 'index']);
    Route::post('/transactions/manual', [TransactionController::class, 'manual']);
    Route::get ('/balances',            [TransactionController::class, 'allBalances']);

    // Prizes
    Route::get   ('/prizes',                               [PrizeController::class, 'index']);
    Route::post  ('/prizes',                               [PrizeController::class, 'store']);
    Route::put   ('/prizes/{prize}',                       [PrizeController::class, 'update']);
    Route::delete('/prizes/{prize}',                       [PrizeController::class, 'destroy']);
    Route::post  ('/prizes/{prize}/request',               [PrizeController::class, 'request']);
    Route::get   ('/prize-requests',                       [PrizeController::class, 'requests']);
    Route::get   ('/prize-requests/my',                    [PrizeController::class, 'myRequests']);
    Route::post  ('/prize-requests/{prizeRequest}/handle', [PrizeController::class, 'handleRequest']);

    // Leaderboard
    Route::get('/leaderboard', [LeaderboardController::class, 'index']);

    // Notifications
    Route::get ('/notifications',           [NotificationController::class, 'index']);
    Route::post('/notifications/read-all',  [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);

    // Admin
    Route::get   ('/admin/stats',        [AdminController::class, 'stats']);
    Route::get   ('/admin/users',        [AdminController::class, 'users']);
    Route::put   ('/admin/users/{user}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{user}', [AdminController::class, 'destroyUser']);
});
