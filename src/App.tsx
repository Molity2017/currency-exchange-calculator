import { useState } from 'react';
import { read, utils } from 'xlsx';
import { exportToExcel } from './utils/excelExport';

interface CalculationResult {
  totalEGP: number;
  totalAED: number;
  repurchaseCost: number;
  merchantFee: number;
  netProfit: number;
  profitPercentage: number;
  requiredUSDT: number;
  companyProfitPercentage: number;
}

// واجهة البيانات المستوردة
interface ImportedRow {
  Reference: string;
  Created: string;
  'Mobile Number': string;
  Amount: string;
  'Voucher Amount': string;
  Rate: string;
  Status: string;
}

function App() {
  const [amounts, setAmounts] = useState<string>('');
  const [usdtEGPRate, setUsdtEGPRate] = useState<string>('');
  const [aedEGPRate, setAedEGPRate] = useState<string>('');
  const [usdtAEDRate, setUsdtAEDRate] = useState<string>('');
  const [merchantFeeRate, setMerchantFeeRate] = useState<string>('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  // إضافة حالة لتخزين البيانات المستوردة
  const [importedData, setImportedData] = useState<ImportedRow[]>([]);

  const calculateResults = () => {
    if (!amounts) return null;

    const lines = amounts.split('\n').filter(line => line.trim() !== '');
    const values = lines.map(line => parseFloat(line.replace(/,/g, '')));
    const validValues = values.filter(val => !isNaN(val));

    if (validValues.length === 0) {
      return {
        totalEGP: 0,
        totalAED: 0,
        count: 0
      };
    }

    const totalEGP = validValues.reduce((sum, val) => sum + val, 0);
    // تعديل معادلة حساب إجمالي الدراهم المطلوبة
    const totalAED = aedEGPRate ? totalEGP / parseFloat(aedEGPRate) : 0;

    const requiredUSDT = totalEGP / parseFloat(usdtEGPRate);
    const repurchaseCost = requiredUSDT * parseFloat(usdtAEDRate);
    // عمولة التاجر = (كمية USDT المطلوبة × عمولة التاجر بالجنيه) ÷ سعر AED/EGP
    const merchantFee = (requiredUSDT * parseFloat(merchantFeeRate)) / parseFloat(aedEGPRate);
    const netProfit = totalAED - repurchaseCost - merchantFee;
    // نسبة الربح = (عمولة التاجر + صافي الربح) / إجمالي الدراهم المطلوبة × 100
    const profitPercentage = ((merchantFee + netProfit) / repurchaseCost) * 100;
    // نسبة ربح الشركة = صافي الربح / إجمالي الدراهم المطلوبة × 100
    const companyProfitPercentage = (netProfit / repurchaseCost) * 100;

    setResult({
      totalEGP,
      totalAED,
      repurchaseCost,
      merchantFee,
      netProfit,
      profitPercentage,
      requiredUSDT,
      companyProfitPercentage
    });

    return {
      totalEGP,
      totalAED,
      count: validValues.length
    };
  };

  // دالة للبحث عن أعمدة المبالغ وتصنيفها
  const findAmountColumns = (data: any[]) => {
    if (!data || data.length === 0) return { largerAmountCol: null, smallerAmountCol: null, rateCol: null };

    const headers = Object.keys(data[0]);
    
    // البحث عن عمود سعر الصرف (درهم/مصري)
    const rateCol = headers.find(key => {
      const lower = key.toLowerCase();
      return (
        (lower.includes('aed') && lower.includes('egp')) ||
        (lower.includes('درهم') && lower.includes('مصري')) ||
        (lower.includes('درهم') && lower.includes('جنيه')) ||
        (lower.includes('rate') && !lower.includes('usdt'))
      );
    });

    // البحث عن الأعمدة التي تحتوي على "amount" أو "مبلغ"
    const amountColumns = headers.filter(key => {
      const lower = key.toLowerCase();
      return lower.includes('amount') || lower.includes('مبلغ');
    });

    let largerAmountCol = null;
    let smallerAmountCol = null;

    if (amountColumns.length === 1) {
      largerAmountCol = amountColumns[0];
    } else if (amountColumns.length >= 2) {
      // حساب متوسط المبالغ في كل عمود
      const averages = amountColumns.map(col => ({
        column: col,
        average: data.reduce((sum, row) => {
          const val = parseFloat(row[col]?.toString().replace(/,/g, '') || '0');
          return sum + (isNaN(val) ? 0 : val);
        }, 0) / data.length
      }));

      // ترتيب تنازلي - الأكبر للمصري والأصغر للدرهم
      averages.sort((a, b) => b.average - a.average);
      largerAmountCol = averages[0].column;
      smallerAmountCol = averages[1]?.column || null;
    }

    return { 
      egyptianCol: largerAmountCol,  // العمود ذو المبالغ الأكبر للمصري
      aedCol: smallerAmountCol,      // العمود ذو المبالغ الأصغر للدرهم
      rateCol 
    };
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // تنظيف البيانات القديمة
      setImportedData([]);
      setAmounts('');
      setResult(null);

      // قراءة الملف
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      try {
        const workbook = read(data, { type: 'array' });
        
        if (!workbook.SheetNames.length) {
          alert('الملف لا يحتوي على أي بيانات');
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = utils.sheet_to_json(firstSheet);

        if (!Array.isArray(rawData) || !rawData.length) {
          alert('لا توجد بيانات في الملف');
          return;
        }

        // البحث عن الأعمدة
        const { egyptianCol, aedCol, rateCol } = findAmountColumns(rawData);

        if (!egyptianCol) {
          alert('لم يتم العثور على عمود المبلغ المصري في الملف');
          return;
        }

        // تحويل البيانات
        const processedData: ImportedRow[] = rawData.map((row: any) => {
          // البحث عن التاريخ والوقت
          const dateValue = Object.entries(row).find(([key]) => 
            key.toLowerCase().includes('date') || 
            key.toLowerCase().includes('created') ||
            key.toLowerCase().includes('تاريخ')
          )?.[1]?.toString() || '';

          // البحث عن الرقم المرجعي
          const referenceValue = Object.entries(row).find(([key]) => 
            key.toLowerCase().includes('reference') || 
            key.toLowerCase().includes('ref') ||
            key.toLowerCase().includes('مرجع')
          )?.[1]?.toString() || '';

          // البحث عن رقم الموبايل
          const mobileValue = Object.entries(row).find(([key]) => 
            key.toLowerCase().includes('mobile') || 
            key.toLowerCase().includes('phone') ||
            key.toLowerCase().includes('موبايل') ||
            key.toLowerCase().includes('هاتف')
          )?.[1]?.toString() || '';

          return {
            Reference: referenceValue,
            Created: dateValue,
            'Mobile Number': mobileValue,
            Amount: aedCol ? row[aedCol]?.toString() || '' : '',
            'Voucher Amount': row[egyptianCol]?.toString() || '',
            Rate: rateCol ? row[rateCol]?.toString() || '' : '',
            Status: row['Status']?.toString() || ''
          };
        });

        // تنقية البيانات من صفوف الإجمالي
        const jsonData = processedData.filter(row => {
          const reference = String(row.Reference || '').toLowerCase();
          return !reference.includes('total') && 
                 !reference.includes('الإجمالي') &&
                 !reference.includes('اجمالي') &&
                 !reference.includes('المجموع');
        });

        setImportedData(jsonData);

        // تحديث حقل الإدخال بالمبالغ المصرية
        const amounts = jsonData
          .map(row => row['Voucher Amount'])
          .filter(amount => amount && !isNaN(parseFloat(amount)));

        if (amounts.length > 0) {
          setAmounts(amounts.join('\n'));
        } else {
          alert('لم يتم العثور على مبالغ صحيحة في الملف');
        }
      } catch (error) {
        console.error('خطأ في قراءة الملف:', error);
        alert('حدث خطأ أثناء قراءة الملف');
      }
    } catch (error) {
      console.error('خطأ في معالجة الملف:', error);
      alert('حدث خطأ أثناء معالجة الملف');
    }
    
    // تنظيف حقل الملف
    event.target.value = '';
  };

  const handleExport = () => {
    if (amounts) {
      const manualData: ImportedRow[] = amounts.split('\n')
        .map((amount, index) => ({
          Reference: `MANUAL-${index + 1}`,
          Created: new Date().toISOString(),
          'Mobile Number': '',
          Amount: '',
          'Voucher Amount': amount.trim(),
          Rate: aedEGPRate,
          Status: ''
        }));
      exportToExcel(amounts, importedData.length > 0 ? importedData : manualData);
    }
  };

  const handleClearMemory = () => {
    setImportedData([]);
    setAmounts('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="relative mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            حاسبة تحويل العملات
          </h1>
          <p className="text-gray-600">حاسبة دقيقة لتحويل وحساب العملات والعمولات</p>
        </div>
        
        <div className="relative bg-white backdrop-blur-sm bg-opacity-90 shadow-2xl rounded-2xl p-4 sm:p-8 lg:p-12 mx-auto border border-gray-100 mb-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* قسم الإدخال - يمين */}
              <div className="flex flex-col h-full space-y-6">
                <div>
                  <div className="relative">
                    <label className="block text-lg font-semibold text-gray-700 text-right mb-3">
                      المبالغ بالجنيه المصري
                    </label>
                    <textarea
                      value={amounts}
                      onChange={(e) => setAmounts(e.target.value)}
                      className="w-full h-32 sm:h-36 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-right shadow-sm resize-none"
                      placeholder="أدخل المبالغ هنا (كل مبلغ في سطر جديد)"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                      سعر USDT/EGP
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 51.85"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-right shadow-sm"
                      value={usdtEGPRate}
                      onChange={(e) => setUsdtEGPRate(e.target.value)}
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                      سعر AED/EGP
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 13.72"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-right shadow-sm"
                      value={aedEGPRate}
                      onChange={(e) => setAedEGPRate(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                      سعر USDT/AED
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 3.67"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-right shadow-sm"
                      value={usdtAEDRate}
                      onChange={(e) => setUsdtAEDRate(e.target.value)}
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                      عمولة التاجر (بالجنيه)
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 0.15"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-right shadow-sm"
                      value={merchantFeeRate}
                      onChange={(e) => setMerchantFeeRate(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6">
                  <div className="text-center mb-4">
                    <label className="inline-flex items-center px-6 py-2.5 bg-green-500 text-white rounded-xl cursor-pointer hover:bg-green-600 transition-all shadow-sm space-x-2 hover:scale-105 transform duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                      <span>رفع ملف Excel</span>
                    </label>
                  </div>

                  <button
                    onClick={calculateResults}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 sm:py-4 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all text-lg shadow-md hover:scale-[1.02] transform duration-200"
                  >
                    احسب النتائج
                  </button>
                </div>
              </div>

              {/* قسم النتائج - يسار */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6 rounded-2xl shadow-lg flex flex-col h-full border border-gray-100">
                {result ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">إجمالي المبلغ (جنيه)</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.totalEGP.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">كمية USDT المطلوبة</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.requiredUSDT.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">إجمالي الدراهم المطلوبة</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.totalAED.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">تكلفة إعادة الشراء (درهم)</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.repurchaseCost.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">عمولة التاجر (درهم)</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.merchantFee.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1">صافي الربح (درهم)</div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">{result.netProfit.toFixed(2)}</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1 text-green-800 font-bold">نسبة الربح النهائية</div>
                      <div className="text-lg sm:text-xl font-bold text-green-800">{result.profitPercentage.toFixed(2)}%</div>
                    </div>

                    <div className="text-right bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="text-gray-500 text-sm mb-1 text-blue-800 font-bold">نسبة ربح الشركة</div>
                      <div className="text-lg sm:text-xl font-bold text-blue-800">{result.companyProfitPercentage.toFixed(2)}%</div>
                    </div>

                    <div className="mt-4 col-span-2">
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleExport}
                          className="w-full bg-green-500 text-white py-2.5 px-6 rounded-xl font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-md hover:scale-[1.02] transform duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.293 6.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span>تصدير إلى Excel</span>
                        </button>

                        <button
                          onClick={handleClearMemory}
                          className="w-full bg-red-500 text-white py-2.5 px-6 rounded-xl font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-md hover:scale-[1.02] transform duration-200 flex items-center justify-center space-x-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2H9.382l-.724 1.447A1 1 0 0011 3.378V9a2 2 0 01-2 2z" clipRule="evenodd" />
                          </svg>
                          <span>مسح الذاكرة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 sm:h-16 w-12 sm:w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                      <p className="text-base sm:text-lg">النتائج ستظهر هنا بعد الحساب</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* زر تحميل التطبيق */}
        <div className="text-center mb-3">
          <a
            href="https://revune.netlify.app/Revune-E-Voucher.apk"
            download="Revune-E-Voucher.apk"
            className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="font-medium">تحميل التطبيق</span>
          </a>
        </div>

        {/* زر الواتساب */}
        <div className="text-center">
          <a
            href="https://wa.me/+201015415601"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.523 15.34l.418-2.183-1.165-.06c-5.423.247-9.252.749-9.252.749l-.146 1.86s3.164-.502 8.72-.502c.463 0 .882.005 1.425.135zm.419-3.579l.414-2.165-1.177-.06c-5.423.247-9.252.749-9.252.749l-.146 1.86s3.164-.502 8.72-.502c.463 0 .882.005 1.441.118zm-1.455-5.347l-1.214-.06c-5.423.247-9.252.749-9.252.749l-.146 1.86s3.164-.502 8.72-.502c.463 0 .882.005 1.425.135l.467-2.182zm4.963-2.039C19.929 1.723 16.256 0 12.207 0 5.618 0 0 5.618 0 12.207c0 6.589 5.618 12.207 12.207 12.207 6.589 0 12.207-5.618 12.207-12.207 0-1.511-.281-2.956-.792-4.286l-1.171 6.116c-.387 2.023-.704 3.687-3.136 3.687H9.505c-2.432 0-2.749-1.664-3.136-3.687L4.412 4.375h2.795l1.875 9.805c.149.781.32 1.289.938 1.289h8.227c.618 0 .789-.508.938-1.289l1.875-9.805h2.795l-1.405 7.34z"/>
            </svg>
            <span className="font-medium">تواصل معنا على واتساب</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;