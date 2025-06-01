import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AccountCategoryAPI, BalanceSheetAPI } from '../api';

// Gemini ile analiz edilmiş veriyi localStorage'a kaydet
const saveGeminiDataToLocalStorage = () => {
  // Örnek Gemini analiz verisi - gerçek veri bu formatta gelecek
  const geminiData = {
    success: true,
    detected_data: {
      company_name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.",
      tax_number: "6140087281",
      trade_registry_number: "TEKKEKÖY-328",
      email: "info@memsanmakina.com",
      year: 2023,
      period: "YILLIK",
      previous_period_year: 2022,
      current_period_year: 2023,
      items: [
        {
          account_code: "A.1.1.1",
          account_name: "KASA",
          description: "KASA",
          "2023": "125.000,00",
          "2022": "100.000,00"
        },
        {
          account_code: "A.1.1.3",
          account_name: "BANKALAR",
          description: "BANKALAR",
          "2023": "385.000,00",
          "2022": "320.000,00"
        },
        {
          account_code: "A.1.3.1",
          account_name: "ALICILAR",
          description: "ALICILAR",
          "2023": "750.000,00",
          "2022": "650.000,00"
        },
        {
          account_code: "A.1.5.1",
          account_name: "İLK MADDE VE MALZEME",
          description: "İLK MADDE VE MALZEME",
          "2023": "175.000,00",
          "2022": "155.000,00"
        },
        {
          account_code: "A.2.4.1",
          account_name: "ARAZİ VE ARSALAR",
          description: "ARAZİ VE ARSALAR",
          "2023": "850.000,00",
          "2022": "850.000,00"
        },
        {
          account_code: "A.1",
          account_name: "DÖNEN VARLIKLAR",
          description: "DÖNEN VARLIKLAR TOPLAMI",
          "2023": "1.310.000,00",
          "2022": "1.125.000,00"
        },
        {
          account_code: "A.2",
          account_name: "DURAN VARLIKLAR",
          description: "DURAN VARLIKLAR TOPLAMI",
          "2023": "850.000,00",
          "2022": "850.000,00"
        },
        {
          account_code: "P.1.1.1",
          account_name: "BANKA KREDİLERİ",
          description: "BANKA KREDİLERİ",
          "2023": "230.000,00",
          "2022": "180.000,00"
        },
        {
          account_code: "P.1.2.1",
          account_name: "SATICILAR",
          description: "SATICILAR",
          "2023": "185.000,00",
          "2022": "140.000,00"
        },
        {
          account_code: "P.1.3.1",
          account_name: "ORTAKLARA BORÇLAR",
          description: "ORTAKLARA BORÇLAR",
          "2023": "120.000,00",
          "2022": "95.000,00"
        },
        {
          account_code: "P.2.1.1",
          account_name: "UZUN VADELİ BANKA KREDİLERİ",
          description: "UZUN VADELİ BANKA KREDİLERİ",
          "2023": "450.000,00",
          "2022": "380.000,00"
        },
        {
          account_code: "P.3.1.1",
          account_name: "SERMAYE",
          description: "SERMAYE",
          "2023": "915.000,00",
          "2022": "903.500,00"
        },
        {
          account_code: "P.1",
          account_name: "KISA VADELİ BORÇLAR",
          description: "KISA VADELİ BORÇLAR TOPLAMI",
          "2023": "535.000,00",
          "2022": "415.000,00"
        },
        {
          account_code: "P.2",
          account_name: "UZUN VADELİ BORÇLAR",
          description: "UZUN VADELİ BORÇLAR TOPLAMI",
          "2023": "450.000,00",
          "2022": "380.000,00"
        },
        {
          account_code: "P.3",
          account_name: "ÖZKAYNAKLAR",
          description: "ÖZKAYNAKLAR TOPLAMI",
          "2023": "915.000,00",
          "2022": "903.500,00"
        }
      ]
    }
  };

  try {
    localStorage.setItem('pdfAnalysisData', JSON.stringify(geminiData));
    console.log('✅ Gemini analiz verisi localStorage\'a kaydedildi');
    return true;
  } catch (error) {
    console.error('❌ localStorage kaydetme hatası:', error);
    return false;
  }
};

const BalanceSheetPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [accountCategories, setAccountCategories] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [showEmptyRows, setShowEmptyRows] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [activeHierarchy, setActiveHierarchy] = useState([]);
  const [passiveHierarchy, setPassiveHierarchy] = useState([]);

  // JSON verisine göre analiz sonuçlarını yükle
  useEffect(() => {
    const initializePreview = async () => {
      try {
        setLoading(true);
        setError(null);

        // State'den analiz verilerini al
        const stateData = location.state;
        
        if (stateData && stateData.analysisData) {
          console.log('📄 State\'den analiz verisi alındı:', stateData.analysisData);
          
          // Eğer JSON formatında geliyorsa işle
          if (stateData.analysisData.detected_data) {
            setAnalyzedData(stateData.analysisData);
            
            // Önizleme verisi hazırla
            const previewResponse = await BalanceSheetAPI.prepareBalanceSheetPreview(stateData.analysisData);
            
            if (previewResponse.success) {
              setPreviewData(previewResponse.preview_data);
              console.log('✅ Önizleme verisi hazırlandı:', previewResponse.preview_data);
            } else {
              throw new Error(previewResponse.error);
            }
          } else {
            // Eski format compatibility
            setAnalyzedData(stateData.analysisData);
          }
        } else {
          // localStorage'dan veri okumayı dene
          console.log('📱 State bulunamadı, localStorage kontrol ediliyor...');
          
          const storageData = localStorage.getItem('pdfAnalysisData');
          if (storageData) {
            console.log('📦 Preview verisi localStorage\'dan okunuyor...');
            const parsedData = JSON.parse(storageData);
            console.log('📄 Preview verisi alındı:', parsedData);
            
            // Veri formatını kontrol et ve düzelt
            let processedData = parsedData;
            if (parsedData.detected_data && parsedData.detected_data.items) {
              // Doğru format - doğrudan kullan
              setAnalyzedData(parsedData);
            
            // Önizleme verisi hazırla
            const previewResponse = await BalanceSheetAPI.prepareBalanceSheetPreview(parsedData);
            
            if (previewResponse.success) {
              setPreviewData(previewResponse.preview_data);
                console.log('✅ Önizleme verisi hazırlandı:', previewResponse.preview_data);
              } else {
                throw new Error(previewResponse.error);
              }
            } else if (parsedData.items) {
              // Eski format - güncelle
              processedData = {
                success: true,
                detected_data: {
                  company_name: parsedData.company_name || "Bilinmiyor",
                  tax_number: parsedData.tax_number || "",
                  year: parsedData.year || new Date().getFullYear(),
                  period: parsedData.period || "YILLIK",
                  items: parsedData.items
                }
              };
              setAnalyzedData(processedData);
              
              // Önizleme verisi hazırla
              const previewResponse = await BalanceSheetAPI.prepareBalanceSheetPreview(processedData);
              
              if (previewResponse.success) {
                setPreviewData(previewResponse.preview_data);
              } else {
                throw new Error(previewResponse.error);
              }
            } else {
              console.warn('⚠️ localStorage verisi beklenenden farklı format:', Object.keys(parsedData));
              throw new Error('localStorage verisi geçersiz formatta');
            }
          } else {
            // Demo veri kullan
            console.log('🎭 Demo veri kullanılıyor...');
            saveGeminiDataToLocalStorage();
            const demoData = JSON.parse(localStorage.getItem('pdfAnalysisData'));
            setAnalyzedData(demoData);
            
            // Önizleme verisi hazırla
            const previewResponse = await BalanceSheetAPI.prepareBalanceSheetPreview(demoData);
            
            if (previewResponse.success) {
              setPreviewData(previewResponse.preview_data);
            } else {
              throw new Error(previewResponse.error);
            }
          }
        }

      } catch (err) {
        console.error('❌ Önizleme verisi yükleme hatası:', err);
        setError(`Önizleme verisi yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializePreview();
  }, [location.state]);

  // PDF verilerini hesap planı ile eşleştir
  const createPdfDataMap = () => {
    if (!previewData || !previewData.detected_data.items) return {};
    
    const map = {};
    previewData.detected_data.items.forEach(item => {
      if (item.account_code || item.definition) {
        const key = item.account_code || item.definition;
        map[key] = item.year_data || item;
      }
    });
    
    return map;
  };

  // Hesap kategorilerini yükle
  useEffect(() => {
    const fetchAccountCategories = async () => {
      try {
        const categories = await AccountCategoryAPI.getAllAccountCategories();
        setAccountCategories(categories || []);
      } catch (error) {
        console.error('Hesap planı yüklenirken hata:', error);
        setAccountCategories([]);
      }
    };

    fetchAccountCategories();
  }, []);

  // Hiyerarşileri güncelleyen useEffect
  useEffect(() => {
    const updateHierarchies = async () => {
      if (previewData?.detected_data?.items?.length > 0) {
        const items = previewData.detected_data.items;
        console.log('🔍 Preview Data Items:', items);
        console.log('🔍 Sample Item:', items[0]);
        console.log('🔍 Year Columns:', getYearColumns());
        
        const activeH = await buildHierarchy(items, 'active');
        const passiveH = await buildHierarchy(items, 'passive');
        setActiveHierarchy(activeH);
        setPassiveHierarchy(passiveH);
      }
    };
    
    updateHierarchies();
  }, [previewData, showEmptyRows]);

  // Bilanço verisini kaydet
  const saveBalanceSheet = async () => {
    console.log('🔥 VERİLERİ KAYDET BUTONUNA TIKLANDI!');
    setSaving(true);
    
    try {
      let dataToSave = analyzedData;

      console.log('📊 Mevcut analiz verisi:', analyzedData);
      console.log('📊 Mevcut preview verisi:', previewData);

      // Veri kontrolü ve hazırlama
      if (!analyzedData || !analyzedData.detected_data) {
        console.log('❌ Analiz verisi eksik, alternatif veri kaynaklarını kontrol ediliyor...');
        
        // localStorage'dan veri okumayı dene
        const storageData = localStorage.getItem('pdfAnalysisData');
        if (storageData) {
          const parsedData = JSON.parse(storageData);
          dataToSave = parsedData;
          console.log('📦 localStorage\'dan veri kullanıldı:', dataToSave);
        } else if (previewData) {
          // previewData'dan veri oluştur
          console.log('🔄 previewData\'dan veri oluşturuluyor...');
          dataToSave = {
            detected_data: previewData.detected_data,
            company_info: previewData.company_info,
            analysis_metadata: previewData.analysis_metadata
          };
          console.log('📝 previewData\'dan oluşturulan veri:', dataToSave);
        } else {
          // Son çare: demo veri oluştur
          console.log('🎭 Demo veri oluşturuluyor...');
          saveGeminiDataToLocalStorage();
          const demoData = JSON.parse(localStorage.getItem('pdfAnalysisData'));
          dataToSave = demoData;
          console.log('🎭 Demo veri oluşturuldu ve kullanıldı:', dataToSave);
        }
        
        // State'i güncelle
        setAnalyzedData(dataToSave);
      }

      // Veri doğrulama
      if (!dataToSave || !dataToSave.detected_data) {
        throw new Error('Kaydetmek için geçerli veri bulunamadı!');
      }

      if (!dataToSave.detected_data.items || dataToSave.detected_data.items.length === 0) {
        throw new Error('Kaydedilecek hesap kalemi bulunamadı!');
      }

      // Veri formatını backend için düzenle - year_data nested yapısını düzelt
      const processedData = {
        ...dataToSave,
        detected_data: {
          ...dataToSave.detected_data,
          items: dataToSave.detected_data.items.map(item => {
            // Eğer year_data nested ise, ana seviyeye çıkar
            if (item.year_data && typeof item.year_data === 'object') {
              return {
                account_code: item.definition || item.account_code,
                account_name: item.description || item.account_name,
                description: item.description || item.account_name,
                ...item.year_data,  // year_data içindeki tüm yıl verilerini ana seviyeye çıkar
                // Diğer alanları koru
                definition: item.definition,
                raw_item: item.raw_item
              };
            } else {
              // Zaten düz yapıda ise olduğu gibi bırak
              return {
                account_code: item.definition || item.account_code,
                account_name: item.description || item.account_name,
                description: item.description || item.account_name,
                ...item
              };
            }
          })
        }
      };

      console.log('🔧 İşlenmiş veri örneği:', processedData.detected_data.items[0]);

      // Kaydetme öncesi veri özeti
      const saveInfo = {
        company_name: processedData.company_info?.name || processedData.detected_data?.company_name || 'Bilinmeyen Şirket',
        tax_number: processedData.company_info?.tax_number || processedData.detected_data?.tax_number,
        year: processedData.detected_data?.year || new Date().getFullYear(),
        period: processedData.detected_data?.period || 'YILLIK',
        items_count: processedData.detected_data.items.length
      };

      console.log('📊 Kaydedilecek veri özeti:', saveInfo);

      // Kullanıcıya onay sor
      const confirmMessage = `${saveInfo.company_name} şirketi için ${saveInfo.year} ${saveInfo.period} dönemi bilançosunu kaydetmek istediğinize emin misiniz?\n\n` +
        `📊 Kaydedilecek kalem sayısı: ${saveInfo.items_count}\n` +
        `🏢 VKN: ${saveInfo.tax_number || 'Belirtilmemiş'}\n\n` +
        `Bu işlem mevcut verilerin üzerine yazabilir.`;

      if (!window.confirm(confirmMessage)) {
        console.log('❌ Kullanıcı kaydetme işlemini iptal etti');
        setSaving(false);
        return;
      }

      console.log('🌐 API çağrısı yapılıyor...');
      const saveResponse = await BalanceSheetAPI.saveBalanceSheetFromPreview(processedData);
      
      console.log("✅ Backend yanıtı alındı:", saveResponse);
      
      if (saveResponse && (saveResponse.success !== false)) {
        console.log("✅ Bilanço başarıyla kaydedildi!");
        
        // Başarı mesajı göster
        alert(`✅ Bilanço başarıyla kaydedildi!\n\n` +
          `🏢 Şirket: ${saveResponse.company_name || saveInfo.company_name}\n` +
          `📅 Dönem: ${saveResponse.year || saveInfo.year} ${saveResponse.period || saveInfo.period}\n` +
          `📊 Kaydedilen kalem: ${saveResponse.items_saved || saveInfo.items_count}\n\n` +
          `Ana sayfaya yönlendiriliyorsunuz...`);
        
        // Başarılı kaydetme sonrası yönlendirme
        navigate('/balance-sheets', {
          state: {
            success: true,
            message: `${saveResponse.company_name || saveInfo.company_name} ${saveResponse.year || saveInfo.year} ${saveResponse.period || saveInfo.period} dönemi başarıyla kaydedildi. (${saveResponse.items_saved || saveInfo.items_count} kalem)`
          }
        });
      } else {
        throw new Error(saveResponse.error || 'Bilinmeyen bir hata oluştu');
      }
      
    } catch (error) {
      console.error('❌ Bilanço kaydetme hatası:', error);
      console.error('❌ Hata detayları:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      // Kullanıcıya hata mesajı göster
      let errorMessage = `❌ Bilanço kaydedilemedi!\n\nHata: ${error.message}`;
      
      if (error.response?.data?.error) {
        errorMessage += `\n\nDetay: ${error.response.data.error}`;
      }
      
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        errorMessage += `\n\n🔧 Çözüm önerileri:\n• Backend server'ının çalıştığından emin olun\n• Port 5002'nin açık olduğunu kontrol edin\n• İnternet bağlantınızı kontrol edin`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
      console.log('🏁 Kaydet işlemi tamamlandı, saving state false yapıldı');
    }
  };

  // Hiyerarşi oluşturma fonksiyonu
  const buildHierarchy = async (items, type) => {
    if (!items || !Array.isArray(items)) return [];
    
    // Önce tüm hesap planı ile birleştir
    const completeItems = await buildCompleteItemList(items, type);
    
    const filteredItems = completeItems.filter(item => {
      const definition = item.definition || item.account_code || '';
      if (type === 'active') {
        return (definition.startsWith('A.') || (definition === 'eşleşmedi' && item.description?.includes('AKTİF')));
      } else {
        return (definition.startsWith('P.') || (definition === 'eşleşmedi' && item.description?.includes('PASİF')));
      }
    });

    const hierarchy = [];
    const itemMap = {};
    
    filteredItems.forEach(item => {
      const parts = (item.definition || item.account_code || '').split('.');
      const level = parts.length;
      item.level = level;
      item.id = item.definition || item.account_code || Math.random().toString();
      itemMap[item.id] = { ...item, children: [] };
    });

    filteredItems.forEach(item => {
      const parts = (item.definition || item.account_code || '').split('.');
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

  // Hesap planı ile PDF verilerini birleştir
  const buildCompleteItemList = async (pdfItems, type) => {
    const yearColumns = getYearColumns();
    console.log('📊 Year columns found:', yearColumns);
    
    // PDF verilerinin map'ini oluştur
    const pdfDataMap = {};
    pdfItems.forEach(item => {
      const key = item.definition || item.account_code || '';
      if (key) {
        pdfDataMap[key] = item;
      }
    });

    // Hesap kategorilerinden ilgili olanları al
    const relevantCategories = accountCategories.filter(cat => cat.type === type);
    console.log(`📋 ${type} kategorileri:`, relevantCategories.length);

    // Hem PDF hem hesap planı verilerini birleştir
    const combinedItems = [];
    
    // Önce PDF'deki verileri ekle
    pdfItems.forEach(item => {
      const definition = item.definition || item.account_code || '';
      if (type === 'active' ? definition.startsWith('A.') : definition.startsWith('P.')) {
        
        // Veri yapısını kontrol et ve year_data'dan değerleri çıkar
        let yearData = {};
        if (item.year_data && typeof item.year_data === 'object') {
          yearData = item.year_data;
          console.log(`📊 Year data found for ${definition}:`, yearData);
        } else {
          // Doğrudan item'da yıl verileri varsa onları kullan
          yearColumns.forEach(year => {
            if (item[year]) {
              yearData[year] = item[year];
            }
          });
        }

        combinedItems.push({
          ...item,
          id: definition,
          definition: definition,
          account_code: definition,
          description: item.description || item.account_name || '',
          hasData: yearColumns.some(year => yearData[year] && yearData[year] !== '-' && yearData[year] !== '0,00'),
          ...yearData  // year_data'daki tüm yıl verilerini spread et
        });
      }
    });

    // Eğer "Boş satırları göster" aktifse, hesap planındaki eksik kalemleri de ekle
    if (showEmptyRows) {
      relevantCategories.forEach(cat => {
        if (!pdfDataMap[cat.code]) {
          combinedItems.push({
            id: cat.code,
            definition: cat.code,
            account_code: cat.code,
            description: cat.name,
            hasData: false,
            ...yearColumns.reduce((acc, year) => {
              acc[year] = '-';
              return acc;
            }, {})
          });
        }
      });
    }

    console.log(`📊 Combined items (${type}):`, combinedItems.length);
    console.log(`📊 Sample combined item:`, combinedItems[0]);
    return combinedItems;
  };

  // Para formatı
  const formatCurrency = (amount) => {
    if (!amount || amount === '-' || amount === '0,00') return '-';
    
    let numAmount;
    
    if (typeof amount === 'string') {
      // Türkçe format: "125.000,00" -> 125000.00
      if (amount.includes(',')) {
        const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
        numAmount = parseFloat(cleanAmount);
      } else {
        // İngilizce format: "125000.00" -> 125000.00
        numAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
      }
    } else {
      numAmount = parseFloat(amount);
    }
    
    if (isNaN(numAmount) || numAmount === 0) return '-';
    
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Hesap adını formatla  
  const formatAccountName = (name) => {
    if (!name) return 'Belirtilmemiş';
    
    // Her kelimenin baş harfini büyük yap (Title Case)
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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

  // Hiyerarşik satırları render etme
  const renderHierarchicalRows = (items, depth = 0) => {
    if (!items || !Array.isArray(items)) return [];
    
    const rows = [];

    items.forEach(item => {
      if (!item) return;
      
      let fontWeight = 'font-normal';
      let bgColor = 'bg-white';
      let textSize = 'text-sm';
      let isUpperCase = false;

      // Resimdeki gibi hiyerarşi düzenlemesi
      if (depth === 0) {
        // Ana kategoriler (A.1, A.2, P.1, P.2, P.3) - büyük yazı, kalın, büyük harfler
        fontWeight = 'font-bold';
        bgColor = activeTab === 'active' ? 'bg-blue-100' : 'bg-indigo-100';
        textSize = 'text-base';
        isUpperCase = true;
      } else if (depth === 1) {
        // Alt kategoriler (A.1.1, A.1.2) - orta boyut, yarı kalın, büyük harfler  
        fontWeight = 'font-semibold';
        bgColor = activeTab === 'active' ? 'bg-blue-50' : 'bg-indigo-50';
        textSize = 'text-sm';
        isUpperCase = true;
      } else if (depth === 2) {
        // En alt seviye (A.1.1.1, A.1.1.3) - normal boyut, orta kalın, normal harfler
        fontWeight = 'font-medium';
        textSize = 'text-sm';
        isUpperCase = false;
      } else {
        // Daha derin seviyeler - normal boyut, normal kalın, normal harfler
        fontWeight = 'font-normal';
        textSize = 'text-xs';
        isUpperCase = false;
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
      
      const yearColumns = getYearColumns();
      const hasData = yearColumns.some(year => item[year] && item[year] !== '-' && item[year] !== '0,00');
      const statusColor = item.definition && item.definition !== 'eşleşmedi' && hasData ? 'bg-green-500' : 
                         item.definition && item.definition !== 'eşleşmedi' && !hasData ? 'bg-blue-500' : 'bg-gray-400';

      // Hesap adını formatla - resimdeki gibi
      let displayDescription = item.description || item.account_name || 'Açıklama yok';
      
      if (isUpperCase) {
        displayDescription = displayDescription.toUpperCase();
      } else {
        // Normal case - formatAccountName kullanarak her kelimenin baş harfini büyük yap
        displayDescription = formatAccountName(displayDescription);
      }

      rows.push(
        <tr 
          key={item.id || Math.random()}
          className={`${bgColor} hover:bg-gray-100 transition-colors duration-150 ${hasChildren ? 'cursor-pointer' : ''}`}
          onClick={() => hasChildren && toggleItem(item.id)}
        >
          <td className="px-6 py-3 whitespace-nowrap border-r border-gray-200 w-1/6">
            <div className="flex items-center">
              {hasChildren && (
                <span className="mr-2 text-gray-500 w-4 flex-shrink-0">
                  {isExpanded ? '−' : '+'}
                </span>
              )}
              <span className={`${textSize} text-gray-900 ${fontWeight}`}>
                {item.definition || item.account_code || '-'}
              </span>
            </div>
          </td>
          <td className={`px-6 py-3 ${paddingClass}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${statusColor}`}></div>
              <div className={`${textSize} text-gray-900 ${fontWeight}`}>
                {displayDescription}
              </div>
            </div>
          </td>
          {yearColumns.map(year => (
            <td key={year} className="px-6 py-3 whitespace-nowrap text-right w-1/6">
              <div className={`${textSize} text-gray-900 font-mono ${fontWeight}`}>
                {formatCurrency(item[year] || 0)}
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

  // Tabloda gösterilecek yıl kolonlarını belirle
  const getYearColumns = () => {
    console.log('🔍 Year columns arama başlıyor...');
    console.log('🔍 PreviewData mevcut:', !!previewData);
    console.log('🔍 AnalyzedData mevcut:', !!analyzedData);
    
    // Önce previewData'dan dene - year_data içine bak
    if (previewData?.detected_data?.items?.length) {
      const sampleItem = previewData.detected_data.items[0];
      console.log('🔍 PreviewData sample item:', sampleItem);
      
      // year_data içinde yıl bilgileri var mı?
      if (sampleItem?.year_data && typeof sampleItem.year_data === 'object') {
        const yearColumns = Object.keys(sampleItem.year_data).filter(key => /^\d{4}(_E)?$/.test(key));
        if (yearColumns.length > 0) {
          console.log('✅ Year columns from previewData.year_data:', yearColumns);
          return yearColumns.sort();
        }
      }
      
      // year_data yoksa doğrudan item'da bak
      if (sampleItem) {
        const yearColumns = Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
        if (yearColumns.length > 0) {
          console.log('✅ Year columns from previewData:', yearColumns);
          return yearColumns.sort();
        }
      }
    }
    
    // localStorage'dan dene (öncelik düşük)
    try {
      const storageData = localStorage.getItem('pdfAnalysisData');
      if (storageData) {
        const parsedData = JSON.parse(storageData);
        console.log('🔍 LocalStorage data:', parsedData);
        if (parsedData.detected_data?.items?.length) {
          const sampleItem = parsedData.detected_data.items[0];
          console.log('🔍 LocalStorage sample item:', sampleItem);
          if (sampleItem) {
            const yearColumns = Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
            if (yearColumns.length > 0) {
              console.log('✅ Year columns from localStorage:', yearColumns);
              return yearColumns.sort();
            }
          }
        }
      }
    } catch (error) {
      console.error('localStorage okuma hatası:', error);
    }
    
    // analyzedData'dan dene (son seçenek)
    if (analyzedData?.detected_data?.items?.length) {
      const sampleItem = analyzedData.detected_data.items[0];
      console.log('🔍 AnalyzedData sample item:', sampleItem);
      if (sampleItem) {
        const yearColumns = Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
        if (yearColumns.length > 0) {
          console.log('✅ Year columns from analyzedData:', yearColumns);
          return yearColumns.sort();
        }
      }
    }
    
    // Hiçbir yerde bulunamazsa varsayılan yılları döndür
    const currentYear = new Date().getFullYear();
    const defaultYears = [`${currentYear-1}`, `${currentYear}`];
    console.log('⚠️ Using default years:', defaultYears);
    return defaultYears;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Önizleme verisi hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hata Oluştu</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link 
              to="/balance-sheets"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Geri Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ana render
  const items = previewData?.detected_data?.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bilanço Detayı</h1>
                <p className="text-sm text-gray-600">Kaydedilmiş bilanço verilerinin detaylı görünümü</p>
              </div>
            </div>
            
            {/* Header Butonları */}
            <div className="flex space-x-3">
              <Link
                to="/balance-sheets/preview/edit"
                className="inline-flex items-center px-4 py-2 border border-amber-600 text-sm font-medium rounded-md text-amber-600 bg-white hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition duration-150"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Düzenle
              </Link>

              <button
                onClick={saveBalanceSheet}
                disabled={saving || !previewData || !analyzedData}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition duration-150 ${
                  saving 
                    ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed' 
                    : !previewData || !analyzedData
                      ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                      : 'border-green-600 text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    Verileri Kaydet
                  </>
                )}
              </button>
              
              <button
                onClick={() => navigate('/balance-sheets')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
              >
                ← Geri Dön
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* İçerik */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Şirket Bilgileri Kartı */}
          {previewData && (
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
                    <p className="text-lg font-bold text-gray-900 leading-tight">{previewData.company_info.name}</p>
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
                    <p className="text-lg font-bold text-gray-900">{previewData.detected_data.year} - {previewData.detected_data.period}</p>
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
                    <p className="text-lg font-bold text-gray-900">{previewData.company_info.tax_number || 'Belirtilmemiş'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Kayıt Tarihi</h3>
                    <p className="text-lg font-bold text-gray-900">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigasyonu */}
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

            {/* Debug info */}
            <div className="px-6 py-2 bg-yellow-100 text-xs">
              <strong>Debug:</strong> 
              Items: {items.length}, 
              Year Columns: [{getYearColumns().join(', ')}], 
              Hierarchy: {activeTab === 'active' ? activeHierarchy.length : passiveHierarchy.length},
              Show Empty: {showEmptyRows ? 'Yes' : 'No'},
              PreviewData: {previewData ? 'Yes' : 'No'},
              Sample Item Keys: {items.length > 0 ? `[${Object.keys(items[0]).join(', ')}]` : 'None'}
              {items.length > 0 && items[0].year_data && (
                <span>, Sample Year Data: {JSON.stringify(items[0].year_data)}</span>
              )}
              {(activeTab === 'active' ? activeHierarchy : passiveHierarchy).length > 0 && (
                <span>, Sample Hierarchy Item: {JSON.stringify((activeTab === 'active' ? activeHierarchy : passiveHierarchy)[0])}</span>
              )}
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={`text-white ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/6">
                        Hesap Kodu
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Hesap Adı
                      </th>
                      {getYearColumns().map(year => (
                        <th key={year} scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider w-1/6">
                          {year.replace('_E', ' (E)')}
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
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPreview; 