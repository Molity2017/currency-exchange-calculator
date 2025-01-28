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

        try {
            console.log('جاري جلب سجل المعاملات...');
            const timestamp = Date.now();
            const params = {
                timestamp,
                recvWindow: 60000,
                tradeType: 'BUY,SELL',
                page: 1,
                rows: 100
            };
            
            console.log('إنشاء التوقيع...');
            const queryString = Object.entries(params)
                .map(([key, value]) => `${key}=${value}`)
                .join('&');
            const signature = this.generateSignature(queryString);
            
            console.log('إرسال الطلب إلى Binance API...');
            const url = `${this.baseUrl}/sapi/v1/c2c/orderMatch/listUserOrderHistory`;
            console.log('URL:', url);
            console.log('Query String:', queryString);
            console.log('Headers:', { 'X-MBX-APIKEY': '***' });
            console.log('Params:', { ...params, signature: '***' });

            const response = await axios.get(url, {
                headers: {
                    'X-MBX-APIKEY': this.config.apiKey,
                },
                params: {
                    ...params,
                    signature
                },
                timeout: 30000,
                validateStatus: (status) => status >= 200 && status < 300
            });

            console.log('تم استلام الرد:', {
                status: response.status,
                statusText: response.statusText,
                hasData: !!response.data,
                dataType: typeof response.data,
                isArray: Array.isArray(response.data),
                headers: response.headers
            });

            if (!response.data) {
                throw new Error('لم يتم استلام أي بيانات من السيرفر');
            }

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

        } catch (error) {
            console.error('تفاصيل الخطأ:', error);
            
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                console.error('معلومات الخطأ:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                    message: axiosError.message,
                    code: axiosError.code,
                    request: {
                        method: axiosError.config?.method,
                        url: axiosError.config?.url,
                        headers: axiosError.config?.headers,
                        params: axiosError.config?.params
                    }
                });

                if (axiosError.code === 'ECONNABORTED') {
                    throw new Error('انتهت مهلة الاتصال. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
                }
                
                if (axiosError.code === 'ERR_NETWORK') {
                    throw new Error('فشل الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
                }

                if (axiosError.response?.status === 401) {
                    throw new Error('خطأ في مفاتيح API - يرجى التحقق من صحتها');
                }
                
                if (axiosError.response?.status === 403) {
                    throw new Error('ليس لديك صلاحية للوصول إلى هذه البيانات');
                }

                if (axiosError.response?.status === 404) {
                    throw new Error('المسار المطلوب غير موجود. يرجى التحقق من صحة عنوان API');
                }

                const errorData = axiosError.response?.data as { msg?: string, message?: string };
                const errorMessage = errorData?.msg || errorData?.message || axiosError.message;
                throw new Error(`خطأ في الاتصال: ${errorMessage}`);
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error('حدث خطأ غير متوقع أثناء جلب البيانات');
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
