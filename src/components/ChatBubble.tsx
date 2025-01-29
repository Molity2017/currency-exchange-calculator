import React, { useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatMessage } from '../types/chat';

interface ChatBubbleProps {
    orderNo: string;
    onClick: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ orderNo, onClick }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const handleNewMessage = (message: ChatMessage) => {
            if (!message.self && message.orderNo === orderNo) {
                setUnreadCount(prev => prev + 1);
            }
        };

        // الاتصال بالمحادثة
        const connectToChat = async () => {
            try {
                await chatService.connectToChat(handleNewMessage);
            } catch (error) {
                console.error('خطأ في الاتصال بالمحادثة:', error);
            }
        };

        connectToChat();

        return () => {
            chatService.disconnect();
        };
    }, [orderNo]);

    const handleClick = () => {
        setUnreadCount(0);
        onClick();
    };

    return (
        <button
            onClick={handleClick}
            className="relative bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
            فتح المحادثة
            {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                </span>
            )}
        </button>
    );
};

export default ChatBubble;
