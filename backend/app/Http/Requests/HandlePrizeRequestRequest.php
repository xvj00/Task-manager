<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class HandlePrizeRequestRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'action' => 'required|in:approve,reject',
            'reason' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'action.required' => 'Действие обязательно.',
            'action.in'       => 'Действие должно быть: approve или reject.',
            'reason.string'   => 'Причина должна быть текстом.',
        ];
    }
}
