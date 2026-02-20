import { Sparkles } from 'lucide-react';

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
export default EmptyState;
