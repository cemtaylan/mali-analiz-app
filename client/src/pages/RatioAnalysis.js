import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BalanceSheetAPI, CompanyAPI } from '../api';
import ModernAlert from '../components/ModernAlert';

// Türkçe sayı formatını parse etme fonksiyonu
const parseNumericValue = (value) => {
  if (!value || value === '-') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return 0;
};

const RatioAnalysis = () => {
  // State'ler
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableBalances, setAvailableBalances] = useState([]);
  const [selectedBalances, setSelectedBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false });
  
  // Oransal analiz verileri
  const [ratios, setRatios] = useState({
    liquidity: [],
    structure: [],
    profitability: [],
    efficiency: []
  });
  const [columnHeaders, setColumnHeaders] = useState([]);

  // Şirketleri API'den çek
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      const companiesData = await CompanyAPI.getAllCompanies();
      setCompanies(companiesData);
      
    } catch (error) {
      console.error('Şirketler yüklenirken hata:', error);
      setApiError('API bağlantısı kurulamadı. Demo modda çalışılıyor.');
      
      const demoCompanies = [
        { id: 1, name: "ABC Şirketi", tax_number: "1234567890" },
        { id: 2, name: "XYZ Holding", tax_number: "0987654321" },
        { id: 3, name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", tax_number: "6140087281" }
      ];
      setCompanies(demoCompanies);
      
    } finally {
      setLoading(false);
    }
  }, []);

  // Bilançoları API'den çek
  const fetchBalanceSheets = useCallback(async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      setApiError(null);
      
      const balanceSheetsData = await BalanceSheetAPI.getAllBalanceSheets();
      const companyBalances = balanceSheetsData.filter(b => 
        b.company_name === selectedCompany || 
        b.company_id === companies.find(c => c.name === selectedCompany)?.id
      );
      
      if (companyBalances.length === 0) {
        setAlertConfig({
          isOpen: true,
          type: 'warning',
          title: 'Bilanço Bulunamadı',
          message: 'Seçilen şirket için bilanço bulunamadı.',
          onClose: () => setAlertConfig({ isOpen: false })
        });
        setAvailableBalances([]);
        return;
      }
      
      setAvailableBalances(companyBalances);
      setSelectedBalances([]);
      setShowResults(false);
      
    } catch (error) {
      console.error('Bilançolar yüklenirken hata:', error);
      setApiError('Bilanço verileri alınamadı.');
      
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, companies]);

  // İlk yükleme
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Şirket seçimi değiştiğinde bilançoları güncelle
  useEffect(() => {
    if (selectedCompany) {
      fetchBalanceSheets();
    }
  }, [selectedCompany, fetchBalanceSheets]);

  // Bilanço seçimi işlemi
  const handleBalanceSelection = (balance, isSelected) => {
    if (isSelected) {
      if (selectedBalances.length < 5) {
        setSelectedBalances([...selectedBalances, balance]);
      }
    } else {
      setSelectedBalances(selectedBalances.filter(b => b.id !== balance.id));
    }
  };

  // Finansal oranları hesapla
  const calculateRatios = async () => {
    if (selectedBalances.length < 2) return;
    
    setLoading(true);
    
    try {
      console.log('🧮 Finansal oranlar hesaplanıyor...');
      
      // Kolon başlıkları oluştur
      const headers = selectedBalances.map(balance => `${balance.year}`);
      setColumnHeaders(headers);
      
      // Her bilanço için veri çek ve oranları hesapla
      const ratioData = {
        liquidity: [
          { name: 'Cari Oran', formula: 'Dönen Varlıklar / Kısa Vadeli Borçlar', sector: 1.8, values: {} },
          { name: 'Likidite Oranı (Asit-Test)', formula: '(Dönen Varlıklar - Stoklar) / Kısa Vadeli Borçlar', sector: 1.0, values: {} },
          { name: 'Nakit Oran', formula: '(Nakit + Menkul Kıymetler) / Kısa Vadeli Borçlar', sector: 0.15, values: {} }
        ],
        structure: [
          { name: 'Borç / Özkaynak Oranı', formula: 'Toplam Borçlar / Özkaynak', sector: 1.2, values: {} },
          { name: 'Toplam Borç / Toplam Varlık Oranı', formula: 'Toplam Borçlar / Toplam Varlıklar', sector: 0.55, values: {} },
          { name: 'Faiz Karşılama Oranı', formula: 'EBIT / Faiz Giderleri', sector: 7, values: {} }
        ],
        profitability: [
          { name: 'Brüt Kar Marjı', formula: '(Brüt Kar / Net Satışlar) × 100', sector: 28.0, values: {}, isPercentage: true },
          { name: 'Faaliyet Kar Marjı', formula: '(Faaliyet Karı / Net Satışlar) × 100', sector: 14.0, values: {}, isPercentage: true },
          { name: 'Net Kar Marjı', formula: '(Net Kar / Net Satışlar) × 100', sector: 9.0, values: {}, isPercentage: true },
          { name: 'ROA (Aktif Karlılık)', formula: '(Net Kar / Toplam Varlıklar) × 100', sector: 15.0, values: {}, isPercentage: true },
          { name: 'ROE (Özkaynak Karlılığı)', formula: '(Net Kar / Özkaynak) × 100', sector: 28.0, values: {}, isPercentage: true }
        ],
        efficiency: [
          { name: 'Stok Devir Hızı', formula: 'Satılan Malın Maliyeti / Ortalama Stok', sector: 4.5, values: {} },
          { name: 'Alacak Devir Hızı', formula: 'Net Satışlar / Ortalama Alacaklar', sector: 7.5, values: {} },
          { name: 'Borç Devir Hızı', formula: 'Satın Alımlar / Ortalama Ticari Borçlar', sector: 5.8, values: {} }
        ]
      };

      for (const balance of selectedBalances) {
        try {
          const balanceDetail = await BalanceSheetAPI.getBalanceSheetDetail(balance.id);
          console.log(`📊 Bilanço ${balance.year} analiz ediliyor...`);
          
          // Demo oranlar (gerçek uygulamada bilanço verilerinden hesaplanacak)
          const year = balance.year;
          
          // Likidite oranları
          ratioData.liquidity[0].values[year] = 1.5 + (Math.random() * 0.4 - 0.2); // Cari Oran
          ratioData.liquidity[1].values[year] = 0.7 + (Math.random() * 0.3 - 0.15); // Likidite Oranı
          ratioData.liquidity[2].values[year] = 0.05 + (Math.random() * 0.1); // Nakit Oran
          
          // Finansal yapı oranları
          ratioData.structure[0].values[year] = 1.4 + (Math.random() * 0.3 - 0.15); // Borç/Özkaynak
          ratioData.structure[1].values[year] = 0.55 + (Math.random() * 0.1 - 0.05); // Borç/Varlık
          ratioData.structure[2].values[year] = 5 + (Math.random() * 4); // Faiz Karşılama
          
          // Karlılık oranları (%)
          ratioData.profitability[0].values[year] = 26 + (Math.random() * 6 - 3); // Brüt Kar Marjı
          ratioData.profitability[1].values[year] = 13 + (Math.random() * 4 - 2); // Faaliyet Kar Marjı
          ratioData.profitability[2].values[year] = 8 + (Math.random() * 4 - 2); // Net Kar Marjı
          ratioData.profitability[3].values[year] = 12 + (Math.random() * 6 - 3); // ROA
          ratioData.profitability[4].values[year] = 30 + (Math.random() * 8 - 4); // ROE
          
          // Verimlilik oranları
          ratioData.efficiency[0].values[year] = 4 + (Math.random() * 2 - 1); // Stok Devir
          ratioData.efficiency[1].values[year] = 7 + (Math.random() * 2 - 1); // Alacak Devir
          ratioData.efficiency[2].values[year] = 5 + (Math.random() * 2 - 1); // Borç Devir
          
        } catch (error) {
          console.error(`Bilanço ${balance.id} analiz edilirken hata:`, error);
        }
      }
      
      setRatios(ratioData);
      setShowResults(true);
      console.log('✅ Oransal analiz tamamlandı!');
      
    } catch (error) {
      console.error('Oransal analiz hatası:', error);
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Analiz Hatası',
        message: `Oransal analiz sırasında hata oluştu: ${error.message}`,
        onClose: () => setAlertConfig({ isOpen: false })
      });
    } finally {
      setLoading(false);
    }
  };

  // Gemini ile yorum al
  const getGeminiComment = async (ratioName, values, sectorAverage) => {
    try {
      setLoading(true);
      
      // Gemini API çağrısı burada yapılacak
      // Demo yorum döndür
      const demoComments = {
        'Cari Oran': 'Şirketin kısa vadeli borç ödeme yeteneği sektör ortalamasının altında. Likidite pozisyonunu güçlendirmek önerilir.',
        'Likidite Oranı (Asit-Test)': 'Stoklar çıkarıldığında likidite durumu daha net görülmekte. Hızlı nakde çevrilebilir varlıklar yetersiz.',
        'Nakit Oran': 'Nakit ve nakit benzeri varlıklar oranı düşük. Acil durumlarda likidite sıkıntısı yaşanabilir.',
        'Borç / Özkaynak Oranı': 'Finansal kaldıraç kullanımı sektör ortalamasının üzerinde. Risk seviyesi yüksek.',
        'Toplam Borç / Toplam Varlık Oranı': 'Varlıkların büyük kısmı borçla finanse edilmiş. Finansal risklere dikkat edilmeli.',
        'ROA (Aktif Karlılık)': 'Varlık kullanım verimliliği sektör ortalamasına yakın. İyileştirme alanları mevcut.',
        'ROE (Özkaynak Karlılığı)': 'Özkaynak karlılığı tatmin edici seviyede. Ortaklar için iyi getiri sağlanıyor.'
      };
      
      const comment = demoComments[ratioName] || `${ratioName} için analiz: Genel durumu değerlendirerek iyileştirme önerileri geliştirilebilir.`;
      
      setAlertConfig({
        isOpen: true,
        type: 'info',
        title: `${ratioName} - AI Yorumu`,
        message: comment,
        onClose: () => setAlertConfig({ isOpen: false })
      });
      
    } catch (error) {
      console.error('Gemini yorum hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Oran tablosu render etme
  const renderRatioTable = (categoryRatios, title, bgColor) => {
    if (!categoryRatios || categoryRatios.length === 0) return null;

    return (
      <div className={`bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200/50 mb-6`}>
        <div className={`px-6 py-4 ${bgColor}`}>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Finansal Oran
                </th>
                {columnHeaders.map(header => (
                  <th key={header} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Sektör Ort.
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  AI Yorum
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {categoryRatios.map((ratio, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{ratio.name}</div>
                      <div className="text-xs text-gray-500">{ratio.formula}</div>
                    </div>
                  </td>
                  {columnHeaders.map(header => {
                    const value = ratio.values[header];
                    const sectorValue = ratio.sector;
                    let colorClass = 'text-gray-900';
                    
                    if (value !== undefined && sectorValue !== undefined) {
                      if (ratio.name.includes('Borç') && value > sectorValue) {
                        colorClass = 'text-red-600 font-semibold';
                      } else if (!ratio.name.includes('Borç') && value < sectorValue * 0.8) {
                        colorClass = 'text-red-600 font-semibold';
                      } else if (!ratio.name.includes('Borç') && value > sectorValue * 1.1) {
                        colorClass = 'text-green-600 font-semibold';
                      }
                    }
                    
                    return (
                      <td key={header} className={`px-6 py-4 text-center text-sm ${colorClass}`}>
                        {value !== undefined ? (
                          ratio.isPercentage ? 
                            `${value.toFixed(2)}%` : 
                            value.toFixed(2)
                        ) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-center text-sm font-medium text-blue-600">
                    {ratio.isPercentage ? `${ratio.sector}%` : ratio.sector}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => getGeminiComment(ratio.name, ratio.values, ratio.sector)}
                      disabled={loading}
                      className="inline-flex items-center px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium rounded-full transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Yorumla
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Oransal Analiz</h1>
                <p className="text-purple-100 mt-1">Finansal oranları hesaplayın ve AI ile yorumlayın</p>
                {apiError && (
                  <p className="text-yellow-300 text-sm mt-2 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {apiError}
                  </p>
                )}
              </div>
            </div>
            <Link 
              to="/balance-sheets"
              className="inline-flex items-center px-6 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-sm font-medium text-white hover:bg-opacity-30 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Bilançolara Dön
            </Link>
          </div>
        </div>

        {!showResults && (
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 mb-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Analiz Parametreleri
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Şirket Seçimi */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <label className="block text-sm font-semibold text-purple-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Şirket Seçimi
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      disabled={loading || companies.length === 0}
                      className="w-full p-3 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <option value="">
                        {companies.length === 0 ? 'Şirketler yükleniyor...' : 'Analiz edilecek şirketi seçin...'}
                      </option>
                      {companies.map(company => (
                        <option key={company.id} value={company.name}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bilanço Seçimi */}
                  {selectedCompany && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Karşılaştırılacak Dönemler (En az 2 dönem seçin)
                      </label>
                      
                      {availableBalances.length === 0 && !loading ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <h3 className="text-sm font-medium text-gray-900 mb-1">Bu şirket için bilanço bulunamadı</h3>
                          <p className="text-xs text-gray-500">Lütfen farklı bir şirket seçin</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableBalances.map(balance => (
                            <div 
                              key={balance.id} 
                              className={`relative border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer hover:shadow-md ${
                                selectedBalances.some(b => b.id === balance.id)
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              onClick={() => {
                                const isSelected = selectedBalances.some(b => b.id === balance.id);
                                handleBalanceSelection(balance, !isSelected);
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedBalances.some(b => b.id === balance.id)
                                    ? 'border-purple-500 bg-purple-500'
                                    : 'border-gray-300'
                                }`}>
                                  {selectedBalances.some(b => b.id === balance.id) && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {balance.year} - {balance.period}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {balance.creation_date}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Seçim Özeti */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 h-fit">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Seçim Özeti
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">Seçilen Şirket:</span>
                      <span className="font-medium text-gray-900 text-right max-w-[120px] truncate" title={selectedCompany || 'Henüz seçilmedi'}>
                        {selectedCompany || 'Henüz seçilmedi'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">Seçilen Dönem:</span>
                      <span className="font-medium text-gray-900">{selectedBalances.length}/5</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Analiz Durumu:</span>
                        <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                          selectedBalances.length >= 2 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {selectedBalances.length >= 2 ? '✅ Hazır' : 'En az 2 dönem gerekli'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analiz Butonu */}
              {selectedBalances.length >= 2 && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={calculateRatios}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                        Hesaplanıyor...
                      </>
                    ) : (
                      'Oransal Analizi Başlat'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sonuçlar */}
        {showResults && (
          <>
            {/* Analiz Özeti */}
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCompany} - Oransal Analiz Sonuçları
                </h2>
                <button 
                  onClick={() => setShowResults(false)}
                  className="inline-flex items-center px-4 py-2 text-purple-600 hover:text-purple-800 font-medium bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Yeni Analiz
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedBalances.map(balance => (
                  <div key={balance.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                    <div className="text-sm font-bold text-gray-900">
                      {balance.year} - {balance.period}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {balance.creation_date}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Oran Tabloları */}
            {renderRatioTable(ratios.liquidity, 'LİKİDİTE ORANLARI', 'bg-gradient-to-r from-blue-600 to-blue-700')}
            {renderRatioTable(ratios.structure, 'FİNANSAL YAPI ORANLARI', 'bg-gradient-to-r from-green-600 to-green-700')}
            {renderRatioTable(ratios.profitability, 'KARLILIK ORANLARI', 'bg-gradient-to-r from-yellow-600 to-yellow-700')}
            {renderRatioTable(ratios.efficiency, 'VERİMLİLİK ORANLARI', 'bg-gradient-to-r from-red-600 to-red-700')}
          </>
        )}
      </div>
      
      {/* Modern Alert */}
      <ModernAlert {...alertConfig} />
    </div>
  );
};

export default RatioAnalysis; 