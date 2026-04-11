<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaskAttachmentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $request->validate([
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,txt,zip,rar,7z',
        ], [
            'file.required' => 'Файл обязателен.',
            'file.file'     => 'Загрузите корректный файл.',
            'file.max'      => 'Размер файла не должен превышать 10 МБ.',
            'file.mimes'    => 'Допустимые форматы: изображения, PDF, документы Office, txt, архивы.',
        ]);

        $file         = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $filename     = Str::uuid() . '.' . $file->getClientOriginalExtension();

        $file->storeAs('attachments', $filename, 'public');

        $attachment = $task->attachments()->create([
            'user_id'       => $request->user()->id,
            'filename'      => $filename,
            'original_name' => $originalName,
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
        ]);

        return response()->json($attachment->load('user'), 201);
    }

    public function serve(Request $request, string $filename)
    {
        if ($request->isMethod('OPTIONS')) {
            return response('', 204)->withHeaders($this->fileCorsHeaders());
        }

        if (str_contains($filename, '..') || str_contains($filename, '/') || str_contains($filename, '\\')) {
            abort(404);
        }

        $path = storage_path('app/public/attachments/'.$filename);
        if (! is_file($path)) {
            abort(404);
        }

        return tap(response()->file($path, array_merge([
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
            'Cross-Origin-Resource-Policy' => 'cross-origin',
        ], $this->fileCorsHeaders())), function ($response) {
            $response->headers->remove('X-Frame-Options');
            $ancestors = config('app.frontend_frame_ancestors', '*');
            $response->headers->set('Content-Security-Policy', 'frame-ancestors '.$ancestors);
        });
    }

    /**
     * @return array<string, string>
     */
    private function fileCorsHeaders(): array
    {
        return [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers' => 'Authorization, Content-Type, Accept',
            'Access-Control-Max-Age' => '86400',
        ];
    }

    public function destroy(Request $request, Task $task, TaskAttachment $attachment)
    {
        if ($attachment->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            abort(403, 'Нельзя удалить чужое вложение.');
        }

        \Illuminate\Support\Facades\Storage::disk('public')->delete('attachments/' . $attachment->filename);
        $attachment->delete();

        return response()->json(null, 204);
    }
}
