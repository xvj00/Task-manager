<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'  => 'sometimes|string|max:255',
            'role'  => 'sometimes|in:creator,executor',
            'email' => 'sometimes|email|unique:users,email,' . $this->route('user')->id,
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'      => 'Имя не должно превышать 255 символов.',
            'role.in'       => 'Роль должна быть: creator или executor.',
            'email.email'   => 'Введите корректный email адрес.',
            'email.unique'  => 'Пользователь с таким email уже существует.',
        ];
    }
}
