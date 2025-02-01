import axios from 'axios';
import {
    ChatCredentials,
    ChatCredentialsResponse,
    ChatMessage,
    ImageUploadResponse,
    MessageType
} from '../types/chat';

class ChatService {
    private baseUrl: string = 'https://api.binance.com';
    private ws: WebSocket | null = null;
    private apiKey: string | null = null;
    private apiSecret: string | null = null;

    constructor() {
        this.apiKey = import.meta.env.VITE_BINANCE_API_KEY;
        this.apiSecret = import.meta.env.VITE_BINANCE_API_SECRET;
    }

    // الحصول على بيانات اعتماد المحادثة
    async retrieveChatCredentials(): Promise<ChatCredentials> {
        try {
            const response = await axios.get<ChatCredentialsResponse>(
                `${this.baseUrl}/sapi/v1/c2c/chat/retrieveChatCredential`,
                {
                    headers: {
                        'X-MBX-APIKEY': this.apiKey
                    }
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message);
            }

            return response.data.data;
        } catch (error) {
            console.error('خطأ في الحصول على بيانات اعتماد المحادثة:', error);
            throw error;
        }
    }

    // إنشاء اتصال WebSocket
    async connectToChat(onMessage: (message: ChatMessage) => void): Promise<void> {
        try {
            const credentials = await this.retrieveChatCredentials();
            const wsUrl = `${credentials.chatWssUrl}/${credentials.listenKey}?token=${credentials.listenToken}&clientType=web`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data) as ChatMessage;
                onMessage(message);
            };

            this.ws.onerror = (error) => {
                console.error('خطأ في اتصال WebSocket:', error);
            };

            this.ws.onclose = () => {
                console.log('تم إغلاق اتصال WebSocket');
            };

        } catch (error) {
            console.error('خطأ في الاتصال بالمحادثة:', error);
            throw error;
        }
    }

    // إرسال رسالة نصية
    sendTextMessage(orderNo: string, content: string): void {
        if (!this.ws) {
            throw new Error('لم يتم إنشاء اتصال WebSocket');
        }

        const message: ChatMessage = {
            type: MessageType.TEXT,
            uuid: Date.now().toString(),
            orderNo,
            content,
            self: true,
            clientType: 'web',
            createTime: Date.now(),
            sendStatus: 0
        };

        this.ws.send(JSON.stringify(message));
    }

    // الحصول على رابط مؤقت لرفع صورة
    async getImageUploadUrl(): Promise<ImageUploadResponse> {
        try {
            const response = await axios.post<ImageUploadResponse>(
                `${this.baseUrl}/sapi/v1/c2c/chat/image/pre-signed-url`,
                null,
                {
                    headers: {
                        'X-MBX-APIKEY': this.apiKey
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('خطأ في الحصول على رابط رفع الصورة:', error);
            throw error;
        }
    }

    // رفع صورة
    async uploadImage(preSignedUrl: string, file: File): Promise<void> {
        try {
            await axios.put(preSignedUrl, file, {
                headers: {
                    'Content-Type': file.type
                }
            });
        } catch (error) {
            console.error('خطأ في رفع الصورة:', error);
            throw error;
        }
    }

    // إرسال رسالة صورة
    async sendImageMessage(orderNo: string, file: File): Promise<void> {
        try {
            const { preSignedUrl, imageUrl } = await this.getImageUploadUrl();
            await this.uploadImage(preSignedUrl, file);

            if (!this.ws) {
                throw new Error('لم يتم إنشاء اتصال WebSocket');
            }

            const message: ChatMessage = {
                type: MessageType.IMAGE,
                uuid: Date.now().toString(),
                orderNo,
                content: imageUrl,
                self: true,
                clientType: 'web',
                createTime: Date.now(),
                sendStatus: 0
            };

            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('خطأ في إرسال الصورة:', error);
            throw error;
        }
    }

    // إغلاق اتصال WebSocket
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const chatService = new ChatService();
