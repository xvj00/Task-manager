<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users',
            'password' => 'required|string|min:6|confirmed',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'         => 'Имя обязательно для заполнения.',
            'name.max'              => 'Имя не должно превышать 255 символов.',
            'email.required'        => 'Email обязателен для заполнения.',
            'email.email'           => 'Введите корректный email адрес.',
            'email.unique'          => 'Пользователь с таким email уже существует.',
            'password.required'     => 'Пароль обязателен для заполнения.',
            'password.min'          => 'Пароль должен содержать не менее 6 символов.',
            'password.confirmed'    => 'Пароли не совпадают.',
        ];
    }
}
