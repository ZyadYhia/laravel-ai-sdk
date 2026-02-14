import axios from 'axios';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { chat } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import IsTyping from './Components/IsTyping';
import MessageComponent from './Components/Message';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Assistant',
        href: chat().url,
    },
];

export type MessageT = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
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
    const [messages, setMessages] = useState<MessageT[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your AI assistant. How can I help you today?',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

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

        console.log('=== Chat Request Started ===');
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

            console.log('=== Response Received ===');
            console.log('Status:', response.status);
            console.log('Success:', response.data.success);
            console.log('Response data:', response.data);

            if (response.data.success) {
                const aiMsg: MessageT = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMsg]);

                // Store conversation ID for future messages
                if (response.data.conversation_id && !conversationId) {
                    console.log(
                        'New conversation ID:',
                        response.data.conversation_id,
                    );
                    setConversationId(response.data.conversation_id);
                }
            } else {
                const errorMsg =
                    response.data.error || 'Failed to get response';
                const details = response.data.details
                    ? `\n\nDetails: ${response.data.details}`
                    : '';
                console.error('Response indicated failure:', errorMsg, details);
                setError(errorMsg + details);
            }
        } catch (err: any) {
            console.error('=== Chat Request Failed ===');
            console.error('Error object:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', err.response?.data);
            console.error('Error message:', err.message);

            let errorMessage =
                err.response?.data?.error ||
                'Failed to connect to the AI. Please make sure Ollama is running.';

            // Add details if available
            if (err.response?.data?.details) {
                errorMessage += `\n\nDetails: ${err.response.data.details}`;
                console.error('Error details:', err.response.data.details);
            }
            if (err.response?.data?.file && err.response?.data?.line) {
                const location = `${err.response.data.file}:${err.response.data.line}`;
                errorMessage += `\n\nLocation: ${location}`;
                console.error('Error location:', location);
            }

            setError(errorMessage);
        } finally {
            setIsTyping(false);
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
        <AppLayout breadcrumbs={breadcrumbs}>
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

                        {isTyping && <IsTyping />}

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
        </AppLayout>
    );
};

export default ChatIndex;
