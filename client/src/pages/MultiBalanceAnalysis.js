import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BalanceSheetAPI, CompanyAPI } from '../api';
import ModernAlert from '../components/ModernAlert';

// Hesap adı formatlama fonksiyonu
const formatAccountName = (name) => {
  if (!name || typeof name !== 'string') return name;
  
  let cleanName = name.trim().replace(/^\.+\s*/, '');
  cleanName = cleanName.replace(/İ/g, 'I');
  cleanName = cleanName.replace(/^(i+|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)\.\s*/gi, (match, roman) => {
    return roman.toUpperCase() + '. ';
  });
  
  if (cleanName.startsWith('F.') || cleanName.startsWith('F ')) {
    return cleanName.toUpperCase();
  }
  
  if (/^[A-Z]\.\s/.test(cleanName) || /^[A-Z]\.\d+\s/.test(cleanName) || /^[A-Z]\.\d+\.\d+\s/.test(cleanName)) {
    return cleanName.toUpperCase();
  }
  
  if (/^[IVX]+\.\s/i.test(cleanName)) {
    return cleanName.toUpperCase();
  }
  
  return cleanName;
};

// Türkçe sayı formatını parse etme fonksiyonu
const parseNumericValue = (value) => {
  if (!value || value === '-') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Türkçe format: "3.882.837,70" -> 3882837.70
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return 0;
};

// Switch Component
const Switch = ({ checked, onChange, label }) => (
  <label className="flex items-center space-x-3 cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div className={`w-11 h-6 bg-gray-200 rounded-full transition-colors duration-200 ease-in-out ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'} shadow-md`}></div>
      </div>
    </div>
    <span className="text-sm font-medium text-white">{label}</span>
  </label>
);

const MultiBalanceAnalysis = () => {
  // State'ler
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableBalances, setAvailableBalances] = useState([]);
  const [selectedBalances, setSelectedBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [expandedItems, setExpandedItems] = useState({});
  const [showEmptyRows, setShowEmptyRows] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertConfig, setAlertConfig] = useState({ isOpen: false });
  
  // Hiyerarşik yapı
  const [activeHierarchy, setActiveHierarchy] = useState([]);
  const [passiveHierarchy, setPassiveHierarchy] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [totals, setTotals] = useState({ aktif: {}, pasif: {} });

  // Yıl aralığı oluşturma fonksiyonu
  const generateYearRange = useCallback((baseYear) => {
    const years = [];
    for (let i = baseYear - 3; i <= baseYear; i++) {
      if (i > 2018) { // Minimum 2019'dan başla
        years.push(i.toString());
      }
    }
    return years.length > 0 ? years : [baseYear.toString()];
  }, []);

  // Şirketleri API'den çek
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      console.log('📋 Şirketler API\'den çekiliyor...');
      const companiesData = await CompanyAPI.getAllCompanies();
      
      console.log('✅ Şirketler başarıyla alındı:', companiesData.length);
      setCompanies(companiesData);
      
    } catch (error) {
      console.error('❌ Şirketler yüklenirken hata:', error);
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Veri Yükleme Hatası',
        message: 'Şirket verileri yüklenirken hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.',
        onClose: () => setAlertConfig({ isOpen: false })
      });
      
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
      
      console.log('📊 Bilançolar API\'den çekiliyor...', selectedCompany);
      const balanceSheetsData = await BalanceSheetAPI.getAllBalanceSheets();
      
      // Seçilen şirkete ait bilançoları filtrele
      const companyBalances = balanceSheetsData.filter(b => 
        b.company_name === selectedCompany || 
        b.company_id === companies.find(c => c.name === selectedCompany)?.id
      );
      
      console.log('✅ Bilançolar başarıyla alındı:', companyBalances.length);
      
      if (companyBalances.length === 0) {
        setAlertConfig({
          isOpen: true,
          type: 'warning',
          title: 'Bilanço Bulunamadı',
          message: 'Seçilen şirket için bilanço bulunamadı. Lütfen önce bilanço ekleyin.',
          onClose: () => setAlertConfig({ isOpen: false })
        });
        setAvailableBalances([]);
        return;
      }
      
      // Her bilanço için mevcut yıl bilgilerini ekle
      const processedBalances = companyBalances.map(balance => ({
        ...balance,
        years: generateYearRange(balance.year)
      }));
      
      setAvailableBalances(processedBalances);
      setSelectedBalances([]);
      setShowResults(false);
      
    } catch (error) {
      console.error('❌ Bilançolar yüklenirken hata:', error);
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Bilanço Yükleme Hatası',
        message: 'Bilanço verileri yüklenirken hata oluştu. Lütfen tekrar deneyin.',
        onClose: () => setAlertConfig({ isOpen: false })
      });
      
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, companies, generateYearRange]);

  // İlk yükleme - şirketleri çek
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
      if (selectedBalances.length < 3) {
        setSelectedBalances([...selectedBalances, balance]);
      }
    } else {
      setSelectedBalances(selectedBalances.filter(b => b.id !== balance.id));
    }
  };

  // Analiz işlemi - gerçek API verisi ile
  const performAnalysis = async () => {
    if (selectedBalances.length < 2) return;
    
    setLoading(true);
    setApiError(null);
    
    try {
      console.log('🔍 Analiz başlatılıyor...', selectedBalances.length, 'bilanço seçili');
      
      // Kolon başlıklarını oluştur
      const headers = [];
      selectedBalances.forEach(balance => {
        balance.years.forEach(year => {
          headers.push(`${balance.year}-${balance.period}-${year}`);
        });
      });
      setColumnHeaders(headers);
      console.log('📊 Kolon başlıkları oluşturuldu:', headers);
      
      // Her seçili bilanço için detaylı veri çek
      const processedData = [];
      
      for (const balance of selectedBalances) {
        try {
          console.log(`📋 Bilanço ${balance.id} detayı alınıyor...`);
          const balanceDetail = await BalanceSheetAPI.getBalanceSheetDetail(balance.id);
          
          console.log(`🔍 Bilanço ${balance.id} API yanıtı:`, balanceDetail);
          
          // Ana veri yapısını kontrol et
          if (balanceDetail && balanceDetail.detected_data && balanceDetail.detected_data.items) {
            console.log(`✅ Bilanço ${balance.id} detected_data.items bulundu:`, balanceDetail.detected_data.items.length, 'kalem');
            
            // API'den gelen veriler
            balanceDetail.detected_data.items.forEach((item, index) => {
              console.log(`📋 Kalem ${index}:`, item);
              
              // Hesap kodunu al (çeşitli alanlardan dene)
              const accountCode = item.code || item.definition || item.account_code || item.id || item.account_number || '';
              const accountName = item.description || item.name || item.account_name || item.title || accountCode;
              
              console.log(`🔍 Parse edilen kod: "${accountCode}", isim: "${accountName}"`);
              
              // Hesap kategorisini belirle
              let category = 'Aktif';
              if (accountCode && (accountCode.startsWith('P.') || accountCode.toLowerCase().includes('pasif'))) {
                category = 'Pasif';
              }
              
              // Eğer hesap kodu boşsa ve isim varsa, isimden kategori belirle
              if (!accountCode && accountName) {
                if (accountName.toLowerCase().includes('pasif') || 
                    accountName.toLowerCase().includes('borç') || 
                    accountName.includes('kaynak')) {
                  category = 'Pasif';
                }
              }
              
              // Bu hesabın daha önceden eklenip eklenmediğini kontrol et
              const itemKey = accountCode || accountName || `item_${index}`;
              let existingItem = processedData.find(existing => existing.code === itemKey);
              
              if (!existingItem && (accountCode || accountName)) {
                existingItem = {
                  code: itemKey,
                  name: formatAccountName(accountName),
                  category: category,
                  isGroup: /^[A-P]\.\d*$/.test(accountCode) && accountCode.split('.').length === 2,
                  isSubGroup: /^[A-P]\.\d+\.\d*$/.test(accountCode) && accountCode.split('.').length === 3
                };
                processedData.push(existingItem);
                console.log(`➕ Yeni kalem eklendi: ${existingItem.code} - ${existingItem.name} (${existingItem.category})`);
              }
              
              // Her yıl için veri ekle
              if (existingItem) {
                balance.years.forEach(year => {
                  const columnKey = `${balance.year}-${balance.period}-${year}`;
                  
                  // API'den gelen veriyi kullan, öncelik sırasına göre
                  const yearValue = item[year] || item.current_amount || item.amount || 
                                   item.value || item.current_value || item.balance ||
                                   item['2024'] || item['2023'] || item['2022'] || item['2021'] || 0;
                  
                  console.log(`💰 ${itemKey} - ${year}: ${yearValue}`);
                  
                  // parseNumericValue fonksiyonunu kullan
                  const numericValue = parseNumericValue(yearValue);
                  existingItem[columnKey] = numericValue;
                });
              }
            });
          } else if (balanceDetail && balanceDetail.balance_sheet) {
            console.log(`📄 Bilanço ${balance.id} için balance_sheet yapısı kontrol ediliyor...`);
            
            // balance_sheet.detected_data kontrol et
            if (balanceDetail.balance_sheet.detected_data && balanceDetail.balance_sheet.detected_data.items) {
              console.log(`✅ balance_sheet.detected_data.items bulundu:`, balanceDetail.balance_sheet.detected_data.items.length, 'kalem');
              
              balanceDetail.balance_sheet.detected_data.items.forEach((item, index) => {
                const accountCode = item.code || item.definition || item.account_code || item.id || '';
                const accountName = item.description || item.name || item.account_name || accountCode;
                
                let category = 'Aktif';
                if (accountCode && (accountCode.startsWith('P.') || accountCode.toLowerCase().includes('pasif'))) {
                  category = 'Pasif';
                }
                
                const itemKey = accountCode || accountName || `item_${index}`;
                let existingItem = processedData.find(existing => existing.code === itemKey);
                
                if (!existingItem && (accountCode || accountName)) {
                  existingItem = {
                    code: itemKey,
                    name: formatAccountName(accountName),
                    category: category,
                    isGroup: /^[A-P]\.\d*$/.test(accountCode) && accountCode.split('.').length === 2,
                    isSubGroup: /^[A-P]\.\d+\.\d*$/.test(accountCode) && accountCode.split('.').length === 3
                  };
                  processedData.push(existingItem);
                }
                
                if (existingItem) {
                  balance.years.forEach(year => {
                    const columnKey = `${balance.year}-${balance.period}-${year}`;
                    const yearValue = item[year] || item.current_amount || item.amount || 0;
                    const numericValue = parseNumericValue(yearValue);
                    existingItem[columnKey] = numericValue;
                  });
                }
              });
            } else if (balanceDetail.balance_sheet.raw_pdf_data) {
              // raw_pdf_data içinde items var
              console.log(`📄 Bilanço ${balance.id} için raw_pdf_data kullanılıyor...`);
              try {
                const rawData = JSON.parse(balanceDetail.balance_sheet.raw_pdf_data);
                console.log(`🔍 Raw data yapısı:`, rawData);
                
                if (rawData.items && Array.isArray(rawData.items)) {
                  console.log(`✅ Raw data'dan ${rawData.items.length} kalem bulundu`);
                  
                  rawData.items.forEach((item, index) => {
                    const accountCode = item.definition || item.code || item.account_code || item.id || '';
                    const accountName = item.account_name || item.description || item.name || accountCode;
                    
                    let category = 'Aktif';
                    if (accountCode && (accountCode.startsWith('P.') || accountCode.toLowerCase().includes('pasif'))) {
                      category = 'Pasif';
                    }
                    
                    const itemKey = accountCode || accountName || `raw_item_${index}`;
                    let existingItem = processedData.find(existing => existing.code === itemKey);
                    
                    if (!existingItem && (accountCode || accountName)) {
                      existingItem = {
                        code: itemKey,
                        name: formatAccountName(accountName),
                        category: category,
                        isGroup: /^[A-P]\.\d*$/.test(accountCode) && accountCode.split('.').length === 2,
                        isSubGroup: /^[A-P]\.\d+\.\d*$/.test(accountCode) && accountCode.split('.').length === 3
                      };
                      processedData.push(existingItem);
                    }
                    
                    if (existingItem) {
                      balance.years.forEach(year => {
                        const columnKey = `${balance.year}-${balance.period}-${year}`;
                        const yearValue = item[year] || item['2024'] || item['2023'] || item['2022'] || item['2021'] || 0;
                        const numericValue = parseNumericValue(yearValue);
                        existingItem[columnKey] = numericValue;
                      });
                    }
                  });
                }
              } catch (parseError) {
                console.error(`❌ Raw PDF data parse edilemedi:`, parseError);
              }
            }
          } else {
            console.warn(`⚠️ Bilanço ${balance.id} için veri bulunamadı. API yanıtı:`, balanceDetail);
          }
        } catch (error) {
          console.error(`❌ Bilanço ${balance.id} detayı alınırken hata:`, error);
          setAlertConfig({
            isOpen: true,
            type: 'error',
            title: 'Veri Alma Hatası',
            message: `Bilanço ${balance.id} verisi alınırken hata oluştu: ${error.message}`,
            onClose: () => setAlertConfig({ isOpen: false })
          });
        }
      }
      
      // Veri kontrolü ve hata yönetimi
      if (processedData.length === 0) {
        console.log('⚠️ Analiz için veri bulunamadı');
        setAlertConfig({
          isOpen: true,
          type: 'warning',
          title: 'Analiz Verisi Bulunamadı',
          message: 'Seçilen bilançolarda analiz yapılabilir veri bulunamadı. Lütfen bilançoların doğru formatlandığından emin olun.',
          onClose: () => setAlertConfig({ isOpen: false })
        });
        setLoading(false);
        return;
      }
      
      console.log('📈 Toplam işlenen hesap kalemi:', processedData.length);
      console.log('🔧 Hiyerarşi oluşturuluyor...');
      
      buildHierarchies(processedData);
      calculateTotals(processedData, headers);
      setShowResults(true);
      
      console.log('✅ Analiz tamamlandı!');
      
    } catch (error) {
      console.error('❌ Analiz hatası:', error);
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Analiz Hatası',
        message: `Analiz sırasında bir hata oluştu: ${error.message}`,
        onClose: () => setAlertConfig({ isOpen: false })
      });
    } finally {
      setLoading(false);
    }
  };

  // Hiyerarşik yapı oluşturma
  const buildHierarchies = (data) => {
    const activeItems = data.filter(item => item.category === 'Aktif');
    const passiveItems = data.filter(item => item.category === 'Pasif');
    
    const buildHierarchy = (items) => {
      const groups = items.filter(item => item.isGroup);
      const subGroups = items.filter(item => item.isSubGroup);
      const normalItems = items.filter(item => !item.isGroup && !item.isSubGroup);
      
      return groups.map(group => ({
        ...group,
        id: group.code,
        description: group.name,
        children: [
          ...subGroups.filter(sub => sub.code.startsWith(group.code.split('.')[0])),
          ...normalItems.filter(item => item.code.startsWith(group.code.split('.')[0]))
        ].map(child => ({
          ...child,
          id: child.code,
          description: child.name,
          children: []
        }))
      }));
    };
    
    setActiveHierarchy(buildHierarchy(activeItems));
    setPassiveHierarchy(buildHierarchy(passiveItems));
  };

  // Toplam hesaplama
  const calculateTotals = (data, headers) => {
    const aktifTotals = {};
    const pasifTotals = {};
    
    headers.forEach(header => {
      aktifTotals[header] = data
        .filter(item => item.category === 'Aktif')
        .reduce((sum, item) => sum + (item[header] || 0), 0);
      
      pasifTotals[header] = data
        .filter(item => item.category === 'Pasif')
        .reduce((sum, item) => sum + (item[header] || 0), 0);
    });
    
    setTotals({ aktif: aktifTotals, pasif: pasifTotals });
  };

  // Arama filtreleme
  const filterBySearch = (items) => {
    if (!searchTerm) return items;
    
    return items.filter(item => {
      const nameMatch = item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = item.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const childMatch = item.children?.some(child => 
        child.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        child.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return nameMatch || codeMatch || childMatch;
    });
  };

  // Hiyerarşik satırları render etme
  const renderHierarchicalRows = (items, depth = 0) => {
    const filteredItems = filterBySearch(items);
    const rows = [];

    filteredItems.forEach(item => {
      const isExpanded = expandedItems[item.id];
      const hasChildren = item.children && item.children.length > 0;
      
      let bgColor = 'bg-white hover:bg-gray-50';
      let fontWeight = 'font-normal';
      let textSize = 'text-sm';
      
      if (item.isGroup) {
        bgColor = activeTab === 'active' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-indigo-50 hover:bg-indigo-100';
        fontWeight = 'font-bold';
        textSize = 'text-base';
      } else if (item.isSubGroup) {
        bgColor = activeTab === 'active' ? 'bg-blue-25 hover:bg-blue-50' : 'bg-indigo-25 hover:bg-indigo-50';
        fontWeight = 'font-semibold';
        textSize = 'text-sm';
      }

      const paddingLeft = depth * 24;

      rows.push(
        <tr key={item.id} className={bgColor}>
          <td className="px-6 py-3 text-left">
            <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
              {hasChildren && (
                <button
                  onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !isExpanded }))}
                  className="mr-3 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-all duration-200"
                >
                  {isExpanded ? (
                    // Açık durum: Minus (-) ikonu
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    // Kapalı durum: Plus (+) ikonu
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${item.isGroup ? 'bg-blue-600' : item.isSubGroup ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                <div>
                  <div className={`${textSize} text-gray-900 ${fontWeight}`}>
                    {formatAccountName(item.description)}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{item.code}</div>
                </div>
              </div>
            </div>
          </td>
          {columnHeaders.map(header => {
            const value = item[header];
            return (
              <td key={header} className="px-6 py-3 text-right">
                <div className={`${textSize} text-gray-900 font-mono ${fontWeight}`}>
                  {value ? new Intl.NumberFormat('tr-TR').format(value) : '-'}
                </div>
              </td>
            );
          })}
        </tr>
      );

      if (hasChildren && isExpanded) {
        rows.push(...renderHierarchicalRows(item.children, depth + 1));
      }
    });

    return rows;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Çoklu Bilanço Analizi</h1>
                <p className="text-indigo-100 mt-1">Birden fazla bilançoyu detaylı karşılaştırın ve analiz edin</p>
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

        {/* API Hata Bilgilendirme */}
        {apiError && (
          <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-700 p-4 mb-6" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-bold">API Bağlantı Uyarısı</p>
                <p>{apiError}</p>
                <p className="mt-2 text-sm">
                  Sunucu bağlantısı kurulamadığında sistem otomatik olarak demo modda çalışır.
                </p>
              </div>
            </div>
          </div>
        )}

        {!showResults && (
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-6 mb-8">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center flex items-center justify-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Analiz Parametreleri
              </h2>
              
              {/* Loading State için UI */}
              {loading && (
                <div className="flex justify-center items-center py-8">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600 font-medium">
                      {companies.length === 0 ? 'Şirketler yükleniyor...' : 
                       availableBalances.length === 0 && selectedCompany ? 'Bilançolar yükleniyor...' : 
                       'Analiz yapılıyor...'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Compact Selection Area */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Şirket Seçimi */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Şirket Seçimi
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      disabled={loading || companies.length === 0}
                      className="w-full p-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed text-sm font-medium"
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
                    
                    {companies.length === 0 && !loading && (
                      <p className="text-xs text-red-600 mt-2">
                        Şirket verileri yüklenemedi. Lütfen sayfayı yenileyin.
                      </p>
                    )}
                  </div>

                  {/* Bilanço Seçimi - Compact Grid */}
                  {selectedCompany && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Karşılaştırılacak Bilançolar (2-3 adet seçin)
                      </label>
                      
                      {availableBalances.length === 0 && !loading ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
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
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              } ${selectedBalances.length >= 3 && !selectedBalances.some(b => b.id === balance.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => {
                                if (selectedBalances.length >= 3 && !selectedBalances.some(b => b.id === balance.id)) return;
                                const isSelected = selectedBalances.some(b => b.id === balance.id);
                                handleBalanceSelection(balance, !isSelected);
                              }}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  selectedBalances.some(b => b.id === balance.id)
                                    ? 'border-blue-500 bg-blue-500'
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
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    Yıllar: {balance.years.join(', ')}
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

                {/* Compact Seçim Özeti */}
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
                      <span className="text-gray-600">Mevcut Bilanço:</span>
                      <span className="font-medium text-gray-900">{availableBalances.length} adet</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-600">Seçilen Bilanço:</span>
                      <span className="font-medium text-gray-900">{selectedBalances.length}/3</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Analiz Durumu:</span>
                        <span className={`font-medium text-xs px-2 py-1 rounded-full ${
                          selectedBalances.length >= 2 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {selectedBalances.length >= 2 ? '✅ Hazır' : 'En az 2 bilanço gerekli'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Analiz Butonu */}
              {selectedBalances.length >= 2 && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={performAnalysis}
                    disabled={loading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                        Analiz Yapılıyor...
                      </>
                    ) : (
                      'Detaylı Analizi Başlat'
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
                  {selectedCompany}
                </h2>
                <button
                  onClick={() => setShowResults(false)}
                  className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Yeni Analiz
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {selectedBalances.map(balance => (
                  <div key={balance.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-sm font-bold text-gray-900">
                      {balance.year} - {balance.period}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {balance.creation_date}
                    </div>
                    <div className="text-xs text-blue-600 mt-2 font-medium">
                      Yıllar: {balance.years.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arama Alanı */}
            <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50 p-4 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Hesap adı veya kodu ile arama yapın..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-3 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Temizle
                  </button>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-lg ${
                      activeTab === 'active'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Aktif Hesaplar
                  </button>
                  <button
                    onClick={() => setActiveTab('passive')}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-lg ${
                      activeTab === 'passive'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pasif Hesaplar
                  </button>
                </nav>
              </div>
            </div>

            {/* Finansal Veri Tablosu */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200/50 mb-8">
              <div className={`px-6 py-5 ${activeTab === 'active' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-indigo-600 to-indigo-700'} flex items-center justify-between`}>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                  </svg>
                  {activeTab === 'active' ? 'Aktif Hesaplar (Varlıklar)' : 'Pasif Hesaplar (Kaynaklar)'}
                </h2>
                
                <div className="flex items-center space-x-6">
                  <Switch
                    checked={showEmptyRows}
                    onChange={(e) => setShowEmptyRows(e.target.checked)}
                    label="Boş Satırları Göster"
                  />
                  
                  <Switch
                    checked={allExpanded}
                    onChange={() => {
                      const currentHierarchy = activeTab === 'active' ? activeHierarchy : passiveHierarchy;
                      const newExpanded = {};
                      const newAllExpanded = !allExpanded;
                      
                      const processItems = (itemList) => {
                        itemList.forEach(item => {
                          if (item.children && item.children.length > 0) {
                            newExpanded[item.id] = newAllExpanded;
                            processItems(item.children);
                          }
                        });
                      };
                      
                      processItems(currentHierarchy);
                      setExpandedItems(newExpanded);
                      setAllExpanded(newAllExpanded);
                    }}
                    label="Tümünü Aç"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`${activeTab === 'active' ? 'bg-blue-50' : 'bg-indigo-50'}`}>
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Hesap Bilgileri
                      </th>
                      {columnHeaders.map(header => {
                        const [year, period, dataYear] = header.split('-');
                        return (
                          <th key={header} scope="col" className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider min-w-[150px]">
                            <div className="text-center">
                              <div>{year} - {period}</div>
                              <div className="text-xs font-normal text-gray-500 mt-1">{dataYear}</div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(activeTab === 'active' ? activeHierarchy : passiveHierarchy).length === 0 ? (
                      <tr>
                        <td colSpan={columnHeaders.length + 1} className="px-6 py-12 text-center">
                          <div className="text-gray-500">
                            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Veri bulunamadı</h3>
                            <p className="text-gray-500">Bu kategoride hiçbir finansal veri bulunamadı.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      renderHierarchicalRows(activeTab === 'active' ? activeHierarchy : passiveHierarchy)
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Toplam Hesaplar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  AKTİFLER TOPLAMI
                </h3>
                <div className="space-y-3">
                  {columnHeaders.map(header => {
                    const [year, period, dataYear] = header.split('-');
                    return (
                      <div key={header} className="flex justify-between items-center py-2 px-4 bg-white rounded-lg">
                        <span className="font-medium text-gray-700">{year}-{period} ({dataYear})</span>
                        <span className="font-bold text-green-700 text-lg">
                          {new Intl.NumberFormat('tr-TR').format(totals.aktif[header] || 0)} ₺
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  PASİFLER TOPLAMI
                </h3>
                <div className="space-y-3">
                  {columnHeaders.map(header => {
                    const [year, period, dataYear] = header.split('-');
                    return (
                      <div key={header} className="flex justify-between items-center py-2 px-4 bg-white rounded-lg">
                        <span className="font-medium text-gray-700">{year}-{period} ({dataYear})</span>
                        <span className="font-bold text-blue-700 text-lg">
                          {new Intl.NumberFormat('tr-TR').format(totals.pasif[header] || 0)} ₺
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Modern Alert */}
      <ModernAlert {...alertConfig} />
    </div>
  );
};

export default MultiBalanceAnalysis; 