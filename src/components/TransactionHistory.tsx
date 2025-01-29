import React, { useEffect, useState } from 'react';
import { binanceService } from '../services/binanceService';
import { BinanceTransaction, TradeType } from '../types/binance';

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
                        <tr className="bg-gray-100">
                            <th className="border p-2">التاريخ</th>
                            <th className="border p-2">النوع</th>
                            <th className="border p-2">الحالة</th>
                            <th className="border p-2">المبلغ</th>
                            <th className="border p-2">العملة</th>
                            <th className="border p-2">السعر</th>
                            <th className="border p-2">الإجمالي</th>
                            <th className="border p-2">العمولة</th>
                            <th className="border p-2">الطرف الآخر</th>
                            <th className="border p-2">طريقة الدفع</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((tx, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="border p-2 text-right">{tx.date.toLocaleString()}</td>
                                <td className="border p-2 text-right">{tx.type === TradeType.BUY ? 'شراء' : 'بيع'}</td>
                                <td className="border p-2 text-right">{tx.status}</td>
                                <td className="border p-2 text-right">{tx.amount.toFixed(2)}</td>
                                <td className="border p-2 text-right">{tx.asset}</td>
                                <td className="border p-2 text-right">{tx.price.toFixed(2)} {tx.fiat}</td>
                                <td className="border p-2 text-right">{tx.totalPrice.toFixed(2)} {tx.fiat}</td>
                                <td className="border p-2 text-right">{tx.commission.toFixed(2)}</td>
                                <td className="border p-2 text-right">{tx.counterParty}</td>
                                <td className="border p-2 text-right">{tx.payMethod}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionHistory;
