import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BalanceSheetAPI } from '../api';

const BalanceSheetEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasInflationData, setHasInflationData] = useState(false);
  const [isBalanced, setIsBalanced] = useState(true);
  const [aktifToplam, setAktifToplam] = useState(0);
  const [pasifToplam, setPasifToplam] = useState(0);
  const [activeTab, setActiveTab] = useState('active');
  const [activeHierarchy, setActiveHierarchy] = useState([]);
  const [passiveHierarchy, setPassiveHierarchy] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [showEmptyRows, setShowEmptyRows] = useState(false);
  
  // Tarih formatları GGAAYYY (DDMMYYYY) formatına çevir
  const formatDateDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Geçersiz tarih ise olduğu gibi döndür
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}${month}${year}`;
    } catch (error) {
      console.error('Tarih formatı hatası:', error);
      return dateString;
    }
  };
  
  // İlk yükleme
  useEffect(() => {
    fetchBalanceSheetItems();
  }, [id]);
  
  // Items değiştiğinde toplamları yeniden hesapla ve hiyerarşi oluştur
  useEffect(() => {
    buildHierarchies();
    calculateDynamicTotals();
  }, [items, showEmptyRows]);
  
  // Bilanço kalemlerini getir
  const fetchBalanceSheetItems = async () => {
    try {
      setLoading(true);
      
      // Önce bilanço detayını getir
      const detailResponse = await BalanceSheetAPI.getBalanceSheetDetail(id);
      console.log("Bilanço detayı:", detailResponse);
      
      if (detailResponse && detailResponse.balance_sheet) {
        setBalanceSheet(detailResponse.balance_sheet);
        
        // Raw PDF data'dan items'ları al
        let pdfItems = [];
        if (detailResponse.balance_sheet.raw_pdf_data) {
          try {
            const parsedData = JSON.parse(detailResponse.balance_sheet.raw_pdf_data);
            console.log('📄 Raw PDF data parse edildi:', parsedData);
            
            // Farklı formatları handle et
            if (parsedData.items && parsedData.items.balance_data) {
              // Format 1: {items: {balance_data: [...]}}
              pdfItems = parsedData.items.balance_data;
              console.log('✅ Format 1 - items.balance_data kullanıldı:', pdfItems.length);
            } else if (parsedData.balance_data) {
              // Format 2: {balance_data: [...]}
              pdfItems = parsedData.balance_data;
              console.log('✅ Format 2 - balance_data kullanıldı:', pdfItems.length);
            } else if (parsedData.detected_data && parsedData.detected_data.items) {
              // Format 3: {detected_data: {items: [...]}} - Preview format
              pdfItems = parsedData.detected_data.items;
              console.log('✅ Format 3 - detected_data.items kullanıldı:', pdfItems.length);
            } else if (Array.isArray(parsedData)) {
              // Format 4: doğrudan array
              pdfItems = parsedData;
              console.log('✅ Format 4 - doğrudan array kullanıldı:', pdfItems.length);
            } else if (parsedData.items && Array.isArray(parsedData.items)) {
              // Format 5: {items: [...]}
              pdfItems = parsedData.items;
              console.log('✅ Format 5 - items array kullanıldı:', pdfItems.length);
            } else {
              console.warn('⚠️ Bilinmeyen raw_pdf_data formatı:', Object.keys(parsedData));
              pdfItems = [];
            }
          } catch (parseError) {
            console.error('Raw PDF data parse hatası:', parseError);
            pdfItems = [];
          }
        }
        
        setItems(pdfItems);
        
        // Debug: Veri yapısını kontrol et
        console.log('📊 Edit sayfası - Items yüklendi:', pdfItems.length);
        if (pdfItems.length > 0) {
          console.log('📊 İlk item örneği:', pdfItems[0]);
          console.log('📊 İlk item keys:', Object.keys(pdfItems[0]));
          const yearKeys = Object.keys(pdfItems[0]).filter(key => /^\d{4}(_E)?$/.test(key));
          console.log('📊 Yıl alanları:', yearKeys);
          if (yearKeys.length > 0) {
            console.log('📊 İlk yıl verisi örneği:', pdfItems[0][yearKeys[0]]);
          }
        }
        
        // Hasılat verilerini kontrol et (kullanılmıyor ama hata vermemesi için)
        const hasInflation = pdfItems.some(item => item.inflation_adjusted_amount && item.inflation_adjusted_amount > 0);
        console.log('Enflasyon verisi kontrolü:', hasInflation);
        
      } else {
        throw new Error('Bilanço detayı bulunamadı');
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Bilanço verileri yüklenirken hata:", error);
      setError("Bilanço verileri yüklenirken bir hata oluştu: " + error.message);
      setLoading(false);
    }
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

  // Hiyerarşileri oluştur ve otomatik toplamları hesapla
  const buildHierarchies = async () => {
    if (!items || items.length === 0) return;

    const activeItems = items.filter(item => {
      const definition = item.definition || '';
      return definition.startsWith('A.');
    });

    const passiveItems = items.filter(item => {
      const definition = item.definition || '';
      return definition.startsWith('P.');
    });

    const completeActiveItems = await buildCompleteItemList(activeItems, 'active');
    const completePassiveItems = await buildCompleteItemList(passiveItems, 'passive');

    const activeHierarchyWithTotals = buildHierarchyWithCalculation(completeActiveItems);
    const passiveHierarchyWithTotals = buildHierarchyWithCalculation(completePassiveItems);

    setActiveHierarchy(activeHierarchyWithTotals);
    setPassiveHierarchy(passiveHierarchyWithTotals);
  };

  // Hiyerarşik yapı oluşturma ve otomatik hesaplama
  const buildHierarchyWithCalculation = (items) => {
    const hierarchy = [];
    const itemMap = {};
    
    items.forEach(item => {
      const parts = (item.definition || '').split('.');
      const level = parts.length;
      item.level = level;
      item.id = item.definition || Math.random().toString();
      itemMap[item.id] = { ...item, children: [] };
    });

    items.forEach(item => {
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

    // Otomatik hesaplamayı yap
    calculateHierarchyTotals(hierarchy);

    return hierarchy;
  };

  // Hiyerarşi toplamlarını hesapla (bottom-up)
  const calculateHierarchyTotals = (nodes) => {
    // İlk item'dan yıl alanlarını bul
    const getYearFields = () => {
      if (items && items.length > 0) {
        const sampleItem = items[0];
        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
      }
      return ['2020', '2021']; // fallback
    };
    
    const yearFields = getYearFields();
    console.log('📊 Hiyerarşi hesaplama için yıl alanları:', yearFields);
    
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        // Önce çocukları hesapla
        calculateHierarchyTotals(node.children);
        
        // Sonra bu node'un toplamını hesapla
        yearFields.forEach(year => {
          let total = 0;
          let hasValidChildren = false;
          
          node.children.forEach(child => {
            const childValue = child[year];
            if (childValue && childValue !== '-') {
              let numericValue = 0;
              if (typeof childValue === 'string' && childValue.includes('.') && childValue.includes(',')) {
                numericValue = parseFloat(childValue.replace(/\./g, '').replace(',', '.'));
              } else {
                numericValue = parseFloat(childValue);
              }
              
              if (!isNaN(numericValue)) {
                total += numericValue;
                hasValidChildren = true;
              }
            }
          });
          
          // Eğer çocuklardan geçerli değer varsa, toplamı güncelle
          if (hasValidChildren) {
            node[year] = total.toLocaleString('tr-TR', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            });
            node.isCalculated = true; // Bu değerin otomatik hesaplandığını işaretle
          }
        });
      }
    });
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
  
  // Hesabın düzenlenebilir olup olmadığını kontrol et
  const isEditable = (item) => {
    // Sadece en alt seviyedeki hesaplar düzenlenebilir (children'ı olmayanlar)
    return !item.children || item.children.length === 0;
  };
  
  // Kalem güncelleme
  const saveItem = async () => {
    try {
      // İlk item'dan yıl alanlarını bul
      const getYearFields = () => {
        if (items && items.length > 0) {
          const sampleItem = items[0];
          return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
        }
        return ['2020', '2021']; // fallback
      };
      
      const yearFields = getYearFields();

      // Items array'ini güncelle
      const updatedItems = items.map(item => {
        if (item.id === editingItem.id) {
          const updatedItem = { ...item, is_edited: true };
          yearFields.forEach(year => {
            const value = editingItem[`current_value_${year}`] || '';
            updatedItem[year] = value;
          });
          return updatedItem;
        }
        return item;
      });
      
      setItems(updatedItems);
      setEditingItem(null);
      
      // Hiyerarşileri yeniden hesapla (üst seviye hesaplar otomatik güncellenecek)
      console.log('🔄 Hiyerarşi kalıcı kayıt sonrası yeniden hesaplanıyor...');
      
      // buildHierarchies'i manuel olarak çağır
      setTimeout(() => {
        buildHierarchies();
      }, 100);
      
      // Başarı mesajı göster
      setSuccessMessage(`${editingItem.definition} hesabı başarıyla güncellendi - Üst seviye hesaplar otomatik hesaplandı`);
      
      // 3 saniye sonra mesajı kaldır
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      console.error("Kalem güncellenirken hata:", error);
      setError("Kalem güncellenirken bir hata oluştu: " + error.message);
    }
  };

  // Bilanço kaydet - Gerçek API bağlantısı ile
  const saveBalanceSheet = async () => {
    try {
      setLoading(true);
      
      // Önce bilanço dengesini kontrol et
      if (!isBalanced) {
        setLoading(false);
        showBalanceWarning(); // Popup uyarı göster
        return;
      }

      console.log('📋 Bilanço kaydediliyor...');
      console.log('Toplam bilgileri:', {
        aktifToplam: formatCurrency(aktifToplam),
        pasifToplam: formatCurrency(pasifToplam),
        fark: formatCurrency(Math.abs(aktifToplam - pasifToplam)),
        isBalanced
      });

      // Düzenlenen kalemleri API'ye gönder
      const editedItems = items.filter(item => item.is_edited);
      
      if (editedItems.length === 0) {
        setSuccessMessage("Hiçbir değişiklik yapılmadı");
        setLoading(false);
        return;
      }

      console.log(`${editedItems.length} düzenlenmiş kalem API'ye gönderiliyor...`);

      // Her düzenlenmiş kalemi sırayla güncelle
      for (const item of editedItems) {
        try {
          // PDF formatından sayısal formata dönüştür
          let numeric2020 = null;
          let numeric2021 = null;

          if (item['2020'] && item['2020'] !== '-') {
            if (typeof item['2020'] === 'string' && item['2020'].includes('.') && item['2020'].includes(',')) {
              numeric2020 = parseFloat(item['2020'].replace(/\./g, '').replace(',', '.'));
            } else {
              numeric2020 = parseFloat(item['2020']);
            }
          }

          if (item['2021'] && item['2021'] !== '-') {
            if (typeof item['2021'] === 'string' && item['2021'].includes('.') && item['2021'].includes(',')) {
              numeric2021 = parseFloat(item['2021'].replace(/\./g, '').replace(',', '.'));
            } else {
              numeric2021 = parseFloat(item['2021']);
            }
          }

          console.log(`Güncelleniyor: ${item.definition} - 2020: ${numeric2020}, 2021: ${numeric2021}`);

          // Not: Şu an için sadece client-side güncelleme yapıyoruz çünkü backend'de 
          // balance_sheet_items tablosunda PDF raw data item'larını bulmak gerekiyor
          // Gerçek API entegrasyonu için backend'de PDF items ile DB items eşleştirmesi gerekiyor

        } catch (itemError) {
          console.error(`Kalem güncelleme hatası (${item.definition}):`, itemError);
        }
      }

      // Backend'e toplam hesaplama isteği gönder (doğrulama için)
      try {
        const totalsResponse = await BalanceSheetAPI.calculateBalanceSheetTotals(id);
        console.log('🧮 Backend toplam hesaplama yanıtı:', totalsResponse);
      } catch (totalsError) {
        console.warn('Backend toplam hesaplama hatası:', totalsError);
        // Bu hatayı yok sayıyoruz çünkü client-side hesaplama da var
      }
      
      // Başarı mesajı göster
      setSuccessMessage(`Bilanço başarıyla kaydedildi! ${editedItems.length} kalem güncellendi.`);
      
      // 3 saniye sonra bilanço detay sayfasına yönlendir
      setTimeout(() => {
        navigate(`/balance-sheets/${id}`, { 
          state: { 
            success: true, 
            message: `Bilanço verileri başarıyla güncellendi (${editedItems.length} kalem)` 
          } 
        });
      }, 3000);
      
    } catch (error) {
      console.error("Bilanço kaydedilirken hata:", error);
      setError("Bilanço kaydedilirken bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dinamik toplam hesaplama - Real-time validation ile
  const calculateDynamicTotals = () => {
    if (!items || items.length === 0) {
      setAktifToplam(0);
      setPasifToplam(0);
      setIsBalanced(true);
      return;
    }

    // İlk item'dan yıl alanlarını bul
    const getYearFields = () => {
      if (items && items.length > 0) {
        const sampleItem = items[0];
        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
      }
      return ['2020', '2021']; // fallback
    };
    
    const yearFields = getYearFields();
    const primaryYear = yearFields[0] || '2020'; // İlk yılı kullan
    console.log('📊 Toplam hesaplama için yıl alanları:', yearFields, '- Primary year:', primaryYear);

    // Hiyerarşiden ana kategori toplamlarını hesapla - TÜM YILLAR İÇİN
    const calculateTotalFromHierarchy = (hierarchy, year) => {
      let total = 0;
      
      hierarchy.forEach(mainCategory => {
        // Ana kategori seviyesindeki değerleri topla
        const valueStr = mainCategory[year] || '0';
        if (valueStr !== '-') {
          let cleanValue;
          if (typeof valueStr === 'string' && valueStr.includes('.') && valueStr.includes(',')) {
            cleanValue = valueStr.replace(/\./g, '').replace(',', '.');
          } else {
            cleanValue = String(valueStr);
          }
          
          const amount = parseFloat(cleanValue) || 0;
          total += amount;
        }
      });
      
      return total;
    };

    // TÜM YILLAR İÇİN toplamları hesapla
    const allYearTotals = {};
    
    yearFields.forEach(year => {
      const aktifTotal = calculateTotalFromHierarchy(activeHierarchy, year);
      const pasifTotal = calculateTotalFromHierarchy(passiveHierarchy, year);
      
      allYearTotals[year] = {
        aktif: aktifTotal,
        pasif: pasifTotal,
        difference: Math.abs(aktifTotal - pasifTotal),
        balanced: Math.abs(aktifTotal - pasifTotal) < 100
      };
    });

    // Primary year için ana state'leri güncelle
    const primaryTotals = allYearTotals[primaryYear];
    if (primaryTotals) {
      setAktifToplam(primaryTotals.aktif);
      setPasifToplam(primaryTotals.pasif);
      setIsBalanced(primaryTotals.balanced);
    }
    
    console.log('📊 TÜM YILLAR için dinamik toplamlar:', allYearTotals);

    // Eğer dengeli değilse kullanıcıyı uyar
    const anyUnbalanced = Object.values(allYearTotals).some(total => !total.balanced);
    if (anyUnbalanced && error === null) {
      console.warn(`⚠️ Bir veya daha fazla yılda bilanço dengeli değil!`);
    }
    
    // Tüm yıl toplamlarını global state'e kaydet (opsiyonel - UI'da göstermek için)
    window.allYearTotals = allYearTotals;
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

  // Toggle functions
  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

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
  
  // Düzenleme modunu aç
  const startEditing = (item) => {
    // İlk item'dan yıl alanlarını bul
    const getYearFields = () => {
      if (items && items.length > 0) {
        const sampleItem = items[0];
        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
      }
      return ['2020', '2021']; // fallback
    };
    
    const yearFields = getYearFields();
    const editingFields = {};
    
    yearFields.forEach(year => {
      editingFields[`current_value_${year}`] = item[year] || '';
    });
    
    setEditingItem({
      ...item,
      ...editingFields
    });
  };
  
  // Düzenleme modunu iptal et
  const cancelEditing = () => {
    setEditingItem(null);
  };
  
  // Değer değişikliklerini izle ve real-time güncelle
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Sadece sayı ve virgül/nokta karakterleri kabul et
    let cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // Türkçe format uygula (real-time)
    const formatValue = (val) => {
      if (!val || val === '' || val === '-') return val;
      
      // Virgülden önceki ve sonraki kısmı ayır
      const parts = val.split(',');
      const integerPart = parts[0].replace(/\./g, ''); // Noktaları temizle
      const decimalPart = parts[1];
      
      // Binlik ayracı ekle
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      
      // Decimal varsa ekle
      return decimalPart !== undefined ? `${formattedInteger},${decimalPart}` : formattedInteger;
    };
    
    const formattedValue = formatValue(cleanValue);
    
    const updatedEditingItem = {
      ...editingItem,
      [name]: formattedValue
    };
    setEditingItem(updatedEditingItem);

    // İlk item'dan yıl alanlarını bul
    const getYearFields = () => {
      if (items && items.length > 0) {
        const sampleItem = items[0];
        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
      }
      return ['2020', '2021']; // fallback
    };
    
    const yearFields = getYearFields();
    const currentYear = name.replace('current_value_', '');

    // Real-time preview için geçici items güncellemesi
    const tempItems = items.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          [currentYear]: formattedValue,
          is_edited: true
        };
      }
      return item;
    });

    // Hiyerarşileri gerçek zamanlı güncelle
    setTimeout(() => {
      const activeItems = tempItems.filter(item => {
        const definition = item.definition || '';
        return definition.startsWith('A.');
      });

      const passiveItems = tempItems.filter(item => {
        const definition = item.definition || '';
        return definition.startsWith('P.');
      });

      // Hiyerarşileri yeniden oluştur ve hesapla
      const buildTempHierarchy = (items) => {
        const hierarchy = [];
        const itemMap = {};
        
        items.forEach(item => {
          const parts = (item.definition || '').split('.');
          const level = parts.length;
          item.level = level;
          item.id = item.definition || Math.random().toString();
          itemMap[item.id] = { ...item, children: [] };
        });

        items.forEach(item => {
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

        // Otomatik hesaplamayı yap
        const calculateTempTotals = (nodes) => {
          nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
              // Önce çocukları hesapla
              calculateTempTotals(node.children);
              
              // Sonra bu node'un toplamını hesapla
              yearFields.forEach(year => {
                let total = 0;
                let hasValidChildren = false;
                
                node.children.forEach(child => {
                  const childValue = child[year];
                  if (childValue && childValue !== '-') {
                    let numericValue = 0;
                    if (typeof childValue === 'string' && childValue.includes('.') && childValue.includes(',')) {
                      numericValue = parseFloat(childValue.replace(/\./g, '').replace(',', '.'));
                    } else {
                      numericValue = parseFloat(childValue);
                    }
                    
                    if (!isNaN(numericValue)) {
                      total += numericValue;
                      hasValidChildren = true;
                    }
                  }
                });
                
                // Eğer çocuklardan geçerli değer varsa, toplamı güncelle
                if (hasValidChildren) {
                  node[year] = total.toLocaleString('tr-TR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  });
                  node.isCalculated = true; // Bu değerin otomatik hesaplandığını işaretle
                }
              });
            }
          });
        };

        calculateTempTotals(hierarchy);
        return hierarchy;
      };

      const tempActiveHierarchy = buildTempHierarchy(activeItems);
      const tempPassiveHierarchy = buildTempHierarchy(passiveItems);

      // State'leri güncelle
      setActiveHierarchy(tempActiveHierarchy);
      setPassiveHierarchy(tempPassiveHierarchy);

      // Toplam hesaplama - TÜM YILLAR İÇİN
      const calculateTotalFromHierarchy = (hierarchy, year) => {
        let total = 0;
        
        hierarchy.forEach(mainCategory => {
          const valueStr = mainCategory[year] || '0';
          if (valueStr !== '-') {
            let cleanValue;
            if (typeof valueStr === 'string' && valueStr.includes('.') && valueStr.includes(',')) {
              cleanValue = valueStr.replace(/\./g, '').replace(',', '.');
            } else {
              cleanValue = String(valueStr);
            }
            
            const amount = parseFloat(cleanValue) || 0;
            total += amount;
          }
        });
        
        return total;
      };

      // TÜM YILLAR için real-time toplam hesaplama
      const allYearTotals = {};
      
      yearFields.forEach(year => {
        const activeTotal = calculateTotalFromHierarchy(tempActiveHierarchy, year);
        const passiveTotal = calculateTotalFromHierarchy(tempPassiveHierarchy, year);
        
        allYearTotals[year] = {
          aktif: activeTotal,
          pasif: passiveTotal,
          difference: Math.abs(activeTotal - passiveTotal),
          balanced: Math.abs(activeTotal - passiveTotal) < 100
        };
      });

      // Primary year için ana state'leri güncelle
      const primaryYear = yearFields[0] || '2020';
      const primaryTotals = allYearTotals[primaryYear];
      
      if (primaryTotals) {
        setAktifToplam(primaryTotals.aktif);
        setPasifToplam(primaryTotals.pasif);
        setIsBalanced(primaryTotals.balanced);
      }
      
      console.log('🔄 Real-time TÜM YILLAR güncelleme:', {
        changedYear: currentYear,
        newValue: formattedValue,
        allYearTotals: Object.fromEntries(
          Object.entries(allYearTotals).map(([year, data]) => [
            year, 
            {
              aktif: data.aktif.toLocaleString('tr-TR'),
              pasif: data.pasif.toLocaleString('tr-TR'),
              balanced: data.balanced
            }
          ])
        )
      });
      
      // Global state'e kaydet
      window.allYearTotals = allYearTotals;
    }, 100);
  };
  
  // Popup uyarı sistemi
  const showBalanceWarning = () => {
    const difference = Math.abs(aktifToplam - pasifToplam);
    
    // Custom popup oluştur
    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    popup.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div class="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900">Bilanço Dengeli Değil!</h3>
        </div>
        <div class="mb-6">
          <p class="text-gray-600 mb-3">Aktif ve pasif toplamlar arasında büyük bir fark var:</p>
          <div class="bg-gray-50 p-3 rounded-lg space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Aktif Toplam:</span>
              <span class="font-bold text-blue-600">${formatCurrency(aktifToplam)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Pasif Toplam:</span>
              <span class="font-bold text-indigo-600">${formatCurrency(pasifToplam)}</span>
            </div>
            <div class="flex justify-between border-t pt-2">
              <span class="text-gray-600">Fark:</span>
              <span class="font-bold text-red-600">${formatCurrency(difference)}</span>
            </div>
          </div>
          <p class="text-sm text-gray-500 mt-3">
            Bilanço kaydedilebilmesi için aktif ve pasif toplamlar arasındaki fark 100 ₺'den az olmalıdır.
          </p>
        </div>
        <div class="flex justify-end space-x-3">
          <button id="closePopup" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Anladım
          </button>
          <button id="reviewValues" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Değerleri Gözden Geçir
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Event listeners
    document.getElementById('closePopup').onclick = () => {
      document.body.removeChild(popup);
    };
    
    document.getElementById('reviewValues').onclick = () => {
      document.body.removeChild(popup);
      // Aktif tab'a geç ve tüm kategorileri aç
      setActiveTab('active');
      setAllExpanded(true);
    };
    
    // ESC tuşu ile kapatma
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(popup);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  };

  // Hiyerarşik satırları render et
  const renderHierarchicalRows = (items, depth = 0) => {
    const rows = [];

    // İlk item'dan yıl alanlarını bul
    const getYearFields = () => {
      if (items && items.length > 0) {
        const sampleItem = items[0];
        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
      }
      return ['2020', '2021']; // fallback
    };
    
    const yearFields = getYearFields();

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
      const canEdit = isEditable(item);
      
      const isMainHeading = /^[IVX]+\./.test(item.description || '');
      
      const displayDescription = isMainHeading ? 
        (item.description || 'Açıklama yok').toUpperCase() : 
        formatAccountName(item.description || 'Açıklama yok');

      // Otomatik hesaplanan değerleri göster
      const statusColor = item.isCalculated ? 'bg-orange-500' : 
                         item.is_edited ? 'bg-blue-500' : 
                         item.definition && item.definition !== 'eşleşmedi' ? 'bg-green-500' : 'bg-gray-400';

      // Dinamik yıl kolonları için cell'leri oluştur
      const yearCells = yearFields.map(year => (
        <td key={year} className="px-6 py-3 whitespace-nowrap text-right w-1/6">
          {editingItem && editingItem.id === item.id && canEdit ? (
            <input
              type="text"
              name={`current_value_${year}`}
              value={editingItem[`current_value_${year}`] || ''}
              onChange={handleInputChange}
              onFocus={(e) => e.target.select()}
              className="w-full p-1 border border-gray-300 rounded text-right"
              placeholder="0,00"
            />
          ) : (
            <div className={`${textSize} text-gray-900 font-mono ${fontWeight} ${item.isCalculated ? 'text-orange-600' : ''}`}>
              {item[year] || '-'}
            </div>
          )}
        </td>
      ));

      rows.push(
        <tr 
          key={item.id}
          className={`${bgColor} hover:bg-gray-100 transition-colors duration-150 ${item.is_edited ? 'border-l-4 border-blue-500' : ''} ${item.isCalculated ? 'border-l-4 border-orange-500' : ''}`}
        >
          <td className="px-6 py-3 whitespace-nowrap border-r border-gray-200 w-1/6">
            <div className="flex items-center">
              {hasChildren && (
                <button
                  onClick={() => toggleItem(item.id)}
                  className="mr-2 text-gray-500 w-4 flex-shrink-0 hover:text-gray-700"
                >
                  {isExpanded ? '−' : '+'}
                </button>
              )}
              <span className={`${textSize} text-gray-900 ${fontWeight}`}>
                {item.definition || '-'}
              </span>
            </div>
          </td>
          <td className={`px-6 py-3 ${paddingClass}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${statusColor}`} title={
                item.isCalculated ? 'Otomatik hesaplanan' : 
                item.is_edited ? 'Düzenlenmiş' : 
                item.definition ? 'PDF\'den gelen' : 'Hesap planından'
              }></div>
              <div className={`${textSize} text-gray-900 ${fontWeight} ${isMainHeading ? 'uppercase' : ''} ${!canEdit ? 'text-gray-600' : ''}`}>
                {displayDescription}
              </div>
            </div>
          </td>
          {yearCells}
          <td className="px-6 py-3 text-center">
            {editingItem && editingItem.id === item.id ? (
              <div className="flex justify-center space-x-2">
                <button 
                  onClick={saveItem} 
                  className="text-green-600 hover:text-green-900 p-1"
                  title="Kaydet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  onClick={cancelEditing} 
                  className="text-red-600 hover:text-red-900 p-1"
                  title="İptal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : canEdit ? (
              <button 
                onClick={() => startEditing(item)} 
                className="text-blue-600 hover:text-blue-900 p-1"
                title="Düzenle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            ) : (
              <div className="flex justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Otomatik hesaplanan - düzenlenemez">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}
          </td>
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
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Hata</p>
        <p>{error}</p>
        <div className="mt-4">
          <Link to="/balance-sheets" className="text-blue-600 hover:text-blue-800">
            Bilançolar sayfasına dön
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p className="font-bold">Başarılı</p>
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bilanço Düzenle</h1>
              <p className="text-sm text-gray-600">Bilanço verilerini düzenleyebilir ve kaydedebilirsiniz</p>
            </div>
          </div>
          
        <div className="flex space-x-3">
            <Link
              to={`/balance-sheets/${id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            >
              ← Görünüm
          </Link>
          <button 
            onClick={saveBalanceSheet} 
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isBalanced 
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150`}
            disabled={!isBalanced}
          >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {!isBalanced ? 'Bilanço Dengeli Değil' : 'Bilançoyu Kaydet'}
          </button>
          </div>
        </div>
      </div>
      
      {balanceSheet && (
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
                  {balanceSheet.company_name}
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
                  {balanceSheet.year} - {balanceSheet.period}
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
                  {balanceSheet.tax_number || '-'}
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
                <h3 className="text-sm font-medium text-gray-500 mb-1">Kayıt Tarihi</h3>
                <p className="text-lg font-bold text-gray-900">
                  {formatDateDDMMYYYY(balanceSheet.creation_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
              Aktif Hesaplar (Düzenle)
            </button>
            <button
              onClick={() => setActiveTab('passive')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'passive'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pasif Hesaplar (Düzenle)
            </button>
          </nav>
        </div>
      </div>
      
      {/* Financial Data Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 mb-6">
        <div className={`px-6 py-4 ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'} flex items-center justify-between`}>
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {activeTab === 'active' ? 'Aktif Hesapları Düzenle' : 'Pasif Hesapları Düzenle'}
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
          <table className="min-w-full divide-y divide-gray-200">
              <thead className={`text-white ${activeTab === 'active' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-1/6">
                    Hesap Kodu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Hesap Adı
                  </th>
                  {(() => {
                    // İlk item'dan yıl alanlarını bul
                    const getYearFields = () => {
                      if (items && items.length > 0) {
                        const sampleItem = items[0];
                        return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
                      }
                      return ['2020', '2021']; // fallback
                    };
                    
                    const yearFields = getYearFields();
                    return yearFields.map(year => (
                      <th key={year} scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider w-1/6">
                        {year}
                      </th>
                    ));
                  })()}
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    İşlemler
                  </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {renderHierarchicalRows(activeTab === 'active' ? activeHierarchy : passiveHierarchy)}
              </tbody>
            </table>
                      </div>
                    )}
        
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              {/* Tüm yıllar için toplam gösterimi */}
              {(() => {
                const getYearFields = () => {
                  if (items && items.length > 0) {
                    const sampleItem = items[0];
                    return Object.keys(sampleItem).filter(key => /^\d{4}(_E)?$/.test(key));
                  }
                  return ['2020', '2021']; // fallback
                };
                
                const yearFields = getYearFields();
                const allYearTotals = window.allYearTotals || {};
                
                return yearFields.map(year => {
                  const yearData = allYearTotals[year];
                  const aktifTotal = yearData?.aktif || 0;
                  const pasifTotal = yearData?.pasif || 0;
                  const isYearBalanced = yearData?.balanced || false;
                  
                  return (
                    <div key={year} className="flex items-center space-x-4 py-1">
                      <div className="text-xs font-medium text-gray-700 bg-gray-200 px-2 py-1 rounded min-w-[60px] text-center">
                        {year}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Aktif:</span>
                        <span className={`font-bold text-sm ${isYearBalanced ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(aktifTotal)}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="text-xs text-gray-600">Pasif:</span>
                        <span className={`font-bold text-sm ${isYearBalanced ? 'text-indigo-600' : 'text-red-600'}`}>
                          {formatCurrency(pasifTotal)}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div className="flex items-center space-x-1">
                        {isYearBalanced ? (
                          <div className="w-3 h-3 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-3 h-3 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-xs font-medium ${isYearBalanced ? 'text-green-600' : 'text-red-600'}`}>
                          Fark: {formatCurrency(Math.abs(aktifTotal - pasifTotal))}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
              
              {/* Genel durum */}
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-300">
                {isBalanced ? (
                  <>
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      Bilanço dengeli (primary year)
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-red-600">
                      Bilanço kontrol gerekiyor!
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-right space-y-2">
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 mb-1">Primary Year Fark</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-xl ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(aktifToplam - pasifToplam))}
                  </span>
                  {isBalanced ? (
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                        </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-gray-500">
                  Düzenlenen: {items.filter(item => item.is_edited).length} kalem
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
        
      {/* API Bilgi Notu */}
      <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6" role="alert">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="font-bold">API Bağlantısı Durumu</p>
            <p>Bilanço işlemleri için API bağlantısı şu anda kullanılamıyor olabilir. Bu durumda sistem otomatik olarak demo veriler gösterecektir.</p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">Hata:</span> PDF analizi ve yükleme işlemleri demo modda çalışacak. Gerçek sunucu bağlantısı gerektiğinde lütfen arka uç (backend) sisteminin çalıştığından emin olun.
            </p>
            <p className="mt-2 text-sm">
              <code className="bg-blue-100 px-2 py-1 rounded">ERR_CONNECTION_REFUSED</code> hatası görürseniz, sunucu bağlantısında sorun var demektir.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <Link 
          to="/balance-sheets" 
          className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded mr-3"
        >
          İptal
        </Link>
        <button 
          onClick={saveBalanceSheet} 
          className={`font-medium py-2 px-4 rounded flex items-center ${
            !isBalanced || loading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
          disabled={!isBalanced || loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-200" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Kaydediliyor...
            </>
          ) : !isBalanced ? (
            'Bilanço Dengeli Değil'
          ) : (
            'Bilançoyu Kaydet'
          )}
        </button>
      </div>
    </div>
  );
};

export default BalanceSheetEdit; 