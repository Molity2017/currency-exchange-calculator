import { BinanceTransaction, BinanceConfig } from '../types/binance';
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
        const queryString = `timestamp=${timestamp}&recvWindow=60000&tradeType="BUY,SELL"&page=1&rows=100`;
        const signature = this.generateSignature(queryString);

        try {
            console.log('Sending request to Binance API:', {
                url: `${this.baseUrl}/v1/c2c/orderMatch/listUserOrderHistory`,
                timestamp,
                signature: signature.slice(0, 10) + '...'
            });

            const response = await axios.get(
                `${this.baseUrl}/v1/c2c/orderMatch/listUserOrderHistory?${queryString}&signature=${signature}`,
                {
                    headers: {
                        'X-MBX-APIKEY': this.config.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Response received:', {
                status: response.status,
                hasData: !!response.data,
                dataLength: response.data?.length
            });

            if (response.status === 200) {
                let transactionsData = response.data;
                
                if (response.data.data) {
                    transactionsData = response.data.data;
                    console.log('تم استخراج البيانات من حقل data');
                }

                if (!Array.isArray(transactionsData)) {
                    console.error('شكل البيانات المستلمة:', JSON.stringify(transactionsData, null, 2));
                    throw new Error('البيانات المستلمة ليست في الشكل المتوقع');
                }

                const transactions = this.transformTransactions(transactionsData);
                console.log(`تم تحويل ${transactions.length} معاملة بنجاح`);
                return transactions;
            }

            throw new Error('فشل في استرداد البيانات من Binance API');
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error('Binance API Error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                
                if (error.response?.status === 403) {
                    throw new Error('غير مصرح بالوصول. يرجى التحقق من صحة مفاتيح API');
                }

                if (error.response?.status === 404) {
                    throw new Error('المسار المطلوب غير موجود. يرجى التحقق من صحة عنوان API');
                }

                const errorData = error.response?.data as { msg?: string, message?: string };
                const errorMessage = errorData?.msg || errorData?.message || error.message;
                throw new Error(`خطأ في الاتصال: ${errorMessage}`);
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error('حدث خطأ غير متوقع أثناء الاتصال');
        }
    }

    private generateSignature(queryString: string): string {
        if (!this.config?.apiSecret) {
            throw new Error('API Secret غير موجود');
        }
        
        return CryptoJS.HmacSHA256(queryString, this.config.apiSecret).toString(CryptoJS.enc.Hex);
    }

    private transformTransactions(data: any[]): BinanceTransaction[] {
        if (!Array.isArray(data)) {
            console.warn('البيانات المستلمة ليست مصفوفة:', data);
            return [];
        }

        return data.map(transaction => {
            try {
                if (!transaction || typeof transaction !== 'object') {
                    throw new Error('معاملة غير صالحة');
                }

                console.log('معالجة المعاملة:', {
                    orderType: transaction.orderType,
                    fiatAmount: transaction.fiatAmount,
                    amount: transaction.amount,
                    price: transaction.price,
                    createTime: transaction.createTime
                });

                const egyptianAmount = parseFloat(transaction.fiatAmount || '0');
                const usdAmount = parseFloat(transaction.amount || '0');
                const price = parseFloat(transaction.price || '0');
                
                if (isNaN(egyptianAmount) || isNaN(usdAmount) || isNaN(price)) {
                    throw new Error('قيم غير صالحة للمبالغ');
                }

                if (!transaction.orderType || !['BUY', 'SELL'].includes(transaction.orderType.toUpperCase())) {
                    throw new Error('نوع معاملة غير صالح');
                }

                return {
                    date: new Date(transaction.createTime || Date.now()).toISOString(),
                    type: transaction.orderType.toUpperCase() as 'BUY' | 'SELL',
                    egyptianAmount,
                    usdAmount,
                    fees: parseFloat(transaction.commission || '0'),
                    effectiveRate: egyptianAmount / usdAmount,
                    binanceRate: price,
                    difference: (egyptianAmount / usdAmount) - price
                };
            } catch (error) {
                console.error('خطأ في معالجة المعاملة:', error, transaction);
                return null;
            }
        }).filter((tx): tx is BinanceTransaction => tx !== null);
    }
}

export const binanceService = new BinanceService();
