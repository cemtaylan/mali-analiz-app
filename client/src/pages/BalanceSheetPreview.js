import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { BalanceSheetAPI } from '../api/index';

const BalanceSheetPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [balanceSheetData, setBalanceSheetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [expandedItems, setExpandedItems] = useState({});
  const [showEmptyRows, setShowEmptyRows] = useState(false);
  
  // Hiyerarşileri async olarak oluştur
  const [activeHierarchy, setActiveHierarchy] = useState([]);
  const [passiveHierarchy, setPassiveHierarchy] = useState([]);
  const [allExpanded, setAllExpanded] = useState(false);
  
  // Dinamik toplamlar için state
  const [calculatedTotals, setCalculatedTotals] = useState({});

  useEffect(() => {
    console.log('🚀 BalanceSheetPreview component yüklendi');
    fetchPreviewData();
  }, []);

  // Preview verisi için localStorage'dan oku veya state'den al
  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      console.log('📱 Preview verisi alınıyor...');
      
      // State'den analiz verilerini al
      const stateData = location.state;
      let analysisData = null;
      
      if (stateData && stateData.analysisData) {
        console.log('📄 State\'den analiz verisi alındı:', stateData.analysisData);
        analysisData = stateData.analysisData;
      } else {
        // localStorage'dan veri okumayı dene
        console.log('📦 State bulunamadı, localStorage kontrol ediliyor...');
        const previewData = localStorage.getItem('pdfAnalysisData');
        if (!previewData) {
          throw new Error('Preview verisi bulunamadı. Lütfen PDF analizi yapın.');
        }
        analysisData = JSON.parse(previewData);
        console.log('✅ Preview verisi localStorage\'dan alındı:', analysisData);
      }
      
      // Preview verisini uygun formata dönüştür
      const formattedData = {
        id: 'preview',
        company_name: analysisData.detected_data?.company_name || 'Preview Şirketi',
        tax_number: analysisData.detected_data?.tax_number || '',
        year: analysisData.detected_data?.year || new Date().getFullYear(),
        period: analysisData.detected_data?.period || 'YILLIK',
        creation_date: new Date().toISOString().split('T')[0],
        notes: 'PDF Analiz Önizlemesi',
        detected_data: analysisData.detected_data || { items: [] }
      };
      
      setBalanceSheetData(formattedData);
      setError(null);
    } catch (err) {
      console.error('❌ Preview verisi alınamadı:', err);
      setError('Preview verisi yüklenirken bir hata oluştu: ' + err.message);
      setBalanceSheetData(null);
    } finally {
      setLoading(false);
    }
  };

  // Bilanço verisini getir
  const fetchBalanceSheetData = async () => {
    try {
      setLoading(true);
      const response = await BalanceSheetAPI.getBalanceSheetDetail(id);
      console.log('✅ Bilanço verisi alındı:', response);
      
      // API'den gelen veri yapısını kontrol et
      if (response && response.balance_sheet) {
        const balanceSheet = response.balance_sheet;
        const items = response.items || [];
        
        // raw_pdf_data'yı parse et
        let parsedData = null;
        let detectedItems = [];
        
        if (balanceSheet.raw_pdf_data) {
          try {
            parsedData = JSON.parse(balanceSheet.raw_pdf_data);
            console.log('📄 Raw PDF data parse edildi:', parsedData);
            
            // Farklı formatları handle et
            if (parsedData.items && parsedData.items.balance_data) {
              // Format 1: {items: {balance_data: [...]}}
              detectedItems = parsedData.items.balance_data;
              console.log('✅ Format 1 - items.balance_data kullanıldı:', detectedItems.length);
            } else if (parsedData.balance_data) {
              // Format 2: {balance_data: [...]}
              detectedItems = parsedData.balance_data;
              console.log('✅ Format 2 - balance_data kullanıldı:', detectedItems.length);
            } else if (parsedData.detected_data && parsedData.detected_data.items) {
              // Format 3: {detected_data: {items: [...]}} - Preview format
              detectedItems = parsedData.detected_data.items;
              console.log('✅ Format 3 - detected_data.items kullanıldı:', detectedItems.length);
            } else if (Array.isArray(parsedData)) {
              // Format 4: doğrudan array
              detectedItems = parsedData;
              console.log('✅ Format 4 - doğrudan array kullanıldı:', detectedItems.length);
            } else if (parsedData.items && Array.isArray(parsedData.items)) {
              // Format 5: {items: [...]}
              detectedItems = parsedData.items;
              console.log('✅ Format 5 - items array kullanıldı:', detectedItems.length);
            } else {
              console.warn('⚠️ Bilinmeyen raw_pdf_data formatı:', Object.keys(parsedData));
            }
          } catch (parseError) {
            console.error('❌ Raw PDF data parse hatası:', parseError);
          }
        }
        
        // Veriyi uygun formata dönüştür
        const formattedData = {
          id: balanceSheet.id,
          company_name: balanceSheet.company_name,
          tax_number: balanceSheet.tax_number,
          year: balanceSheet.year,
          period: balanceSheet.period,
          creation_date: balanceSheet.creation_date?.split(' ')[0], // Sadece tarih kısmı
          notes: balanceSheet.notes,
          detected_data: {
            company_name: balanceSheet.company_name,
            tax_number: balanceSheet.tax_number,
            items: detectedItems
          }
        };
        
        setBalanceSheetData(formattedData);
        setError(null);
      } else {
        throw new Error('Veri yapısı beklenenden farklı');
      }
    } catch (err) {
      console.error('❌ Bilanço verisi alınamadı:', err);
      setError('Bilanço verisi yüklenirken bir hata oluştu: ' + err.message);
      setBalanceSheetData(null);
    } finally {
      setLoading(false);
    }
  };

  // Hiyerarşileri güncelleyen useEffect
  useEffect(() => {
    const updateHierarchies = async () => {
      if (balanceSheetData?.detected_data?.items?.length > 0) {
        const items = balanceSheetData.detected_data.items;
        const activeH = await buildHierarchy(items, 'active');
        const passiveH = await buildHierarchy(items, 'passive');
        setActiveHierarchy(activeH);
        setPassiveHierarchy(passiveH);
        
        // Toplamları hesapla
        calculateDynamicTotals(activeH, passiveH, items);
      }
    };
    
    updateHierarchies();
  }, [balanceSheetData, showEmptyRows]);

  // Dinamik toplam hesaplama fonksiyonu
  const calculateDynamicTotals = (activeHierarchy, passiveHierarchy, items) => {
    if (!items || items.length === 0) {
      setCalculatedTotals({});
      return;
    }

    // Yıl alanlarını bul
    const yearFields = Object.keys(items[0]).filter(key => /^\d{4}(_E)?$/.test(key));
    const totals = {};

    yearFields.forEach(year => {
      // Aktif toplamı hesapla - sadece A.1 ve A.2 ana kategorilerini topla
      const aktifToplam = calculateMainCategoryTotalFromItems(items, year, ['A.1', 'A.2']);
      
      // Pasif toplamı hesapla - sadece P.1, P.2 ve P.3 ana kategorilerini topla  
      const pasifToplam = calculateMainCategoryTotalFromItems(items, year, ['P.1', 'P.2', 'P.3']);

      totals[year] = {
        aktif: aktifToplam,
        pasif: pasifToplam,
        fark: aktifToplam - pasifToplam,
        dengeli: Math.abs(aktifToplam - pasifToplam) < 0.01
      };
    });

    console.log('📊 Dinamik toplamlar hesaplandı:', totals);
    setCalculatedTotals(totals);
  };

  // Ana kategori toplamlarını orijinal PDF verilerinden hesapla
  const calculateMainCategoryTotalFromItems = (items, year, allowedCategories) => {
    let total = 0;

    items.forEach(item => {
      const definition = item.definition || '';
      
      if (allowedCategories.includes(definition) && item[year] && item[year] !== '-') {
        // Türkçe formatından sayıya dönüştür: "3.882.837,70" -> 3882837.70
        const valueStr = String(item[year]).replace(/\./g, '').replace(',', '.');
        const value = parseFloat(valueStr);
        
        if (!isNaN(value)) {
          total += value;
          console.log(`➕ ${definition} (${year}): "${item[year]}" -> ${value}`);
        }
      }
    });

    return total;
  };

  // Formatlanmış para değeri döndür
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0,00 ₺';
    }
    return amount.toLocaleString('tr-TR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + ' ₺';
  };

  // Hesap adı formatlama fonksiyonu
  const formatAccountName = (name) => {
    if (!name || typeof name !== 'string') return name;
    
    // Başlangıçta tüm string'i temizle
    let cleanName = name.trim();
    
    // Başlangıçtaki nokta ve boşlukları temizle (". B. Menkul Kıymetler" -> "B. Menkul Kıymetler")
    cleanName = cleanName.replace(/^\.+\s*/, '');
    
    // Roma rakamlarındaki İ harflerini I'ya çevir (tüm İ'leri)
    cleanName = cleanName.replace(/İ/g, 'I');
    
    // Başta roma rakamı varsa düzelt (Iii. -> III.)
    cleanName = cleanName.replace(/^(i+|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)\.\s*/gi, (match, roman) => {
      return roman.toUpperCase() + '. ';
    });
    
    // F ile başlayan hesapları kontrol et (F.Ödenecek Vergi...)
    if (cleanName.startsWith('F.') || cleanName.startsWith('F ')) {
      return cleanName.toUpperCase();
    }
    
    // Ana kategorileri kontrol et (A., B., C., D., E., F., G., H., I. gibi)
    const isMainCategory = /^[A-Z]\.\s/.test(cleanName);
    if (isMainCategory) {
      return cleanName.toUpperCase();
    }
    
    // Alt kategorileri kontrol et (A.1, A.2, P.1, P.2 gibi)
    const isSubCategory = /^[A-Z]\.\d+\s/.test(cleanName);
    if (isSubCategory) {
      return cleanName.toUpperCase();
    }
    
    // 3. basamak hesapları kontrol et (A.1.1, A.1.2, P.1.1 gibi)
    const is3rdLevel = /^[A-Z]\.\d+\.\d+\s/.test(cleanName);
    if (is3rdLevel) {
      return cleanName.toUpperCase();
    }
    
    // 4. basamak ve daha alt hesapları kontrol et
    const is4thLevelOrBelow = /^[A-Z]\.\d+\.\d+\.\d+/.test(cleanName);
    if (is4thLevelOrBelow) {
      return cleanName.toLowerCase().replace(/(^|\s|[-.()])[a-züğıöşçA-ZÜĞIÖŞÇıI]/g, (match) => {
        return match.toUpperCase();
      });
    }
    
    // Roma rakamı ile başlayan hesap grupları (III. Kısa Vadeli...)
    if (/^[IVX]+\.\s/i.test(cleanName)) {
      return cleanName.toUpperCase();
    }
    
    // Özel durumlar - tamamen büyük olması gerekenler (genişletilmiş liste)
    const shouldBeUpperCase = [
      'MADDİ DURAN VARLIKLAR',
      'DÖNEN VARLIKLAR', 'DURAN VARLIKLAR', 
      'KISA VADELİ YABANCI KAYNAKLAR', 'UZUN VADELİ YABANCI KAYNAKLAR', 
      'ÖZ KAYNAKLAR', 'DÖNEM KARI',
      'YILLARA YAYGIN', 'GELECEK AYLARA AİT', 'GELİR TAHAKKUKLARI',
      'ÖDENECEK VERGİ', 'DİĞER YÜKÜMLÜLÜKLER', 'INŞAAT VE ONARIM',
      'GIDERLER VE GELIR', 'ALINAN AVANSLAR', 'DİĞER UZUN VADELİ',
      'GEÇMİŞ YILLAR ZARARLARI', 'DİĞER KISA VADELİ', 'GELECEKTEKI AYLARA AİT', 
      'GİDER TAHAKKUKLARI', 'HAZIR DEĞERLER', 'MENKUL KIYMETLER',
      'TİCARİ ALACAKLAR', 'STOKLAR', 'MALİ BORÇLAR', 'TİCARİ BORÇLAR',
      'DİĞER ALACAKLAR', 'DİĞER BORÇLAR', 'ALINAN AVANSLAR',
      'ÖDENECEK VERGİ VE FONLAR', 'ÖDENMİŞ SERMAYE', 'SERMAYE YEDEKLERİ',
      'KARDAN AYRILAN KISITLANMIŞ YEDEKLER', 'NET DÖNEM KARI',
      'KISA VADELİ', 'UZUN VADELİ', 'YABANCI KAYNAKLAR',
      'VERGİ', 'YÜKÜMLÜLÜKLER', 'KAYNAKLAR'
    ];
    
    const upperName = cleanName.toUpperCase();
    if (shouldBeUpperCase.some(term => upperName.includes(term))) {
      return upperName;
    }
    
    // Diğerleri için title case
    return cleanName.toLowerCase().replace(/(^|\s|[-.()])[a-züğıöşçA-ZÜĞIÖŞÇıI]/g, (match) => {
      return match.toUpperCase();
    });
  };

  // Tam hesap listesi oluştur (PDF verisi + hesap planı)
  const buildCompleteItemList = async (pdfItems, type) => {
    if (!showEmptyRows) {
      return pdfItems;
    }

    try {
      const response = await fetch('http://localhost:5002/account-categories');
      if (!response.ok) {
        console.error('Hesap planı API hatası:', response.status);
        return pdfItems;
      }
      
      const accountPlan = await response.json();
      console.log('📋 Hesap planı alındı:', accountPlan.length, 'hesap');
      
      const allItems = [...pdfItems];
      
      accountPlan.forEach(account => {
        const definition = account.code || account.definition || '';
        const shouldInclude = type === 'active' 
          ? definition.startsWith('A.') 
          : definition.startsWith('P.');
        
        if (shouldInclude) {
          const existsInPdf = pdfItems.find(item => 
            (item.definition || '').trim() === definition.trim()
          );
          
          if (!existsInPdf) {
            allItems.push({
              definition: definition,
              description: formatAccountName(account.name || account.description || 'Hesap planı hesabı'),
              '2020': '-',
              '2021': '-',
              fromAccountPlan: true
            });
          }
        }
      });
      
      allItems.sort((a, b) => {
        const defA = a.definition || '';
        const defB = b.definition || '';
        
        if (defA === 'eşleşmedi' && defB !== 'eşleşmedi') return 1;
        if (defB === 'eşleşmedi' && defA !== 'eşleşmedi') return -1;
        if (defA === 'eşleşmedi' && defB === 'eşleşmedi') return 0;
        
        return defA.localeCompare(defB, 'tr', { numeric: true });
      });
      
      return allItems;
    } catch (error) {
      console.error('❌ Hesap planı alınamadı:', error);
      return pdfItems;
    }
  };

  // Hiyerarşik yapı oluşturma
  const buildHierarchy = async (items, type) => {
    const completeItems = await buildCompleteItemList(items, type);
    
    const filteredItems = completeItems.filter(item => {
      const definition = item.definition || '';
      if (type === 'active') {
        return (definition.startsWith('A.') || (definition === 'eşleşmedi' && item.description?.includes('AKTİF')));
      } else {
        return (definition.startsWith('P.') || (definition === 'eşleşmedi' && item.description?.includes('PASİF')));
      }
    });

    const hierarchy = [];
    const itemMap = {};
    
    filteredItems.forEach(item => {
      const parts = (item.definition || '').split('.');
      const level = parts.length;
      item.level = level;
      item.id = item.definition || Math.random().toString();
      itemMap[item.id] = { ...item, children: [] };
    });

    filteredItems.forEach(item => {
      const parts = (item.definition || '').split('.');
      if (parts.length > 1) {
        const parentCode = parts.slice(0, -1).join('.');
        const parent = itemMap[parentCode];
        if (parent && itemMap[item.id]) {
          parent.children.push(itemMap[item.id]);
        } else {
          hierarchy.push(itemMap[item.id]);
        }
      } else {
        hierarchy.push(itemMap[item.id]);
      }
    });

    return hierarchy;
  };

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Tümünü Aç/Kapat fonksiyonları
  const toggleExpandAll = () => {
    const currentHierarchy = activeTab === 'active' ? activeHierarchy : passiveHierarchy;
    const newExpanded = { ...expandedItems };
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
  };

  const renderHierarchicalRows = (items, depth = 0) => {
    const rows = [];

    items.forEach(item => {
      let fontWeight = 'font-normal';
      let bgColor = 'bg-white';
      let textSize = 'text-sm';

      if (depth === 0) {
        fontWeight = 'font-bold';
        bgColor = activeTab === 'active' ? 'bg-blue-100' : 'bg-indigo-100';
        textSize = 'text-base';
      } else if (depth === 1) {
        fontWeight = 'font-semibold';
        bgColor = activeTab === 'active' ? 'bg-blue-50' : 'bg-indigo-50';
      } else if (depth === 2) {
        fontWeight = 'font-medium';
      }

      let paddingClass = '';
      if (depth === 1) {
        paddingClass = 'pl-6';
      } else if (depth === 2) {
        paddingClass = 'pl-12';
      } else if (depth >= 3) {
        paddingClass = 'pl-18';
      }

      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems[item.id];
      
      const hasData = item['2020'] !== '-' || item['2021'] !== '-';
      const statusColor = item.definition && item.definition !== 'eşleşmedi' && hasData ? 'bg-green-500' : 
                         item.definition && item.definition !== 'eşleşmedi' && !hasData ? 'bg-blue-500' : 'bg-gray-400';

      const isMainHeading = /^[IVX]+\./.test(item.description || '');
      const displayDescription = isMainHeading ? 
        (item.description || 'Açıklama yok').toUpperCase() : 
        formatAccountName(item.description || 'Açıklama yok');

      rows.push(
        <tr 
          key={item.id}
          className={`${bgColor} hover:bg-gray-100 transition-colors duration-150 ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={() => hasChildren && toggleItem(item.id)}
        >
          <td className="px-6 py-3 whitespace-nowrap border-r border-gray-200 w-32">
            <div className="flex items-center">
              {/* Hiyerarşi indentasyonu */}
              {depth > 0 && (
                <div className="flex items-center mr-1">
                  {Array.from({ length: depth }).map((_, i) => (
                    <div key={i} className="w-3 flex-shrink-0">
                      {i === depth - 1 ? (
                        <div className="w-2 h-2 border-l border-b border-gray-400 ml-1"></div>
                      ) : (
                        <div className="w-px h-6 bg-gray-300 ml-1"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {hasChildren && (
                <span className="mr-2 text-gray-500 w-4 flex-shrink-0 text-center">
                  {isExpanded ? '−' : '+'}
                </span>
              )}
              <span className={`${textSize} text-gray-900 ${fontWeight} ${depth > 0 ? 'text-blue-700' : ''}`}>
                {item.definition || '-'}
              </span>
            </div>
          </td>
          <td className={`px-6 py-3 ${paddingClass}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${statusColor}`}></div>
              <div className={`${textSize} text-gray-900 ${fontWeight} ${isMainHeading ? 'uppercase' : ''}`}>
                {displayDescription}
              </div>
            </div>
          </td>
          {Object.keys(item).filter(key => /^\d{4}(_E)?$/.test(key)).map(year => (
            <td key={year} className="px-6 py-3 whitespace-nowrap text-right w-40">
              <div className={`${textSize} text-gray-900 font-mono ${fontWeight}`}>
                {item[year] || '-'}
              </div>
            </td>
          ))}
        </tr>
      );

      if (hasChildren && isExpanded) {
        rows.push(...renderHierarchicalRows(item.children, depth + 1));
      }
    });

    return rows;
  };

  const saveBalanceSheet = async () => {
    try {
      setSaving(true);
      
      // Bilançoyu kaydet
      const saveResponse = await BalanceSheetAPI.saveAnalyzedBalanceSheet({
        ...balanceSheetData,
        formData: location.state?.formData
      });
      
      if (saveResponse.success) {
        console.log('✅ Bilanço başarıyla kaydedildi');
        navigate('/balance-sheets', {
          state: {
            success: true,
            message: 'Bilanço başarıyla kaydedildi ve sisteme eklendi!'
          }
        });
      } else {
        throw new Error(saveResponse.error || 'Bilanço kaydedilemedi');
      }
    } catch (error) {
      console.error('❌ Bilanço kaydetme hatası:', error);
      setError('Bilanço kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!balanceSheetData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">❌ Bilanço Bulunamadı</p>
          <p>Belirtilen ID'ye ait bilanço verisi bulunamadı.</p>
      </div>
        <button 
          onClick={() => navigate('/balance-sheets')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
        >
          ← Bilançolara Dön
        </button>
      </div>
    );
  }

  const { detected_data } = balanceSheetData;
  const items = detected_data?.items || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📊 Bilanço Önizlemesi</h1>
              <p className="text-sm text-gray-600">PDF analiz sonuçları ve veri önizlemesi</p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={saveBalanceSheet}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bilançoyu Kaydet
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/balance-sheets')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            >
              ← Geri Dön
            </button>
          </div>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
          <p className="font-bold">⚠️ Bilgi</p>
          <p>{error}</p>
        </div>
      )}

      {/* Bilanço Bilgileri */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-200 p-6 mb-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Şirket</h3>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {balanceSheetData.company_name}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Dönem</h3>
              <p className="text-lg font-bold text-gray-900">
                {balanceSheetData.year} - {balanceSheetData.period}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">VKN</h3>
              <p className="text-lg font-bold text-gray-900">
                {balanceSheetData.tax_number || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Analiz Tarihi</h3>
              <p className="text-lg font-bold text-gray-900">
                {balanceSheetData.creation_date}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Aktif Hesaplar
            </button>
            <button
              onClick={() => setActiveTab('passive')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Financial Data Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 mb-8">
        <div className={`px-6 py-4 ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'} flex items-center justify-between`}>
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
            </svg>
            {activeTab === 'active' ? 'Aktif Hesaplar (Varlıklar)' : 'Pasif Hesaplar (Kaynaklar)'}
          </h2>
          
          {/* Header Controls */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">Boş satırları göster</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showEmptyRows}
                  onChange={(e) => setShowEmptyRows(e.target.checked)}
                />
                <div className="w-9 h-5 bg-white bg-opacity-30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:bg-opacity-40"></div>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-white text-sm font-medium">Tümünü {allExpanded ? 'Kapat' : 'Aç'}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={allExpanded}
                  onChange={toggleExpandAll}
                />
                <div className="w-9 h-5 bg-white bg-opacity-30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:bg-opacity-40"></div>
              </label>
            </div>
          </div>
        </div>

        {(activeTab === 'active' ? activeHierarchy : passiveHierarchy).length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Veri bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">Bu kategoride hiçbir finansal veri bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className={`text-white ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-32">
                    Hesap Kodu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Hesap Adı
                  </th>
                  {items.length > 0 && Object.keys(items[0]).filter(key => /^\d{4}(_E)?$/.test(key)).map(year => (
                    <th key={year} scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider w-40">
                      {year}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === 'active'
                  ? renderHierarchicalRows(activeHierarchy) 
                  : renderHierarchicalRows(passiveHierarchy)
                }
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Financial Summary Section */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bilanço Özeti</h2>
            <p className="text-sm text-gray-600">Toplam aktif ve pasif değerleri</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.length > 0 && Object.keys(items[0]).filter(key => /^\d{4}(_E)?$/.test(key)).map(year => (
            <div key={year} className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <div className="w-4 h-4 bg-gray-600 rounded-full mr-3"></div>
                <h3 className="text-xl font-bold text-gray-900">{year}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-blue-900 font-medium">Toplam Aktif:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(calculatedTotals[year]?.aktif || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-blue-900 font-medium">Toplam Pasif:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(calculatedTotals[year]?.pasif || 0)}
                  </span>
                </div>
                
                <hr className="border-gray-300" />
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700 font-medium">Fark:</span>
                  <span className={`text-lg font-bold ${
                    Math.abs(calculatedTotals[year]?.fark || 0) < 0.01 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(calculatedTotals[year]?.fark || 0))}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700 font-medium">Durum:</span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    Math.abs(calculatedTotals[year]?.fark || 0) < 0.01
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {Math.abs(calculatedTotals[year]?.fark || 0) < 0.01 ? '✓ Dengeli' : '⚠ Dengeli Değil'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notlar */}
      {balanceSheetData.notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">Notlar:</h3>
              <div className="mt-1 text-sm text-blue-800">
                <p>{balanceSheetData.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheetPreview; 