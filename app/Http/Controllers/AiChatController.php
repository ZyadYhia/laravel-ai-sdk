<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ChatBot;
use App\Http\Requests\ChatRequest;
use App\Models\AgentConversation;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
        $userId = Auth::id() ?? 0; // Use 0 for guest users
        $message = $request->input('message');
        $conversationId = $request->input('conversation_id');

        // Create a new conversation if one doesn't exist
        if (! $conversationId) {
            $conversationId = Str::uuid()->toString();

            AgentConversation::create([
                'id' => $conversationId,
                'user_id' => $userId,
                'title' => Str::limit($message, 50),
            ]);
        }

        // Store the user's message
        DB::table('agent_conversation_messages')->insert([
            'id' => Str::uuid()->toString(),
            'conversation_id' => $conversationId,
            'user_id' => $userId,
            'agent' => ChatBot::class,
            'role' => 'user',
            'content' => $message,
            'attachments' => json_encode([]),
            'tool_calls' => json_encode([]),
            'tool_results' => json_encode([]),
            'usage' => json_encode([]),
            'meta' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            // Create the agent and generate a response
            $response = (new ChatBot($conversationId, $userId))
                ->prompt(
                    $message,
                    model: env('OLLAMA_LLM_MODEL', 'qwen3-vl:8b')
                );

            $responseText = (string) $response;

            return response()->json([
                'success' => true,
                'response' => $responseText,
                'conversation_id' => $conversationId,
            ]);
        } catch (\Exception $e) {
            Log::error('AI Chat Error: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate response. Please make sure Ollama is running and the model is available.',
                'details' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile()),
            ], 500);
        }
    }
}
