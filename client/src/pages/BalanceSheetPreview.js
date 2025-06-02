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
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [error, setError] = useState(null);

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

  // Hesap planını yükle
  useEffect(() => {
    const fetchAccountCategories = async () => {
      try {
        const categories = await AccountCategoryAPI.getAllAccountCategories();
        setAccountCategories(categories || []);
        
        // Ana kategorileri default olarak açık yap
        const mainCategories = (categories || [])
          .filter(account => !account.parent_id)
          .map(account => account.id);
        setExpandedCategories(new Set(mainCategories));
      } catch (error) {
        console.error('Hesap planı yüklenirken hata:', error);
        setAccountCategories([]);
      }
    };

    fetchAccountCategories();
  }, []);

  // Bilanço verisini kaydet
  const saveBalanceSheet = async () => {
    if (!analyzedData || !analyzedData.detected_data) {
      console.error('❌ Analiz verisi eksik');
      alert('Kaydetmek için geçerli analiz verisi bulunamadı!');
      return;
    }

    setSaving(true);
    
    try {
      console.log('📊 Bilanço kaydediliyor...', {
        company_info: analyzedData.company_found || analyzedData.company_info,
        detected_data: analyzedData.detected_data,
        items_count: analyzedData.detected_data.items?.length
      });

      const saveResponse = await BalanceSheetAPI.saveBalanceSheetFromPreview(analyzedData);
      
      console.log("✅ Bilanço başarıyla kaydedildi:", saveResponse);
      
      // Başarılı kaydetme sonrası yönlendirme
      navigate('/balance-sheets', {
        state: {
          success: true,
          message: `${saveResponse.company_name} şirketi için ${saveResponse.year} ${saveResponse.period} dönemi bilançosu başarıyla kaydedildi. (${saveResponse.items_saved} kalem)`
        }
      });
      
    } catch (error) {
      console.error('❌ Bilanço kaydetme hatası:', error);
      
      // Kullanıcıya hata mesajı göster
      alert(`Bilanço kaydedilemedi: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Category toggle fonksiyonu
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Para formatı
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    const numAmount = typeof amount === 'string' ? 
      parseFloat(amount.replace(/[.,]/g, '').replace(/[^\d]/g, '')) / 100 : 
      parseFloat(amount);
    
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // PDF verilerini hesap planı ile eşleştir
  const createPdfDataMap = () => {
    if (!previewData || !previewData.detected_data.items) return {};
    
    const map = {};
    previewData.detected_data.items.forEach(item => {
      if (item.account_code) {
        map[item.account_code] = item.year_data || {};
      }
    });
    
    return map;
  };

  // Hesap tablosu render fonksiyonu
  const renderAccountTable = (accounts, title, bgGradient, iconColor) => {
    if (!accounts || accounts.length === 0) return null;

    const pdfDataMap = createPdfDataMap();
    const yearColumns = previewData?.detected_data.year_columns || [];
    const currentYear = previewData?.detected_data.current_period_year;
    const previousYear = previewData?.detected_data.previous_period_year;
    const inflationYear = yearColumns.find(col => col.includes('_E'));

    // Kategorize accounts
    const buildHierarchy = (parentId = null, level = 0) => {
      return accounts
        .filter(account => account.parent_id === parentId)
        .map(account => ({
          ...account,
          level,
          children: buildHierarchy(account.id, level + 1)
        }));
    };

    const hierarchy = buildHierarchy();

    // Flatten hierarchy for rendering
    const flattenHierarchy = (items, level = 0) => {
      let result = [];
      items.forEach(item => {
        result.push({ ...item, level });
        if (expandedCategories.has(item.id) && item.children && item.children.length > 0) {
          result = result.concat(flattenHierarchy(item.children, level + 1));
        }
      });
      return result;
    };

    const visibleAccounts = flattenHierarchy(hierarchy);

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
        <div className={`${bgGradient} px-6 py-4`}>
          <div className="flex items-center">
            <div className={`w-3 h-3 ${iconColor} rounded-full mr-3`}></div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <span className="ml-auto text-white text-sm opacity-75">
              {visibleAccounts.filter(acc => pdfDataMap[acc.code]).length} PDF'den / {visibleAccounts.length} toplam
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Kod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hesap Adı
                </th>
                {previousYear && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    {previousYear}
                  </th>
                )}
                {currentYear && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    {currentYear}
                  </th>
                )}
                {inflationYear && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    {inflationYear}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleAccounts.map((account, index) => {
                const isFromPdf = pdfDataMap[account.code];
                const accountHasChildren = account.children && account.children.length > 0;
                const isExpanded = expandedCategories.has(account.id);
                const paddingClass = `pl-${Math.min(account.level * 4, 12)}`;
                const isMainCategory = account.level === 0;
                const isSubCategory = account.level === 1;

                // PDF'den gelen veriler
                const pdfData = pdfDataMap[account.code] || {};
                
                return (
                  <tr 
                    key={account.id} 
                    className={`
                      ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} 
                      ${isFromPdf ? "hover:bg-blue-50" : "hover:bg-gray-100"} 
                      transition-colors duration-150
                      ${isMainCategory ? 'border-t-2 border-gray-300' : ''}
                    `}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      {isFromPdf ? (
                        <div className="w-3 h-3 bg-green-500 rounded-full" title="PDF'den veri var"></div>
                      ) : (
                        <div className="w-3 h-3 bg-gray-400 rounded-full" title="PDF'den veri yok"></div>
                      )}
                    </td>
                    <td className={`px-6 py-3 whitespace-nowrap ${paddingClass}`}>
                      <div className="flex items-center">
                        {accountHasChildren && (
                          <button
                            onClick={() => toggleCategory(account.id)}
                            className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors duration-150"
                          >
                            <svg 
                              className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                            </svg>
                          </button>
                        )}
                        <div className={`
                          text-sm font-semibold rounded-lg px-3 py-1 ${accountHasChildren ? '' : 'ml-6'}
                          ${isMainCategory ? 'bg-gray-800 text-white text-base' : 
                            isSubCategory ? 'bg-gray-600 text-white' : 
                            isFromPdf ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-600'}
                        `}>
                          {account.code}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-3`}>
                      <div className={`
                        text-sm font-medium ${paddingClass}
                        ${isMainCategory ? 'text-gray-900 font-bold text-base' : 
                          isSubCategory ? 'text-gray-800 font-semibold' : 
                          isFromPdf ? 'text-gray-900' : 'text-gray-500'}
                      `}>
                        {account.name}
                      </div>
                    </td>
                    {previousYear && (
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className={`text-sm font-semibold ${
                          isFromPdf ? 'text-gray-600' : 'text-gray-400'}`}>
                          {isFromPdf ? formatCurrency(pdfData[previousYear] || 0) : '-'}
                        </div>
                      </td>
                    )}
                    {currentYear && (
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className={`text-sm font-bold ${
                          isFromPdf ? 'text-green-700' : 'text-gray-400'}`}>
                          {isFromPdf ? formatCurrency(pdfData[currentYear] || 0) : '-'}
                        </div>
                      </td>
                    )}
                    {inflationYear && (
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className={`text-sm font-semibold ${
                          isFromPdf ? 'text-purple-600' : 'text-gray-400'}`}>
                          {isFromPdf ? formatCurrency(pdfData[inflationYear] || 0) : '-'}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
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
  const activeAccounts = accountCategories.filter(acc => acc.type === 'active');
  const passiveAccounts = accountCategories.filter(acc => acc.type === 'passive');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/balance-sheets"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Geri
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Bilanço Analiz Önizlemesi</h1>
                <p className="text-gray-600 mt-1">JSON Verisi ile PDF Analiz Sonuçları</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Şirket Bilgileri */}
        {previewData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Şirket Adı</h3>
                <p className="text-lg font-semibold text-gray-900">{previewData.company_info.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vergi Numarası</h3>
                <p className="text-lg font-semibold text-gray-900">{previewData.company_info.tax_number || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Dönem</h3>
                <p className="text-lg font-semibold text-gray-900">{previewData.detected_data.year} - {previewData.detected_data.period}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tespit Edilen Kalemler</h3>
                <p className="text-lg font-semibold text-green-600">{previewData.analysis_metadata.total_items} kalem</p>
              </div>
            </div>
          </div>
        )}

        {/* Aktif ve Pasif Tablolar */}
        <div className="space-y-8">
          {renderAccountTable(
            activeAccounts, 
            "AKTİF VARLIKLAR", 
            "bg-gradient-to-r from-blue-600 to-blue-800",
            "bg-blue-500"
          )}
          
          {renderAccountTable(
            passiveAccounts, 
            "PASİF KAYNAKLAR", 
            "bg-gradient-to-r from-red-600 to-red-800",
            "bg-red-500"
          )}
        </div>

        {/* Kaydet Butonu */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={saveBalanceSheet}
            disabled={saving || !previewData}
            className={`
              px-8 py-3 rounded-lg font-medium transition-colors duration-200
              ${saving || !previewData
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700'}
            `}
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Kaydediliyor...
              </div>
            ) : (
              'Bilançoyu Kaydet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPreview; 