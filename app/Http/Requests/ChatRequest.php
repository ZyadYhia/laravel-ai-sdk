<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'message' => ['required_without:image', 'string', 'max:5000'],
            'image' => ['nullable', 'file', 'image', 'max:5120'], // 5MB max
            'conversation_id' => ['nullable', 'string', 'exists:agent_conversations,id'],
        ];
    }

    /**
     * Get custom error messages for the validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'message.required_without' => 'Please enter a message or attach an image.',
            'message.max' => 'Your message is too long. Please keep it under 5000 characters.',
            'image.image' => 'The file must be an image.',
            'image.max' => 'The image may not be greater than 5MB.',
            'conversation_id.exists' => 'The conversation could not be found.',
        ];
    }
}
