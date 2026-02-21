import { supabase } from '../lib/supabase';

export interface ChatMessage {
    avatarId: string;
    text: string;
    timestamp: number;
}

type ChatCallback = (msg: ChatMessage) => void;

class ChatService {
    private channel = supabase.channel('world_chat');
    private callbacks: ChatCallback[] = [];

    constructor() {
        this.channel
            .on('broadcast', { event: 'chat' }, (payload) => {
                const msg = payload.payload as ChatMessage;
                this.callbacks.forEach(cb => cb(msg));
            })
            .subscribe();
    }

    public onMessage(cb: ChatCallback) {
        this.callbacks.push(cb);
        return () => {
            this.callbacks = this.callbacks.filter(c => c !== cb);
        };
    }

    public async sendMessage(avatarId: string, text: string) {
        await this.channel.send({
            type: 'broadcast',
            event: 'chat',
            payload: {
                avatarId,
                text,
                timestamp: Date.now()
            }
        });
    }
}

export const chatService = new ChatService();
