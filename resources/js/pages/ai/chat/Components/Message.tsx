import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type MessageT } from '../index';

type MessageComponentPropsT = {
    msg: MessageT;
};

const MessageComponent = (props: MessageComponentPropsT) => {
    const { msg } = props;
    return (
        <div
            className={`flex w-full ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-in duration-300 slide-in-from-bottom-2`}
        >
            <div
                className={`flex max-w-[85%] gap-3 md:max-w-[70%] ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
            >
                <Avatar className="h-8 w-8 shrink-0 md:h-10 md:w-10">
                    {msg.role === 'assistant' ? (
                        <>
                            <AvatarImage src="/ai-avatar.png" alt="AI" />
                            <AvatarFallback className="bg-primary/10 text-primary">
                                <Bot size={18} />
                            </AvatarFallback>
                        </>
                    ) : (
                        <>
                            <AvatarImage src="/user-avatar.png" alt="User" />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                                <User size={18} />
                            </AvatarFallback>
                        </>
                    )}
                </Avatar>

                <div
                    className={`group relative flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                >
                    <div
                        className={`rounded-2xl px-4 py-3 text-sm shadow-sm md:text-base ${
                            msg.role === 'user'
                                ? 'rounded-tr-none bg-primary text-primary-foreground'
                                : 'rounded-tl-none border bg-card text-card-foreground'
                        }`}
                    >
                        {msg.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:font-semibold prose-ol:my-2 prose-ul:my-2 prose-li:my-1">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            msg.content
                        )}
                    </div>
                    <span className="mt-1 px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {msg.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
};
export default MessageComponent;
