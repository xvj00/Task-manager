<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePrizeRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'cost_points' => 'sometimes|integer|min:1',
            'quantity'    => 'nullable|integer|min:-1',
            'is_active'   => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.max'            => 'Название не должно превышать 255 символов.',
            'cost_points.integer' => 'Стоимость должна быть целым числом.',
            'cost_points.min'     => 'Стоимость должна быть не менее 1 балла.',
            'quantity.integer'    => 'Количество должно быть целым числом.',
            'quantity.min'        => 'Количество не может быть меньше -1.',
            'is_active.boolean'   => 'Поле активности должно быть true или false.',
        ];
    }
}
