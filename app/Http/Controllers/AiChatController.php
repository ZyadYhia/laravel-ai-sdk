<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChatRequest;
use App\Jobs\ProcessChatMessage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AiChatController extends Controller
{
    public function index()
    {
        return Inertia::render('ai/chat/index');
    }

    public function chat(ChatRequest $request)
    {
        $user = Auth::user();
        $message = $request->input('message');
        $conversationId = $request->input('conversation_id');

        // Generate temporary message ID for tracking
        $tempMessageId = (string) Str::uuid();

        // Debug: Log incoming request
        Log::info('=== AI Chat Request (Async) ===', [
            'user_id' => $user?->id,
            'message_preview' => substr($message, 0, 100),
            'conversation_id' => $conversationId,
            'temp_message_id' => $tempMessageId,
            'timestamp' => now()->toIso8601String(),
        ]);

        // Dispatch job to process chat message asynchronously
        ProcessChatMessage::dispatch(
            $user->id,
            $message,
            $conversationId,
            $tempMessageId
        );

        Log::info('Chat job dispatched', ['temp_message_id' => $tempMessageId]);

        // Return immediate response indicating job was queued
        return response()->json([
            'success' => true,
            'pending' => true,
            'temp_message_id' => $tempMessageId,
            'message' => 'Your message is being processed...',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
