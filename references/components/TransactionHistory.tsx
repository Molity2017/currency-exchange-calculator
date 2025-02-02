import React, { useEffect, useState } from 'react';
import { binanceService } from '../../references/types/services/binanceService';
import { BinanceTransaction, TradeType } from '../types/binance';
import Chat from './Chat';
import ChatBubble from './ChatBubble';

interface TransactionHistoryProps {
    filters?: {
        type?: TradeType | 'ALL';
        minRate?: number;
        maxRate?: number;
    };
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ filters = { type: 'ALL' } }) => {
    const [transactions, setTransactions] = useState<BinanceTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeChatOrderNo, setActiveChatOrderNo] = useState<string | null>(null);

    useEffect(() => {
        const initializeBinanceService = () => {
            const apiKey = import.meta.env.VITE_BINANCE_API_KEY;
            const apiSecret = import.meta.env.VITE_BINANCE_API_SECRET;
            
            console.log('فحص متغيرات البيئة:', {
                hasApiKey: !!apiKey,
                hasApiSecret: !!apiSecret,
                apiKeyLength: apiKey?.length,
                apiSecretLength: apiSecret?.length
            });
            
            if (!apiKey || !apiSecret) {
                throw new Error('يرجى إضافة مفاتيح API في ملف .env');
            }

            try {
                binanceService.setConfig({
                    apiKey,
                    apiSecret
                });
                console.log('تم تهيئة BinanceService بنجاح');
            } catch (error) {
                console.error('خطأ في تهيئة BinanceService:', error);
                throw error;
            }
        };

        const fetchTransactions = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await binanceService.getTransactionHistory();
                setTransactions(data);
                
                if (data.length === 0) {
                    setError('لم يتم العثور على معاملات');
                }
            } catch (err) {
                console.error('خطأ في تحميل المعاملات:', err);
                setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
            } finally {
                setLoading(false);
            }
        };

        initializeBinanceService();
        fetchTransactions();
    }, []);

    const filteredTransactions = transactions.filter(tx => {
        if (filters.type && filters.type !== 'ALL' && tx.type !== filters.type) {
            return false;
        }

        const rate = tx.totalPrice / tx.amount;
        
        if (filters.minRate && rate < filters.minRate) {
            return false;
        }
        
        if (filters.maxRate && rate > filters.maxRate) {
            return false;
        }
        
        return true;
    });

    if (loading) {
        return <div className="p-4 text-center">جاري التحميل...</div>;
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="text-red-500 mb-4">{error}</div>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h2 className="text-xl mb-4">سجل المعاملات</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                    <thead>
                        <tr>
                            <th className="border p-2">رقم المعاملة</th>
                            <th className="border p-2">النوع</th>
                            <th className="border p-2">الحالة</th>
                            <th className="border p-2">المبلغ</th>
                            <th className="border p-2">السعر الإجمالي</th>
                            <th className="border p-2">السعر</th>
                            <th className="border p-2">العمولة</th>
                            <th className="border p-2">الطرف الآخر</th>
                            <th className="border p-2">طريقة الدفع</th>
                            <th className="border p-2">التاريخ</th>
                            <th className="border p-2">المحادثة</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((tx) => (
                            <tr key={tx.id}>
                                <td className="border p-2 text-right">{tx.id}</td>
                                <td className="border p-2 text-right">
                                    <span className={`px-2 py-1 rounded ${
                                        tx.type === TradeType.BUY 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {tx.type === TradeType.BUY ? 'شراء' : 'بيع'}
                                    </span>
                                </td>
                                <td className="border p-2 text-right">
                                    <span className={`px-2 py-1 rounded ${
                                        tx.status === 'FILLED' 
                                            ? 'bg-green-100 text-green-800'
                                            : tx.status === 'CANCELLED' 
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {tx.status === 'FILLED' ? 'مكتمل' 
                                         : tx.status === 'CANCELLED' ? 'ملغي'
                                         : tx.status === 'PENDING' ? 'معلق'
                                         : 'قيد المعالجة'}
                                    </span>
                                </td>
                                <td className="border p-2 text-right">{tx.amount.toFixed(2)} USDT</td>
                                <td className="border p-2 text-right">{tx.totalPrice.toFixed(2)} EGP</td>
                                <td className="border p-2 text-right">{tx.rate.toFixed(2)} EGP/USDT</td>
                                <td className="border p-2 text-right">{tx.commission.toFixed(2)} EGP</td>
                                <td className="border p-2 text-right">{tx.counterParty}</td>
                                <td className="border p-2 text-right">{tx.payMethod}</td>
                                <td className="border p-2 text-right">
                                    {new Date(tx.createTime).toLocaleString('ar-EG')}
                                </td>
                                <td className="border p-2 text-right">
                                    <ChatBubble
                                        orderNo={tx.id}
                                        onClick={() => setActiveChatOrderNo(tx.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {activeChatOrderNo && (
                <Chat
                    orderNo={activeChatOrderNo}
                    onClose={() => setActiveChatOrderNo(null)}
                />
            )}
        </div>
    );
};

export default TransactionHistory;
