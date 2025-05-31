import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BalanceSheetAPI } from '../api';

const BalanceSheetWithPlan = () => {
  const { id } = useParams();
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [accountCategories, setAccountCategories] = useState([]);
  const [accountBalances, setAccountBalances] = useState({
    current: {},
    previous: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [debugInfo, setDebugInfo] = useState(null); // Debugging için eklendi
  
  // showAllAccounts değişkeni şu anda kullanılmıyor, ihtiyaç olursa etkinleştirilecek
  // const [showAllAccounts, setShowAllAccounts] = useState(true);

  useEffect(() => {
    // Bilanço ve hesap planı verilerini al
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Her seferinde hata durumunu sıfırla
        setDebugInfo(null); // Debugging bilgilerini sıfırla
        
        // API modülünü kullanarak bilançoyu ve hesap planını birlikte getir
        console.log("API isteği gönderiliyor, id:", id);
        
        const combinedData = await BalanceSheetAPI.getBalanceSheetWithPlan(id);
        console.log("Alınan Veriler:", combinedData);
        
        // API yanıtını doğrulama kontrolü - debugging bilgisi ekle
        const debugData = {
          api_keys: Object.keys(combinedData || {}),
          items_type: combinedData && combinedData.items ? typeof combinedData.items : 'undefined',
          items_is_array: combinedData && combinedData.items ? Array.isArray(combinedData.items) : false,
          items_length: combinedData && combinedData.items && Array.isArray(combinedData.items) ? combinedData.items.length : 0,
          account_cats_type: combinedData && combinedData.account_categories ? typeof combinedData.account_categories : 'undefined',
          account_cats_is_array: combinedData && combinedData.account_categories ? Array.isArray(combinedData.account_categories) : false,
          account_cats_length: combinedData && combinedData.account_categories && Array.isArray(combinedData.account_categories) ? combinedData.account_categories.length : 0,
        };
        
        setDebugInfo(debugData);
        console.log("Debug bilgisi:", debugData);
        
        // Bilanço ve hesap planı verilerini ayır
        const balanceSheetData = {
          id: combinedData.id,
          company_name: combinedData.company_name,
          company_id: combinedData.company_id,
          year: combinedData.year,
          period: combinedData.period,
          creation_date: combinedData.creation_date,
          notes: combinedData.notes,
          items: combinedData.items || []
        };
        
        const accountCategoriesData = combinedData.account_categories || [];

        // Veri doğrulama kontrolleri
        if (!accountCategoriesData || accountCategoriesData.length === 0) {
          console.warn("Hesap planı verisi bulunamadı");
          setError("Hesap planı bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.");
          setLoading(false);
          return;
        }

        // items array kontrolü yapılıyor
        if (!balanceSheetData.items || !Array.isArray(balanceSheetData.items) || balanceSheetData.items.length === 0) {
          console.warn("Bilanço kalemleri bulunamadı veya boş bir array", balanceSheetData.items);
          setError(`Bilanço kalemleri yüklenemedi veya boş. API yanıtı: ${JSON.stringify(balanceSheetData)}`);
          setLoading(false);
          return;
        }

        console.log("İşlenecek bilanço kalemleri:", balanceSheetData.items);

        // Cari dönem ve önceki dönem bakiyeleri için iki ayrı map oluştur
        const currentBalanceMap = {};
        const previousBalanceMap = {};
        
        // Hesap planı isimleri için özel düzeltmeler tanımla
        const customAccountNames = {
          'A.1.1': 'HAZIR DEĞERLER', 
          'A.1.3': 'TİCARİ ALACAKLAR',
          'A.1.5': 'STOKLAR',
          'A.2': 'DURAN VARLIKLAR',
          'A.2.4': 'MADDİ DURAN VARLIKLAR',
          'P.1': 'KISA VADELİ YABANCI KAYNAKLAR',
          'P.1.1': 'TİCARİ BORÇLAR',
          'P.2': 'UZUN VADELİ YABANCI KAYNAKLAR',
          'P.3': 'ÖZKAYNAKLAR'
        };
        
        // Hesap planı isimlerini özel düzeltmelerle güncelle
        const updatedAccountCategories = accountCategoriesData.map(category => {
          // Eğer bu hesap kodu için özel bir isim tanımlanmışsa, onu kullan
          if (customAccountNames[category.code]) {
            return {
              ...category,
              originalName: category.name, // Orijinal ismi saklayalım
              name: customAccountNames[category.code]
            };
          }
          return category;
        });
        
        // Hesap kodları tam eşleşmesini sağlamak için tüm bakiyeleri tarayalım
        balanceSheetData.items.forEach(item => {
          // Sayısal veriler API'den geliyorsa doğru şekilde parse et
          let currentAmount = 0;
          let previousAmount = 0;
          
          try {
            // API'den gelen değer bir string ise veya sayı ise uygun şekilde parse et
            currentAmount = typeof item.current_amount === 'string' ? 
              parseFloat(item.current_amount.replace(/\./g, '').replace(',', '.')) : 
              parseFloat(item.current_amount) || 0;
            
            previousAmount = typeof item.previous_amount === 'string' ? 
              parseFloat(item.previous_amount.replace(/\./g, '').replace(',', '.')) : 
              parseFloat(item.previous_amount) || 0;
          } catch (e) {
            console.error(`Bakiye dönüştürme hatası (${item.account_code}): ${e.message}`);
            currentAmount = 0;
            previousAmount = 0;
          }
          
          // Hesap kodunun doğru formatını kullan (API'den gelen formatta nokta olabilir)
          const accountCode = item.account_code;
          
          // API verilerini hesap kategorisi verileriyle eşleştir
          currentBalanceMap[accountCode] = currentAmount;
          previousBalanceMap[accountCode] = previousAmount;
          
          console.log(`API'den bakiye alındı: ${accountCode}, Cari: ${currentAmount}, Önceki: ${previousAmount}`);
        });
        
        // Üst kategoriler için alt kategorilerin bakiyelerini otomatik olarak topla
        // Örneğin A.1.1'in altındaki tüm hesapların toplamını A.1.1 koduna ata
        const calculateParentTotals = (categories) => {
          const parentCodes = new Set();
          
          // Önce tüm üst kategori kodlarını belirleyelim
          categories.forEach(category => {
            if (category.parent_id) {
              const parent = categories.find(p => p.id === category.parent_id);
              if (parent) {
                parentCodes.add(parent.code);
              }
            }
          });
          
          // Şimdi parentCodes'taki her kod için alt hesaplarının toplamını hesaplayalım
          parentCodes.forEach(parentCode => {
            // Bu üst hesabın altındaki tüm hesapları bul
            const childCategories = categories.filter(c => 
              c.code !== parentCode && c.code.startsWith(parentCode + '.')
            );
            
            // Alt hesapların cari ve önceki dönem bakiyelerini topla
            let currentTotal = 0;
            let previousTotal = 0;
            
            childCategories.forEach(child => {
              if (currentBalanceMap[child.code]) {
                currentTotal += currentBalanceMap[child.code];
              }
              
              if (previousBalanceMap[child.code]) {
                previousTotal += previousBalanceMap[child.code];
              }
            });
            
            // Eğer üst kategorinin kendi bakiyesi yoksa, alt hesapların toplamını ata
            if (!currentBalanceMap[parentCode] || currentBalanceMap[parentCode] === 0) {
              currentBalanceMap[parentCode] = currentTotal;
            }
            
            if (!previousBalanceMap[parentCode] || previousBalanceMap[parentCode] === 0) {
              previousBalanceMap[parentCode] = previousTotal;
            }
            
            console.log(`Otomatik toplama: ${parentCode}, Cari: ${currentBalanceMap[parentCode]}, Önceki: ${previousBalanceMap[parentCode]}`);
          });
        };
        
        // Otomatik toplamayı uygula
        calculateParentTotals(accountCategoriesData);

        setBalanceSheet(balanceSheetData);
        setAccountCategories(updatedAccountCategories); // Özelleştirilmiş isimlerle hesap planı
        setAccountBalances({
          current: currentBalanceMap,
          previous: previousBalanceMap
        });
        
        // Debug bilgisi - hesap kategorileri ve bakiyelerini kontrol et
        console.log("Hesap Kategorileri:", updatedAccountCategories);
        console.log("Bakiyeler - Cari:", currentBalanceMap);
        console.log("Bakiyeler - Önceki:", previousBalanceMap);
      } catch (err) {
        console.error("Veri yüklenirken hata oluştu:", err);
        
        // API hata türüne göre kullanıcıya farklı mesajlar göster
        if (err.message && err.message.includes('Network Error')) {
          setError("Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.");
        } else if (err.response && err.response.status === 404) {
          setError("Bilanço bulunamadı veya silinmiş olabilir.");
        } else {
          setError("Bilanço verileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Hesap planını hiyerarşik olarak yapılandırma
  const buildHierarchy = (items, type) => {
    console.log(`buildHierarchy çağrıldı, type: ${type}, items: `, items);
    const filteredItems = items.filter(item => item.type === type);
    console.log(`${type} türündeki filtrelenmiş öğeler:`, filteredItems);
    
    const hierarchy = [];
    const itemMap = {};
    
    // Önce tüm öğeleri kimliklerine göre eşleştir
    filteredItems.forEach(item => {
      itemMap[item.id] = { ...item, children: [] };
    });
    
    // Şimdi ebeveyn-çocuk ilişkilerini kur
    filteredItems.forEach(item => {
      if (item.parent_id) {
        if (itemMap[item.parent_id]) {
          itemMap[item.parent_id].children.push(itemMap[item.id]);
        }
      } else {
        hierarchy.push(itemMap[item.id]);
      }
    });
    
    return hierarchy;
  };

  // Para birimini formatlayan fonksiyon
  const formatCurrency = (amount) => {
    // Türk Lirası için virgül ve nokta formatını doğru şekilde ayarla
    return new Intl.NumberFormat('tr-TR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'decimal', // Para birimi stili
    }).format(amount) + ' ₺';
  };

  // Hesapların hiyerarşik yapısını tablo satırları olarak oluşturma
  const renderCategoryRows = (categories, depth = 0, parentPath = '') => {
    const rows = [];
    
    categories.forEach(category => {
      // Stil belirleme - Derinliğe göre font ağırlığı
      let fontWeight = '';
      if (depth === 0) {
        fontWeight = 'font-bold'; // Ana başlıklar için
      } else if (depth === 1) {
        fontWeight = 'font-semibold'; // Alt başlıklar için
      } else {
        fontWeight = 'font-normal'; // Diğer tüm kalemler için
      }
      
      // Girintileme için padding sınıfı
      let paddingClass = '';
      if (depth === 1) {
        paddingClass = 'pl-4';
      } else if (depth === 2) {
        paddingClass = 'pl-8';
      } else if (depth >= 3) {
        paddingClass = 'pl-12';
      }
      
      // Bu hesap kodu için bakiye var mı kontrol et
      const categoryCode = category.code;
      
      // Hesap koduna göre bakiyeyi bul veya 0 kullan
      const currentAmount = accountBalances.current[categoryCode] || 0;
      const previousAmount = accountBalances.previous[categoryCode] || 0;
      
      // Alt hesapların bakiye toplamını hesapla (eğer bu bir üst kategoriyse)
      // Önemli: Bu kategorinin alt hesaplarının bakiyelerini doğru hesapla
      let childCurrentTotal = 0;
      let childPreviousTotal = 0;
      
      // Alt kategorilerin bakiyelerini toplama fonksiyonu (recursive)
      const calculateChildTotal = (items) => {
        let childCurrent = 0;
        let childPrevious = 0;
        
        for (const child of items) {
          // Bu alt hesabın kendi bakiyesi
          const directCurrentAmount = accountBalances.current[child.code] || 0;
          const directPreviousAmount = accountBalances.previous[child.code] || 0;
          
          // Bakiyeleri topla
          childCurrent += directCurrentAmount;
          childPrevious += directPreviousAmount;
          
          // Alt hesapları varsa onları da hesapla (recursive)
          if (child.children && child.children.length > 0) {
            const [subChildCurrent, subChildPrevious] = calculateChildTotal(child.children);
            childCurrent += subChildCurrent;
            childPrevious += subChildPrevious;
          }
        }
        
        return [childCurrent, childPrevious];
      };
      
      // Alt hesaplar varsa toplamlarını hesapla
      if (category.children && category.children.length > 0) {
        [childCurrentTotal, childPreviousTotal] = calculateChildTotal(category.children);
      }
      
      // Bakiye kontrolü
      const hasDirectBalance = currentAmount > 0 || previousAmount > 0;
      const hasChildBalance = childCurrentTotal > 0 || childPreviousTotal > 0;
      const hasBalance = hasDirectBalance || hasChildBalance;
      
      // Gösterilecek değerler - Önemli değişiklik:
      // Üst kategoriler için alt kategorilerin toplamını göster, direkt bakiye varsa onu göster
      let displayCurrentAmount = currentAmount;
      let displayPreviousAmount = previousAmount;
      
      // Eğer bu bir üst kategori ise (çocukları varsa) ve kendi bakiyesi yoksa alt hesapların toplamını göster
      if (category.children && category.children.length > 0 && !hasDirectBalance) {
        displayCurrentAmount = childCurrentTotal;
        displayPreviousAmount = childPreviousTotal;
      }
      
      // Değişim yüzdesi hesapla
      let changePercent = 0;
      if (displayPreviousAmount > 0) {
        changePercent = ((displayCurrentAmount - displayPreviousAmount) / displayPreviousAmount) * 100;
      }
      
      // Değişim rengi belirle
      let changeColor = 'text-gray-500';
      let percentBackground = '';
      
      if (changePercent > 10) {
        changeColor = 'text-green-700 font-bold';
        percentBackground = 'bg-green-100 px-2 py-1 rounded-md';
      } else if (changePercent > 0) {
        changeColor = 'text-green-600';
        percentBackground = 'bg-green-50 px-2 py-1 rounded-md';
      } else if (changePercent < -10) {
        changeColor = 'text-red-700 font-bold';
        percentBackground = 'bg-red-100 px-2 py-1 rounded-md';
      } else if (changePercent < 0) {
        changeColor = 'text-red-600';
        percentBackground = 'bg-red-50 px-2 py-1 rounded-md';
      }
      
      // Satır arkaplan rengi
      let rowBgClass = depth % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100";
      
      // Ana kategoriler için farklı renkler kullan
      if (depth === 0) {
        rowBgClass = activeTab === 'active' ? "bg-blue-50 hover:bg-blue-100" : "bg-indigo-50 hover:bg-indigo-100";
      } else if (depth === 1) {
        rowBgClass = activeTab === 'active' ? "bg-blue-50/70 hover:bg-blue-100/70" : "bg-indigo-50/70 hover:bg-indigo-100/70"; 
      }
      
      // Hesap bakiyesi olup olmadığına göre satır stilini değiştir
      if (hasBalance) {
        if (depth === 0) {
          rowBgClass = activeTab === 'active' ? "bg-blue-100 hover:bg-blue-200" : "bg-indigo-100 hover:bg-indigo-200";
        } else if (depth === 1) {
          rowBgClass = activeTab === 'active' ? "bg-blue-50 hover:bg-blue-100" : "bg-indigo-50 hover:bg-indigo-100";
        } else {
          rowBgClass = hasDirectBalance ? 
            (activeTab === 'active' ? "bg-blue-50/50 hover:bg-blue-100/50" : "bg-indigo-50/50 hover:bg-indigo-100/50") : 
            rowBgClass;
        }
      }
      
      // Hücre içindeki renk ve yazı tipi ayarları
      let cellClass = "";
      let amountClass = "";
      
      if (depth === 0) {
        // Ana kategoriler için farklı stil
        cellClass = "border-t border-b border-gray-200";
        amountClass = "font-bold text-gray-900";
      } else if (depth === 1) {
        // Alt kategoriler için farklı stil
        cellClass = "border-b border-gray-100";
        amountClass = "font-semibold text-gray-800";
      } else {
        // En alt hesaplar için stil
        amountClass = hasDirectBalance ? "font-medium text-blue-800" : "text-gray-500";
      }
      
      rows.push(
        <tr key={category.id} className={`transition-colors duration-150 ${rowBgClass} ${cellClass}`}>
          <td className="px-6 py-3 whitespace-nowrap border-r border-gray-100 w-1/6">
            <div className="text-sm text-gray-900 font-medium">{category.code}</div>
          </td>
          <td className="px-6 py-3 w-3/6">
            <div className={`text-sm text-gray-900 ${fontWeight} ${paddingClass}`}>
              {category.name}
            </div>
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-right w-1/6">
            <div className={`text-sm ${amountClass}`}>
              {displayPreviousAmount > 0 ? formatCurrency(displayPreviousAmount) : '-'}
            </div>
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-right w-1/6">
            <div className={`text-sm ${amountClass}`}>
              {displayCurrentAmount > 0 ? formatCurrency(displayCurrentAmount) : '-'}
            </div>
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-right">
            <div className={`text-sm inline-block ${changeColor} ${percentBackground}`}>
              {hasBalance && displayPreviousAmount > 0 ? 
                (changePercent > 0 ? '+' : '') + changePercent.toFixed(2) + '%' : 
                '-'
              }
            </div>
          </td>
        </tr>
      );
      
      // Alt kategorileri ayrı ayrı işle
      if (category.children && category.children.length > 0) {
        rows.push(...renderCategoryRows(category.children, depth + 1, parentPath + category.code + '/'));
      }
    });
    
    return rows;
  };

  // Toplam değerleri hesapla
  const calculateTotal = (balances, type) => {
    return Object.entries(balances)
      .filter(([code]) => code.startsWith(type))
      .reduce((total, [_, amount]) => total + amount, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Hata</p>
          <p>{error}</p>
          
          {/* Debug bilgisi - geliştirici modunda gösterilecek */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
              <details>
                <summary className="cursor-pointer font-bold text-gray-700">Geliştirici Bilgisi</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          <div className="mt-4">
            <Link 
              to="/balance-sheets" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded mr-3"
            >
              Bilanço Listesine Dön
            </Link>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!balanceSheet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">Veri Bulunamadı</p>
          <p>Bilanço verileri yüklenemedi. İlgili bilanço bulunamıyor olabilir.</p>
          <div className="mt-4">
            <Link 
              to="/balance-sheets" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            >
              Bilanço Listesine Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Hesap planı verisi var mı kontrol et
  if (!accountCategories || accountCategories.length === 0) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
        <p className="font-bold">Uyarı</p>
        <p>Hesap planı bulunamadı.</p>
      </div>
    );
  }

  const activeHierarchy = buildHierarchy(accountCategories, 'active');
  console.log("Aktif Hesap Hiyerarşisi:", activeHierarchy);
  
  const passiveHierarchy = buildHierarchy(accountCategories, 'passive');
  console.log("Pasif Hesap Hiyerarşisi:", passiveHierarchy);

  const totalActiveCurrent = calculateTotal(accountBalances.current, 'A');
  console.log("Aktif Toplam (Cari):", totalActiveCurrent);
  
  const totalPassiveCurrent = calculateTotal(accountBalances.current, 'P');
  console.log("Pasif Toplam (Cari):", totalPassiveCurrent);

  const totalActivePrevious = calculateTotal(accountBalances.previous, 'A');
  const totalPassivePrevious = calculateTotal(accountBalances.previous, 'P');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link to="/balance-sheets" className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition duration-150 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Bilançolara Dön
        </Link>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg rounded-lg p-6 mb-8 border border-blue-100">
        <div className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {balanceSheet.company_name}
          </h1>
          <div className="text-blue-700 font-semibold text-lg">
            {balanceSheet.year} {balanceSheet.period} - Hesap Planı Görünümü
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 border-t border-blue-100 pt-4">
          <div className="bg-white rounded-lg px-4 py-3 shadow-sm flex flex-col items-center md:items-start mb-4 md:mb-0">
            <p className="text-sm text-gray-500 mb-1">Oluşturma Tarihi</p>
            <p className="text-gray-800 font-medium">{balanceSheet.creation_date}</p>
          </div>
          
          {balanceSheet.notes && (
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm flex flex-col items-center md:items-start">
              <p className="text-sm text-gray-500 mb-1">Notlar</p>
              <p className="text-gray-800 font-medium">{balanceSheet.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center mb-6 justify-between">
        <div className="flex">
          <button
            className={`px-6 py-2 rounded-tl-lg rounded-tr-lg font-medium transition duration-150 ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Aktifler
          </button>
          <button
            className={`ml-2 px-6 py-2 rounded-tl-lg rounded-tr-lg font-medium transition duration-150 ${
              activeTab === 'passive'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('passive')}
          >
            Pasifler
          </button>
        </div>
        
        {/* Bilgilendirme Metni */}
        <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-md">
          <span className="font-medium">Bilgi:</span> Hesap planındaki tüm hesaplar görüntüleniyor
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`text-white ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/6">
                Kod
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-3/6">
                Hesap Adı
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider w-1/6">
                Önceki Dönem
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider w-1/6">
                Cari Dönem
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Değişim %
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeTab === 'active' ? renderCategoryRows(activeHierarchy) : renderCategoryRows(passiveHierarchy)}
            <tr className={`font-bold ${activeTab === 'active' ? 'bg-blue-100' : 'bg-indigo-100'} border-t-2 ${activeTab === 'active' ? 'border-blue-300' : 'border-indigo-300'}`}>
              <td className="px-6 py-4 whitespace-nowrap"></td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-lg">TOPLAM</td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-lg">
                {formatCurrency(activeTab === 'active' ? totalActivePrevious : totalPassivePrevious)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-lg">
                {formatCurrency(activeTab === 'active' ? totalActiveCurrent : totalPassiveCurrent)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-lg">
                {activeTab === 'active' && totalActivePrevious > 0
                  ? (((totalActiveCurrent - totalActivePrevious) / totalActivePrevious) * 100).toFixed(2)
                  : activeTab === 'passive' && totalPassivePrevious > 0
                  ? (((totalPassiveCurrent - totalPassivePrevious) / totalPassivePrevious) * 100).toFixed(2)
                  : "0.00"
                }%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Yardım Bilgisi */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <p className="font-medium mb-1">Bilgi:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Bakiyesi olan hesaplar renkli arka planla gösterilir.</li>
          <li>Ana kategori hesapları (ör. DÖNEN VARLIKLAR), alt hesaplarının toplamını gösterir.</li>
          <li>Değişim yüzdesi, bir önceki döneme göre değişimi ifade eder.</li>
          <li>Gösterilen hesap planı, sistemde tanımlı resmi hesap planından alınmaktadır.</li>
        </ul>
      </div>
    </div>
  );
};

export default BalanceSheetWithPlan; 