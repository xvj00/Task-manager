<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'         => 'required|string|max:150',
            'description'   => 'nullable|string',
            'deadline'      => 'nullable|date',
            'priority'      => 'nullable|in:low,medium,high,urgent',
            'assignee_id'   => 'nullable|exists:users,id',
            'reward_points' => 'nullable|integer|min:0',
            'category'      => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required'        => 'Название задачи обязательно.',
            'title.max'             => 'Название не должно превышать 150 символов.',
            'deadline.date'         => 'Дедлайн должен быть корректной датой.',
            'priority.in'           => 'Приоритет должен быть: low, medium, high или urgent.',
            'assignee_id.exists'    => 'Выбранный исполнитель не существует.',
            'reward_points.integer' => 'Баллы должны быть целым числом.',
            'reward_points.min'     => 'Баллы не могут быть отрицательными.',
            'category.max'          => 'Категория не должна превышать 100 символов.',
        ];
    }
}
