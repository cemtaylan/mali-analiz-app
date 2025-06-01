import axios from 'axios';

// API temel URL'i - proxy kullanıldığı için boş
const API_BASE_URL = '';
// API hatalarını kontrol et
console.log("API bağlantı URL'si:", API_BASE_URL || 'Proxy kullanılıyor');

/**
 * Bilanço API işlemleri
 */
export const BalanceSheetAPI = {
  // Tüm bilançoları getir
  getAllBalanceSheets: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/balance-sheets`);
      return response.data;
    } catch (error) {
      console.error("Bilançolar yüklenirken hata:", error);
      // Demo veriler
      return [
        { 
          id: 1, 
          company_name: 'ABC Şirketi', 
          year: 2024, 
          period: 'Q1', 
          creation_date: '2024-03-31',
          notes: 'İlk çeyrek bilançosu'
        },
        { 
          id: 2, 
          company_name: 'XYZ Holding', 
          year: 2023, 
          period: 'YILLIK', 
          creation_date: '2023-12-31',
          notes: '2023 yılsonu bilançosu'
        },
        { 
          id: 3, 
          company_name: 'Örnek Anonim Şirketi', 
          year: 2023, 
          period: 'Q3', 
          creation_date: '2023-09-30',
          notes: 'Üçüncü çeyrek bilançosu'
        }
      ];
    }
  },

  // Bilanço detayını getir
  getBalanceSheetDetail: async (id) => {
    try {
      console.log(`Bilanço detayı API isteği gönderiliyor: ${API_BASE_URL}/balance-sheets/${id}`);
      const response = await axios.get(`${API_BASE_URL}/balance-sheets/${id}`);
      console.log(`Bilanço detayı API yanıtı (${id}):`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Bilanço detayı (${id}) yüklenirken hata:`, error);
      console.error('Hata detayları:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // 404 hatası durumunda gerçek listeden veriyi almaya çalış
      if (error.response?.status === 404) {
        console.log("Bilanço detail endpoint'i bulunamadı (404), liste API'sinden veri alınıyor...");
        
        try {
          // Tüm bilançoları al ve istenen ID'yi bul
          const allBalanceSheets = await axios.get(`${API_BASE_URL}/balance-sheets`);
          const targetBalanceSheet = allBalanceSheets.data.find(bs => bs.id === parseInt(id));
          
          if (targetBalanceSheet) {
            console.log(`✅ ID ${id} için gerçek veri liste API'sinden alındı:`, targetBalanceSheet);
            
            // Gerçek veriyi detay formatına dönüştür
            return {
              balance_sheet: {
                id: targetBalanceSheet.id,
                company_name: targetBalanceSheet.company_name,
                tax_number: targetBalanceSheet.tax_number,
                year: targetBalanceSheet.year,
                period: targetBalanceSheet.period,
                creation_date: targetBalanceSheet.creation_date,
                notes: targetBalanceSheet.notes || `${targetBalanceSheet.company_name} ${targetBalanceSheet.year} ${targetBalanceSheet.period} bilançosu`,
                pdf_filename: targetBalanceSheet.pdf_filename,
                analysis_status: targetBalanceSheet.analysis_status,
                currency: targetBalanceSheet.currency,
                industry: targetBalanceSheet.industry,
                raw_pdf_data: null // Henüz backend'den gelmediği için null
              },
              items: []
            };
          } else {
            console.warn(`⚠️ ID ${id} liste API'sinde bulunamadı, demo veri döndürülüyor.`);
          }
        } catch (listError) {
          console.error('Liste API\'sinden veri alınamadı:', listError);
        }
      }
      
      // Network hataları VEYA liste API'sinden de veri alınamazsa demo veri döndür
      if (error.message.includes('Network Error') || 
          error.message.includes('ECONNREFUSED') ||
          error.code === 'ECONNREFUSED' ||
          !error.response) {
        console.log("API bağlantısı kurulamadı, demo bilanço detayı döndürülüyor.");
      } else {
        console.log("API'den gerçek veri alınamadı, demo veri döndürülüyor.");
      }
        
      // ID'ye göre farklı demo şirket bilgileri
      const demoCompanies = {
        1: { name: 'ABC Şirketi', tax_number: '1234567890' },
        2: { name: 'XYZ Holding', tax_number: '0987654321' },
        3: { name: 'Örnek Anonim Şirketi', tax_number: '5555555555' },
        4: { name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', tax_number: '6140087281' },
        5: { name: 'Demo Tekstil A.Ş.', tax_number: '1111111111' },
        6: { name: 'Teknoloji Yazılım Ltd.', tax_number: '2222222222' },
        7: { name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', tax_number: '6140087281' },
        8: { name: 'Ticaret ve Pazarlama Ltd.', tax_number: '4444444444' },
        9: { name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', tax_number: '6140087281' },
        10: { name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', tax_number: '6140087281' },
        11: { name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', tax_number: '6140087281' }
      };
      
      const companyInfo = demoCompanies[id] || { name: 'Demo Şirket A.Ş.', tax_number: '1234567890' };
      
      // Demo bilanço detayı
      return {
        balance_sheet: {
          id: parseInt(id),
          company_name: companyInfo.name,
          tax_number: companyInfo.tax_number,
          year: 2024,
          period: 'YILLIK',
          creation_date: '2024-12-31 10:00:00',
          notes: `${companyInfo.name} demo bilanço detayı`,
          raw_pdf_data: JSON.stringify({
            items: [
              {
                definition: "A.1.1.1",
                account_name: "KASA",
                "2024": "125.000,00",
                "2023": "100.000,00"
              },
              {
                definition: "A.1.3.1", 
                account_name: "ALICILAR",
                "2024": "750.000,00",
                "2023": "650.000,00"
              },
              {
                definition: "A.1.1.3",
                account_name: "BANKALAR", 
                "2024": "385.000,00",
                "2023": "320.000,00"
              },
              {
                definition: "A.1.5.1",
                account_name: "İLK MADDE VE MALZEME",
                "2024": "175.000,00", 
                "2023": "155.000,00"
              },
              {
                definition: "A.2.4.1",
                account_name: "ARAZİ VE ARSALAR",
                "2024": "850.000,00",
                "2023": "850.000,00"
              },
              {
                definition: "P.1.1.1",
                account_name: "BANKA KREDİLERİ",
                "2024": "230.000,00",
                "2023": "180.000,00" 
              },
              {
                definition: "P.1.2.1",
                account_name: "SATICILAR",
                "2024": "185.000,00",
                "2023": "140.000,00"
              },
              {
                definition: "P.2.1.1", 
                account_name: "UZUN VADELİ BANKA KREDİLERİ",
                "2024": "450.000,00",
                "2023": "380.000,00"
              },
              {
                definition: "P.3.1.1",
                account_name: "SERMAYE", 
                "2024": "915.000,00",
                "2023": "903.500,00"
              },
              {
                definition: "A.1",
                account_name: "DÖNEN VARLIKLAR",
                "2024": "1.260.000,00",
                "2023": "1.125.000,00"
              },
              {
                definition: "A.2", 
                account_name: "DURAN VARLIKLAR",
                "2024": "850.000,00",
                "2023": "850.000,00"
              },
              {
                definition: "P.1",
                account_name: "KISA VADELİ BORÇLAR", 
                "2024": "415.000,00",
                "2023": "320.000,00"
              },
              {
                definition: "P.2",
                account_name: "UZUN VADELİ BORÇLAR",
                "2024": "450.000,00", 
                "2023": "380.000,00"
              },
              {
                definition: "P.3",
                account_name: "ÖZKAYNAKLAR",
                "2024": "915.000,00",
                "2023": "903.500,00"
              }
            ]
          })
        },
        items: []
      };
    }
  },

  // Bilanço kalemlerini getir
  getBalanceSheetItems: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/balance-sheets/${id}/items`);
      return response.data;
    } catch (error) {
      console.error(`Bilanço kalemleri (${id}) yüklenirken hata:`, error);
      
      // Demo veri döndür
      const demoItems = [
        { id: 1001, balance_sheet_id: id, account_code: "A.1.1.1", account_name: "KASA", current_amount: 125000.0, previous_amount: 100000.0, inflation_amount: 135000.0, is_edited: false },
        { id: 1002, balance_sheet_id: id, account_code: "A.1.3.1", account_name: "ALICILAR", current_amount: 750000.0, previous_amount: 650000.0, inflation_amount: null, is_edited: false },
        { id: 1003, balance_sheet_id: id, account_code: "A.1.1.3", account_name: "BANKALAR", current_amount: 385000.0, previous_amount: 320000.0, inflation_amount: 400000.0, is_edited: false },
        { id: 1004, balance_sheet_id: id, account_code: "A.1.5.1", account_name: "İLK MADDE VE MALZEME", current_amount: 175000.0, previous_amount: 155000.0, inflation_amount: null, is_edited: false },
        { id: 1005, balance_sheet_id: id, account_code: "A.2.4.1", account_name: "ARAZİ VE ARSALAR", current_amount: 850000.0, previous_amount: 850000.0, inflation_amount: 920000.0, is_edited: false },
        { id: 1006, balance_sheet_id: id, account_code: "P.1.1.1", account_name: "BANKA KREDİLERİ", current_amount: 230000.0, previous_amount: 180000.0, inflation_amount: null, is_edited: false },
        { id: 1007, balance_sheet_id: id, account_code: "P.1.2.1", account_name: "SATICILAR", current_amount: 185000.0, previous_amount: 140000.0, inflation_amount: null, is_edited: false },
        { id: 1008, balance_sheet_id: id, account_code: "P.2.1.1", account_name: "BANKA KREDİLERİ", current_amount: 450000.0, previous_amount: 380000.0, inflation_amount: null, is_edited: false },
        { id: 1009, balance_sheet_id: id, account_code: "P.3.1.1", account_name: "SERMAYE", current_amount: 915000.0, previous_amount: 903500.0, inflation_amount: 915000.0, is_edited: false },
        { id: 1010, balance_sheet_id: id, account_code: "A.1.2.1", account_name: "HİSSE SENETLERİ", current_amount: null, previous_amount: 75000.0, inflation_amount: null, is_edited: false },
        { id: 1011, balance_sheet_id: id, account_code: "P.1.3.1", account_name: "ORTAKLARA BORÇLAR", current_amount: 120000.0, previous_amount: null, inflation_amount: null, is_edited: false }
      ];
      
      // Aktif ve pasif toplamlar
      const aktifToplam = demoItems
        .filter(item => item.account_code.startsWith("A"))
        .reduce((sum, item) => sum + (item.current_amount || 0), 0);
      
      const pasifToplam = demoItems
        .filter(item => item.account_code.startsWith("P"))
        .reduce((sum, item) => sum + (item.current_amount || 0), 0);
      
      // Döndürülecek demo veri
      return {
        balance_sheet_id: id,
        items: demoItems,
        has_inflation_data: true,
        aktif_toplam: aktifToplam,
        pasif_toplam: pasifToplam,
        is_balanced: Math.abs(aktifToplam - pasifToplam) < 0.01
      };
    }
  },

  // Bilanço kalemini güncelle
  updateBalanceSheetItem: async (balanceSheetId, itemId, currentAmount, previousAmount, inflationAmount) => {
    try {
      const formData = new FormData();
      if (currentAmount !== undefined) formData.append('current_amount', currentAmount);
      if (previousAmount !== undefined) formData.append('previous_amount', previousAmount);
      if (inflationAmount !== undefined) formData.append('inflation_amount', inflationAmount);
      
      const response = await axios.put(
        `${API_BASE_URL}/balance-sheets/${balanceSheetId}/items/${itemId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Bilanço kalemi güncelleme (${itemId}) hatası:`, error);
      
      // Demo veri
      return {
        id: itemId,
        balance_sheet_id: balanceSheetId,
        current_amount: currentAmount,
        previous_amount: previousAmount,
        inflation_amount: inflationAmount,
        is_edited: true,
        message: "Bilanço kalemi başarıyla güncellendi (demo yanıt)"
      };
    }
  },
  
  // Bilanço toplamlarını hesapla
  calculateBalanceSheetTotals: async (balanceSheetId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/balance-sheets/${balanceSheetId}/calculate-totals`);
      return response.data;
    } catch (error) {
      console.error(`Bilanço toplamları hesaplama (${balanceSheetId}) hatası:`, error);
      
      // Demo veri - gerçek uygulamada bu veriler API'dan alınır
      // Bu demo verileri, getBalanceSheetItems'dan aldıklarımızla tutarlı olmalı
      const aktifToplam = 2285000; // A.1.1.1 + A.1.3.1 + A.1.1.3 + A.1.5.1 + A.2.4.1
      const pasifToplam = 1900000; // P.1.1.1 + P.1.2.1 + P.2.1.1 + P.3.1.1 + P.1.3.1
      
      return {
        balance_sheet_id: balanceSheetId,
        ana_kategoriler: {
          "A": {
            name: "AKTİF (VARLIKLAR)",
            current_total: aktifToplam,
            previous_total: 2150000,
            inflation_total: 1455000
          },
          "P": {
            name: "PASİF (KAYNAKLAR)",
            current_total: pasifToplam,
            previous_total: 1603500,
            inflation_total: 915000
          }
        },
        aktif_toplam: aktifToplam,
        pasif_toplam: pasifToplam,
        is_balanced: Math.abs(aktifToplam - pasifToplam) < 0.01
      };
    }
  },

  // Hesap planı ile birlikte bilanço detayını getir
  getBalanceSheetWithPlan: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/balance-sheets/${id}/with-plan`);
      return response.data;
    } catch (error) {
      console.error(`Bilanço ve hesap planı (${id}) yüklenirken hata:`, error);
      
      // Demo veri
      // Bu durumda hesap planı ve bilanço verilerini ayrı ayrı alıp birleştirmeyi deneyelim
      try {
        // Bilanço detayı
        const balanceSheetResponse = await axios.get(`${API_BASE_URL}/balance-sheets/${id}`);
        const balanceSheetData = balanceSheetResponse.data;
        
        // Hesap planı
        const accountCategoriesResponse = await axios.get(`${API_BASE_URL}/account-categories`);
        const accountCategoriesData = accountCategoriesResponse.data;
        
        // İki veriyi birleştir
        return {
          ...balanceSheetData,
          account_categories: accountCategoriesData
        };
      } catch (innerError) {
        console.error("Bilanço verilerini alternatif yöntemle yüklerken hata:", innerError);
        throw error;
      }
    }
  },

  // Bilanço sil
  deleteBalanceSheet: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/balance-sheets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Bilanço silme (${id}) işleminde hata:`, error);
      throw error;
    }
  },

  // PDF yükle ve analiz et
  analyzePdf: async (formData) => {
    try {
      // Form verilerinin içeriğini log'la
      const formDataFields = [];
      for (let [key, value] of formData.entries()) {
        if (key === 'file') {
          formDataFields.push(`${key}: '${value.name}'`);
        } else {
          formDataFields.push(`${key}: '${value}'`);
        }
      }
      
      console.log('API\'ye PDF analiz isteği gönderiliyor:', {
        endpoint: `${API_BASE_URL}/upload`,
        formData_fields: formDataFields,
        company_id: formData.get('company_id'),
        file_name: formData.get('file')?.name
      });
      
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('API analiz yanıtı:', response.data);
      
      // Backend'den gelen yanıtı frontend formatına dönüştür
      if (response.data.success && response.data.financial_data) {
        const transformedResponse = {
          success: true,
          detected_data: {
            company_name: response.data.filename ? response.data.filename.replace('.pdf', '') : '',
            tax_number: response.data.tax_number || '',
            trade_registry_number: response.data.trade_registry_number || '',
            email: response.data.email || '',
            year: response.data.year || new Date().getFullYear(),
            period: response.data.period || 'YILLIK',
            previous_period_year: response.data.previous_period_year || null,
            current_period_year: response.data.current_period_year || new Date().getFullYear(),
            items: response.data.financial_data || []
          }
        };
        
        // VKN tespit edildi mi kontrol et ve şirket bilgisini al
        let detectedTaxNumber = transformedResponse.detected_data.tax_number;
        
        // Eğer API'den VKN gelmedi ise financial_data'dan çıkarmaya çalış
        if (!detectedTaxNumber && response.data.financial_data) {
          // PDF'deki VKN'yi financial_data içinde ara
          for (const item of response.data.financial_data) {
            if (item.account_name && item.account_name.includes('VKN')) {
              // VKN değerini çıkarmaya çalış
              const vknMatch = item.account_name.match(/(\d{10})/);
              if (vknMatch) {
                detectedTaxNumber = vknMatch[1];
                transformedResponse.detected_data.tax_number = detectedTaxNumber;
                break;
              }
            }
          }
        }
        
        // VKN tespit edildiyse şirket bilgisini getir
        if (detectedTaxNumber && detectedTaxNumber.length === 10) {
          console.log('VKN tespit edildi, şirket bilgileri alınıyor:', detectedTaxNumber);
          
          try {
            // Şirket kontrolü yap
            const companyCheckResult = await CompanyAPI.checkCompanyByTaxNumber(detectedTaxNumber);
            
            if (companyCheckResult.exists && companyCheckResult.company) {
              console.log('✅ Kayıtlı şirket bulundu:', companyCheckResult.company);
              
              // Şirket bilgilerini güncelle
              transformedResponse.detected_data.company_name = companyCheckResult.company.name;
              transformedResponse.detected_data.tax_number = companyCheckResult.company.tax_number;
              transformedResponse.detected_data.email = companyCheckResult.company.email || '';
              transformedResponse.detected_data.trade_registry_number = companyCheckResult.company.trade_registry_number || '';
            } else {
              console.warn('⚠️ VKN kayıtlı değil:', detectedTaxNumber);
            }
          } catch (companyError) {
            console.error('Şirket bilgisi alınırken hata:', companyError);
          }
        } else {
          console.warn('VKN tespit edilemedi veya geçersiz format');
        }
        
        // PDF'deki dönem ve yıl bilgisini tespit et
        if (response.data.financial_data && response.data.financial_data.length > 0) {
          // İlk item'dan yıl sütunlarını çıkar
          const firstItem = response.data.financial_data[0];
          const yearKeys = Object.keys(firstItem).filter(key => /^\d{4}$/.test(key));
          
          if (yearKeys.length > 0) {
            const years = yearKeys.map(y => parseInt(y)).sort((a, b) => b - a); // Büyükten küçüğe sırala
            
            if (years.length >= 1) {
              transformedResponse.detected_data.current_period_year = years[0];
              transformedResponse.detected_data.year = years[0];
              console.log('📅 Cari dönem yılı PDF\'den tespit edildi:', years[0]);
            }
            
            if (years.length >= 2) {
              transformedResponse.detected_data.previous_period_year = years[1];
              console.log('📅 Önceki dönem yılı PDF\'den tespit edildi:', years[1]);
            }
          }
        }
        
        // Dönem bilgisini filename'dan çıkarmaya çalış
        const filename = response.data.filename || formData.get('file')?.name || '';
        if (filename) {
          // Filename'da "çeyrek", "Q1", "Q2" gibi ifadeler ara
          const periodMatches = filename.toLowerCase();
          if (periodMatches.includes('q1') || periodMatches.includes('çeyrek') || periodMatches.includes('1. çeyrek')) {
            transformedResponse.detected_data.period = 'Q1';
          } else if (periodMatches.includes('q2') || periodMatches.includes('2. çeyrek')) {
            transformedResponse.detected_data.period = 'Q2';
          } else if (periodMatches.includes('q3') || periodMatches.includes('3. çeyrek')) {
            transformedResponse.detected_data.period = 'Q3';
          } else if (periodMatches.includes('q4') || periodMatches.includes('4. çeyrek')) {
            transformedResponse.detected_data.period = 'Q4';
          } else if (periodMatches.includes('yıllık') || periodMatches.includes('annual') || periodMatches.includes('kurumlar')) {
            transformedResponse.detected_data.period = 'YILLIK';
          }
          console.log('📄 PDF dosya adından dönem tespit edildi:', transformedResponse.detected_data.period);
        }
        
        // Form verilerinden dönem yıllarını kontrol et ve yanıtta yoksa ekle
        const formPreviousYear = formData.get('previous_period_year');
        const formCurrentYear = formData.get('current_period_year');
        
        if (formPreviousYear && !transformedResponse.detected_data.previous_period_year) {
          console.log(`Form verilerinden önceki dönem yılı ekleniyor: ${formPreviousYear}`);
          transformedResponse.detected_data.previous_period_year = parseInt(formPreviousYear);
        }
        
        if (formCurrentYear && !transformedResponse.detected_data.current_period_year) {
          console.log(`Form verilerinden cari dönem yılı ekleniyor: ${formCurrentYear}`);
          transformedResponse.detected_data.current_period_year = parseInt(formCurrentYear);
          transformedResponse.detected_data.year = parseInt(formCurrentYear);
        }
        
        // Yanıtı localStorage'a kaydet - BalanceSheetPreview için
        try {
          localStorage.setItem('pdfAnalysisData', JSON.stringify(transformedResponse));
          console.log('PDF verileri localStorage\'a kaydedildi');
        } catch (storageError) {
          console.error('localStorage kaydetme hatası:', storageError);
        }
        
        return transformedResponse;
      } else {
        return { success: false, error: response.data.error || 'PDF analizi başarısız oldu' };
      }
    } catch (error) {
      console.error('PDF analiz hatası:', error);
      if (error.response) {
        console.error('API hata yanıtı:', error.response.data);
        return { success: false, error: error.response.data.error || error.response.data.message || 'API hatası' };
      }
      
      // Network hatası durumunda demo analiz sonucu döndür
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        console.log("API bağlantısı kurulamadı, demo PDF analiz sonucu döndürülüyor.");
        
        // Form verilerinden temel bilgileri al
        const fileName = formData.get('file')?.name || 'demo-pdf.pdf';
        const year = formData.get('year') || 2023;
        const period = formData.get('period') || 'YILLIK';
        
        // Demo analiz sonucu - MEMSAN verilerine uygun
        const demoResponse = {
          success: true,
          detected_data: {
            company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.',
            tax_number: '6140087281',
            trade_registry_number: 'TEKKEKÖY-328',
            email: 'info@memsanmakina.com',
            year: parseInt(year),
            period: period,
            previous_period_year: parseInt(year) - 1,
            current_period_year: parseInt(year),
            items: [
              {
                definition: "A.1.1.1",
                account_name: "KASA",
                description: "KASA",
                "2023": "125.000,00",
                "2022": "100.000,00"
              },
              {
                definition: "A.1.3.1", 
                account_name: "ALICILAR",
                description: "ALICILAR",
                "2023": "750.000,00",
                "2022": "650.000,00"
              },
              {
                definition: "A.1.1.3",
                account_name: "BANKALAR", 
                description: "BANKALAR",
                "2023": "385.000,00",
                "2022": "320.000,00"
              },
              {
                definition: "A.1.5.1",
                account_name: "İLK MADDE VE MALZEME",
                description: "İLK MADDE VE MALZEME",
                "2023": "175.000,00", 
                "2022": "155.000,00"
              },
              {
                definition: "A.2.4.1",
                account_name: "ARAZİ VE ARSALAR",
                description: "ARAZİ VE ARSALAR",
                "2023": "850.000,00",
                "2022": "850.000,00"
              },
              {
                definition: "P.1.1.1",
                account_name: "BANKA KREDİLERİ",
                description: "BANKA KREDİLERİ",
                "2023": "230.000,00",
                "2022": "180.000,00" 
              },
              {
                definition: "P.1.2.1",
                account_name: "SATICILAR",
                description: "SATICILAR",
                "2023": "185.000,00",
                "2022": "140.000,00"
              },
              {
                definition: "P.2.1.1", 
                account_name: "UZUN VADELİ BANKA KREDİLERİ",
                description: "UZUN VADELİ BANKA KREDİLERİ",
                "2023": "450.000,00",
                "2022": "380.000,00"
              },
              {
                definition: "P.3.1.1",
                account_name: "SERMAYE", 
                description: "SERMAYE",
                "2023": "915.000,00",
                "2022": "903.500,00"
              }
            ]
          }
        };
        
        // localStorage'a kaydet
        try {
          localStorage.setItem('pdfAnalysisData', JSON.stringify(demoResponse));
          console.log('Demo PDF analiz verileri localStorage\'a kaydedildi');
        } catch (storageError) {
          console.error('localStorage kaydetme hatası:', storageError);
        }
        
        return demoResponse;
      }
      
      return { success: false, error: error.message };
    }
  },

  // Bilanço PDF yükle
  uploadBalanceSheetPdf: async (formData) => {
    try {
      console.log("API'ye bilanço yükleme isteği gönderiliyor:", {
        endpoint: `${API_BASE_URL}/upload-balance-sheet`,
        formData_fields: Array.from(formData.keys())
      });
      
      const response = await axios.post(`${API_BASE_URL}/upload-balance-sheet`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log("API yükleme yanıtı:", response.data);
      return response.data;
    } catch (error) {
      console.error("Bilanço PDF yükleme sırasında hata:", error);
      console.error("Hata detayları:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      // Sadece gerçek ağ bağlantı hatalarında demo veri döndür
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        console.log("API bağlantısı kurulamadı, demo PDF yükleme cevabı kullanılıyor.");
        
        // Form verilerinden bilgileri çıkarmaya çalışalım
        let companyName = "Demo Şirket";
        let year = new Date().getFullYear();
        let period = "YILLIK";
        
        try {
          // FormData'dan temel bilgileri çıkarmaya çalış
          const companyId = formData.get('company_id');
          if (companyId) {
            // Şirket ID'sine göre varsayılan isimler
            if (companyId === "1" || companyId === 1) companyName = "ABC Şirketi";
            else if (companyId === "2" || companyId === 2) companyName = "XYZ Holding";
            else if (companyId === "3" || companyId === 3) companyName = "Örnek Anonim Şirketi";
            else if (companyId === "4" || companyId === 4) companyName = "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.";
          }
          
          const yearValue = formData.get('year');
          if (yearValue) year = parseInt(yearValue);
          
          const periodValue = formData.get('period');
          if (periodValue) period = periodValue;
        } catch (e) {
          console.error("FormData içeriği alınamadı:", e);
        }
        
        return {
          success: true,
          balance_sheet_id: Math.floor(Math.random() * 1000) + 10, // Rastgele ID
          id: Math.floor(Math.random() * 1000) + 10, // Bazı API'ler id döndürebilir
          company_name: companyName,
          year: year,
          period: period,
          creation_date: new Date().toISOString().split('T')[0],
          message: "PDF başarıyla işlendi (demo yanıt). Sunucu bağlantısı olmadığı için gerçek işlem yapılmadı."
        };
      }
      
      // Diğer hatalarda hatayı fırlat
      throw error;
    }
  },

  // JSON verisine göre PDF analiz et
  analyzePdfWithJson: async (formData, jsonData) => {
    try {
      console.log('📄 JSON verisine göre PDF analiz isteği gönderiliyor');
      
      // FormData'ya JSON verilerini ekle
      if (jsonData.company_info) {
        formData.append('company_info', JSON.stringify(jsonData.company_info));
      }
      
      if (jsonData.analysis_metadata) {
        formData.append('analysis_metadata', JSON.stringify(jsonData.analysis_metadata));
      }
      
      if (jsonData.target_year) {
        formData.append('target_year', jsonData.target_year);
      }
      
      if (jsonData.target_period) {
        formData.append('target_period', jsonData.target_period);
      }

      const response = await axios.post(`${API_BASE_URL}/analyze-pdf-with-json`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('✅ JSON PDF analiz yanıtı:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ JSON PDF analiz hatası:', error);
      
      if (error.response) {
        console.error('API hata yanıtı:', error.response.data);
        return { 
          success: false, 
          error: error.response.data.error || error.response.data.message || 'API hatası' 
        };
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // Bilanço önizleme verisi hazırla
  prepareBalanceSheetPreview: async (analysisData) => {
    try {
      console.log('📊 Bilanço önizleme verisi hazırlanıyor');
      
      const response = await axios.post(`${API_BASE_URL}/balance-sheets/prepare-preview`, analysisData);
      
      console.log('✅ Önizleme verisi hazırlandı:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Önizleme verisi hazırlama hatası:', error);
      
      if (error.response) {
        console.error('API hata yanıtı:', error.response.data);
        return { 
          success: false, 
          error: error.response.data.error || 'Önizleme verisi hazırlanamadı' 
        };
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // Bilanço önizleme verilerini kaydet
  saveBalanceSheetPreview: async (previewData) => {
    try {
      console.log('💾 Bilanço önizleme verisi kaydediliyor');
      
      const response = await axios.post(`${API_BASE_URL}/balance-sheets/save-preview`, {
        preview_data: previewData
      });
      
      console.log('✅ Bilanço kaydedildi:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ Bilanço kaydetme hatası:', error);
      
      if (error.response) {
        console.error('API hata yanıtı:', error.response.data);
        return { 
          success: false, 
          error: error.response.data.error || 'Bilanço kaydedilemedi' 
        };
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // JSON verisi ile demo analiz (test için)
  getDemoAnalysisWithJson: async () => {
    try {
      // Demo JSON verisini oku
      const demoData = {
        "company_info": {
          "name": "Test Demo Şirketi",
          "tax_number": "1111111111",
          "email": "demo@test.com",
          "industry": "Test"
        },
        "detected_data": {
          "company_name": "Test Demo Şirketi",
          "tax_number": "1111111111",
          "items": [
            {
              "definition": "100",
              "account_name": "KASA",
              "description": "KASA",
              "2023": "1000000",
              "2024": "1200000",
              "2024_E": "1250000"
            },
            {
              "definition": "120",
              "account_name": "BANKALAR",
              "description": "BANKALAR",
              "2023": "500000",
              "2024": "600000"
            },
            {
              "definition": "300",
              "account_name": "SATICILAR",
              "description": "SATICILAR",
              "2023": "800000",
              "2024": "900000"
            }
          ]
        },
        "analysis_metadata": {
          "filename": "demo_test.pdf",
          "year": 2024,
          "period": "YILLIK"
        }
      };

      // Önizleme verisi hazırla
      const previewResponse = await this.prepareBalanceSheetPreview(demoData);
      
      if (previewResponse.success) {
        return {
          success: true,
          preview_data: previewResponse.preview_data
        };
      } else {
        throw new Error(previewResponse.error);
      }
      
    } catch (error) {
      console.error('❌ Demo analiz hatası:', error);
      
      // Fallback demo verisi
      return {
        success: true,
        preview_data: {
          company_info: {
            name: "Test Demo Şirketi",
            tax_number: "1111111111",
            email: "demo@test.com",
            industry: "Test"
          },
          detected_data: {
            company_name: "Test Demo Şirketi",
            tax_number: "1111111111",
            year: 2024,
            period: "YILLIK",
            items: [
              {
                account_code: "100",
                account_name: "KASA",
                description: "KASA",
                year_data: {
                  "2023": "1000000",
                  "2024": "1200000",
                  "2024_E": "1250000"
                }
              },
              {
                account_code: "120",
                account_name: "BANKALAR", 
                description: "BANKALAR",
                year_data: {
                  "2023": "500000",
                  "2024": "600000"
                }
              },
              {
                account_code: "300",
                account_name: "SATICILAR",
                description: "SATICILAR", 
                year_data: {
                  "2023": "800000",
                  "2024": "900000"
                }
              }
            ],
            year_columns: ["2023", "2024", "2024_E"],
            previous_period_year: 2023,
            current_period_year: 2024
          },
          analysis_metadata: {
            filename: "demo_test.pdf",
            year: 2024,
            period: "YILLIK",
            processed_at: new Date().toISOString(),
            total_items: 3,
            matched_items: 3
          }
        }
      };
    }
  },
};

/**
 * Şirket API işlemleri
 */
export const CompanyAPI = {
  // Tüm şirketleri getir
  getAllCompanies: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies`);
      return response.data;
    } catch (error) {
      console.error("Şirketler yüklenirken hata:", error);
      // Demo veriler - daha kapsamlı veriler sunuyoruz
      console.log("API bağlantısı kurulamadı, demo şirket verileri kullanılıyor.");
      return [
        { id: 1, name: "ABC Şirketi", tax_number: "1234567890", email: "info@abc.com", trade_registry_number: "ABC-123", industry: "Teknoloji" },
        { id: 2, name: "XYZ Holding", tax_number: "0987654321", email: "info@xyz.com", trade_registry_number: "XYZ-456", industry: "Finans" },
        { id: 3, name: "Örnek Anonim Şirketi", tax_number: "5555555555", email: "info@ornek.com", trade_registry_number: "ORNEK-789", industry: "Üretim" },
        { id: 4, name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", tax_number: "6140087281", email: "info@memsanmakina.com", trade_registry_number: "TEKKEKÖY-328", industry: "Makina" }
      ];
    }
  },

  // VKN ile şirket kontrol et
  checkCompanyByTaxNumber: async (taxNumber) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies/check-tax/${taxNumber}`);
      return response.data;
    } catch (error) {
      console.error(`VKN kontrolünde (${taxNumber}) hata:`, error);
      
      // Bağlantı hatası durumunda demo yanıt
      console.log(`API bağlantısı kurulamadı, VKN kontrolü için demo yanıt döndürülüyor. VKN: ${taxNumber}`);
      
      // Demo yanıt - bilinen VKN'ler için varsayılan şirketler
      const knownCompanies = {
        "1234567890": { id: 1, name: "ABC Şirketi", tax_number: "1234567890" },
        "0987654321": { id: 2, name: "XYZ Holding", tax_number: "0987654321" },
        "5555555555": { id: 3, name: "Örnek Anonim Şirketi", tax_number: "5555555555" },
        "6140087281": { id: 4, name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", tax_number: "6140087281" }
      };
      
      // Bilinen VKN'leri kontrol et
      if (knownCompanies[taxNumber]) {
        return {
          exists: true,
          valid: true,
          message: "Bu VKN ile kayıtlı şirket bulundu (demo veri)",
          company: knownCompanies[taxNumber]
        };
      }
      
      // Farklı VKN formatı kontrolü - 10 haneli mi?
      const isValidFormat = /^\d{10}$/.test(taxNumber);
      
      return {
        exists: false,
        valid: isValidFormat,
        message: isValidFormat 
          ? "Bu VKN geçerli formatta ancak kayıtlı şirket bulunamadı (demo yanıt)" 
          : "VKN geçersiz formatta. 10 haneli sayısal değer olmalıdır (demo yanıt)"
      };
    }
  },
  
  // Yeni şirket ekle
  createCompany: async (companyData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/companies`, companyData);
      return response.data;
    } catch (error) {
      console.error("Şirket oluşturma hatası:", error);
      
      // Demo yanıt
      // Normalde hata fırlatılmalı ama offline demo için başarılı yanıt dönüyoruz
      const demoId = Math.floor(Math.random() * 1000) + 10; // Rastgele demo ID
      return {
        id: demoId,
        name: companyData.title || `${companyData.first_name || ''} ${companyData.last_name || ''}`.trim() || 'Demo Şirket',
        tax_number: companyData.tax_number,
        email: companyData.email,
        trade_registry_number: companyData.trade_registry_number,
        address: companyData.address || "",
        industry: companyData.industry || "",
        phone: companyData.phone || "",
        establishment_date: companyData.establishment_date || "",
        activity_main_category: companyData.activity_main_category || "",
        activity_subcategory: companyData.activity_subcategory || "",
        created_at: new Date().toISOString().split('T')[0]
      };
    }
  },

  // Şirket detaylarını getir
  getCompanyById: async (companyId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies/${companyId}`);
      return response.data;
    } catch (error) {
      console.error(`Şirket detayları yüklenirken hata (ID: ${companyId}):`, error);
      
      // Demo şirket verisi - daha geniş ID aralığı destekleyerek
      const demoCompanies = [
        { 
          id: 1, 
          name: "ABC Şirketi", 
          tax_number: "1234567890", 
          email: "info@abc.com", 
          trade_registry_number: "ABC-123", 
          address: "İstanbul, Türkiye",
          phone: "0212 123 45 67",
          industry: "Teknoloji",
          establishment_date: "2010-01-01",
          created_at: "2024-01-01"
        },
        { 
          id: 2, 
          name: "XYZ Holding", 
          tax_number: "0987654321", 
          email: "info@xyz.com", 
          trade_registry_number: "XYZ-456", 
          address: "Ankara, Türkiye",
          phone: "0312 987 65 43",
          industry: "Finans",
          establishment_date: "2008-05-15",
          created_at: "2024-01-02"
        },
        { 
          id: 3, 
          name: "Örnek Anonim Şirketi", 
          tax_number: "5555555555", 
          email: "info@ornek.com", 
          trade_registry_number: "ORNEK-789", 
          address: "İzmir, Türkiye",
          phone: "0232 555 55 55",
          industry: "Üretim",
          establishment_date: "2015-12-10",
          created_at: "2024-01-03"
        },
        { 
          id: 4, 
          name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", 
          tax_number: "6140087281", 
          email: "info@memsanmakina.com", 
          trade_registry_number: "TEKKEKÖY-328", 
          address: "Samsun, Türkiye",
          phone: "0362 123 45 67",
          industry: "Makina",
          establishment_date: "2005-03-20",
          created_at: "2024-01-04"
        }
      ];
      
      let demoCompany = demoCompanies.find(company => company.id === parseInt(companyId));
      
      // Eğer ID demo listesinde yoksa, dinamik demo şirket oluştur
      if (!demoCompany && parseInt(companyId) > 4) {
        console.log(`ID ${companyId} için dinamik demo şirket oluşturuluyor`);
        
        // Yeni eklenen şirketler için varsayılan demo verisi
        demoCompany = {
          id: parseInt(companyId),
          name: `Demo Şirket ${companyId}`,
          tax_number: `${String(parseInt(companyId) * 123456789).slice(0, 10).padEnd(10, '0')}`,
          email: `demo${companyId}@example.com`,
          trade_registry_number: `DEMO-${companyId}`,
          address: "Demo Mahallesi, Demo Caddesi No:123, İstanbul",
          phone: "0212 555 00 " + String(companyId).padStart(2, '0'),
          industry: "Demo Sektör",
          establishment_date: "2020-01-01",
          activity_main_category: "C",
          activity_subcategory: "15",
          activity_notes: "Demo şirket faaliyet notları",
          sector_size_dynamics: "Demo sektör dinamikleri",
          competitive_position_market_share: "Demo rekabet pozisyonu",
          income_expenses_tax_compliance: "Demo gelir gider vergi uyumu",
          regulation_monitoring: "Demo mevzuat takibi",
          sector_notes: "Demo sektör notları",
          created_at: new Date().toISOString().split('T')[0]
        };
      }
      
      if (demoCompany) {
        console.log(`Demo şirket verisi döndürülüyor: ${demoCompany.name} (ID: ${companyId})`);
        return demoCompany;
      } else {
        console.log(`Demo şirket bulunamadı: ID ${companyId}`);
        throw new Error(`Şirket bulunamadı: ID ${companyId}`);
      }
    }
  },

  // Şirketin bilanço geçmişini getir
  getCompanyBalanceSheets: async (companyId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies/${companyId}/balance-sheets`);
      return response.data;
    } catch (error) {
      console.error(`Şirket bilanço geçmişi yüklenirken hata (ID: ${companyId}):`, error);
      
      // Demo bilanço geçmişi
      return [
        {
          id: 1,
          year: 2024,
          period: 'YILLIK',
          creation_date: '2024-12-31',
          analysis_status: 'completed',
          pdf_filename: 'bilanço_2024.pdf',
          currency: 'TL',
          notes: '2024 yılsonu bilançosu'
        },
        {
          id: 2,
          year: 2023,
          period: 'YILLIK', 
          creation_date: '2023-12-31',
          analysis_status: 'completed',
          pdf_filename: 'bilanço_2023.pdf',
          currency: 'TL',
          notes: '2023 yılsonu bilançosu'
        },
        {
          id: 3,
          year: 2024,
          period: 'Q3',
          creation_date: '2024-09-30',
          analysis_status: 'completed', 
          pdf_filename: 'bilanço_2024_Q3.pdf',
          currency: 'TL',
          notes: '2024 3. çeyrek bilançosu'
        }
      ];
    }
  },

  // Şirket özet bilgilerini getir
  getCompanySummary: async (companyId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/companies/${companyId}/summary`);
      return response.data;
    } catch (error) {
      console.error(`Şirket özet bilgileri yüklenirken hata (ID: ${companyId}):`, error);
      
      // Demo özet bilgiler
      return {
        company_name: `Demo Şirket ${companyId}`,
        tax_number: `${String(parseInt(companyId) * 123456789).slice(0, 10).padEnd(10, '0')}`,
        establishment_date: '2020-01-01',
        industry: 'Demo Sektör',
        registration_date: new Date().toISOString().split('T')[0],
        statistics: {
          total_balance_sheets: 3,
          latest_year: 2024,
          years_analyzed: 2,
          analysis_period: '2023 - 2024'
        }
      };
    }
  }
};

/**
 * Hesap Planı API işlemleri
 */
export const AccountCategoryAPI = {
  // Tüm hesap kategorilerini getir
  getAllAccountCategories: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/account-categories`);
      console.log("Hesap planı API yanıtı:", response.data);
      return response.data;
    } catch (error) {
      console.error("Hesap kategorileri yüklenirken hata:", error);
      console.log("Demo hesap kategorileri kullanılıyor.");
      
      // Demo hesap kategorileri - temel hesap planı
      return [
        // Ana kategoriler
        { id: 1, name: 'AKTİF (VARLIKLAR)', code: 'A', type: 'active', parent_id: null },
        { id: 2, name: 'PASİF (KAYNAKLAR)', code: 'P', type: 'passive', parent_id: null },
        
        // AKTİF - Ana gruplar (Roman rakamlarla)
        { id: 10, name: 'I-DÖNEN VARLIKLAR', code: 'A.1', type: 'active', parent_id: 1 },
        { id: 20, name: 'II-DURAN VARLIKLAR', code: 'A.2', type: 'active', parent_id: 1 },
        
        // I-DÖNEN VARLIKLAR alt grupları
        { id: 100, name: 'A-HAZIR DEĞERLER', code: 'A.1.1', type: 'active', parent_id: 10 },
        { id: 101, name: 'B-MENKUL KIYMETLER', code: 'A.1.2', type: 'active', parent_id: 10 },
        { id: 102, name: 'C-TİCARİ ALACAKLAR', code: 'A.1.3', type: 'active', parent_id: 10 },
        { id: 103, name: 'D-DİĞER ALACAKLAR', code: 'A.1.4', type: 'active', parent_id: 10 },
        { id: 104, name: 'E-STOKLAR', code: 'A.1.5', type: 'active', parent_id: 10 },
        { id: 105, name: 'F-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ', code: 'A.1.6', type: 'active', parent_id: 10 },
        { id: 106, name: 'G-GELECEK AYLARA AİT GİDERLER VE GELİR TAHAKKUKLARI', code: 'A.1.7', type: 'active', parent_id: 10 },
        { id: 107, name: 'H-DİĞER DÖNEN VARLIKLAR', code: 'A.1.8', type: 'active', parent_id: 10 },
        
        // A-HAZIR DEĞERLER detayları
        { id: 1000, name: '1-KASA', code: 'A.1.1.1', type: 'active', parent_id: 100 },
        { id: 1001, name: '2-ALINAN ÇEKLER', code: 'A.1.1.2', type: 'active', parent_id: 100 },
        { id: 1002, name: '3-BANKALAR', code: 'A.1.1.3', type: 'active', parent_id: 100 },
        { id: 1003, name: '4-VERİLEN ÇEKLER VE ÖDEME EMİRLERİ (-)', code: 'A.1.1.4', type: 'active', parent_id: 100 },
        { id: 1004, name: '5-DİĞER HAZIR DEĞERLER', code: 'A.1.1.5', type: 'active', parent_id: 100 },
        
        // B-MENKUL KIYMETLER detayları
        { id: 1010, name: '1-HİSSE SENETLERİ', code: 'A.1.2.1', type: 'active', parent_id: 101 },
        { id: 1011, name: '2-ÖZEL KESİM TAHVİL, SENET VE BONOLARI', code: 'A.1.2.2', type: 'active', parent_id: 101 },
        { id: 1012, name: '3-KAMU KESİMİ TAHVİL, SENET VE BONOLARI', code: 'A.1.2.3', type: 'active', parent_id: 101 },
        { id: 1013, name: '4-DİĞER MENKUL KIYMETLER', code: 'A.1.2.4', type: 'active', parent_id: 101 },
        { id: 1014, name: '5-MENKUL KIYMETLER DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.1.2.5', type: 'active', parent_id: 101 },
        
        // C-TİCARİ ALACAKLAR detayları
        { id: 1020, name: '1-ALICILAR', code: '120', type: 'active', parent_id: 102 },
        { id: 1021, name: '2-ALACAK SENETLERİ', code: '121', type: 'active', parent_id: 102 },
        { id: 1022, name: '3-ALACAK SENETLERİ REESKONTU (-)', code: '122', type: 'active', parent_id: 102 },
        { id: 1023, name: '4-KAZANILMAMIŞ FİNANSMAN GELİRLERİ (-)', code: '123', type: 'active', parent_id: 102 },
        { id: 1024, name: '5-VERİLEN DEPOZİTO VE TEMİNATLAR', code: '124', type: 'active', parent_id: 102 },
        { id: 1025, name: '6-DİĞER TİCARİ ALACAKLAR', code: '125', type: 'active', parent_id: 102 },
        { id: 1026, name: '7-ŞÜPHELİ TİCARİ ALACAKLAR', code: '126', type: 'active', parent_id: 102 },
        { id: 1027, name: '8-ŞÜPHELİ TİCARİ ALACAKLAR KARŞILIĞI (-)', code: '129', type: 'active', parent_id: 102 },
        
        // D-DİĞER ALACAKLAR detayları
        { id: 1030, name: '1-ORTAKLARDAN ALACAKLAR', code: '131', type: 'active', parent_id: 103 },
        { id: 1031, name: '2-İŞTİRAKLERDEN ALACAKLAR', code: '132', type: 'active', parent_id: 103 },
        { id: 1032, name: '3-BAĞLI ORTAKLIKLARDAN ALACAKLAR', code: '133', type: 'active', parent_id: 103 },
        { id: 1033, name: '4-PERSONELDEN ALACAKLAR', code: '135', type: 'active', parent_id: 103 },
        { id: 1034, name: '5-DİĞER ÇEŞİTLİ ALACAKLAR', code: '136', type: 'active', parent_id: 103 },
        { id: 1035, name: '6-DİĞER ALACAK SENETLERİ REESKONTU (-)', code: '137', type: 'active', parent_id: 103 },
        { id: 1036, name: '7-ŞÜPHELİ DİĞER ALACAKLAR', code: '138', type: 'active', parent_id: 103 },
        { id: 1037, name: '8-ŞÜPHELİ DİĞER ALACAKLAR KARŞILIĞI (-)', code: '139', type: 'active', parent_id: 103 },
        
        // E-STOKLAR detayları
        { id: 1040, name: '1-İLK MADDE VE MALZEME', code: '150', type: 'active', parent_id: 104 },
        { id: 1041, name: '2-YARI MAMULLER - ÜRETİM', code: '151', type: 'active', parent_id: 104 },
        { id: 1042, name: '3-MAMULLER', code: '152', type: 'active', parent_id: 104 },
        { id: 1043, name: '4-TİCARİ MALLAR', code: '153', type: 'active', parent_id: 104 },
        { id: 1044, name: '5-DİĞER STOKLAR', code: '154', type: 'active', parent_id: 104 },
        { id: 1045, name: '6-STOK DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '157', type: 'active', parent_id: 104 },
        { id: 1046, name: '7-VERİLEN SİPARİŞ AVANSLARI', code: '158', type: 'active', parent_id: 104 },
        
        // II-DURAN VARLIKLAR alt grupları
        { id: 200, name: 'A-TİCARİ ALACAKLAR', code: '220-229', type: 'active', parent_id: 20 },
        { id: 201, name: 'B-DİĞER ALACAKLAR', code: '231-239', type: 'active', parent_id: 20 },
        { id: 202, name: 'C-MALİ DURAN VARLIKLAR', code: '240-249', type: 'active', parent_id: 20 },
        { id: 204, name: 'D-MADDİ DURAN VARLIKLAR', code: '250-259', type: 'active', parent_id: 20 },
        { id: 205, name: 'E-MADDİ OLMAYAN DURAN VARLIKLAR', code: '260-269', type: 'active', parent_id: 20 },
        { id: 206, name: 'F-ÖZEL TÜKENMEKTE TABİİ VARLIKLAR', code: '270-279', type: 'active', parent_id: 20 },
        { id: 207, name: 'G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI', code: '280-289', type: 'active', parent_id: 20 },
        { id: 208, name: 'H-DİĞER DURAN VARLIKLAR', code: '290-299', type: 'active', parent_id: 20 },
        
        // A-TİCARİ ALACAKLAR (Duran Varlık) detayları
        { id: 2000, name: '1-ALICILAR', code: '220', type: 'active', parent_id: 200 },
        { id: 2001, name: '2-ALACAK SENETLERİ', code: '221', type: 'active', parent_id: 200 },
        { id: 2002, name: '3-ALACAK SENETLERİ REESKONTU (-)', code: '222', type: 'active', parent_id: 200 },
        { id: 2003, name: '4-KAZANILMAMIŞ FİNANSMAN KİRALAMA FAİZ GELİRLERİ (-)', code: '223', type: 'active', parent_id: 200 },
        { id: 2004, name: '5-VERİLEN DEPOZİTO VE TEMİNATLAR', code: '224', type: 'active', parent_id: 200 },
        { id: 2005, name: '6-ŞÜPHELİ ALACAKLAR KARŞILIĞI (-)', code: '225', type: 'active', parent_id: 200 },
        { id: 2006, name: '7-DİĞER TİCARİ ALACAKLAR (-)', code: '229', type: 'active', parent_id: 200 },
        
        // B-DİĞER ALACAKLAR (Duran Varlık) detayları
        { id: 2010, name: '1-ORTAKLARDAN ALACAKLAR', code: '231', type: 'active', parent_id: 201 },
        { id: 2011, name: '2-İŞTİRAKLERDEN ALACAKLAR', code: '232', type: 'active', parent_id: 201 },
        { id: 2012, name: '3-BAĞLI ORTAKLIKLARDAN ALACAKLAR', code: '233', type: 'active', parent_id: 201 },
        { id: 2013, name: '4-PERSONELDEN ALACAKLAR', code: '235', type: 'active', parent_id: 201 },
        { id: 2014, name: '5-DİĞER ÇEŞİTLİ ALACAKLAR', code: '236', type: 'active', parent_id: 201 },
        { id: 2015, name: '6-DİĞER ALACAK SENETLERİ REESKONTU (-)', code: '237', type: 'active', parent_id: 201 },
        { id: 2016, name: '7-ŞÜPHELİ DİĞER ALACAKLAR KARŞILIĞI (-)', code: '239', type: 'active', parent_id: 201 },
        
        // C-MALİ DURAN VARLIKLAR detayları
        { id: 2020, name: '1-BAĞLI MENKUL KIYMETLER', code: '240', type: 'active', parent_id: 202 },
        { id: 2021, name: '2-MALİ DURAN VARLIKLAR DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '241', type: 'active', parent_id: 202 },
        { id: 2022, name: '3-İŞTİRAKLER', code: '242', type: 'active', parent_id: 202 },
        { id: 2023, name: '4-İŞTİRAKLER SERMAYE TAAHHÜTLERI (-)', code: '243', type: 'active', parent_id: 202 },
        { id: 2024, name: '5-İŞTİRAKLER SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '244', type: 'active', parent_id: 202 },
        { id: 2025, name: '6-BAĞLI ORTAKLIKLAR', code: '245', type: 'active', parent_id: 202 },
        { id: 2026, name: '7-BAĞLI ORTAKLIKLARA SERMAYE TAAHHÜTLERI (-)', code: '246', type: 'active', parent_id: 202 },
        { id: 2027, name: '8-BAĞLI ORTAKLIKLAR SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '247', type: 'active', parent_id: 202 },
        { id: 2028, name: '9-DİĞER MALİ DURAN VARLIKLAR', code: '248', type: 'active', parent_id: 202 },
        { id: 2029, name: '10-DİĞER MALİ DURAN VARLIKLAR DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '249', type: 'active', parent_id: 202 },
        
        
        // D-MADDİ DURAN VARLIKLAR detayları
        { id: 2040, name: '1-ARAZİ VE ARSALAR', code: '250', type: 'active', parent_id: 204 },
        { id: 2041, name: '2-YERALTINA VE YER ÜSTÜ DÜZENLEMELER', code: '251', type: 'active', parent_id: 204 },
        { id: 2042, name: '3-BİNALAR', code: '252', type: 'active', parent_id: 204 },
        { id: 2043, name: '4-TESİS, MAKİNE VE CİHAZLAR', code: '253', type: 'active', parent_id: 204 },
        { id: 2044, name: '5-TAŞITLAR', code: '254', type: 'active', parent_id: 204 },
        { id: 2045, name: '6-DEMİRBAŞLAR', code: '255', type: 'active', parent_id: 204 },
        { id: 2046, name: '7-DİĞER MADDİ DURAN VARLIKLAR', code: '256', type: 'active', parent_id: 204 },
        { id: 2047, name: '8-BİRİKMİŞ AMORTİSMANLAR (-)', code: '257', type: 'active', parent_id: 204 },
        { id: 2048, name: '9-YAPILMAKTA OLAN YATIRIMLAR', code: '258', type: 'active', parent_id: 204 },
        { id: 2049, name: '10-VERİLEN AVANSLAR', code: '259', type: 'active', parent_id: 204 },

        // E-MADDİ OLMAYAN DURAN VARLIKLAR detayları
        { id: 2050, name: '1-HAKLAR', code: '260', type: 'active', parent_id: 205 },
        { id: 2051, name: '2-ŞEREFİYE', code: '261', type: 'active', parent_id: 205 },
        { id: 2052, name: '3-KURULUŞ VE ÖRGÜTLENME GİDERLERİ', code: '262', type: 'active', parent_id: 205 },
        { id: 2053, name: '4-ARAŞTIRMA VE GELİŞTİRME GİDERLERİ', code: '263', type: 'active', parent_id: 205 },
        { id: 2054, name: '5-ÖZEL MALİYETLER', code: '264', type: 'active', parent_id: 205 },
        { id: 2055, name: '6-DİĞER MADDİ OLMAYAN DURAN VARLIKLAR', code: '265', type: 'active', parent_id: 205 },
        { id: 2056, name: '7-BİRİKMİŞ AMORTİSMANLAR (-)', code: '267', type: 'active', parent_id: 205 },
        { id: 2057, name: '8-VERİLEN AVANSLAR', code: '269', type: 'active', parent_id: 205 },

        // F-ÖZEL TÜKENMEKTE TABİİ VARLIKLAR detayları  
        { id: 2060, name: '1-ARAMA GİDERLERİ', code: '270', type: 'active', parent_id: 206 },
        { id: 2061, name: '2-HAZİRLIK VE GELİŞTİRME GİDERLERİ', code: '271', type: 'active', parent_id: 206 },
        { id: 2062, name: '3-DİĞER ÖZEL TÜKENMEKTE TABİİ VARLIKLAR', code: '272', type: 'active', parent_id: 206 },
        { id: 2063, name: '4-BİRİKMİŞ TÜKENME PAYLARI (-)', code: '277', type: 'active', parent_id: 206 },
        { id: 2064, name: '5-VERİLEN AVANSLAR', code: '279', type: 'active', parent_id: 206 },

        // G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI detayları
        { id: 2070, name: '1-GELECEK YILLARA AİT GİDERLER', code: '280', type: 'active', parent_id: 207 },
        { id: 2071, name: '2-GELİR TAHAKKUKLARI', code: '281', type: 'active', parent_id: 207 },
        
        // H-DİĞER DURAN VARLIKLAR detayları
        { id: 2080, name: '1-GELECEK YILLARDA İNDİRİLECEK KATMA DEĞER VERGİSİ', code: '290', type: 'active', parent_id: 208 },
        { id: 2081, name: '2-DİĞER KATMA DEĞER VERGİSİ', code: '291', type: 'active', parent_id: 208 },
        { id: 2082, name: '3-GELECEK YILLARA AİT İNTO STOKLARI', code: '292', type: 'active', parent_id: 208 },
        { id: 2083, name: '4-ELDEN ÇIKARILANACAK STOKLAR VE MADDİ DURAN VARLIKLAR', code: '293', type: 'active', parent_id: 208 },
        { id: 2084, name: '5-PEŞİN ÖDENEN VERGİLER VE FONLAR', code: '294', type: 'active', parent_id: 208 },
        { id: 2085, name: '6-DİĞER HESAP', code: '295', type: 'active', parent_id: 208 },
        { id: 2086, name: '7-DİĞER ÇEŞİTLİ DURAN VARLIKLAR', code: '296', type: 'active', parent_id: 208 },
        { id: 2087, name: '8-STOK DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '297', type: 'active', parent_id: 208 },
        { id: 2088, name: '9-BİRİKMİŞ AMORTİSMANLAR (-)', code: '299', type: 'active', parent_id: 208 },

        // PASİF - Ana gruplar
        { id: 30, name: 'I-KISA VADELİ YABANCI KAYNAKLAR', code: '30-39', type: 'passive', parent_id: 2 },
        { id: 40, name: 'II-UZUN VADELİ YABANCI KAYNAKLAR', code: '40-49', type: 'passive', parent_id: 2 },
        { id: 50, name: 'III-ÖZKAYNAKLAR', code: '50-59', type: 'passive', parent_id: 2 },
        
        // I-KISA VADELİ YABANCI KAYNAKLAR alt grupları
        { id: 300, name: 'A-FİNANSAL BORÇLAR', code: '300-309', type: 'passive', parent_id: 30 },
        { id: 301, name: 'B-TİCARİ BORÇLAR', code: '320-329', type: 'passive', parent_id: 30 },
        { id: 302, name: 'C-DİĞER BORÇLAR', code: '331-339', type: 'passive', parent_id: 30 },
        { id: 303, name: 'Ç-ALINAN AVANSLAR', code: '340-349', type: 'passive', parent_id: 30 },
        { id: 304, name: 'D-YILLARA YAYGIN İNŞAAT VE ONARIM HAKEDİŞLERİ', code: '370-379', type: 'passive', parent_id: 30 },
        { id: 305, name: 'E-ÖDENECEK VERGİ VE FONLAR', code: '360-369', type: 'passive', parent_id: 30 },
        { id: 306, name: 'F-BORÇ VE GİDER KARŞILIKLARI', code: '350-359', type: 'passive', parent_id: 30 },
        { id: 307, name: 'G-GELECEKTEKİ AYLARA AİT GELİRLER VE GİDER TAHAKKUKLARI', code: '380-389', type: 'passive', parent_id: 30 },
        
        // A-FİNANSAL BORÇLAR detayları
        { id: 3000, name: 'BANKA KREDİLERİ', code: '300', type: 'passive', parent_id: 300 },
        { id: 3001, name: 'UZUN VADELİ KREDİLERİN ANAPARA TAKSİTLERİ VE FAİZLERİ', code: '301', type: 'passive', parent_id: 300 },
        { id: 3002, name: 'ÇIKARILMIŞ TAHVILLER', code: '302', type: 'passive', parent_id: 300 },
        { id: 3003, name: 'ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: '303', type: 'passive', parent_id: 300 },
        { id: 3004, name: 'MENKUL KIYMETLER İHRAÇ FARKI', code: '304', type: 'passive', parent_id: 300 },
        { id: 3005, name: 'DİĞER FİNANSAL BORÇLAR', code: '305', type: 'passive', parent_id: 300 },
        { id: 3006, name: 'FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: '306', type: 'passive', parent_id: 300 },
        { id: 3007, name: 'ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: '309', type: 'passive', parent_id: 300 },
        
        // B-TİCARİ BORÇLAR detayları
        { id: 3010, name: 'SATICILAR', code: '320', type: 'passive', parent_id: 301 },
        { id: 3011, name: 'BORÇ SENETLERİ', code: '321', type: 'passive', parent_id: 301 },
        { id: 3012, name: 'BORÇ SENETLERİ REESKONTU (-)', code: '322', type: 'passive', parent_id: 301 },
        { id: 3013, name: 'ALINAN DEPOZİTO VE TEMİNATLAR', code: '324', type: 'passive', parent_id: 301 },
        { id: 3014, name: 'DİĞER TİCARİ BORÇLAR', code: '325', type: 'passive', parent_id: 301 },
        
        // C-DİĞER BORÇLAR detayları
        { id: 3020, name: 'ORTAKLARA BORÇLAR', code: '331', type: 'passive', parent_id: 302 },
        { id: 3021, name: 'İŞTİRAKLERE BORÇLAR', code: '332', type: 'passive', parent_id: 302 },
        { id: 3022, name: 'BAĞLI ORTAKLIKLARA BORÇLAR', code: '333', type: 'passive', parent_id: 302 },
        { id: 3023, name: 'PERSONELE BORÇLAR', code: '335', type: 'passive', parent_id: 302 },
        { id: 3024, name: 'DİĞER ÇEŞİTLİ BORÇLAR', code: '336', type: 'passive', parent_id: 302 },
        { id: 3025, name: 'DİĞER BORÇ SENETLERİ REESKONTU (-)', code: '337', type: 'passive', parent_id: 302 },
        
        // Ç-ALINAN AVANSLAR detayları
        { id: 3030, name: 'ALINAN SİPARİŞ AVANSLARI', code: '340', type: 'passive', parent_id: 303 },
        { id: 3031, name: 'ALINAN DİĞER AVANSLAR', code: '349', type: 'passive', parent_id: 303 },
        
        // E-ÖDENECEK VERGİ VE FONLAR detayları
        { id: 3040, name: 'ÖDENECEK VERGİ VE FONLAR', code: '360', type: 'passive', parent_id: 305 },
        { id: 3041, name: 'ÖDENECEK SOSYAL GÜVENLİK KESİNTİLERİ', code: '361', type: 'passive', parent_id: 305 },
        { id: 3042, name: 'VADESİ GEÇMİŞ ERTELENMİŞ VEYA TAKSİTLENDİRİLMİŞ VERGİ VE DİĞER YÜKÜMLÜLÜKLER', code: '368', type: 'passive', parent_id: 305 },
        { id: 3043, name: 'ÖDENECEK DİĞER YÜKÜMLÜLÜKLER', code: '369', type: 'passive', parent_id: 305 },
        
        // F-BORÇ VE GİDER KARŞILIKLARI detayları
        { id: 3050, name: 'DÖNEM KARI VERGİ VE DİĞER YASAL YÜKÜMLÜLÜK KARŞILIKLARI', code: '350', type: 'passive', parent_id: 306 },
        { id: 3051, name: 'DÖNEM KARININ PEŞİN ÖDENEN VERGİ VE DİĞER YÜKÜMLÜLÜKLER (-)', code: '351', type: 'passive', parent_id: 306 },
        { id: 3052, name: 'DÖNEM TAZMINATI KARŞILIĞI', code: '352', type: 'passive', parent_id: 306 },
        { id: 3053, name: 'MALİYET GİDERLERİ KARŞILIĞI', code: '353', type: 'passive', parent_id: 306 },
        { id: 3054, name: 'DİĞER BORÇ VE GİDER KARŞILIKLARI', code: '359', type: 'passive', parent_id: 306 },
        
        // II-UZUN VADELİ YABANCI KAYNAKLAR alt grupları
        { id: 400, name: 'A-FİNANSAL BORÇLAR', code: '400-409', type: 'passive', parent_id: 40 },
        { id: 401, name: 'B-TİCARİ BORÇLAR', code: '420-429', type: 'passive', parent_id: 40 },
        { id: 402, name: 'C-DİĞER BORÇLAR', code: '431-439', type: 'passive', parent_id: 40 },
        { id: 403, name: 'Ç-ALINAN AVANSLAR', code: '440-449', type: 'passive', parent_id: 40 },
        { id: 404, name: 'D-BORÇ VE GİDER KARŞILIKLARI', code: '450-459', type: 'passive', parent_id: 40 },
        { id: 405, name: 'E-GELECEKTEKİ YILLARA AİT GELİRLER', code: '480-489', type: 'passive', parent_id: 40 },
        
        // A-FİNANSAL BORÇLAR (Uzun Vadeli) detayları
        { id: 4000, name: '1-BANKA KREDİLERİ', code: '400', type: 'passive', parent_id: 400 },
        { id: 4001, name: '2-FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: '401', type: 'passive', parent_id: 400 },
        { id: 4002, name: '3-ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: '402', type: 'passive', parent_id: 400 },
        { id: 4003, name: '4-ÇIKARILMIŞ TAHVILLER', code: '403', type: 'passive', parent_id: 400 },
        { id: 4004, name: '5-ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: '404', type: 'passive', parent_id: 400 },
        { id: 4005, name: '6-MENKUL KIYMETLER İHRAÇ FARKI', code: '405', type: 'passive', parent_id: 400 },
        { id: 4006, name: '7-DİĞER FİNANSAL BORÇLAR', code: '409', type: 'passive', parent_id: 400 },
        
        // B-TİCARİ BORÇLAR (Uzun Vadeli) detayları
        { id: 4010, name: '1-SATICILAR', code: '420', type: 'passive', parent_id: 401 },
        { id: 4011, name: '2-BORÇ SENETLERİ', code: '421', type: 'passive', parent_id: 401 },
        { id: 4012, name: '3-BORÇ SENETLERİ REESKONTU (-)', code: '422', type: 'passive', parent_id: 401 },
        { id: 4013, name: '4-ALINAN DEPOZİTO VE TEMİNATLAR', code: '424', type: 'passive', parent_id: 401 },
        { id: 4014, name: '5-DİĞER TİCARİ BORÇLAR', code: '429', type: 'passive', parent_id: 401 },
        
        // C-DİĞER BORÇLAR (Uzun Vadeli) detayları
        { id: 4020, name: '1-ORTAKLARA BORÇLAR', code: '431', type: 'passive', parent_id: 402 },
        { id: 4021, name: '2-İŞTİRAKLERE BORÇLAR', code: '432', type: 'passive', parent_id: 402 },
        { id: 4022, name: '3-BAĞLI ORTAKLIKLARA BORÇLAR', code: '433', type: 'passive', parent_id: 402 },
        { id: 4023, name: '4-PERSONELE BORÇLAR', code: '435', type: 'passive', parent_id: 402 },
        { id: 4024, name: '5-DİĞER ÇEŞİTLİ BORÇLAR', code: '436', type: 'passive', parent_id: 402 },
        { id: 4025, name: '6-DİĞER BORÇ SENETLERİ REESKONTU (-)', code: '437', type: 'passive', parent_id: 402 },
        
        // Ç-ALINAN AVANSLAR (Uzun Vadeli) detayları
        { id: 4030, name: '1-ALINAN SİPARİŞ AVANSLARI', code: '440', type: 'passive', parent_id: 403 },
        { id: 4031, name: '2-ALINAN DİĞER AVANSLAR', code: '449', type: 'passive', parent_id: 403 },
        
        // D-BORÇ VE GİDER KARŞILIKLARI (Uzun Vadeli) detayları
        { id: 4040, name: 'KIDEM TAZMİNATI KARŞILIĞI', code: '450', type: 'passive', parent_id: 404 },
        { id: 4041, name: 'DİĞER BORÇ VE GİDER KARŞILIKLARI', code: '459', type: 'passive', parent_id: 404 },
        
        // E-GELECEKTEKİ YILLARA AİT GELİRLER detayları
        { id: 4050, name: '1-GELECEKTEKİ YILLARA AİT GELİRLER', code: '480', type: 'passive', parent_id: 405 },
        { id: 4051, name: '2-GİDER TAHAKKUKLARI', code: '489', type: 'passive', parent_id: 405 },
        
        // III-ÖZKAYNAKLAR alt grupları
        { id: 500, name: 'A-ÖDENMİŞ SERMAYE', code: '500-509', type: 'passive', parent_id: 50 },
        { id: 501, name: 'B-SERMAYE YEDEKLERİ', code: '520-529', type: 'passive', parent_id: 50 },
        { id: 502, name: 'C-KAR YEDEKLERİ', code: '540-549', type: 'passive', parent_id: 50 },
        { id: 503, name: 'Ç-GEÇMİŞ YIL KARLARI', code: '570', type: 'passive', parent_id: 50 },
        { id: 504, name: 'D-GEÇMİŞ YIL ZARARLARI (-)', code: '580', type: 'passive', parent_id: 50 },
        { id: 505, name: 'E-DÖNEM NET KARI', code: '590', type: 'passive', parent_id: 50 },
        { id: 506, name: 'F-DÖNEM NET ZARARI (-)', code: '591', type: 'passive', parent_id: 50 },
        
        // A-ÖDENMİŞ SERMAYE detayları
        { id: 5000, name: 'SERMAYE', code: '500', type: 'passive', parent_id: 500 },
        { id: 5001, name: 'ÖDENMEMİŞ SERMAYE (-)', code: '509', type: 'passive', parent_id: 500 },
        
        // B-SERMAYE YEDEKLERİ detayları
        { id: 5010, name: 'HİSSE SENETLERİ İHRAÇ PRİMLERİ', code: '520', type: 'passive', parent_id: 501 },
        { id: 5011, name: 'HİSSE SENETLERİ İPTAL KARLARI', code: '521', type: 'passive', parent_id: 501 },
        { id: 5012, name: 'M.D.V. YENİDEN DEĞERLEME ARTIŞLARI', code: '522', type: 'passive', parent_id: 501 },
        { id: 5013, name: 'İŞTİRAKLER YENİDEN DEĞERLEME ARTIŞLARI', code: '523', type: 'passive', parent_id: 501 },
        { id: 5014, name: 'MALİYET BEDELİ ARTIŞI FONDU', code: '524', type: 'passive', parent_id: 501 },
        { id: 5015, name: 'KAYNAK ALINAN ENFLASYON DÜZELTME ÖZEL KARŞILIK HESABI', code: '525', type: 'passive', parent_id: 501 },
        { id: 5016, name: 'SERMAYE DÜZELTME FARKLARI', code: '526', type: 'passive', parent_id: 501 },
        { id: 5017, name: 'DİĞER SERMAYE YEDEKLERİ', code: '529', type: 'passive', parent_id: 501 },
        
        // C-KAR YEDEKLERİ detayları
        { id: 5020, name: 'YASAL YEDEKLER', code: '540', type: 'passive', parent_id: 502 },
        { id: 5021, name: 'STATÜ YEDEKLERİ', code: '541', type: 'passive', parent_id: 502 },
        { id: 5022, name: 'OLAĞANÜSTÜ YEDEKLER', code: '542', type: 'passive', parent_id: 502 },
        { id: 5023, name: 'DİĞER KAR YEDEKLERİ', code: '548', type: 'passive', parent_id: 502 },
        { id: 5024, name: 'ÖZEL FONLAR', code: '549', type: 'passive', parent_id: 502 },
        
        // Ç-GEÇMİŞ YIL KARLARI detayları
        { id: 5030, name: 'GEÇMİŞ YIL KARLARI', code: '570', type: 'passive', parent_id: 503 },
        
        // D-GEÇMİŞ YIL ZARARLARI detayları
        { id: 5040, name: 'GEÇMİŞ YIL ZARARLARI (-)', code: '580', type: 'passive', parent_id: 504 },
        
        // E-DÖNEM NET KARI detayları
        { id: 5050, name: 'DÖNEM NET KARI', code: '590', type: 'passive', parent_id: 505 },
        
        // F-DÖNEM NET ZARARI detayları
        { id: 5060, name: 'DÖNEM NET ZARARI (-)', code: '591', type: 'passive', parent_id: 506 },
        
        // Ek özkaynaklar hesapları
        { id: 507, name: 'G-AZINLIK PAYLARı', code: '595-599', type: 'passive', parent_id: 50 },
        { id: 5070, name: 'AZINLIK PAYLARI', code: '595', type: 'passive', parent_id: 507 },

        // F-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ detayları
        { id: 1050, name: '1-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ', code: '170', type: 'active', parent_id: 105 },
        { id: 1051, name: '2-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: '178', type: 'active', parent_id: 105 },
        { id: 1052, name: '3-TAŞERONLARA VERİLEN AVANSLAR', code: '179', type: 'active', parent_id: 105 },
        
        // G-GELECEK AYLARA AİT GİDERLER VE GELİR TAHAKKUKLARI detayları
        { id: 1060, name: '1-GELECEK AYLARA AİT GİDERLER', code: '180', type: 'active', parent_id: 106 },
        { id: 1061, name: '2-GELİR TAHAKKUKLARI', code: '181', type: 'active', parent_id: 106 },
        
        // H-DİĞER DÖNEN VARLIKLAR kategorisi ve detayları
        { id: 1070, name: '1-DEVREDEN KATMA DEĞER VERGİSİ', code: '191', type: 'active', parent_id: 107 },
        { id: 1071, name: '2-İNDİRİLECEK KATMA DEĞER VERGİSİ', code: '192', type: 'active', parent_id: 107 },
        { id: 1072, name: '3-DİĞER KATMA DEĞER VERGİSİ', code: '193', type: 'active', parent_id: 107 },
        { id: 1073, name: '4-PEŞİN ÖDENEN VERGİLER VE FONLAR', code: '194', type: 'active', parent_id: 107 },
        { id: 1074, name: '5-İŞ AVANSLARI', code: '195', type: 'active', parent_id: 107 },
        { id: 1075, name: '6-PERSONEL AVANSLARI', code: '196', type: 'active', parent_id: 107 },
        { id: 1076, name: '7-SAYIM VE TESELLİM NOKSANLARI', code: '197', type: 'active', parent_id: 107 },
        { id: 1077, name: '8-DİĞER ÇEŞİTLİ DÖNEN VARLIKLAR', code: '198', type: 'active', parent_id: 107 },
        { id: 1078, name: '9-DİĞER DÖNEN VARLIKLAR KARŞILIĞI (-)', code: '199', type: 'active', parent_id: 107 },

      ];
    }
  },

  // Hesap kategorilerini ağaç yapısında getir
  getAccountCategoriesTree: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/account-categories/tree`);
      return response.data;
    } catch (error) {
      console.error("Hesap kategorileri ağacı yüklenirken hata:", error);
      // Hata durumunda boş dizi döndür
      return [];
    }
  },
  
  // Belirli bir hesap koduna göre kategori getir
  getAccountCategoryByCode: async (code) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/account-categories`);
      const categories = response.data;
      // Kod ile eşleşen kategori var mı kontrol et
      return categories.find(category => category.code === code) || null;
    } catch (error) {
      console.error(`Hesap kategorisi (${code}) yüklenirken hata:`, error);
      return null;
    }
  }
}; 