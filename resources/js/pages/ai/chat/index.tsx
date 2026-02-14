import axios from 'axios';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IsTyping from './Components/IsTyping';
import MessageComponent from './Components/Message';
import HomeLayout from '@/layouts/home/layout';
import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';

export type MessageT = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
};

type MessageProcessedEvent = {
    conversation_id: string;
    response: string;
    temp_message_id: string;
    timestamp: string;
};

type MessageFailedEvent = {
    temp_message_id: string;
    error: string;
    timestamp: string;
};

type MessageProcessingEvent = {
    temp_message_id: string;
    status: string;
    timestamp: string;
};

type MessageStreamingEvent = {
    temp_message_id: string;
    partial_content: string;
    event_type: string;
    timestamp: string;
};

const EmptyState = () => (
    <div className="flex flex-1 animate-in flex-col items-center justify-center p-8 text-center duration-500 fade-in">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
            How can I help you today?
        </h2>
        <p className="mt-2 max-w-md text-muted-foreground">
            I'm your AI assistant. You can ask me anything about your data,
            generate reports, or get help with your tasks.
        </p>
    </div>
);

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

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Setup WebSocket listeners
    useEffect(() => {
        const userId = auth.user.id;
        const channel = window.Echo.private(`chat.${userId}`) as {
            listen: (event: string, callback: (data: any) => void) => void;
            stopListening: (event: string) => void;
        };

        console.log('=== WebSocket Setup ===');
        console.log('Listening on channel:', `chat.${userId}`);

        // Listen for processing status updates (AI thinking, using tools, etc.)
        channel.listen(
            '.message.processing',
            (data: MessageProcessingEvent) => {
                console.log('=== Message Processing Event Received ===');
                console.log('Event data:', data);

                setProcessingStatus(data.status);
                setIsTyping(true);
            },
        );

        // Listen for streaming content (partial responses)
        channel.listen('.message.streaming', (data: MessageStreamingEvent) => {
            console.log('=== Message Streaming Event Received ===');
            console.log('Event type:', data.event_type);

            // For streaming, you could update a partial message in real-time
            // This is useful if your AI provider supports streaming
            setProcessingStatus('Streaming response...');
        });

        // Listen for successful AI response
        channel.listen('.message.processed', (data: MessageProcessedEvent) => {
            console.log('=== Message Processed Event Received ===');
            console.log('Event data:', data);

            const aiMsg: MessageT = {
                id: data.temp_message_id + '-ai',
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
            setProcessingStatus(null);

            // Store conversation ID for future messages
            if (data.conversation_id && !conversationId) {
                console.log('New conversation ID:', data.conversation_id);
                setConversationId(data.conversation_id);
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

        // Cleanup listeners on unmount
        return () => {
            console.log('=== WebSocket Cleanup ===');
            channel.stopListening('.message.processing');
            channel.stopListening('.message.streaming');
            channel.stopListening('.message.processed');
            channel.stopListening('.message.failed');
            window.Echo.leave(`chat.${userId}`);
        };
    }, [auth.user.id, conversationId]);

    const handleSend = async () => {
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

        console.log('=== Chat Request Started (Async) ===');
        console.log('Message:', messageToSend);
        console.log('Conversation ID:', conversationId);

        try {
            // Get CSRF token
            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content');

            console.log('CSRF Token:', csrfToken ? 'Present' : 'Missing');

            const requestData = {
                message: messageToSend,
                conversation_id: conversationId,
            };

            console.log('Request payload:', requestData);
            console.log('Request URL:', '/chat');

            const response = await axios.post('/chat', requestData, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            });

            console.log('=== Response Received (Job Dispatched) ===');
            console.log('Status:', response.status);
            console.log('Pending:', response.data.pending);
            console.log('Temp Message ID:', response.data.temp_message_id);
            console.log('Response data:', response.data);

            if (!response.data.pending) {
                // Fallback: if for some reason we got a synchronous response
                if (response.data.success && response.data.response) {
                    const aiMsg: MessageT = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: response.data.response,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, aiMsg]);
                    setIsTyping(false);

                    if (response.data.conversation_id && !conversationId) {
                        setConversationId(response.data.conversation_id);
                    }
                } else {
                    const errorMsg =
                        response.data.error || 'Failed to get response';
                    console.error('Response indicated failure:', errorMsg);
                    setError(errorMsg);
                    setIsTyping(false);
                }
            }
            // If pending=true, we wait for WebSocket event (isTyping stays true)
        } catch (err: unknown) {
            console.error('=== Chat Request Failed ===');
            console.error('Error object:', err);

            const error = err as {
                response?: { data?: { error?: string } };
                message?: string;
            };
            console.error('Error response:', error.response);
            console.error('Error response data:', error.response?.data);
            console.error('Error message:', error.message);

            const errorMessage =
                error.response?.data?.error ||
                'Failed to connect to the server. Please try again.';

            setError(errorMessage);
            setIsTyping(false);
        } finally {
            console.log('=== Chat Request Completed ===');
        }
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
