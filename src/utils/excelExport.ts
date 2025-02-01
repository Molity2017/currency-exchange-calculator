import { utils, writeFile } from 'xlsx';

interface ImportedRow {
  Reference: string;
  Created: string;
  'Mobile Number': string;
  Amount: string;
  'Voucher Amount': string;
  Rate: string;
  Status: string;
}

interface ExportRow {
  'Reference': string;
  'Date': string;
  'Mobile Number': string;
  'AED Amount': number | string;
  'EGP Amount': number | string;
  'AED / EGP': number | string;
  'USDT': string;
  'USDT Rate': string;
}

export const exportToExcel = (_amounts: string, importedData: ImportedRow[]) => {
  if (!importedData || importedData.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  try {
    // تحضير البيانات للتصدير
    const rows: ExportRow[] = importedData.map(row => {
      // تنظيف المبالغ من الفواصل والمسافات
      const aedAmount = parseFloat(row.Amount?.toString().replace(/,/g, '') || '0');
      const egpAmount = parseFloat(row['Voucher Amount']?.toString().replace(/,/g, '') || '0');
      const rate = parseFloat(row.Rate?.toString().replace(/,/g, '') || '0');

      return {
        'Reference': row.Reference || '',
        'Date': row.Created || '',
        'Mobile Number': row['Mobile Number'] || '',
        'AED Amount': isNaN(aedAmount) ? '' : aedAmount,
        'EGP Amount': isNaN(egpAmount) ? '' : egpAmount,
        'AED / EGP': isNaN(rate) ? '' : rate,
        'USDT': '',
        'USDT Rate': ''
      };
    });

    // إضافة صف الإجمالي
    const totalRow: ExportRow = {
      'Reference': 'Total',
      'Date': '',
      'Mobile Number': '',
      'AED Amount': rows.reduce((sum, row) => {
        const val = typeof row['AED Amount'] === 'number' ? row['AED Amount'] : 0;
        return sum + val;
      }, 0),
      'EGP Amount': rows.reduce((sum, row) => {
        const val = typeof row['EGP Amount'] === 'number' ? row['EGP Amount'] : 0;
        return sum + val;
      }, 0),
      'AED / EGP': rows.find(row => typeof row['AED / EGP'] === 'number')?.['AED / EGP'] || '',
      'USDT': '',
      'USDT Rate': ''
    };

    rows.push(totalRow);

    // إنشاء ورقة عمل جديدة
    const worksheet = utils.json_to_sheet(rows, {
      header: [
        'Reference',
        'Date',
        'Mobile Number',
        'AED Amount',
        'EGP Amount',
        'AED / EGP',
        'USDT',
        'USDT Rate'
      ]
    });

    // إنشاء الملف
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // حفظ الملف
    writeFile(workbook, 'transactions.xlsx');
  } catch (error) {
    console.error('خطأ في تصدير الملف:', error);
    alert('حدث خطأ أثناء تصدير الملف');
  }
};
