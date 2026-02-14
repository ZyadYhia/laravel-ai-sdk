<?php

namespace App\Jobs;

use App\Ai\Agents\ChatBot;
use App\Events\ChatMessageFailed;
use App\Events\ChatMessageProcessed;
use App\Events\ChatMessageProcessing;
use App\Events\ChatMessageStreaming;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Events\AgentPrompted;
use Laravel\Ai\Events\AgentStreamed;
use Laravel\Ai\Events\InvokingTool;
use Laravel\Ai\Events\PromptingAgent;
use Laravel\Ai\Events\StreamingAgent;
use Laravel\Ai\Events\ToolInvoked;

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

            // Register listeners for AI SDK events
            $this->registerAiEventListeners();

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

    /**
     * Register event listeners for AI SDK events.
     */
    protected function registerAiEventListeners(): void
    {
        // Listen for when AI processing starts
        Event::listen(PromptingAgent::class, function (PromptingAgent $event) {
            Log::info('AI SDK Event: PromptingAgent', [
                'temp_message_id' => $this->tempMessageId,
            ]);

            broadcast(new ChatMessageProcessing(
                $this->userId,
                $this->tempMessageId,
                'AI is thinking...'
            ));
        });

        // Listen for when AI starts streaming (if supported)
        Event::listen(StreamingAgent::class, function (StreamingAgent $event) {
            Log::info('AI SDK Event: StreamingAgent', [
                'temp_message_id' => $this->tempMessageId,
            ]);

            broadcast(new ChatMessageProcessing(
                $this->userId,
                $this->tempMessageId,
                'Streaming response...'
            ));
        });

        // Listen for streaming content (partial responses)
        Event::listen(AgentStreamed::class, function (AgentStreamed $event) {
            $content = $event->content ?? $event->partial ?? '';

            Log::debug('AI SDK Event: AgentStreamed', [
                'temp_message_id' => $this->tempMessageId,
                'partial_length' => strlen($content),
            ]);

            if (! empty($content)) {
                broadcast(new ChatMessageStreaming(
                    $this->userId,
                    $this->tempMessageId,
                    $content,
                    'partial'
                ));
            }
        });

        // Listen for when AI finishes prompting
        Event::listen(AgentPrompted::class, function (AgentPrompted $event) {
            Log::info('AI SDK Event: AgentPrompted', [
                'temp_message_id' => $this->tempMessageId,
                'response_length' => strlen($event->response->content ?? ''),
            ]);
        });

        // Listen for tool invocation (if agent uses tools)
        Event::listen(InvokingTool::class, function (InvokingTool $event) {
            Log::info('AI SDK Event: InvokingTool', [
                'temp_message_id' => $this->tempMessageId,
                'tool' => $event->tool ?? 'unknown',
            ]);

            broadcast(new ChatMessageProcessing(
                $this->userId,
                $this->tempMessageId,
                'Using tool: ' . ($event->tool ?? 'unknown')
            ));
        });

        // Listen for when tool completes
        Event::listen(ToolInvoked::class, function (ToolInvoked $event) {
            Log::info('AI SDK Event: ToolInvoked', [
                'temp_message_id' => $this->tempMessageId,
                'tool' => $event->tool ?? 'unknown',
            ]);

            broadcast(new ChatMessageProcessing(
                $this->userId,
                $this->tempMessageId,
                'Tool completed: ' . ($event->tool ?? 'unknown')
            ));
        });
    }
}
