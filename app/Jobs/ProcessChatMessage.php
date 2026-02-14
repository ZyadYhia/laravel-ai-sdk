<?php

namespace App\Jobs;

use App\Ai\Agents\ChatBot;
use App\Events\ChatMessageFailed;
use App\Events\ChatMessageProcessed;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessChatMessage implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $userId,
        public string $message,
        public ?string $conversationId,
        public string $tempMessageId
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('=== ProcessChatMessage Job Started ===', [
                'user_id' => $this->userId,
                'conversation_id' => $this->conversationId,
                'temp_message_id' => $this->tempMessageId,
            ]);

            // Load user
            $user = User::find($this->userId);

            if (! $user) {
                Log::error('User not found', ['user_id' => $this->userId]);
                broadcast(new ChatMessageFailed(
                    $this->userId,
                    $this->tempMessageId,
                    'User not found'
                ));

                return;
            }

            // Create the agent
            $agent = ChatBot::make();

            // Continue existing conversation or start new one
            if ($this->conversationId) {
                Log::info('Continuing existing conversation', ['conversation_id' => $this->conversationId]);
                $agent->continue($this->conversationId, $user);
            } else {
                Log::info('Starting new conversation for user');
                $agent->forUser($user);
            }

            // Get AI configuration
            $provider = config('ai.default');
            $model = config("ai.providers.{$provider}.model", env('OLLAMA_LLM_MODEL', 'llama3.2:1b'));

            Log::info('Sending prompt to AI', [
                'model' => $model,
                'message_length' => strlen($this->message),
            ]);

            // Generate response
            $response = $agent->prompt(
                $this->message,
                model: $model
            );

            $conversationId = $response->withinConversation ?? $agent->currentConversation();

            Log::info('AI response received', [
                'response_length' => strlen((string) $response),
                'conversation_id' => $conversationId,
            ]);

            // Broadcast success event
            broadcast(new ChatMessageProcessed(
                $this->userId,
                $conversationId,
                (string) $response,
                $this->tempMessageId
            ));

            Log::info('=== ProcessChatMessage Job Completed ===');
        } catch (\Throwable $e) {
            Log::error('=== ProcessChatMessage Job Failed ===', [
                'message' => $e->getMessage(),
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $isConnectionError = str_contains($e->getMessage(), 'Connection refused')
                || str_contains($e->getMessage(), 'Could not connect')
                || str_contains($e->getMessage(), 'cURL error')
                || str_contains($e->getMessage(), 'Failed to connect');

            $errorMessage = $isConnectionError
                ? 'Failed to connect to AI service. Please ensure Ollama is running.'
                : 'An error occurred while generating the response.';

            // Broadcast failure event
            broadcast(new ChatMessageFailed(
                $this->userId,
                $this->tempMessageId,
                $errorMessage
            ));

            // Re-throw to mark job as failed in queue
            throw $e;
        }
    }
}
