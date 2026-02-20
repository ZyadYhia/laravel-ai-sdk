<?php

namespace App\Contracts;

use App\Ai\Agents\ChatBot;
use App\Models\User;

interface IAiAgentService
{
    /**
     * Create a new agent instance.
     */
    public function createAgent(): ChatBot;

    /**
     * Start or continue a conversation for a user.
     */
    public function setupConversation(ChatBot $agent, ?string $conversationId, User $user): void;

    /**
     * Send a prompt to the agent and get a response.
     */
    public function prompt(ChatBot $agent, string $message, ?string $model = null): mixed;

    /**
     * Get the default AI model configuration.
     */
    public function getDefaultModel(): string;

    /**
     * Register event listeners for AI SDK events.
     */
    public function registerEventListeners(int $userId, string $tempMessageId): void;

    /**
     * Get the conversation ID from the response.
     */
    public function getConversationId(ChatBot $agent, mixed $response): ?string;
}
