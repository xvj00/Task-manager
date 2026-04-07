<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ManualTransactionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'user_id'     => 'required|exists:users,id',
            'amount'      => 'required|integer|min:1',
            'type'        => 'required|in:credit,debit',
            'description' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required'     => 'Пользователь обязателен.',
            'user_id.exists'       => 'Выбранный пользователь не существует.',
            'amount.required'      => 'Количество баллов обязательно.',
            'amount.integer'       => 'Количество баллов должно быть целым числом.',
            'amount.min'           => 'Количество баллов должно быть не менее 1.',
            'type.required'        => 'Тип операции обязателен.',
            'type.in'              => 'Тип операции должен быть: credit или debit.',
            'description.required' => 'Описание обязательно.',
            'description.max'      => 'Описание не должно превышать 255 символов.',
        ];
    }
}
