import React, { useEffect, useState, useRef } from 'react';
import { chatService } from '../services/chatService';
import { ChatMessage, MessageType } from '../types/chat';

interface ChatProps {
    orderNo: string;
    onClose?: () => void;
}

const Chat: React.FC<ChatProps> = ({ orderNo, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // التمرير التلقائي إلى آخر رسالة
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // الاتصال بالمحادثة عند تحميل المكون
    useEffect(() => {
        const connectToChat = async () => {
            try {
                await chatService.connectToChat((message) => {
                    setMessages(prev => [...prev, message]);
                });
                setIsConnected(true);
                setError(null);
            } catch (err) {
                setError('فشل الاتصال بالمحادثة');
                console.error(err);
            }
        };

        connectToChat();

        return () => {
            chatService.disconnect();
        };
    }, []);

    // إرسال رسالة نصية
    const handleSendMessage = () => {
        if (!newMessage.trim()) return;

        try {
            chatService.sendTextMessage(orderNo, newMessage);
            setNewMessage('');
        } catch (err) {
            setError('فشل إرسال الرسالة');
            console.error(err);
        }
    };

    // معالجة اختيار الصورة
    const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await chatService.sendImageMessage(orderNo, file);
        } catch (err) {
            setError('فشل رفع الصورة');
            console.error(err);
        }
    };

    // تنسيق وقت الرسالة
    const formatMessageTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed bottom-4 left-4 w-96 h-[600px] bg-white rounded-lg shadow-lg flex flex-col">
            {/* رأس المحادثة */}
            <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h3 className="font-bold">المحادثة #{orderNo}</h3>
                <button
                    onClick={onClose}
                    className="text-white hover:text-gray-200"
                >
                    ✕
                </button>
            </div>

            {/* رسائل الخطأ */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 text-right">
                    {error}
                </div>
            )}

            {/* منطقة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.uuid}
                        className={`flex ${message.self ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                                message.self
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                        >
                            {message.type === MessageType.TEXT ? (
                                <p className="text-right">{message.content}</p>
                            ) : (
                                <img
                                    src={message.content}
                                    alt="صورة المحادثة"
                                    className="max-w-full rounded"
                                />
                            )}
                            <span className={`text-xs ${
                                message.self ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                                {formatMessageTime(message.createTime)}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* منطقة إدخال الرسالة */}
            <div className="p-4 border-t">
                <div className="flex space-x-2 items-center">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-gray-700"
                        title="إرفاق صورة"
                    >
                        📎
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="اكتب رسالتك هنا..."
                        className="flex-1 p-2 border rounded-lg text-right"
                        disabled={!isConnected}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!isConnected || !newMessage.trim()}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                        إرسال
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
