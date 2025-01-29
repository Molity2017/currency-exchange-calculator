// تعريف القيم المحتملة لحالة الطلب
export const OrderStatus = {
    ACCEPTED: 'ACCEPTED',
    CANCELLED: 'CANCELLED',
    CANCELLING: 'CANCELLING',
    CLOSING: 'CLOSING',
    DUPLICATE_CANCEL: 'DUPLICATE_CANCEL',
    ENDED: 'ENDED',
    FILLED: 'FILLED',
    NO_ORDER: 'NO_ORDER',
    OPEN: 'OPEN',
    REJECTED: 'REJECTED',
    UNKNOWN: 'UNKNOWN'
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

// تعريف أنواع المعاملات
export const TradeType = {
    BUY: 'BUY',
    SELL: 'SELL'
} as const;

export type TradeType = typeof TradeType[keyof typeof TradeType];

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
    success: boolean;
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
