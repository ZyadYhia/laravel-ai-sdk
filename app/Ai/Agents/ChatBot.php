<?php

namespace App\Ai\Agents;

use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Promptable;
use Stringable;

class ChatBot implements Agent, Conversational, HasTools
{
    use Promptable;

    /**
     * Create a new ChatBot instance.
     */
    public function __construct(
        protected ?string $conversationId = null,
        protected ?int $userId = null,
    ) {}

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return 'You are a helpful and friendly AI assistant. You help users with their questions and provide clear, accurate, and concise responses. Be conversational, empathetic, and professional in your interactions.';
    }

    /**
     * Get the list of messages comprising the conversation so far.
     */
    public function messages(): iterable
    {
        if (! $this->conversationId || ! $this->userId) {
            return [];
        }

        return DB::table('agent_conversation_messages')
            ->where('conversation_id', $this->conversationId)
            ->where('user_id', $this->userId)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($message) => [
                'role' => $message->role,
                'content' => $message->content,
            ])
            ->toArray();
    }

    /**
     * Get the tools available to the agent.
     *
     * @return Tool[]
     */
    public function tools(): iterable
    {
        return [];
    }
}
