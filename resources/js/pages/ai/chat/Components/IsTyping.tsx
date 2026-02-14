import { Bot } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
const IsTyping = () => {
    return (
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
    );
};
export default IsTyping;
