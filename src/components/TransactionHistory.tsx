import React, { useEffect, useState } from 'react';
import { binanceService } from '../services/binanceService';
import { BinanceTransaction, TransactionFilters } from '../types/binance';

interface ImportMetaEnv {
    readonly VITE_BINANCE_API_KEY: string;
    readonly VITE_BINANCE_API_SECRET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface TransactionHistoryProps {
    filters?: TransactionFilters;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ filters }) => {
    const [transactions, setTransactions] = useState<BinanceTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filtersState, setFiltersState] = useState<TransactionFilters>({
        type: 'ALL'
    });

    useEffect(() => {
        const initializeBinanceService = () => {
            const apiKey = import.meta.env.VITE_BINANCE_API_KEY;
            const apiSecret = import.meta.env.VITE_BINANCE_API_SECRET;
            
            console.log('Environment Variables Check:', {
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
                if (data.length === 0) {
                    setError('لم يتم العثور على معاملات');
                } else {
                    setTransactions(data);
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
        if (filtersState.type && filtersState.type !== 'ALL' && tx.type !== filtersState.type) return false;
        if (filtersState.minRate && tx.effectiveRate < filtersState.minRate) return false;
        if (filtersState.maxRate && tx.effectiveRate > filtersState.maxRate) return false;
        return true;
    });

    const retryLoading = () => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await binanceService.getTransactionHistory();
                if (data.length === 0) {
                    setError('لم يتم العثور على معاملات');
                } else {
                    setTransactions(data);
                }
            } catch (err) {
                console.error('خطأ في تحميل المعاملات:', err);
                setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFiltersState({...filtersState, type: e.target.value as 'BUY' | 'SELL' | 'ALL'});
    };

    if (loading) {
        return (
            <div className="text-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p>جاري تحميل المعاملات...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600">{error}</p>
                </div>
                <button 
                    onClick={retryLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4 text-right">سجل المعاملات</h2>
            
            {/* Filters */}
            <div className="mb-4 flex gap-4 justify-end">
                <select 
                    className="border p-2 rounded"
                    value={filtersState.type}
                    onChange={handleFilterChange}>
                    <option value="ALL">كل المعاملات</option>
                    <option value="BUY">شراء</option>
                    <option value="SELL">بيع</option>
                </select>
            </div>

            {filteredTransactions.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                    لا توجد معاملات للعرض
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-right">التاريخ</th>
                                <th className="border p-2 text-right">النوع</th>
                                <th className="border p-2 text-right">المبلغ (جنيه)</th>
                                <th className="border p-2 text-right">المبلغ (USDT)</th>
                                <th className="border p-2 text-right">الريت الفعلي</th>
                                <th className="border p-2 text-right">ريت بينانس</th>
                                <th className="border p-2 text-right">الفرق</th>
                                <th className="border p-2 text-right">الرسوم</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((tx, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border p-2 text-right">{new Date(tx.date).toLocaleString('ar-EG')}</td>
                                    <td className="border p-2 text-right">{tx.type === 'BUY' ? 'شراء' : 'بيع'}</td>
                                    <td className="border p-2 text-right">{tx.egyptianAmount.toFixed(2)}</td>
                                    <td className="border p-2 text-right">{tx.usdAmount.toFixed(2)}</td>
                                    <td className="border p-2 text-right">{tx.effectiveRate.toFixed(2)}</td>
                                    <td className="border p-2 text-right">{tx.binanceRate.toFixed(2)}</td>
                                    <td className="border p-2 text-right">{tx.difference.toFixed(2)}</td>
                                    <td className="border p-2 text-right">{tx.fees.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
