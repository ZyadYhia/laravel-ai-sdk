type MessageT = {
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

type ChatChannel = {
    listen: (event: string, callback: (data: any) => void) => void;
    stopListening: (event: string) => void;
};

export {
    MessageT,
    MessageProcessedEvent,
    MessageFailedEvent,
    MessageProcessingEvent,
    MessageStreamingEvent,
    ChatChannel,
};
