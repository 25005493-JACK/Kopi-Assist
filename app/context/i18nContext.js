'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Nav & General
    dashboard: 'Dashboard Overview',
    dataManagement: 'Data Management',
    anomalyPrediction: 'Anomaly & Prediction',
    uploadData: 'Upload Data',
    eInvoice: 'E-Invoice',
    annualReport: 'Annual Report',
    logout: 'Logout',
    welcomeBack: 'Welcome back',
    snapshot: "here's your financial snapshot",
    quickActions: 'Quick Actions',
    mainMenu: 'Main Menu',

    // Summary Cards
    annualSummary: 'Annual Summary',
    monthlySummary: 'Monthly Summary',
    annualIncome: 'Annual Income',
    annualExpenses: 'Annual Expenses',
    annualNetFlow: 'Annual Net Flow',
    allTimeTransactions: 'All-Time Transactions',
    monthlyIncome: 'Monthly Income',
    monthlyExpenses: 'Monthly Expenses',
    monthlyNetFlow: 'Monthly Net Flow',
    monthlyTransactions: 'Monthly Transactions',
    totalRecords: 'Total Records',
    positiveFlow: 'Positive flow',
    negativeFlow: 'Negative flow',
    allTimeEntries: 'All-time entries',
    entriesThisMonth: 'Entries in this month',
    transactionsCount: 'transactions',

    // Sections
    cashFlowChartTitle: 'Monthly Cash Flow',
    aiRecommendationsTitle: 'AI Recommendations',
    chatbotTitle: 'Kopi Assist AI',
    askChatbotPlaceholder: 'Ask about your finances...',
    noDataYet: 'No financial data yet. Upload data to see charts.',
    noRecsYet: 'Upload financial data to get AI-powered recommendations.',
    analyzingData: 'Analyzing your data...',

    // Data Management
    opFinDataTitle: 'Operational & Financial Data Management',
    opFinDataDesc: 'Upload, manage, and generate financial documents',
    uploadFinDataTitle: 'Upload Financial Data',
    dragDropText: 'Drag & drop your file here, or click to browse',
    uploadHint: 'Supports CSV, TXT, PNG, JPG, PDF — AI will extract financial data automatically',
    processingFile: 'Processing file... Extracting financial data...',
    financialRecordsTitle: 'Financial Records',
    showingLatest: 'Showing latest 50 of {count} records',
    noRecordsYet: 'No financial data yet. Upload a CSV, TXT, or image to get started.',
    tblDate: 'Date',
    tblType: 'Type',
    tblCategory: 'Category',
    tblAmount: 'Amount (RM)',
    tblDescription: 'Description',
    tblSource: 'Source',

    // E-Invoice
    eInvoiceTitle: 'E-Invoice Generator',
    clientName: 'Client Name',
    clientAddress: 'Client Address',
    lineItems: 'Line Items',
    itemDesc: 'Description',
    itemQty: 'Qty',
    itemPrice: 'Unit Price (RM)',
    itemTotal: 'Total',
    taxRate: 'Tax Rate (%)',
    invoiceNotes: 'Notes',
    invoiceNotesPlaceholder: 'Payment terms, etc.',
    generatePdfBtn: 'Generate & Download PDF',
    generatingPdfBtn: 'Generating...',
    addItemBtn: '+ Add Item',

    // Annual Report
    annualReportTitle: 'Annual Financial Report',
    annualReportDesc: 'Generate a comprehensive AI-powered financial report based on all your company data.',
    generateReportBtn: 'Generate Annual Report',
    generatingReportBtn: 'Generating Report...',
    downloadPdfReportBtn: 'Download PDF Report',

    // Anomaly & Prediction
    anomalyHeaderTitle: 'Anomaly Detection & Incident Prediction',
    anomalyHeaderDesc: 'AI-powered analysis of financial anomalies and risk scenarios',
    tabAnomaly: 'Anomaly Detection',
    tabPrediction: 'Incident Prediction',
    runAnalysisBtn: 'Run Analysis',
    scanningBtn: 'Scanning...',
    predictingBtn: 'Predicting...',
    runPredictionsBtn: 'Run Predictions',
    anomalyDesc: 'Detect unusual expenses, suspicious employee claims, duplicate transactions, duplicate voucher serial numbers, and irregular spending patterns.',
    predictDesc: 'Simulate how your business cashflow would be impacted under different scenarios (CNY/Festive peak, MCO lockdowns, economic recession, supply chain stuns, or retail platform downtimes) and get automated strategic recommendations.',
    scanSuccess: 'No anomalies detected!',
    scanSuccessDesc: 'Your financial records look clean.',
    flaggedItems: 'Flagged Items',
    recommendedActions: 'Recommended Actions',
    projectedCashFlow: 'Projected Cash Flow',
    
    // Auth / Login / Register
    signIn: 'Sign In',
    register: 'Register',
    createAccount: 'Create Account',
    headcountLabel: 'Headcount',
    industryLabel: 'Industry',
    avgRevenueLabel: 'Avg Monthly Revenue (RM)',
    numOutletsLabel: 'Number of Branches/Outlets',
    companyPlaceholder: 'Enter company name',
    passwordPlaceholder: 'Enter password',
    processingAuth: 'Processing...',
    menuUploadLabel: 'Upload Menu File (Required)',
    menuUploadHint: 'Supports CSV, TXT, PDF, PNG, JPG — AI will extract menu items automatically',
  },
  bm: {
    // Nav & General
    dashboard: 'Papan Pemuka',
    dataManagement: 'Pengurusan Data',
    anomalyPrediction: 'Anomali & Ramalan',
    uploadData: 'Muat Naik Data',
    eInvoice: 'E-Invois',
    annualReport: 'Laporan Tahunan',
    logout: 'Log Keluar',
    welcomeBack: 'Selamat kembali',
    snapshot: 'ini adalah ringkasan kewangan anda',
    quickActions: 'Tindakan Pantas',
    mainMenu: 'Menu Utama',

    // Summary Cards
    annualSummary: 'Ringkasan Tahunan',
    monthlySummary: 'Ringkasan Bulanan',
    annualIncome: 'Pendapatan Tahunan',
    annualExpenses: 'Perbelanjaan Tahunan',
    annualNetFlow: 'Aliran Bersih Tahunan',
    allTimeTransactions: 'Semua Transaksi',
    monthlyIncome: 'Pendapatan Bulanan',
    monthlyExpenses: 'Perbelanjaan Bulanan',
    monthlyNetFlow: 'Aliran Bersih Bulanan',
    monthlyTransactions: 'Transaksi Bulanan',
    totalRecords: 'Jumlah Rekod',
    positiveFlow: 'Aliran positif',
    negativeFlow: 'Aliran negatif',
    allTimeEntries: 'Semua entri',
    entriesThisMonth: 'Entri bulan ini',
    transactionsCount: 'transaksi',

    // Sections
    cashFlowChartTitle: 'Aliran Tunai Bulanan',
    aiRecommendationsTitle: 'Syor AI',
    chatbotTitle: 'Kopi Assist AI',
    askChatbotPlaceholder: 'Tanya tentang kewangan anda...',
    noDataYet: 'Tiada data kewangan lagi. Muat naik data untuk melihat carta.',
    noRecsYet: 'Muat naik data kewangan untuk mendapatkan syor dikuasakan AI.',
    analyzingData: 'Menganalisis data anda...',

    // Data Management
    opFinDataTitle: 'Pengurusan Data Operasi & Kewangan',
    opFinDataDesc: 'Muat naik, urus, dan jana dokumen kewangan',
    uploadFinDataTitle: 'Muat Naik Data Kewangan',
    dragDropText: 'Seret & lepaskan fail anda di sini, atau klik untuk memilih',
    uploadHint: 'Menyokong CSV, TXT, PNG, JPG, PDF — AI akan mengekstrak data kewangan secara automatik',
    processingFile: 'Memproses fail... Mengekstrak data kewangan...',
    financialRecordsTitle: 'Rekod Kewangan',
    showingLatest: 'Menunjukkan 50 terbaharu daripada {count} rekod',
    noRecordsYet: 'Tiada data kewangan lagi. Muat naik CSV, TXT, atau imej untuk bermula.',
    tblDate: 'Tarikh',
    tblType: 'Jenis',
    tblCategory: 'Kategori',
    tblAmount: 'Jumlah (RM)',
    tblDescription: 'Penerangan',
    tblSource: 'Sumber',

    // E-Invoice
    eInvoiceTitle: 'Penjana E-Invois',
    clientName: 'Nama Pelanggan',
    clientAddress: 'Alamat Pelanggan',
    lineItems: 'Item Barisan',
    itemDesc: 'Penerangan',
    itemQty: 'Kuantiti',
    itemPrice: 'Harga Unit (RM)',
    itemTotal: 'Jumlah',
    taxRate: 'Kadar Cukai (%)',
    invoiceNotes: 'Nota',
    invoiceNotesPlaceholder: 'Syarat pembayaran, dll.',
    generatePdfBtn: 'Jana & Muat Turun PDF',
    generatingPdfBtn: 'Menjana...',
    addItemBtn: '+ Tambah Item',

    // Annual Report
    annualReportTitle: 'Laporan Kewangan Tahunan',
    annualReportDesc: 'Jana laporan kewangan komprehensif dikuasakan AI berdasarkan semua data syarikat anda.',
    generateReportBtn: 'Jana Laporan Tahunan',
    generatingReportBtn: 'Menjana Laporan Tahunan...',
    downloadPdfReportBtn: 'Muat Turun Laporan PDF',

    // Anomaly & Prediction
    anomalyHeaderTitle: 'Pengesanan Anomali & Ramalan Insiden',
    anomalyHeaderDesc: 'Analisis anomali kewangan dan senario risiko dikuasakan AI',
    tabAnomaly: 'Pengesanan Anomali',
    tabPrediction: 'Ramalan Insiden',
    runAnalysisBtn: 'Jalankan Analisis',
    scanningBtn: 'Mengimbas...',
    predictingBtn: 'Meramal...',
    runPredictionsBtn: 'Jalankan Ramalan',
    anomalyDesc: 'Kesan perbelanjaan luar biasa, tuntutan pekerja yang mencurigakan, transaksi pendua, nombor siri baucar pendua, dan corak perbelanjaan tidak teratur.',
    predictDesc: 'Simulasikan bagaimana aliran tunai perniagaan anda akan terjejas di bawah pelbagai senario (kemuncak perayaan, perintah kawalan pergerakan, kemelesetan ekonomi, gangguan rantaian bekalan, atau kegagalan platform) dan dapatkan syor strategik automatik.',
    scanSuccess: 'Tiada anomali dikesan!',
    scanSuccessDesc: 'Rekod kewangan anda kelihatan bersih.',
    flaggedItems: 'Item Ditandakan',
    recommendedActions: 'Tindakan Disyorkan',
    projectedCashFlow: 'Projeksi Aliran Tunai',

    // Auth / Login / Register
    signIn: 'Log Masuk',
    register: 'Daftar',
    createAccount: 'Daftar Akaun',
    headcountLabel: 'Bilangan Pekerja',
    industryLabel: 'Industri',
    avgRevenueLabel: 'Purata Pendapatan Bulanan (RM)',
    numOutletsLabel: 'Bilangan Cawangan/Outlet',
    companyPlaceholder: 'Masukkan nama syarikat',
    passwordPlaceholder: 'Masukkan kata laluan',
    processingAuth: 'Memproses...',
    menuUploadLabel: 'Muat Naik Fail Menu (Wajib)',
    menuUploadHint: 'Menyokong CSV, TXT, PDF, PNG, JPG — AI akan mengekstrak item menu secara automatik',
  },
  zh: {
    // Nav & General
    dashboard: '仪表板概览',
    dataManagement: '数据管理',
    anomalyPrediction: '异常与预测',
    uploadData: '上传数据',
    eInvoice: '电子发票',
    annualReport: '年度报告',
    logout: '退出登录',
    welcomeBack: '欢迎回来',
    snapshot: '这是您的财务简报',
    quickActions: '快捷操作',
    mainMenu: '主菜单',

    // Summary Cards
    annualSummary: '年度摘要',
    monthlySummary: '月度摘要',
    annualIncome: '年收入',
    annualExpenses: '年支出',
    annualNetFlow: '年净现金流',
    allTimeTransactions: '历史交易总数',
    monthlyIncome: '月收入',
    monthlyExpenses: '月支出',
    monthlyNetFlow: '月净现金流',
    monthlyTransactions: '月交易笔数',
    totalRecords: '总记录数',
    positiveFlow: '正现金流',
    negativeFlow: '负现金流',
    allTimeEntries: '历史总账目数',
    entriesThisMonth: '本月账目数',
    transactionsCount: '交易笔数',

    // Sections
    cashFlowChartTitle: '月度现金流',
    aiRecommendationsTitle: 'AI 财务建议',
    chatbotTitle: 'Kopi Assist AI',
    askChatbotPlaceholder: '咨询您的财务问题...',
    noDataYet: '暂无财务数据。请上传数据以查看图表。',
    noRecsYet: '上传财务数据以获取 AI 智能财务建议。',
    analyzingData: '正在分析您的数据...',

    // Data Management
    opFinDataTitle: '运营与财务数据管理',
    opFinDataDesc: '上传、管理和生成财务文件',
    uploadFinDataTitle: '上传财务数据',
    dragDropText: '将文件拖拽到此处，或点击浏览',
    uploadHint: '支持 CSV、TXT、PNG、JPG、PDF 文件 — AI 将自动提取财务数据',
    processingFile: '正在处理文件... 正在提取财务数据...',
    financialRecordsTitle: '财务记录',
    showingLatest: '显示最新的 50 条账目（共 {count} 条）',
    noRecordsYet: '暂无财务数据。请上传 CSV、TXT 或图片开始。',
    tblDate: '日期',
    tblType: '类型',
    tblCategory: '类别',
    tblAmount: '金额 (RM)',
    tblDescription: '描述',
    tblSource: '来源',

    // E-Invoice
    eInvoiceTitle: '电子发票生成器',
    clientName: '客户名称',
    clientAddress: '客户地址',
    lineItems: '商品清单',
    itemDesc: '描述',
    itemQty: '数量',
    itemPrice: '单价 (RM)',
    itemTotal: '总计',
    taxRate: '税率 (%)',
    invoiceNotes: '备注',
    invoiceNotesPlaceholder: '付款条件等',
    generatePdfBtn: '生成并下载 PDF 发票',
    generatingPdfBtn: '正在生成...',
    addItemBtn: '+ 添加商品',

    // Annual Report
    annualReportTitle: '年度财务报告',
    annualReportDesc: '根据您的所有公司数据生成一份由 AI 驱动的全面年度财务报告。',
    generateReportBtn: '生成年度报告',
    generatingReportBtn: '正在生成年度报告...',
    downloadPdfReportBtn: '下载 PDF 报告',

    // Anomaly & Prediction
    anomalyHeaderTitle: '异常检测与事件预测',
    anomalyHeaderDesc: 'AI 驱动的财务异常分析和风险场景预测',
    tabAnomaly: '异常检测',
    tabPrediction: '事件预测',
    runAnalysisBtn: '运行分析',
    scanningBtn: '扫描中...',
    predictingBtn: '预测中...',
    runPredictionsBtn: '运行预测',
    anomalyDesc: '检测异常支出、可疑员工报销、重复交易以及不规则消费模式。',
    predictDesc: '模拟您的业务现金流在不同场景（节日高峰、行动管制令锁国、经济衰退、供应链中断或零售平台瘫痪）下的受损情况，并获取自动化的应对战略建议。',
    scanSuccess: '未检测到异常！',
    scanSuccessDesc: '您的财务记录非常健康。',
    flaggedItems: '标记项目',
    recommendedActions: '推荐对策',
    projectedCashFlow: '预测现金流趋势',

    // Auth / Login / Register
    signIn: '登录',
    register: '注册',
    createAccount: '创建账户',
    headcountLabel: '员工人数',
    industryLabel: '行业分类',
    avgRevenueLabel: '平均月营业额 (RM)',
    numOutletsLabel: '分店/出口数量',
    companyPlaceholder: '输入公司名称',
    passwordPlaceholder: '输入密码',
    processingAuth: '处理中...',
    menuUploadLabel: '上传菜单文件 (必填)',
    menuUploadHint: '支持 CSV、TXT、PDF、PNG、JPG — AI 将自动提取菜单项目',
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const stored = localStorage.getItem('sme_lang');
    if (stored && ['en', 'bm', 'zh'].includes(stored)) {
      setLang(stored);
    }
  }, []);

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('sme_lang', l);
  };

  const t = (key, params = {}) => {
    let str = translations[lang]?.[key] || translations['en']?.[key] || key;
    Object.keys(params).forEach(p => {
      str = str.replace(`{${p}}`, params[p]);
    });
    return str;
  };

  return (
    <I18nContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
