import { Send, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IsTyping from './Components/IsTyping';
import MessageComponent from './Components/Message';
import EmptyState from './Components/EmptyState';
import HomeLayout from '@/layouts/home/layout';
import { usePage, router } from '@inertiajs/react';
import { send } from '@/routes/chat';
import type { Auth } from '@/types';
import type {
    MessageT,
    MessageFailedEvent,
    MessageProcessingEvent,
    MessageProcessedEvent,
    ChatChannel,
} from './types.d.ts';

const ChatIndex = () => {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [messages, setMessages] = useState<MessageT[]>([
        {
            id: 'system',
            role: 'assistant',
            content:
                'Hello! I am your AI assistant. How can I help you today?\n\n*Please note: I will format all my responses in Markdown for better readability.*',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [processingStatus, setProcessingStatus] = useState<string | null>(
        null,
    );
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const initializeEventsListeners = (channel: ChatChannel) => {
        // Listen for processing status updates (AI thinking, using tools, etc.)
        channel.listen(
            '.message.processing',
            (data: MessageProcessingEvent) => {
                setProcessingStatus(data?.status);
                setIsTyping(true);
            },
        );

        // Listen for streaming content (partial responses)
        channel.listen('.message.streaming', () => {
            // For streaming, you could update a partial message in real-time
            // This is useful if your AI provider supports streaming
            setProcessingStatus('Streaming response...');
        });

        // Listen for successful AI response
        channel.listen('.message.processed', (data: MessageProcessedEvent) => {
            const aiMsg: MessageT = {
                id: data?.temp_message_id + '-ai',
                role: 'assistant',
                content: data?.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
            setProcessingStatus(null);

            // Store conversation ID for future messages using functional update
            if (data?.conversation_id) {
                setConversationId((prevId) => {
                    if (!prevId) {
                        return data?.conversation_id;
                    }
                    return prevId;
                });
            }
        });

        // Listen for failed AI response
        channel.listen('.message.failed', (data: MessageFailedEvent) => {
            console.error('=== Message Failed Event Received ===');
            console.error('Event data:', data);

            setError(data.error);
            setIsTyping(false);
            setProcessingStatus(null);
        });
    };

    const stopListeners = (channel: ChatChannel) => {
        channel.stopListening('.message.processing');
        channel.stopListening('.message.streaming');
        channel.stopListening('.message.processed');
        channel.stopListening('.message.failed');
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Setup WebSocket listeners
    useEffect(() => {
        if (!auth.user || !auth.user.id) {
            return;
        }
        const userId = auth.user.id;
        const channel = window.Echo.private(`chat.${userId}`) as ChatChannel;
        initializeEventsListeners(channel);

        // Cleanup listeners on unmount
        return () => {
            stopListeners(channel);
            window.Echo.leave(`chat.${userId}`);
        };
    }, [auth.user && auth.user.id]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const userMsg: MessageT = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        const messageToSend = inputValue;
        setInputValue('');
        setIsTyping(true);
        setError(null);

        // Use Inertia router with Wayfinder route function
        router.post(
            send.url(),
            {
                message: messageToSend,
                conversation_id: conversationId,
            },
            {
                preserveState: true,
                preserveScroll: true,
                headers: {
                    Accept: 'application/json',
                },
                onError: (errors) => {
                    console.error('=== Chat Request Failed ===');
                    console.error('Errors:', errors);

                    const errorMessage =
                        (errors as Record<string, string>).message ||
                        Object.values(errors)[0] ||
                        'Failed to connect to the server. Please try again.';

                    setError(errorMessage as string);
                    setIsTyping(false);
                },
            },
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <HomeLayout>
            <div className="pt-6">
                <div className="my-4 flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background py-4 md:h-[calc(100vh-4rem)]">
                    {/* Messages Area */}
                    <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                        {messages.length === 0 ? (
                            <EmptyState />
                        ) : (
                            messages.map((msg) => (
                                <MessageComponent key={msg.id} msg={msg} />
                            ))
                        )}

                        {isTyping && (
                            <div className="flex flex-col gap-2">
                                <IsTyping />
                                {processingStatus && (
                                    <p className="animate-pulse text-sm text-muted-foreground">
                                        {processingStatus}
                                    </p>
                                )}
                            </div>
                        )}

                        {error && (
                            <Alert
                                variant="destructive"
                                className="animate-in duration-300 fade-in"
                            >
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="whitespace-pre-wrap">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t bg-background p-4">
                        <div className="relative mx-auto flex max-w-4xl items-center gap-2">
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message to start chatting..."
                                className="rounded-full border-input/50 bg-muted/50 py-6 pr-14 pl-6 shadow-sm transition-all hover:border-primary/30 focus-visible:bg-background focus-visible:ring-primary/20"
                            />
                            <Button
                                onClick={handleSend}
                                size="icon"
                                disabled={!inputValue.trim() || isTyping}
                                className={`absolute right-1.5 h-9 w-9 rounded-full transition-all ${
                                    inputValue.trim()
                                        ? 'scale-100 opacity-100'
                                        : 'scale-95 opacity-50'
                                }`}
                            >
                                <Send className="ml-0.5 h-4 w-4" />
                                <span className="sr-only">Send</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </HomeLayout>
    );
};

export default ChatIndex;
