// أنواع الرسائل المدعومة
export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image'
}

// واجهة بيانات اعتماد المحادثة
export interface ChatCredentials {
    chatWssUrl: string;
    listenKey: string;
    listenToken: string;
}

// واجهة استجابة بيانات الاعتماد
export interface ChatCredentialsResponse {
    code: string;
    message: string;
    data: ChatCredentials;
    success: boolean;
}

// واجهة الرسالة
export interface ChatMessage {
    type: MessageType;
    uuid: string;
    orderNo: string;
    content: string;
    self: boolean;
    clientType: string;
    createTime: number;
    sendStatus: number;
}

// واجهة استجابة رفع الصور
export interface ImageUploadResponse {
    preSignedUrl: string;
    imageUrl: string;
}

// واجهة تكوين WebSocket
export interface WebSocketConfig {
    url: string;
    onMessage: (message: ChatMessage) => void;
    onClose?: () => void;
    onError?: (error: Error) => void;
}
