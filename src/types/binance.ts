// تعريف القيم المحتملة لحالة الطلب
export enum OrderStatus {
    ACCEPTED = 'ACCEPTED',
    CANCELLED = 'CANCELLED',
    CANCELLING = 'CANCELLING',
    CLOSING = 'CLOSING',
    DUPLICATE_CANCEL = 'DUPLICATE_CANCEL',
    ENDED = 'ENDED',
    FILLED = 'FILLED',
    NO_ORDER = 'NO_ORDER',
    OPEN = 'OPEN',
    REJECTED = 'REJECTED',
    UNKNOWN = 'UNKNOWN'
}

// تعريف أنواع المعاملات
export enum TradeType {
    BUY = 'BUY',
    SELL = 'SELL'
}

// واجهة لتكوين API
export interface BinanceConfig {
    apiKey: string;
    apiSecret: string;
}

// واجهة استجابة المعاملة من API
export interface BinanceApiTransaction {
    additionalKycVerify: number;
    advNo: string;
    advertisementRole: string;
    amount: string;
    asset: string;
    commission: number;
    counterPartNickName: string;
    createTime: string;
    fiat: string;
    fiatSymbol: string;
    orderNumber: string;
    orderStatus: OrderStatus;
    payMethodName: string;
    takerAmount: number;
    takerCommission: number;
    takerCommissionRate: number;
    totalPrice: string;
    tradeType: TradeType;
    unitPrice: number;
}

// واجهة استجابة API
export interface BinanceApiResponse {
    data: BinanceApiTransaction[];
}

// واجهة المعاملة المحولة للتطبيق
export interface BinanceTransaction {
    id: string;
    date: Date;
    type: TradeType;
    status: OrderStatus;
    amount: number;
    fiat: string;
    asset: string;
    price: number;
    totalPrice: number;
    commission: number;
    counterParty: string;
    payMethod: string;
}

// واجهة فلترة المعاملات
export interface TransactionFilters {
    type?: TradeType | 'ALL';
    minRate?: number;
    maxRate?: number;
}
