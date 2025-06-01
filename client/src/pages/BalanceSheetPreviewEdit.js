import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { AccountCategoryAPI, BalanceSheetAPI } from '../api';

const BalanceSheetPreviewEdit = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzedData, setAnalyzedData] = useState(null);
  const [editableData, setEditableData] = useState([]);
  const [companyInfo, setCompanyInfo] = useState({});
  const [accountCategories, setAccountCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [error, setError] = useState(null);

  // Demo veri oluştur
  const createDemoData = () => {
    return {
      success: true,
      detected_data: {
        company_name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.",
        tax_number: "6140087281",
        trade_registry_number: "TEKKEKÖY-328",
        email: "info@memsanmakina.com",
        year: 2024,
        period: "YILLIK",
        previous_period_year: 2023,
        current_period_year: 2024,
        items: [
          {
            account_code: "A.1.1.1",
            account_name: "KASA",
            description: "KASA",
            "2024": "125000",
            "2023": "100000"
          },
          {
            account_code: "A.1.1.3",
            account_name: "BANKALAR",
            description: "BANKALAR",
            "2024": "385000",
            "2023": "320000"
          },
          {
            account_code: "A.1.3.1",
            account_name: "ALICILAR",
            description: "ALICILAR",
            "2024": "750000",
            "2023": "650000"
          },
          {
            account_code: "A.1.5.1",
            account_name: "İLK MADDE VE MALZEME",
            description: "İLK MADDE VE MALZEME",
            "2024": "175000",
            "2023": "155000"
          },
          {
            account_code: "A.2.4.1",
            account_name: "ARAZİ VE ARSALAR",
            description: "ARAZİ VE ARSALAR",
            "2024": "850000",
            "2023": "850000"
          },
          {
            account_code: "P.1.1.1",
            account_name: "BANKA KREDİLERİ",
            description: "BANKA KREDİLERİ",
            "2024": "230000",
            "2023": "180000"
          },
          {
            account_code: "P.1.2.1",
            account_name: "SATICILAR",
            description: "SATICILAR",
            "2024": "185000",
            "2023": "140000"
          },
          {
            account_code: "P.3.1.1",
            account_name: "SERMAYE",
            description: "SERMAYE",
            "2024": "915000",
            "2023": "903500"
          }
        ]
      }
    };
  };

  // Veri yükleme
  useEffect(() => {
    const initializeEdit = async () => {
      try {
        setLoading(true);
        setError(null);

        // State'den veya localStorage'dan veri al
        const stateData = location.state;
        let dataToEdit = null;

        if (stateData && stateData.analysisData) {
          dataToEdit = stateData.analysisData;
        } else {
          const storageData = localStorage.getItem('pdfAnalysisData');
          if (storageData) {
            dataToEdit = JSON.parse(storageData);
          } else {
            // Demo veri kullan
            dataToEdit = createDemoData();
            localStorage.setItem('pdfAnalysisData', JSON.stringify(dataToEdit));
          }
        }

        setAnalyzedData(dataToEdit);
        
        // Şirket bilgilerini ayarla
        if (dataToEdit.detected_data) {
          setCompanyInfo({
            name: dataToEdit.detected_data.company_name || "Bilinmiyor",
            tax_number: dataToEdit.detected_data.tax_number || "",
            year: dataToEdit.detected_data.year || new Date().getFullYear(),
            period: dataToEdit.detected_data.period || "YILLIK"
          });

          // Düzenlenebilir veri arrayi oluştur
          const items = dataToEdit.detected_data.items || [];
          setEditableData(items.map((item, index) => ({
            id: index,
            account_code: item.account_code || "",
            account_name: item.account_name || "",
            description: item.description || "",
            current_year_value: item[dataToEdit.detected_data.current_period_year] || item["2024"] || "0",
            previous_year_value: item[dataToEdit.detected_data.previous_period_year] || item["2023"] || "0"
          })));
        }

      } catch (err) {
        console.error('❌ Edit veri yükleme hatası:', err);
        setError(`Edit verisi yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeEdit();
  }, [location.state]);

  // Hesap planını yükle
  useEffect(() => {
    const fetchAccountCategories = async () => {
      try {
        const categories = await AccountCategoryAPI.getAllAccountCategories();
        setAccountCategories(categories || []);
        
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

  // Input değeri değiştirme
  const handleInputChange = (itemId, field, value) => {
    setEditableData(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  // Şirket bilgisi değiştirme
  const handleCompanyChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  // Yeni satır ekleme
  const addNewRow = () => {
    const newId = Math.max(...editableData.map(item => item.id), 0) + 1;
    setEditableData(prev => [...prev, {
      id: newId,
      account_code: "",
      account_name: "",
      description: "",
      current_year_value: "0",
      previous_year_value: "0"
    }]);
  };

  // Satır silme
  const removeRow = (itemId) => {
    setEditableData(prev => prev.filter(item => item.id !== itemId));
  };

  // Para formatı
  const formatNumber = (value) => {
    const numValue = parseFloat(value.toString().replace(/[^\d]/g, '')) || 0;
    return numValue.toLocaleString('tr-TR');
  };

  // Kaydetme
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Düzenlenmiş veriyi analiz formatına çevir
      const updatedAnalysisData = {
        ...analyzedData,
        detected_data: {
          ...analyzedData.detected_data,
          company_name: companyInfo.name,
          tax_number: companyInfo.tax_number,
          year: companyInfo.year,
          period: companyInfo.period,
          items: editableData.map(item => ({
            account_code: item.account_code,
            account_name: item.account_name,
            description: item.description,
            [companyInfo.year]: item.current_year_value.replace(/[^\d]/g, ''),
            [companyInfo.year - 1]: item.previous_year_value.replace(/[^\d]/g, '')
          }))
        }
      };

      console.log('🔄 Düzenlenmiş veri kaydediliyor:', updatedAnalysisData);

      const saveResponse = await BalanceSheetAPI.saveBalanceSheetFromPreview(updatedAnalysisData);
      
      if (saveResponse && (saveResponse.success !== false)) {
        console.log("✅ Düzenlenmiş bilanço başarıyla kaydedildi!");
        
        navigate('/balance-sheets', {
          state: {
            success: true,
            message: `${saveResponse.company_name || companyInfo.name} ${companyInfo.year} ${companyInfo.period} dönemi başarıyla kaydedildi ve güncellendi. (${saveResponse.items_saved || editableData.length} kalem)`
          }
        });
      } else {
        throw new Error(saveResponse.error || 'Bilinmeyen bir hata oluştu');
      }
      
    } catch (error) {
      console.error('❌ Düzenlenmiş bilanço kaydetme hatası:', error);
      alert(`Bilanço kaydedilemedi: ${error.message}\n\nDetaylar: ${error.response?.data?.error || 'Bağlantı sorunu olabilir'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Edit verisi hazırlanıyor...</p>
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
              to="/balance-sheets/preview"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Preview'a Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/balance-sheets/preview"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Önizlemeye Dön
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">📝 Bilanço Düzenleme</h1>
                <p className="text-gray-600 mt-1">Bilanço verilerini düzenleyin ve kaydedin</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Şirket Bilgileri Düzenleme */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🏢 Şirket Bilgileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Şirket Adı</label>
              <input
                type="text"
                value={companyInfo.name || ''}
                onChange={(e) => handleCompanyChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Şirket adını girin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vergi Numarası</label>
              <input
                type="text"
                value={companyInfo.tax_number || ''}
                onChange={(e) => handleCompanyChange('tax_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VKN girin"
                maxLength="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yıl</label>
              <input
                type="number"
                value={companyInfo.year || ''}
                onChange={(e) => handleCompanyChange('year', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yıl"
                min="2020"
                max="2030"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
              <select
                value={companyInfo.period || 'YILLIK'}
                onChange={(e) => handleCompanyChange('period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="YILLIK">YILLIK</option>
                <option value="6 AYLIK">6 AYLIK</option>
                <option value="3 AYLIK">3 AYLIK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Kaydet/İptal Butonları - ÜST */}
        <div className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-green-800">💾 Değişiklikleri Kaydet</h3>
              <p className="text-sm text-green-600 mt-1">Düzenlenmiş bilançoyu veritabanına kaydedin</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`
                  px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-all duration-200 transform
                  ${saving 
                    ? 'bg-yellow-500 text-white cursor-wait scale-95' 
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'}
                `}
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                    🔄 Kaydediliyor...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    💾 Değişiklikleri Kaydet
                  </div>
                )}
              </button>
              
              <Link
                to="/balance-sheets/preview"
                className="px-6 py-3 bg-gray-600 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                İptal
              </Link>
            </div>
          </div>
        </div>

        {/* Düzenlenebilir Tablo */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-300 rounded-full mr-3"></div>
                <h3 className="text-lg font-bold text-white">📊 Bilanço Kalemleri - Düzenlenebilir</h3>
              </div>
              <span className="text-white text-sm opacity-75">
                {editableData.length} kalem
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Hesap Kodu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hesap Adı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    {companyInfo.year - 1} (Önceki)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    {companyInfo.year} (Güncel)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editableData.map((item, index) => (
                  <tr key={item.id} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors duration-150`}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.account_code}
                        onChange={(e) => handleInputChange(item.id, 'account_code', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="A.1.1.1"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.account_name}
                        onChange={(e) => handleInputChange(item.id, 'account_name', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Hesap adı"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleInputChange(item.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Açıklama"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formatNumber(item.previous_year_value)}
                        onChange={(e) => handleInputChange(item.id, 'previous_year_value', e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formatNumber(item.current_year_value)}
                        onChange={(e) => handleInputChange(item.id, 'current_year_value', e.target.value.replace(/[^\d]/g, ''))}
                        className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeRow(item.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition-colors duration-150"
                        title="Satırı sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Yeni Satır Ekleme */}
          <div className="bg-gray-50 px-6 py-4 border-t">
            <button
              onClick={addNewRow}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
              ➕ Yeni Satır Ekle
            </button>
          </div>
        </div>

        {/* Özet Bilgiler */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-purple-800 mb-4">📈 Özet Bilgiler</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-600">Toplam Kalem Sayısı</p>
              <p className="text-2xl font-bold text-purple-600">{editableData.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-600">Aktif Hesaplar</p>
              <p className="text-2xl font-bold text-green-600">
                {editableData.filter(item => item.account_code.startsWith('A')).length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-gray-600">Pasif Hesaplar</p>
              <p className="text-2xl font-bold text-red-600">
                {editableData.filter(item => item.account_code.startsWith('P')).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPreviewEdit; 