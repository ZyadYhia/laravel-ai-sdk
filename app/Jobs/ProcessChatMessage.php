<?php

namespace App\Jobs;

use App\Contracts\IAiAgentService;
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
    public function handle(IAiAgentService $aiService): void
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

            // Register listeners for AI SDK events
            $aiService->registerEventListeners($this->userId, $this->tempMessageId);

            // Create the agent
            /** @var \App\Ai\Agents\ChatBot $agent */
            $agent = $aiService->createAgent();

            // Setup conversation
            /** @var \App\Models\User $user */
            $aiService->setupConversation($agent, $this->conversationId, $user);

            // Generate response
            $response = $aiService->prompt($agent, $this->message);

            // Get conversation ID
            $conversationId = $aiService->getConversationId($agent, $response);

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
