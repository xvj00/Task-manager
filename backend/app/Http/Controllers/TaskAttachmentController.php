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
        $path = storage_path("app/public/attachments/{$filename}");
        if (!file_exists($path)) abort(404);
        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
        ]);
    }

    public function destroy(Request $request, Task $task, TaskAttachment $attachment)
    {
        if ($attachment->user_id !== $request->user()->id && !$request->user()->isCreator()) {
            abort(403, 'Нельзя удалить чужое вложение.');
        }

        \Illuminate\Support\Facades\Storage::disk('public')->delete('attachments/' . $attachment->filename);
        $attachment->delete();

        return response()->json(null, 204);
    }
}
