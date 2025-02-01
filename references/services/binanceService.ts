import { BinanceTransaction, BinanceConfig, BinanceApiTransaction, BinanceApiResponse, TradeType, OrderStatus } from '../types/binance';
import axios, { AxiosError } from 'axios';
import CryptoJS from 'crypto-js';

class BinanceService {
    private config: BinanceConfig | null = null;
    private baseUrl = '/binance-api';  // استخدام الـ proxy

    setConfig(config: BinanceConfig) {
        if (!config.apiKey || !config.apiSecret) {
            throw new Error('يجب توفير كل من API Key و API Secret');
        }
        this.config = config;
        console.log('تم إعداد مفاتيح API بنجاح');
    }

    async getTransactionHistory(): Promise<BinanceTransaction[]> {
        if (!this.config) {
            throw new Error('يرجى إعداد مفاتيح API أولاً');
        }

        const timestamp = Date.now();
        const queryParams = {
            timestamp,
            recvWindow: 60000,
            page: 1,
            rows: 100,
            tradeType: `${TradeType.BUY},${TradeType.SELL}`
        };

        const queryString = Object.entries(queryParams)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        const signature = this.generateSignature(queryString);

        try {
            console.log('إرسال طلب إلى Binance API:', {
                baseUrl: this.baseUrl,
                endpoint: '/sapi/v1/c2c/orderMatch/listUserOrderHistory',
                timestamp,
                signature: signature.slice(0, 10) + '...'
            });

            const response = await axios.get<BinanceApiResponse>(
                `${this.baseUrl}/sapi/v1/c2c/orderMatch/listUserOrderHistory?${queryString}&signature=${signature}`,
                {
                    headers: {
                        'X-MBX-APIKEY': this.config.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200 && response.data?.data) {
                const transactions = this.transformTransactions(response.data.data);
                console.log(`تم تحويل ${transactions.length} معاملة بنجاح`);
                return transactions;
            }

            throw new Error('فشل في استرداد البيانات من Binance API');
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error('خطأ في Binance API:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });

                if (error.response?.status === 403) {
                    throw new Error('غير مصرح بالوصول. يرجى التحقق من صحة مفاتيح API');
                }

                const errorData = error.response?.data as { msg?: string, message?: string };
                const errorMessage = errorData?.msg || errorData?.message || error.message;
                throw new Error(`خطأ في الاتصال: ${errorMessage}`);
            }

            throw error;
        }
    }

    private generateSignature(queryString: string): string {
        if (!this.config?.apiSecret) {
            throw new Error('API Secret غير موجود');
        }
        
        return CryptoJS.HmacSHA256(queryString, this.config.apiSecret).toString(CryptoJS.enc.Hex);
    }

    private transformTransactions(apiTransactions: any[]): BinanceTransaction[] {
        return apiTransactions.map(transaction => {
            try {
                // تحويل نوع المعاملة
                const rawTradeType = String(transaction.tradeType || '').toUpperCase();
                if (!rawTradeType || ![TradeType.BUY, TradeType.SELL].includes(rawTradeType as TradeType)) {
                    console.warn('نوع معاملة غير صالح:', rawTradeType);
                    return null;
                }

                // تحويل حالة الطلب
                const rawOrderStatus = String(transaction.orderStatus || '').toUpperCase();
                if (!rawOrderStatus || !Object.values(OrderStatus).includes(rawOrderStatus as OrderStatus)) {
                    console.warn('حالة طلب غير صالحة:', rawOrderStatus);
                    return null;
                }

                // تحويل التاريخ
                const createTime = transaction.createTime ? new Date(transaction.createTime) : new Date();
                if (isNaN(createTime.getTime())) {
                    console.warn('تاريخ غير صالح:', transaction.createTime);
                    return null;
                }

                // تحويل القيم العددية
                const amount = parseFloat(transaction.amount || '0');
                const price = parseFloat(String(transaction.unitPrice || '0'));
                const totalPrice = parseFloat(transaction.totalPrice || '0');
                const commission = parseFloat(String(transaction.commission || '0'));

                if (isNaN(amount) || isNaN(price) || isNaN(totalPrice) || isNaN(commission)) {
                    console.warn('قيم عددية غير صالحة في المعاملة:', {
                        amount,
                        price,
                        totalPrice,
                        commission
                    });
                    return null;
                }

                return {
                    id: transaction.orderNumber || String(Date.now()),
                    date: createTime,
                    type: rawTradeType as TradeType,
                    status: rawOrderStatus as OrderStatus,
                    amount,
                    fiat: transaction.fiat || 'EGP',
                    asset: transaction.asset || 'USDT',
                    price,
                    totalPrice,
                    commission,
                    counterParty: transaction.counterPartNickName || '',
                    payMethod: transaction.payMethodName || ''
                };
            } catch (error) {
                console.error('خطأ في تحويل المعاملة:', error);
                return null;
            }
        }).filter((tx): tx is BinanceTransaction => tx !== null);
    }
}

export const binanceService = new BinanceService();
