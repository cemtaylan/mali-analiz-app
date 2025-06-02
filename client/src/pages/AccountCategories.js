import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AccountCategoryAPI } from '../api';

// Hesap planı verilerini tanımla ve dışa aktar
export const demoCategories = [
  // Ana kategoriler - Seviye 1
  { id: 1, name: 'AKTİF (VARLIKLAR)', code: 'A', type: 'active', parent_id: null },
  { id: 2, name: 'PASİF (KAYNAKLAR)', code: 'P', type: 'passive', parent_id: null },
  
  // ... existing code ...
];

const AccountCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' veya 'passive'
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // API'den hesap kategorilerini al
        const categoriesData = await AccountCategoryAPI.getAllAccountCategories();
        
        if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
          console.log("API'den getirilen hesap planı:", categoriesData);
          setCategories(categoriesData);
        } else {
          console.warn("API yanıtı boş veya beklenmeyen formatta, demo veriler kullanılıyor:", categoriesData);
          // API'dan veri gelmezse demo verileri kullan
          setCategories(demoCategories);
          // Uyarı mesajı gösterme (isteğe bağlı)
          // setError("API'dan hesap planı verileri alınamadı, demo veriler kullanılıyor.");
        }
      } catch (err) {
        console.error("Hesap kategorileri yüklenirken hata:", err);
        setError("Hesap kategorileri yüklenirken bir hata oluştu. Demo veriler kullanılıyor.");
        // Hata durumunda demo verileri kullan
        setCategories(demoCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Kategorileri hiyerarşik olarak yapılandırma
  const buildHierarchy = (items, type) => {
    const filteredItems = items.filter(item => item.type === type);
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

  // Kategoriyi genişlet/daralt
  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const renderCategoryRows = (categories, depth = 0) => {
    const rows = [];
    
    categories.forEach(category => {
      // Stil belirleme - Derinliğe göre font ağırlığı ve arka plan rengi
      let fontWeight = 'font-normal';
      let bgColor = 'bg-white';
      
      if (depth === 0) {
        fontWeight = 'font-bold text-lg';
        bgColor = activeTab === 'active' ? 'bg-blue-100' : 'bg-indigo-100';
      } else if (depth === 1) {
        fontWeight = 'font-semibold';
        bgColor = activeTab === 'active' ? 'bg-blue-50' : 'bg-indigo-50';
      } else if (depth === 2) {
        fontWeight = 'font-medium';
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
      
      // Kategori satırını render et
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories[category.id];
      
      rows.push(
        <tr 
          key={category.id} 
          className={`${bgColor} hover:bg-gray-100 transition-colors duration-150 cursor-pointer`}
          onClick={() => hasChildren && toggleCategory(category.id)}
        >
          <td className="px-6 py-3 whitespace-nowrap border-r border-gray-200 w-1/4">
            <div className="flex items-center">
              {hasChildren && (
                <span className="mr-2 text-gray-500 w-4">
                  {isExpanded ? '−' : '+'}
                </span>
              )}
              <span className={`text-sm text-gray-900 ${fontWeight}`}>
                {category.code}
              </span>
            </div>
          </td>
          <td className={`px-6 py-3 ${paddingClass}`}>
            <div className={`text-sm text-gray-900 ${fontWeight}`}>
              {category.name}
            </div>
          </td>
        </tr>
      );
      
      // Alt kategorileri göster (sadece genişletilmişse)
      if (hasChildren && isExpanded) {
        rows.push(...renderCategoryRows(category.children, depth + 1));
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

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p className="font-bold">Hata</p>
        <p>{error}</p>
      </div>
    );
  }

  const activeHierarchy = buildHierarchy(categories, 'active');
  const passiveHierarchy = buildHierarchy(categories, 'passive');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center">
          <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Tek Düzen Hesap Planı</h1>
            <p className="text-emerald-100 mt-1">Türkiye standart hesap planı kategori yapısı</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center mb-6">
        <button
          className={`px-6 py-2 rounded-tl-lg rounded-tr-lg font-medium transition duration-150 ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
          onClick={() => setActiveTab('active')}
        >
          Aktif Hesaplar (Varlıklar)
        </button>
        <button
          className={`ml-2 px-6 py-2 rounded-tl-lg rounded-tr-lg font-medium transition duration-150 ${
            activeTab === 'passive'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
          onClick={() => setActiveTab('passive')}
        >
          Pasif Hesaplar (Kaynaklar)
        </button>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`text-white ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/4">
                Hesap Kodu
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Hesap Adı
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activeTab === 'active' 
              ? renderCategoryRows(activeHierarchy) 
              : renderCategoryRows(passiveHierarchy)
            }
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <p className="font-medium mb-2">Kullanım:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kategorileri genişletmek veya daraltmak için kategori satırına tıklayın.</li>
          <li>Hesap kodu, hesabın hiyerarşik yapıdaki konumunu belirtir.</li>
          <li>Aktif (Varlıklar) ve Pasif (Kaynaklar) sekmeleri arasında geçiş yapabilirsiniz.</li>
        </ul>
      </div>
      
      <div className="mt-6 p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Hesap Planı Hakkında</h2>
        <p className="text-gray-600 mb-3">
          Bu hesap planı, Türkiye'de kullanılan Tek Düzen Hesap Planı'na (TDHP) göre düzenlenmiştir. Plan, aktif (varlıklar) ve pasif (kaynaklar) olmak üzere iki ana bölüme ayrılır.
        </p>
        <p className="text-gray-600 mb-1">
          <strong>Aktif (Varlıklar):</strong> İşletmenin sahip olduğu ekonomik değerleri gösterir. İki ana gruptan oluşur:
        </p>
        <ul className="list-disc pl-8 mb-3 text-gray-600">
          <li><strong>Dönen Varlıklar:</strong> 1 yıl içinde paraya çevrilmesi veya kullanılması beklenen varlıklar</li>
          <li><strong>Duran Varlıklar:</strong> 1 yıldan uzun süre işletmede kalması beklenen varlıklar</li>
        </ul>
        <p className="text-gray-600 mb-1">
          <strong>Pasif (Kaynaklar):</strong> İşletme varlıklarının finansman kaynaklarını gösterir. Üç ana gruptan oluşur:
        </p>
        <ul className="list-disc pl-8 text-gray-600">
          <li><strong>Kısa Vadeli Yabancı Kaynaklar:</strong> 1 yıl içinde ödenmesi gereken borçlar</li>
          <li><strong>Uzun Vadeli Yabancı Kaynaklar:</strong> 1 yıldan uzun vadeli borçlar</li>
          <li><strong>Özkaynaklar:</strong> İşletme sahip veya ortaklarının işletme üzerindeki hakları</li>
        </ul>
      </div>
    </div>
  );
};

export default AccountCategories; 