<?php

namespace App\Http\Controllers;

use App\Ai\Agents\ChatBot;
use App\Http\Requests\ChatRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
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

        // Debug: Log incoming request
        Log::info('=== AI Chat Request Started ===', [
            'user_id' => $user?->id,
            'message_preview' => substr($message, 0, 100),
            'conversation_id' => $conversationId,
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            // Debug: Log AI configuration
            $provider = config('ai.default');
            $providerConfig = config("ai.providers.{$provider}");
            $model = config("ai.providers.{$provider}.model", env('OLLAMA_LLM_MODEL', 'llama3.2:1b'));

            Log::info('AI Configuration', [
                'provider' => $provider,
                'provider_url' => $providerConfig['url'] ?? 'N/A',
                'model' => $model,
            ]);

            // Debug: Test Ollama connection
            if ($provider === 'ollama') {
                $ollamaUrl = $providerConfig['url'] ?? 'http://localhost:11434';
                Log::info('Testing Ollama connection', ['url' => $ollamaUrl]);

                try {
                    $ch = curl_init($ollamaUrl . '/api/tags');
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    $result = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);

                    Log::info('Ollama connection test result', [
                        'http_code' => $httpCode,
                        'response' => substr($result, 0, 500),
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('Ollama connection test failed', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Create the agent using Laravel AI SDK's conversation management
            $agent = ChatBot::make();

            // Continue existing conversation or start new one
            if ($conversationId && $user) {
                Log::info('Continuing existing conversation', ['conversation_id' => $conversationId]);
                $agent->continue($conversationId, $user);
            } elseif ($user) {
                Log::info('Starting new conversation for user');
                $agent->forUser($user);
            }

            // Generate response - AI SDK handles all message persistence automatically
            Log::info('Sending prompt to AI', [
                'model' => $model,
                'message_length' => strlen($message),
            ]);

            $response = $agent->prompt(
                $message,
                model: $model
            );

            Log::info('AI response received', [
                'response_length' => strlen((string) $response),
                'conversation_id' => $response->withinConversation ?? $agent->currentConversation(),
            ]);

            return response()->json([
                'success' => true,
                'response' => (string) $response,
                'conversation_id' => $response->withinConversation ?? $agent->currentConversation(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            Log::error('=== AI Chat Error ===', [
                'message' => $e->getMessage(),
                'conversation_id' => $conversationId,
                'user_id' => $user?->id,
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $isConnectionError = str_contains($e->getMessage(), 'Connection refused')
                || str_contains($e->getMessage(), 'Could not connect')
                || str_contains($e->getMessage(), 'cURL error')
                || str_contains($e->getMessage(), 'Failed to connect');

            return response()->json([
                'success' => false,
                'error' => $isConnectionError
                    ? 'Failed to connect to AI service. Please ensure Ollama is running on http://localhost:11434'
                    : 'An error occurred while generating the response.',
                'details' => app()->hasDebugModeEnabled() ? $e->getMessage() : null,
                'file' => app()->hasDebugModeEnabled() ? $e->getFile() : null,
                'line' => app()->hasDebugModeEnabled() ? $e->getLine() : null,
            ], 500);
        }
    }
}
