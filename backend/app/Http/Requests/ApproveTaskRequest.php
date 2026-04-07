<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApproveTaskRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'reward_points' => 'nullable|integer|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'reward_points.integer' => 'Баллы должны быть целым числом.',
            'reward_points.min'     => 'Баллы не могут быть отрицательными.',
        ];
    }
}
