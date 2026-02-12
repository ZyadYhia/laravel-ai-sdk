import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';
import { chat } from '@/routes';
import { Card } from '@/components/ui/card';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Assistant',
        href: chat().url,
    },
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

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
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am your AI assistant. How can I help you today?',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content:
                    "I'm a demo AI. In a real implementation, this would connect to your backend logic.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
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
                                <div
                                    key={msg.id}
                                    className={`flex w-full ${
                                        msg.role === 'user'
                                            ? 'justify-end'
                                            : 'justify-start'
                                    } animate-in duration-300 slide-in-from-bottom-2`}
                                >
                                    <div
                                        className={`flex max-w-[85%] gap-3 md:max-w-[70%] ${
                                            msg.role === 'user'
                                                ? 'flex-row-reverse'
                                                : 'flex-row'
                                        }`}
                                    >
                                        <Avatar className="h-8 w-8 shrink-0 md:h-10 md:w-10">
                                            {msg.role === 'assistant' ? (
                                                <>
                                                    <AvatarImage
                                                        src="/ai-avatar.png"
                                                        alt="AI"
                                                    />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        <Bot size={18} />
                                                    </AvatarFallback>
                                                </>
                                            ) : (
                                                <>
                                                    <AvatarImage
                                                        src="/user-avatar.png"
                                                        alt="User"
                                                    />
                                                    <AvatarFallback className="bg-muted text-muted-foreground">
                                                        <User size={18} />
                                                    </AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>

                                        <div
                                            className={`group relative flex flex-col ${
                                                msg.role === 'user'
                                                    ? 'items-end'
                                                    : 'items-start'
                                            }`}
                                        >
                                            <div
                                                className={`rounded-2xl px-4 py-3 text-sm shadow-sm md:text-base ${
                                                    msg.role === 'user'
                                                        ? 'rounded-tr-none bg-primary text-primary-foreground'
                                                        : 'rounded-tl-none border bg-card text-card-foreground'
                                                }`}
                                            >
                                                {msg.content}
                                            </div>
                                            <span className="mt-1 px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                                {msg.timestamp.toLocaleTimeString(
                                                    [],
                                                    {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    },
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isTyping && (
                            <div className="flex w-full animate-in justify-start duration-300 fade-in">
                                <div className="flex max-w-[80%] gap-3">
                                    <Avatar className="h-8 w-8 shrink-0 md:h-10 md:w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            <Bot size={18} />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-center space-x-1 rounded-2xl rounded-tl-none border bg-card px-4 py-4 text-card-foreground shadow-sm">
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40"></div>
                                    </div>
                                </div>
                            </div>
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
