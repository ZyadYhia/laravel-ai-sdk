<?php

namespace App\Services;

use App\Ai\Agents\ChatBot;
use App\Contracts\IAiAgentService;
use App\Events\ChatMessageProcessing;
use App\Events\ChatMessageStreaming;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Events\AgentPrompted;
use Laravel\Ai\Events\AgentStreamed;
use Laravel\Ai\Events\InvokingTool;
use Laravel\Ai\Events\PromptingAgent;
use Laravel\Ai\Events\StreamingAgent;
use Laravel\Ai\Events\ToolInvoked;

class AiAgentService implements IAiAgentService
{
    /**
     * Create a new agent instance.
     */
    public function createAgent(): ChatBot
    {
        return ChatBot::make();
    }

    /**
     * Start or continue a conversation for a user.
     */
    public function setupConversation(ChatBot $agent, ?string $conversationId, User $user): void
    {
        if ($conversationId) {
            Log::info('Continuing existing conversation', ['conversation_id' => $conversationId]);
            $agent->continue($conversationId, $user);
        } else {
            Log::info('Starting new conversation for user');
            $agent->forUser($user);
        }
    }

    /**
     * Send a prompt to the agent and get a response.
     */
    public function prompt(ChatBot $agent, string $message, ?string $model = null): mixed
    {
        $model = $model ?? $this->getDefaultModel();

        Log::info('Sending prompt to AI', [
            'model' => $model,
            'message_length' => strlen($message),
        ]);

        $response = $agent->prompt($message, model: $model);

        Log::info('AI response received', [
            'response_length' => strlen((string) $response),
        ]);

        return $response;
    }

    /**
     * Get the default AI model configuration.
     */
    public function getDefaultModel(): string
    {
        $provider = config('ai.default');

        return config("ai.providers.{$provider}.model", env('OLLAMA_LLM_MODEL', 'llama3.2:1b'));
    }

    /**
     * Register event listeners for AI SDK events.
     */
    public function registerEventListeners(int $userId, string $tempMessageId): void
    {
        // Listen for when AI processing starts
        Event::listen(PromptingAgent::class, function (PromptingAgent $event) use ($userId, $tempMessageId) {
            Log::info('AI SDK Event: PromptingAgent', [
                'temp_message_id' => $tempMessageId,
            ]);

            broadcast(new ChatMessageProcessing(
                $userId,
                $tempMessageId,
                'AI is thinking...'
            ));
        });

        // Listen for when AI starts streaming (if supported)
        Event::listen(StreamingAgent::class, function (StreamingAgent $event) use ($userId, $tempMessageId) {
            Log::info('AI SDK Event: StreamingAgent', [
                'temp_message_id' => $tempMessageId,
            ]);

            broadcast(new ChatMessageProcessing(
                $userId,
                $tempMessageId,
                'Streaming response...'
            ));
        });

        // Listen for streaming content (partial responses)
        Event::listen(AgentStreamed::class, function (AgentStreamed $event) use ($userId, $tempMessageId) {
            $content = $event->content ?? $event->partial ?? '';

            Log::debug('AI SDK Event: AgentStreamed', [
                'temp_message_id' => $tempMessageId,
                'partial_length' => strlen($content),
            ]);

            if (! empty($content)) {
                broadcast(new ChatMessageStreaming(
                    $userId,
                    $tempMessageId,
                    $content,
                    'partial'
                ));
            }
        });

        // Listen for when AI finishes prompting
        Event::listen(AgentPrompted::class, function (AgentPrompted $event) use ($tempMessageId) {
            Log::info('AI SDK Event: AgentPrompted', [
                'temp_message_id' => $tempMessageId,
                'response_length' => strlen($event->response->content ?? ''),
            ]);
        });

        // Listen for tool invocation (if agent uses tools)
        Event::listen(InvokingTool::class, function (InvokingTool $event) use ($userId, $tempMessageId) {
            Log::info('AI SDK Event: InvokingTool', [
                'temp_message_id' => $tempMessageId,
                'tool' => $event->tool ?? 'unknown',
            ]);

            broadcast(new ChatMessageProcessing(
                $userId,
                $tempMessageId,
                'Using tool: ' . ($event->tool ?? 'unknown')
            ));
        });

        // Listen for when tool completes
        Event::listen(ToolInvoked::class, function (ToolInvoked $event) use ($userId, $tempMessageId) {
            Log::info('AI SDK Event: ToolInvoked', [
                'temp_message_id' => $tempMessageId,
                'tool' => $event->tool ?? 'unknown',
            ]);

            broadcast(new ChatMessageProcessing(
                $userId,
                $tempMessageId,
                'Tool completed: ' . ($event->tool ?? 'unknown')
            ));
        });
    }

    /**
     * Get the conversation ID from the response.
     */
    public function getConversationId(ChatBot $agent, mixed $response): ?string
    {
        return $response->withinConversation ?? $agent->currentConversation();
    }
}
