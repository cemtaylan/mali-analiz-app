import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BalanceSheetAPI, CompanyAPI } from '../api';

// Tarih formatı DDMMYYYY
const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}${month}${year}`;
  } catch (error) {
    return '';
  }
};

// Finansal hesap kalemlerinin büyüme yönü analizi
const getGrowthDirection = (accountCode, accountName) => {
  const code = accountCode.toLowerCase();
  const name = accountName.toLowerCase();
  
  // AKTİF HESAPLAR - Artış genelde pozitif
  if (code.startsWith('a.')) {
    // Gelir tahakkukları ve ertelenmiş giderler - kontekste bağlı ama genelde artış pozitif
    if (code.includes('1.6') || name.includes('gelecek') || name.includes('peşin ödenmiş')) {
      return 'positive'; // Ertelenmiş giderler artarsa likidite açısından pozitif
    }
    // Tüm aktif hesaplar için artış pozitif
    return 'positive';
  }
  
  // PASİF HESAPLAR - Daha karmaşık analiz gerekli
  if (code.startsWith('p.')) {
    // BORÇLAR - Azalış pozitif (P.1 ve P.2)
    if (code.startsWith('p.1') || code.startsWith('p.2')) {
      // Mali borçlar, ticari borçlar, diğer borçlar
      if (name.includes('borç') || name.includes('kredi') || name.includes('satıcı') || 
          name.includes('avans') || name.includes('vergi') || name.includes('personel')) {
        return 'negative'; // Borç artışı negatif
      }
      // Gelecek yıllara ait gelirler gibi özel durumlar
      if (name.includes('gelecek yıllara ait') || name.includes('ertelenmiş gelir')) {
        return 'negative'; // Bu tür yükümlülük artışı negatif
      }
      return 'negative'; // Genel olarak kısa ve uzun vadeli yükümlülük artışı negatif
    }
    
    // ÖZ KAYNAKLAR - Artış pozitif (P.3)
    if (code.startsWith('p.3')) {
      // Sermaye, yedekler, birikmiş karlar
      if (name.includes('sermaye') || name.includes('yedek') || name.includes('kar') || 
          name.includes('kapital')) {
        return 'positive'; // Öz kaynak artışı pozitif
      }
      // Geçmiş yıl zararları
      if (name.includes('zarar') || name.includes('açık')) {
        return 'negative'; // Zarar artışı negatif
      }
      return 'positive'; // Genel olarak öz kaynak artışı pozitif
    }
    
    // DÖNEM KARI (P.4)
    if (code.startsWith('p.4')) {
      if (name.includes('zarar')) {
        return 'negative'; // Zarar artışı negatif
      }
      return 'positive'; // Kar artışı pozitif
    }
  }
  
  // Varsayılan: belirsiz durumlar için nötr
  return 'neutral';
};

// Büyüme oranı hesaplama
const calculateGrowthRate = (oldValue, newValue) => {
  if (!oldValue || oldValue === 0) {
    return newValue > 0 ? 100 : 0; // Sıfırdan artışsa %100, yoksa %0
  }
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
};

// Büyüme rengi belirleme
const getGrowthColor = (growthRate, direction) => {
  if (Math.abs(growthRate) < 0.01) { // %0.01'den küçükse nötr
    return 'text-gray-600 bg-gray-100';
  }
  
  const isIncrease = growthRate > 0;
  
  if (direction === 'positive') {
    return isIncrease ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
  } else if (direction === 'negative') {
    return isIncrease ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100';
  } else {
    return 'text-blue-700 bg-blue-100'; // Nötr durumlar
  }
};

const MultiBalanceAnalysis = () => {
  const [companies, setCompanies] = useState([]);
  const [balanceSheets, setBalanceSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Çoklu bilanço analizi state'leri
  const [selectedCompanyForMulti, setSelectedCompanyForMulti] = useState('');
  const [availableBalancesForMulti, setAvailableBalancesForMulti] = useState([]);
  const [selectedBalancesForMulti, setSelectedBalancesForMulti] = useState([]);
  const [multiAnalysisResults, setMultiAnalysisResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // İki kolon karşılaştırma state'leri
  const [showTwoColumnComparison, setShowTwoColumnComparison] = useState(false);
  const [selectedColumn1, setSelectedColumn1] = useState('');
  const [selectedColumn2, setSelectedColumn2] = useState('');
  const [twoColumnResults, setTwoColumnResults] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Başlangıç verilerini getir
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Şirketleri ve bilançoları paralel olarak getir
      const [companiesData, balanceSheetsData] = await Promise.all([
        CompanyAPI.getAllCompanies(),
        BalanceSheetAPI.getAllBalanceSheets()
      ]);
      
      setCompanies(companiesData);
      setBalanceSheets(balanceSheetsData);
      
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      
      // Demo verilerle devam et
      setCompanies([
        { id: 1, name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", tax_number: "1234567890" },
        { id: 2, name: "ABC Şirketi", tax_number: "0987654321" },
        { id: 3, name: "XYZ Holding", tax_number: "5555555555" }
      ]);
      
      setBalanceSheets([
        { id: 1, company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', year: 2025, period: 'Belirtilmemis', creation_date: '2025-05-31' },
        { id: 2, company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', year: 2024, period: 'YILLIK', creation_date: '2024-12-31' },
        { id: 3, company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', year: 2023, period: 'YILLIK', creation_date: '2023-12-31' },
        { id: 4, company_name: 'ABC Şirketi', year: 2024, period: 'YILLIK', creation_date: '2024-12-31' },
        { id: 5, company_name: 'ABC Şirketi', year: 2023, period: 'Q4', creation_date: '2023-12-31' }
      ]);
      
    } finally {
      setLoading(false);
    }
  };

  // Şirket seçimi değiştiğinde o şirketin bilançolarını getir
  const handleCompanySelection = (companyId) => {
    setSelectedCompanyForMulti(companyId);
    setSelectedBalancesForMulti([]);
    setMultiAnalysisResults([]);
    setShowResults(false);
    
    if (companyId) {
      const selectedCompany = companies.find(c => c.id.toString() === companyId);
      if (selectedCompany) {
        // O şirketin bilançolarını filtrele
        const companyBalances = balanceSheets.filter(sheet => 
          sheet.company_name === selectedCompany.name
        );
        setAvailableBalancesForMulti(companyBalances);
      }
    } else {
      setAvailableBalancesForMulti([]);
    }
  };

  // Bilanço seçimi
  const handleBalanceSelection = (balanceId, isSelected) => {
    if (isSelected) {
      if (selectedBalancesForMulti.length < 4) { // Maksimum 4 bilanço seçilebilir
        setSelectedBalancesForMulti([...selectedBalancesForMulti, balanceId]);
      }
    } else {
      setSelectedBalancesForMulti(selectedBalancesForMulti.filter(id => id !== balanceId));
    }
  };

  // İki kolon karşılaştırma analizi başlat
  const startTwoColumnComparison = () => {
    if (selectedBalancesForMulti.length < 2) {
      alert('İki kolon karşılaştırması için en az 2 bilanço seçmelisiniz.');
      return;
    }
    setShowTwoColumnComparison(true);
    setSelectedColumn1('');
    setSelectedColumn2('');
    setTwoColumnResults([]);
  };

  // İki kolon karşılaştırma analizi gerçekleştir
  const performTwoColumnAnalysis = () => {
    if (!selectedColumn1 || !selectedColumn2) {
      alert('Karşılaştırılacak iki kolonu seçmelisiniz.');
      return;
    }

    if (selectedColumn1 === selectedColumn2) {
      alert('Farklı iki kolon seçmelisiniz.');
      return;
    }

    // Seçilen iki bilanço verisi
    const balance1 = balanceSheets.find(sheet => 
      selectedBalancesForMulti.includes(sheet.id) && 
      `${sheet.year}_${sheet.period}` === selectedColumn1
    );
    const balance2 = balanceSheets.find(sheet => 
      selectedBalancesForMulti.includes(sheet.id) && 
      `${sheet.year}_${sheet.period}` === selectedColumn2
    );

    if (!balance1 || !balance2) {
      alert('Seçilen bilançolar bulunamadı.');
      return;
    }

    // Karşılaştırma başlığı için dönem bilgisi
    const period1 = `${balance1.year}-${balance1.period}`;
    const period2 = `${balance2.year}-${balance2.period}`;

    // Analiz sonuçlarını hazırla
    const comparisonResults = multiAnalysisResults.map(item => {
      if (!item.isItem) {
        return {
          ...item,
          value1: item[selectedColumn1],
          value2: item[selectedColumn2],
          growthRate: null,
          growthDirection: null,
          growthColor: null
        };
      }

      const value1 = item[selectedColumn1] || 0;
      const value2 = item[selectedColumn2] || 0;
      const growthRate = calculateGrowthRate(value1, value2);
      const direction = getGrowthDirection(item.code, item.name);
      const growthColor = getGrowthColor(growthRate, direction);

      return {
        ...item,
        value1,
        value2,
        growthRate,
        growthDirection: direction,
        growthColor,
        period1,
        period2
      };
    });

    setTwoColumnResults(comparisonResults);
  };

  // İki kolon karşılaştırmasını kapat
  const closeTwoColumnComparison = () => {
    setShowTwoColumnComparison(false);
    setSelectedColumn1('');
    setSelectedColumn2('');
    setTwoColumnResults([]);
  };

  // Çoklu bilanço analizini gerçekleştir
  const performAnalysis = async () => {
    if (selectedBalancesForMulti.length < 2) {
      alert('En az 2 bilanço seçmelisiniz.');
      return;
    }

    setAnalysisLoading(true);

    try {
      // Seçilen bilançoları getir
      const selectedBalances = balanceSheets.filter(sheet => 
        selectedBalancesForMulti.includes(sheet.id)
      );

      // Demo analiz verileri oluştur
      const demoAccountItems = [
        // AKTİF HESAPLAR
        { code: 'A.1', name: 'DÖNEN VARLIKLAR', category: 'Aktif', isGroup: true },
        { code: 'A.1.1', name: 'Hazır Değerler', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.1.1', name: 'KASA', category: 'Aktif', isItem: true },
        { code: 'A.1.1.2', name: 'BANKALAR', category: 'Aktif', isItem: true },
        { code: 'A.1.2', name: 'Menkul Kıymetler', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.2.1', name: 'HİSSE SENETLERİ', category: 'Aktif', isItem: true },
        { code: 'A.1.3', name: 'Ticari Alacaklar', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.3.1', name: 'ALICILAR', category: 'Aktif', isItem: true },
        { code: 'A.1.3.2', name: 'ALACAK SENETLERİ', category: 'Aktif', isItem: true },
        { code: 'A.1.4', name: 'Diğer Alacaklar', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.4.1', name: 'ORTAKLARDAN ALACAKLAR', category: 'Aktif', isItem: true },
        { code: 'A.1.5', name: 'Stoklar', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.5.1', name: 'İLK MADDE VE MALZEME', category: 'Aktif', isItem: true },
        { code: 'A.1.5.2', name: 'MAMULLER', category: 'Aktif', isItem: true },
        { code: 'A.1.6', name: 'Gelir Tahakkukları', category: 'Aktif', isSubGroup: true },
        { code: 'A.1.6.1', name: 'GELECEK AYLARA AİT GELİRLER', category: 'Aktif', isItem: true },
        
        { code: 'A.2', name: 'DURAN VARLIKLAR', category: 'Aktif', isGroup: true },
        { code: 'A.2.1', name: 'Maddi Duran Varlıklar', category: 'Aktif', isSubGroup: true },
        { code: 'A.2.1.1', name: 'ARAZİ VE ARSALAR', category: 'Aktif', isItem: true },
        { code: 'A.2.1.2', name: 'YAPILMAKTA OLAN YATIRIMLAR', category: 'Aktif', isItem: true },
        { code: 'A.2.1.3', name: 'MAKİNE VE EKİPMAN', category: 'Aktif', isItem: true },
        { code: 'A.2.1.4', name: 'TAŞIT ARAÇLARI', category: 'Aktif', isItem: true },
        { code: 'A.2.1.5', name: 'DEMİRBAŞLAR', category: 'Aktif', isItem: true },

        // PASİF HESAPLAR
        { code: 'P.1', name: 'KISA VADELİ YABANCI KAYNAKLAR', category: 'Pasif', isGroup: true },
        { code: 'P.1.1', name: 'Mali Borçlar', category: 'Pasif', isSubGroup: true },
        { code: 'P.1.1.1', name: 'BANKA KREDİLERİ', category: 'Pasif', isItem: true },
        { code: 'P.1.2', name: 'Ticari Borçlar', category: 'Pasif', isSubGroup: true },
        { code: 'P.1.2.1', name: 'SATICILAR', category: 'Pasif', isItem: true },
        { code: 'P.1.2.2', name: 'BORÇ SENETLERİ', category: 'Pasif', isItem: true },
        { code: 'P.1.3', name: 'Diğer Borçlar', category: 'Pasif', isSubGroup: true },
        { code: 'P.1.3.1', name: 'ORTAKLARA BORÇLAR', category: 'Pasif', isItem: true },
        { code: 'P.1.4', name: 'Alınan Avanslar', category: 'Pasif', isSubGroup: true },
        { code: 'P.1.4.1', name: 'ALINAN SİPARİŞ AVANSLARI', category: 'Pasif', isItem: true },
        { code: 'P.1.5', name: 'Ödenecek Vergi ve Fonlar', category: 'Pasif', isSubGroup: true },
        { code: 'P.1.5.1', name: 'ÖDENECEK VERGİLER', category: 'Pasif', isItem: true },

        { code: 'P.2', name: 'UZUN VADELİ YABANCI KAYNAKLAR', category: 'Pasif', isGroup: true },
        { code: 'P.2.1', name: 'Mali Borçlar', category: 'Pasif', isSubGroup: true },
        { code: 'P.2.1.1', name: 'UZUN VADELİ BANKA KREDİLERİ', category: 'Pasif', isItem: true },

        { code: 'P.3', name: 'ÖZ KAYNAKLAR', category: 'Pasif', isGroup: true },
        { code: 'P.3.1', name: 'Ödenmiş Sermaye', category: 'Pasif', isSubGroup: true },
        { code: 'P.3.1.1', name: 'SERMAYE', category: 'Pasif', isItem: true },
        { code: 'P.3.2', name: 'Sermaye Yedekleri', category: 'Pasif', isSubGroup: true },
        { code: 'P.3.2.1', name: 'SERMAYE YEDEKLERİ', category: 'Pasif', isItem: true },
        { code: 'P.3.3', name: 'Kardan Ayrılan Kısıtlanmış Yedekler', category: 'Pasif', isSubGroup: true },
        { code: 'P.3.3.1', name: 'YASAL YEDEKLER', category: 'Pasif', isItem: true },
        { code: 'P.4', name: 'DÖNEM KARI', category: 'Pasif', isGroup: true },
        { code: 'P.4.1.1', name: 'NET DÖNEM KARI', category: 'Pasif', isItem: true }
      ];

      // Her seçilen bilanço için veri oluştur
      const analysisResults = demoAccountItems.map(item => {
        const balanceData = {};
        selectedBalances.forEach(balance => {
          const key = `${balance.year}_${balance.period}`;
          if (item.isItem) {
            // Gerçekçi tutarlar için farklı hesap türlerine göre farklı aralıklar
            let min, max;
            if (item.code.startsWith('A.1.1')) { // Hazır değerler
              min = 50000; max = 500000;
            } else if (item.code.startsWith('A.1.3')) { // Ticari alacaklar
              min = 200000; max = 2000000;
            } else if (item.code.startsWith('A.1.5')) { // Stoklar
              min = 300000; max = 1500000;
            } else if (item.code.startsWith('A.2.1')) { // Maddi duran varlıklar
              min = 500000; max = 5000000;
            } else if (item.code.startsWith('P.1.1')) { // Kısa vadeli mali borçlar
              min = 100000; max = 1000000;
            } else if (item.code.startsWith('P.1.2')) { // Ticari borçlar
              min = 150000; max = 800000;
            } else if (item.code.startsWith('P.3.1')) { // Sermaye
              min = 1000000; max = 3000000;
            } else {
              min = 10000; max = 1000000;
            }
            
            balanceData[key] = Math.floor(Math.random() * (max - min) + min);
          } else {
            // Grup ve alt grup için toplamlar hesaplanacak
            balanceData[key] = null;
          }
        });

        return {
          ...item,
          ...balanceData
        };
      });

      setMultiAnalysisResults(analysisResults);
      setShowResults(true);

    } catch (error) {
      console.error('Çoklu bilanço analizi hatası:', error);
      alert('Analiz sırasında bir hata oluştu.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Sonuçları temizle
  const clearResults = () => {
    setShowResults(false);
    setMultiAnalysisResults([]);
    setSelectedBalancesForMulti([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link to="/balance-sheets" className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Çoklu Bilanço Analizi</h1>
              <p className="text-sm text-gray-600">Bir şirketin farklı dönem bilançolarını karşılaştırın</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analiz Formu */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 bg-indigo-600 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Analiz Parametreleri
          </h2>
        </div>

        <div className="p-6">
          {/* Şirket Seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analiz Edilecek Şirketi Seçin
            </label>
            <select
              value={selectedCompanyForMulti}
              onChange={(e) => handleCompanySelection(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">-- Şirket Seçin --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>

          {/* Bilançolar Seçimi */}
          {selectedCompanyForMulti && availableBalancesForMulti.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Karşılaştırılacak Bilançoları Seçin (En az 2, en fazla 4 adet)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableBalancesForMulti.map((balance) => (
                  <div key={balance.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBalancesForMulti.includes(balance.id)}
                        onChange={(e) => handleBalanceSelection(balance.id, e.target.checked)}
                        disabled={!selectedBalancesForMulti.includes(balance.id) && selectedBalancesForMulti.length >= 4}
                        className="h-4 w-4 text-indigo-600 rounded mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {balance.year} - {balance.period}
                        </div>
                        <div className="text-sm text-gray-500">
                          Oluşturulma: {formatDateDDMMYYYY(balance.creation_date)}
                        </div>
                        {balance.notes && (
                          <div className="text-xs text-gray-400 mt-1">
                            {balance.notes}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedBalancesForMulti.length > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    <strong>{selectedBalancesForMulti.length}</strong> bilanço seçildi
                    {selectedBalancesForMulti.length >= 4 && " (maksimum)"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bilgi mesajları */}
          {selectedCompanyForMulti && availableBalancesForMulti.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Bu şirketin bilançosu yok</h3>
              <p className="mt-1 text-sm text-gray-500">
                Seçilen şirketin hiç bilançosu bulunmuyor. Önce bilanço ekleyin.
              </p>
            </div>
          )}

          {!selectedCompanyForMulti && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Şirket seçin</h3>
              <p className="mt-1 text-sm text-gray-500">
                Analiz için önce bir şirket seçmeniz gerekiyor.
              </p>
            </div>
          )}

          {/* İşlem Butonları */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            {showResults && (
              <>
                <button 
                  onClick={startTwoColumnComparison} 
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  İki Kolon Karşılaştır
                </button>
                <button 
                  onClick={clearResults} 
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sonuçları Temizle
                </button>
              </>
            )}
            {!showResults && (
              <button 
                onClick={clearResults} 
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Sonuçları Temizle
              </button>
            )}
            <button 
              onClick={performAnalysis} 
              disabled={selectedBalancesForMulti.length < 2 || analysisLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded disabled:bg-gray-400 flex items-center"
            >
              {analysisLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analizi Başlat
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analiz Sonuçları */}
      {showResults && multiAnalysisResults.length > 0 && (
        <div className="space-y-8">

          {/* AKTİF VARLIKLAR */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="text-xl font-semibold text-green-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              AKTİF VARLIKLAR
            </h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead className="bg-green-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-green-800 uppercase">Hesap Kodu</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-green-800 uppercase">Hesap Adı</th>
                    {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                      .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                      .map(balance => (
                      <th key={balance.id} className="px-4 py-3 text-center text-sm font-medium text-green-800 uppercase">
                        {balance.year}<br/>{balance.period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {multiAnalysisResults.filter(item => item.category === 'Aktif').map((item, index) => (
                    <tr key={index} className={`
                      ${item.isGroup ? 'bg-green-100 font-semibold' : ''}
                      ${item.isSubGroup ? 'bg-green-50 font-medium' : ''}
                      ${item.isItem ? 'hover:bg-green-25' : ''}
                    `}>
                      <td className={`px-4 py-3 text-green-900 ${
                        item.isGroup ? 'font-bold' : 
                        item.isSubGroup ? 'font-medium' : 
                        'text-sm'
                      }`}>
                        {item.code}
                      </td>
                      <td className={`px-4 py-3 text-green-900 ${
                        item.isGroup ? 'font-bold' : 
                        item.isSubGroup ? 'pl-6 font-medium' : 
                        'pl-8 text-sm'
                      }`}>
                        {item.name}
                      </td>
                      {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                        .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                        .map(balance => {
                          const key = `${balance.year}_${balance.period}`;
                          const value = item[key];
                          return (
                            <td key={balance.id} className="px-4 py-3 text-right text-sm text-green-700">
                              {value ? new Intl.NumberFormat('tr-TR').format(value) : '-'}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PASİF KAYNAKLAR */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-xl font-semibold text-blue-800 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
              </svg>
              PASİF KAYNAKLAR
            </h4>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-800 uppercase">Hesap Kodu</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-800 uppercase">Hesap Adı</th>
                    {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                      .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                      .map(balance => (
                      <th key={balance.id} className="px-4 py-3 text-center text-sm font-medium text-blue-800 uppercase">
                        {balance.year}<br/>{balance.period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {multiAnalysisResults.filter(item => item.category === 'Pasif').map((item, index) => (
                    <tr key={index} className={`
                      ${item.isGroup ? 'bg-blue-100 font-semibold' : ''}
                      ${item.isSubGroup ? 'bg-blue-50 font-medium' : ''}
                      ${item.isItem ? 'hover:bg-blue-25' : ''}
                    `}>
                      <td className={`px-4 py-3 text-blue-900 ${
                        item.isGroup ? 'font-bold' : 
                        item.isSubGroup ? 'font-medium' : 
                        'text-sm'
                      }`}>
                        {item.code}
                      </td>
                      <td className={`px-4 py-3 text-blue-900 ${
                        item.isGroup ? 'font-bold' : 
                        item.isSubGroup ? 'pl-6 font-medium' : 
                        'pl-8 text-sm'
                      }`}>
                        {item.name}
                      </td>
                      {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                        .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                        .map(balance => {
                          const key = `${balance.year}_${balance.period}`;
                          const value = item[key];
                          return (
                            <td key={balance.id} className="px-4 py-3 text-right text-sm text-blue-700">
                              {value ? new Intl.NumberFormat('tr-TR').format(value) : '-'}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* İşlem Butonları */}
          <div className="flex justify-center space-x-4 pt-6">
            <button 
              onClick={() => window.print()} 
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H3a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2z" />
              </svg>
              Yazdır
            </button>
          </div>
        </div>
      )}

      {/* İki Kolon Karşılaştırma Modal */}
      {showTwoColumnComparison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  İki Kolon Büyüme Analizi
                </h3>
                <button 
                  onClick={closeTwoColumnComparison}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Kolon Seçimi */}
              {twoColumnResults.length === 0 && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Karşılaştırmak istediğiniz iki dönem seçin. Sistem otomatik olarak her hesap kalemi için 
                    büyüme oranını hesaplayacak ve renklendirme yapacaktır.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Birinci Dönem (Eski)
                      </label>
                      <select
                        value={selectedColumn1}
                        onChange={(e) => setSelectedColumn1(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">-- Dönem Seçin --</option>
                        {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                          .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                          .map(balance => (
                          <option key={balance.id} value={`${balance.year}_${balance.period}`}>
                            {balance.year} - {balance.period}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        İkinci Dönem (Yeni)
                      </label>
                      <select
                        value={selectedColumn2}
                        onChange={(e) => setSelectedColumn2(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">-- Dönem Seçin --</option>
                        {balanceSheets.filter(sheet => selectedBalancesForMulti.includes(sheet.id))
                          .sort((a, b) => a.year - b.year || a.period.localeCompare(b.period))
                          .map(balance => (
                          <option key={balance.id} value={`${balance.year}_${balance.period}`}>
                            {balance.year} - {balance.period}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={performTwoColumnAnalysis}
                      disabled={!selectedColumn1 || !selectedColumn2}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded disabled:bg-gray-400 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Analizi Başlat
                    </button>
                  </div>

                  {/* Renk Açıklaması */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Renk Açıklaması:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                        <span className="text-green-700">Pozitif Büyüme</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                        <span className="text-red-700">Negatif Büyüme</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
                        <span className="text-gray-700">Nötr/Değişim Yok</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      * Sistemin yapay zeka analizi: Borçlar azalırsa pozitif (yeşil), aktifler artarsa pozitif (yeşil) olarak değerlendirilir.
                    </p>
                  </div>
                </div>
              )}

              {/* İki Kolon Karşılaştırma Sonuçları */}
              {twoColumnResults.length > 0 && (
                <div className="space-y-8">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold text-purple-800">
                      {twoColumnResults[0]?.period1} → {twoColumnResults[0]?.period2} Büyüme Analizi
                    </h4>
                    <p className="text-gray-600 mt-2">
                      Her satırın en sağında büyüme oranı ve yönü gösterilmektedir
                    </p>
                  </div>

                  {/* AKTİF VARLIKLAR - İki Kolon */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h5 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                      AKTİF VARLIKLAR
                    </h5>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg shadow">
                        <thead className="bg-green-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase">Kod</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-green-800 uppercase">Hesap Adı</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-green-800 uppercase">
                              {twoColumnResults[0]?.period1}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-green-800 uppercase">
                              {twoColumnResults[0]?.period2}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-green-800 uppercase">Büyüme %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {twoColumnResults.filter(item => item.category === 'Aktif').map((item, index) => (
                            <tr key={index} className={`
                              ${item.isGroup ? 'bg-green-100 font-semibold' : ''}
                              ${item.isSubGroup ? 'bg-green-50 font-medium' : ''}
                              ${item.isItem ? 'hover:bg-green-25' : ''}
                            `}>
                              <td className={`px-3 py-2 text-green-900 text-xs ${
                                item.isGroup ? 'font-bold' : 
                                item.isSubGroup ? 'font-medium' : ''
                              }`}>
                                {item.code}
                              </td>
                              <td className={`px-3 py-2 text-green-900 text-xs ${
                                item.isGroup ? 'font-bold' : 
                                item.isSubGroup ? 'pl-4 font-medium' : 
                                'pl-6'
                              }`}>
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-green-700">
                                {item.value1 ? new Intl.NumberFormat('tr-TR').format(item.value1) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-green-700">
                                {item.value2 ? new Intl.NumberFormat('tr-TR').format(item.value2) : '-'}
                              </td>
                              <td className="px-3 py-2 text-center text-xs">
                                {item.growthRate !== null ? (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.growthColor}`}>
                                    {item.growthRate > 0 ? '+' : ''}{item.growthRate.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PASİF KAYNAKLAR - İki Kolon */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h5 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13l5 5m0 0l5-5m-5 5V6" />
                      </svg>
                      PASİF KAYNAKLAR
                    </h5>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg shadow">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Kod</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase">Hesap Adı</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-blue-800 uppercase">
                              {twoColumnResults[0]?.period1}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-blue-800 uppercase">
                              {twoColumnResults[0]?.period2}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-blue-800 uppercase">Büyüme %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {twoColumnResults.filter(item => item.category === 'Pasif').map((item, index) => (
                            <tr key={index} className={`
                              ${item.isGroup ? 'bg-blue-100 font-semibold' : ''}
                              ${item.isSubGroup ? 'bg-blue-50 font-medium' : ''}
                              ${item.isItem ? 'hover:bg-blue-25' : ''}
                            `}>
                              <td className={`px-3 py-2 text-blue-900 text-xs ${
                                item.isGroup ? 'font-bold' : 
                                item.isSubGroup ? 'font-medium' : ''
                              }`}>
                                {item.code}
                              </td>
                              <td className={`px-3 py-2 text-blue-900 text-xs ${
                                item.isGroup ? 'font-bold' : 
                                item.isSubGroup ? 'pl-4 font-medium' : 
                                'pl-6'
                              }`}>
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-blue-700">
                                {item.value1 ? new Intl.NumberFormat('tr-TR').format(item.value1) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-blue-700">
                                {item.value2 ? new Intl.NumberFormat('tr-TR').format(item.value2) : '-'}
                              </td>
                              <td className="px-3 py-2 text-center text-xs">
                                {item.growthRate !== null ? (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.growthColor}`}>
                                    {item.growthRate > 0 ? '+' : ''}{item.growthRate.toFixed(1)}%
                                  </span>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* İşlem Butonları */}
                  <div className="flex justify-center space-x-4 pt-6">
                    <button 
                      onClick={() => {
                        setSelectedColumn1('');
                        setSelectedColumn2('');
                        setTwoColumnResults([]);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Yeni Karşılaştırma
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H3a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2z" />
                      </svg>
                      Yazdır
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiBalanceAnalysis; 







