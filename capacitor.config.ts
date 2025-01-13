import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.albayaa.currencyexchange',
  appName: 'حاسبة تحويل العملات',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
