export interface BinanceConfig {
    apiKey: string;
    apiSecret: string;
}

export interface BinanceTransaction {
    date: string;
    type: 'BUY' | 'SELL';
    egyptianAmount: number;
    usdAmount: number;
    fees: number;
    effectiveRate: number;
    binanceRate: number;
    difference: number;
}

export interface BinanceApiResponse {
    data: {
        orderType: string;
        fiatAmount: string;
        amount: string;
        price: string;
        commission?: string;
        createTime: number;
    }[];
}

export interface TransactionFilters {
    type?: 'BUY' | 'SELL' | 'ALL';
    minRate?: number;
    maxRate?: number;
}
