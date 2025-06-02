import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BalanceSheetAPI, CompanyAPI } from '../api';
import ModernAlert from '../components/ModernAlert';

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

const BalanceSheets = () => {
  const [balanceSheets, setBalanceSheets] = useState([]);
  const [filteredBalanceSheets, setFilteredBalanceSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Accordion state'i
  const [expandedCompanies, setExpandedCompanies] = useState(new Set());
  
  // Filtreleme state'leri
  const [filterCompany, setFilterCompany] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  
  // PDF yükleme durumu
  const [file, setFile] = useState(null);
  const [company, setCompany] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('YILLIK');
  const [notes, setNotes] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxNumberError, setTaxNumberError] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [autoDetectedData, setAutoDetectedData] = useState(null);
  const [pdfAnalysisLoading, setPdfAnalysisLoading] = useState(false);
  const [pdfUploadStep, setPdfUploadStep] = useState(1); // 1: PDF yükleme, 2: Bilgileri düzenleme
  const [autoDetectedCompany, setAutoDetectedCompany] = useState(null);
  
  // Silme işlemi için state'ler
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [balanceSheetToDelete, setBalanceSheetToDelete] = useState(null);
  
  // Unvan kontrolü ve güncelleme fonksiyonu
  const [showTitleMismatchModal, setShowTitleMismatchModal] = useState(false);
  const [titleMismatchData, setTitleMismatchData] = useState(null);
  
  // Duplicate bilanço kontrolü için state'ler
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateBalanceData, setDuplicateBalanceData] = useState(null);
  const [proceedWithUpdate, setProceedWithUpdate] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false });
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Eğer location.state içinde success ve message varsa, başarı mesajını göster
    if (location.state?.success && location.state?.message) {
      setSuccessMessage(location.state.message);
      // 5 saniye sonra mesajı kaldır
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Şirketleri getiren fonksiyon
  const fetchCompanies = async () => {
    try {
      // API modülünü kullanarak şirketleri getir
      const companies = await CompanyAPI.getAllCompanies();
      setCompanies(companies);
      setError(null); // Başarılı olduğunda hata mesajını temizle
    } catch (err) {
      console.error("Şirketler yüklenirken hata oluştu:", err);
      
      // Kullanıcıya daha açıklayıcı hata mesajı göster
      if (err.message && err.message.includes('Network Error')) {
        setError("Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.");
      } else {
        setError("Şirket verileri yüklenirken bir hata oluştu. Demo veriler gösteriliyor.");
      }
      
      // Hata durumunda varsayılan şirketleri kullan
      setCompanies([
        { id: 1, name: "ABC Şirketi", tax_number: "1234567890" },
        { id: 2, name: "XYZ Holding", tax_number: "0987654321" },
        { id: 3, name: "Örnek Anonim Şirketi", tax_number: "5555555555" }
      ]);
    }
  };

  // Şirket bilançolarını gruplayan fonksiyon
  const groupBalanceSheetsByCompany = (balanceSheets) => {
    const grouped = {};
    balanceSheets.forEach(sheet => {
      const companyName = sheet.company_name;
      if (!grouped[companyName]) {
        grouped[companyName] = [];
      }
      grouped[companyName].push(sheet);
    });
    return grouped;
  };

  // En güncel bilançoyu bulan fonksiyon (analiz raporu için)
  const getLatestBalanceSheetForCompany = (companySheets) => {
    return companySheets.sort((a, b) => {
      // Önce yıla göre
      if (a.year !== b.year) return b.year - a.year;
      
      // Aynı yılsa döneme göre (YILLIK > Q4 > Q3 > Q2 > Q1)
      const periodOrder = { 'YILLIK': 5, 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1 };
      return (periodOrder[b.period] || 0) - (periodOrder[a.period] || 0);
    })[0];
  };

  // fetchBalanceSheets fonksiyonunu useEffect dışına taşıdık
  const fetchBalanceSheets = async () => {
    try {
      setLoading(true);
      
      // API modülünü kullanarak bilançoları getir
      const balanceSheets = await BalanceSheetAPI.getAllBalanceSheets();
      
      // Bilançoları oluşturma tarihine göre sırala (en yeni en üstte)
      const sortedBalanceSheets = balanceSheets.sort((a, b) => {
        // Tarih karşılaştırması yapıp en yeni en üstte olacak şekilde sırala
        return new Date(b.creation_date) - new Date(a.creation_date);
      });
      
      setBalanceSheets(sortedBalanceSheets);
      setError(null); // Başarılı olduğunda hata mesajını temizle
      setLoading(false);
    } catch (err) {
      console.error("Bilançolar yüklenirken hata oluştu:", err);
      
      // API hata türüne göre kullanıcıya farklı mesajlar göster
      if (err.message && err.message.includes('Network Error')) {
        setError("Sunucu bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.");
      } else {
        setError("Bilanço verileri yüklenirken bir hata oluştu. Demo veriler gösteriliyor.");
      }
      
      // API hatası durumunda demo verilerini göster
      console.log("API bağlantısı kurulamadı, demo bilanço verileri gösteriliyor.");
      const demoBalanceSheets = [
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
        },
        { 
          id: 4, 
          company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', 
          year: 2024, 
          period: 'YILLIK', 
          creation_date: '2024-12-31',
          notes: '2024 yılsonu bilançosu'
        },
        { 
          id: 5, 
          company_name: 'Demo Tekstil A.Ş.', 
          year: 2024, 
          period: 'Q2', 
          creation_date: '2024-06-30',
          notes: 'İkinci çeyrek bilançosu'
        },
        { 
          id: 6, 
          company_name: 'Teknoloji Yazılım Ltd.', 
          year: 2024, 
          period: 'Q4', 
          creation_date: '2024-12-31',
          notes: 'Dördüncü çeyrek bilançosu'
        },
        { 
          id: 7, 
          company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', 
          year: 2024, 
          period: 'Q2', 
          creation_date: '2024-06-30',
          notes: '2024 ikinci çeyrek bilançosu'
        },
        { 
          id: 8, 
          company_name: 'Ticaret ve Pazarlama Ltd.', 
          year: 2023, 
          period: 'YILLIK', 
          creation_date: '2023-12-31',
          notes: '2023 yıl sonu bilançosu'
        },
        { 
          id: 9, 
          company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', 
          year: 2023, 
          period: 'YILLIK', 
          creation_date: '2023-12-31',
          notes: '2023 yılsonu bilançosu'
        },
        { 
          id: 10, 
          company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', 
          year: 2024, 
          period: 'Q3', 
          creation_date: '2024-09-30',
          notes: '2024 üçüncü çeyrek bilançosu'
        },
        { 
          id: 11, 
          company_name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.', 
          year: 2022, 
          period: 'YILLIK', 
          creation_date: '2022-12-31',
          notes: '2022 yılsonu bilançosu'
        }
      ];
      
      setBalanceSheets(demoBalanceSheets);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheets();
    fetchCompanies(); // Şirketleri de yükle
  }, []);

  const periodOptions = [
    { value: 'YILLIK', label: 'Yıllık' },
    { value: 'Q1', label: '1. Çeyrek' },
    { value: 'Q2', label: '2. Çeyrek' },
    { value: 'Q3', label: '3. Çeyrek' },
    { value: 'Q4', label: '4. Çeyrek' },
    { value: 'OCAK', label: 'Ocak' },
    { value: 'ŞUBAT', label: 'Şubat' },
    { value: 'MART', label: 'Mart' },
    { value: 'NİSAN', label: 'Nisan' },
    { value: 'MAYIS', label: 'Mayıs' },
    { value: 'HAZİRAN', label: 'Haziran' },
    { value: 'TEMMUZ', label: 'Temmuz' },
    { value: 'AĞUSTOS', label: 'Ağustos' },
    { value: 'EYLÜL', label: 'Eylül' },
    { value: 'EKİM', label: 'Ekim' },
    { value: 'KASIM', label: 'Kasım' },
    { value: 'ARALIK', label: 'Aralık' }
  ];

  // PDF dosyası seçildiğinde önizleme oluştur
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      
      // PDF önizleme URL'sini oluştur
      const fileURL = URL.createObjectURL(selectedFile);
      setPreview(fileURL);
      
      // Otomatik tespit edilen verileri sıfırla
      setAutoDetectedData(null);
      setAutoDetectedCompany(null);
      setUploadError(null);
      
      // PDF analizi başlat
      await analyzePdf(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
      setUploadError('Lütfen geçerli bir PDF dosyası seçin.');
    }
  };
  
  // PDF analizi - şirket, dönem, yıl tespiti
  const analyzePdf = async (pdfFile) => {
    try {
      setPdfAnalysisLoading(true);
      
      // Analiz için formData oluştur
      const formData = new FormData();
      formData.append('file', pdfFile);
      
      // Eğer şirket ID'si seçiliyse ekle (isteğe bağlı)
      if (companyId) {
        formData.append('company_id', companyId);
      }
      
      // Eğer VKN biliniyorsa ekle (isteğe bağlı)
      if (taxNumber) {
        formData.append('tax_number', taxNumber);
      }
      
      // API modülünü kullanarak PDF analizi yap
      const response = await BalanceSheetAPI.analyzePdf(formData);
      
      console.log("PDF analiz sonucu:", response);
      
      // API'den dönen veriyi işle
      if (response.detected_data) {
        const detectedData = response.detected_data;
        setAutoDetectedData(detectedData);
        
        // Otomatik çıkarılan değerleri form alanlarına yerleştir
        setPeriod(detectedData.period || 'YILLIK');
        setYear(detectedData.year || new Date().getFullYear());
        
        // VKN'den şirket bul
        if (detectedData.tax_number) {
          await findCompanyByTaxNumber(detectedData.tax_number);
        }
        
        // Şirket ID ve ismi varsa doğrudan yerleştir
        if ((detectedData.company_id || detectedData.detected_company_id) && detectedData.company_name) {
          setCompanyId((detectedData.company_id || detectedData.detected_company_id).toString());
          setCompany(detectedData.company_name);
          setTaxNumber(detectedData.tax_number || '');
          
          // Şirketi autoDetectedCompany'e ekle
          setAutoDetectedCompany({
            id: detectedData.company_id || detectedData.detected_company_id,
            name: detectedData.company_name,
            tax_number: detectedData.tax_number
          });
        }

        // Hesap kalemleri gelmiş mi kontrol et
        if (detectedData.items && detectedData.items.length > 0) {
          console.log("PDF'den çıkarılan hesap kalemleri:", detectedData.items.length);
        } else {
          console.log("PDF'den hesap kalemleri çıkarılamadı");
        }
      }
      
      // Çıkarılan hesap öğelerini kontrol et
      if (response.extracted_items && response.extracted_items.length > 0) {
        console.log("Hesap planından çıkarılan kalemler:", response.extracted_items);
        // Burada çıkarılan hesap kalemlerini göstermek için bir state ekleyebilirsiniz
        // setExtractedItems(response.extracted_items);
      }
      
      // İlk adımdan ikinci adıma geç
      setPdfUploadStep(2);
      
    } catch (err) {
      console.error("PDF ön analiz hatası:", err);
      
      // Hata türüne göre farklı mesajlar göster
      if (err.message && err.message.includes('Network Error')) {
        setUploadError('Sunucu bağlantısı kurulamadı. PDF analizi demo modda devam edecek.');
      } else if (err.response && err.response.data && err.response.data.detail) {
        setUploadError(`PDF analiz hatası: ${err.response.data.detail}`);
      } else {
        setUploadError('PDF analiz edilirken bir hata oluştu. Demo mod ile devam ediliyor.');
      }
      
      // Demo veriler ayarla
      setAutoDetectedData({
        period: 'YILLIK',
        year: new Date().getFullYear(),
        company_name: companyId ? company : "Demo Şirket A.Ş.",
        tax_number: "1234567890"
      });
      
      // İlk adımdan ikinci adıma yine de geç
      setPdfUploadStep(2);
    } finally {
      setPdfAnalysisLoading(false);
    }
  };
  
  // VKN ile şirket bul
  const findCompanyByTaxNumber = async (taxNumber) => {
    if (!taxNumber) return;
    
    try {
      // API modülünü kullanarak VKN kontrolü yap
      const response = await CompanyAPI.checkCompanyByTaxNumber(taxNumber);
      
      if (response.exists && response.company) {
        // Şirket bulundu, bilgileri doldur
        setAutoDetectedCompany(response.company);
        setCompanyId(response.company.id.toString());
        setCompany(response.company.name);
        setTaxNumber(response.company.tax_number);
        
        // Demo yanıt ise bilgilendirme yap
        if (response.message && response.message.includes("demo")) {
          console.log("VKN kontrolünde demo yanıt kullanıldı:", response.message);
          // Bilgilendirme mesajı göstermek istiyorsanız aktifleştirebilirsiniz
          // setUploadError("Sunucu bağlantısı olmadığı için VKN kontrolü demo modda yapıldı.");
        }
      } else if (!response.valid) {
        // VKN formatı geçersizse uyarı göster
        setUploadError(`VKN formatı geçersiz: ${taxNumber}. VKN 10 haneli sayısal bir değer olmalıdır.`);
      }
    } catch (err) {
      console.error("Şirket bulma hatası:", err);
      
      // Bağlantı hataları için özel işlem
      if (err.message && err.message.includes('Network Error')) {
        console.log("VKN kontrolünde bağlantı hatası, demo mod devreye girecek");
        
        // Bilinen VKN'leri kontrol et ve demo yanıt oluştur
        const knownVkns = {
          "1234567890": { id: 1, name: "ABC Şirketi", tax_number: "1234567890" },
          "0987654321": { id: 2, name: "XYZ Holding", tax_number: "0987654321" },
          "5555555555": { id: 3, name: "Örnek Anonim Şirketi", tax_number: "5555555555" }
        };
        
        // Eğer bilinen bir VKN ise, demo şirket verilerini doldur
        if (knownVkns[taxNumber]) {
          setAutoDetectedCompany(knownVkns[taxNumber]);
          setCompanyId(knownVkns[taxNumber].id.toString());
          setCompany(knownVkns[taxNumber].name);
          setTaxNumber(knownVkns[taxNumber].tax_number);
          
          // Bilgilendirme mesajı
          setUploadError("Sunucu bağlantısı kurulamadı. VKN kontrolü demo modda yapıldı.");
        }
      } else {
        // Diğer hatalar için kullanıcı manuel şirket seçecek
        setUploadError(`VKN kontrolünde bir hata oluştu: ${err.message}. Lütfen şirketi manuel olarak seçin.`);
      }
    }
  };

  // Unvan kontrolü ve güncelleme fonksiyonu
  const handleTitleMismatch = (pdfCompanyName, selectedCompany) => {
    setTitleMismatchData({
      pdfTitle: pdfCompanyName,
      selectedCompany: selectedCompany,
      currentTitle: selectedCompany.title || selectedCompany.name
    });
    setShowTitleMismatchModal(true);
  };
  
  const updateCompanyTitle = async (newTitle) => {
    try {
      // Şirket unvanını güncelle
      const updatedCompany = await CompanyAPI.updateCompany(titleMismatchData.selectedCompany.id, {
        title: newTitle
      });
      
      // Şirketler listesini güncelle
      setCompanies(companies.map(comp => 
        comp.id === titleMismatchData.selectedCompany.id 
          ? { ...comp, title: newTitle } 
          : comp
      ));
      
      setShowTitleMismatchModal(false);
      setTitleMismatchData(null);
      
      // Bilanço yükleme işlemine devam et
      proceedWithUpload();
      
    } catch (error) {
      console.error('Şirket unvanı güncellenirken hata:', error);
      setUploadError('Şirket unvanı güncellenirken bir hata oluştu: ' + error.message);
    }
  };
  
  const proceedWithUpload = () => {
    setShowTitleMismatchModal(false);
    setTitleMismatchData(null);
    continueBalanceSheetSubmission();
  };
  
  const continueBalanceSheetSubmission = () => {
    setUploadLoading(true);
    
    // Form verilerini hazırla
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);
    
    // İsteğe bağlı parametreleri ekle
    if (taxNumber) {
      formData.append('tax_number', taxNumber);
    }
    
    // Otomatik tespit edilmemiş değerleri ekle
    formData.append('year', year);
    formData.append('period', period);
    
    if (notes) {
      formData.append('notes', notes);
    }
    
    console.log("PDF analizi için gönderilen form verileri:", {
      file: file.name,
      company_id: companyId,
      tax_number: taxNumber,
      year: year,
      period: period,
      notes: notes || "Belirtilmedi"
    });
    
    // Önce PDF analizi yap
    BalanceSheetAPI.analyzePdf(formData)
      .then(analyzeResponse => {
        console.log("PDF analizi başarılı:", analyzeResponse);
        
        // Şirket bulunamadı uyarısı
        if (analyzeResponse.company_not_found || analyzeResponse.company_warning) {
          const warningMessage = analyzeResponse.company_warning || 'Şirket bilgisi bulunamadı';
          console.warn('⚠️ Şirket uyarısı:', warningMessage);
          
          // Kullanıcıya uyarı göster
          const shouldContinue = window.confirm(
            `${warningMessage}\n\n` +
            'Devam etmek istiyor musunuz?\n\n' +
            '✅ Evet - Şirket bilgilerini manuel olarak düzenleyeceğim\n' +
            '❌ Hayır - PDF analizi iptal et'
          );
          
          if (!shouldContinue) {
            setUploadLoading(false);
            setUploadError('PDF analizi kullanıcı tarafından iptal edildi.');
            return;
          }
        }
        
        // API'den gelen veriler doğru içermiyorsa uyar
        if (!analyzeResponse.detected_data || !analyzeResponse.detected_data.items || analyzeResponse.detected_data.items.length === 0) {
          console.warn("PDF'den hesap kalemleri çıkarılamadı veya boş geldi");
        }
        
        // Analiz başarılı ise BalanceSheetPreview sayfasına yönlendir
        if (analyzeResponse.success && analyzeResponse.detected_data) {
          setUploadLoading(false);
          closeUploadModal();
          
          // BalanceSheetPreview sayfasına yönlendir
          navigate('/balance-sheets/preview', {
            state: {
              analysisData: analyzeResponse,
              formData: {
                company_id: companyId,
                year: year,
                period: period,
                notes: notes,
                filename: file.name
              }
            }
          });
        } else {
          throw new Error("PDF analizi başarısız");
        }
      })
      .catch(err => {
        console.error('PDF analiz hatası:', err);
        
        if (err.message && err.message.includes('Network Error')) {
          setUploadError('Sunucu bağlantısı kurulamadı. Analiz demo modda devam edecek.');
          
          // Demo veriyle yine de önizleme sayfasına yönlendir
          setTimeout(() => {
            // Demo analiz yanıtı
            const demoAnalyzeResponse = {
              success: true,
              filename: file.name,
              detected_data: {
                company_name: company || "Demo Şirket",
                tax_number: taxNumber || "1234567890",
                detected_company_id: parseInt(companyId) || 1,
                period: period,
                year: year,
                has_inflation_data: true,
                items: [
                  {id: 1, account_code: "A.1.1.1", account_name: "KASA", current_amount: 125000.0, previous_amount: 100000.0, inflation_amount: 135000.0},
                  {id: 2, account_code: "A.1.3.1", account_name: "ALICILAR", current_amount: 750000.0, previous_amount: 650000.0, inflation_amount: null},
                  {id: 3, account_code: "P.3.1.1", account_name: "SERMAYE", current_amount: 875000.0, previous_amount: 750000.0, inflation_amount: 875000.0}
                ]
              },
              message: "DEMO MOD: Bu veriler gerçek PDF analizinden değil, demo verilerdir. Gerçek bilanço kalemleri gösterilmiyor."
            };
            
            setUploadLoading(false);
            closeUploadModal();
            
            // Demo modda da BalanceSheetPreview sayfasına yönlendir
            navigate('/balance-sheets/preview', {
              state: {
                analysisData: demoAnalyzeResponse,
                formData: {
                  company_id: companyId,
                  year: year,
                  period: period,
                  notes: notes,
                  filename: file.name
                },
                isDemoMode: true
              }
            });
          }, 1500);
        } else {
          setUploadError(`PDF analiz edilirken bir hata oluştu: ${err.message}`);
          setUploadLoading(false);
        }
      });
  };

  const submitBalanceSheet = () => {
    console.log("Alternatif kaydetme fonksiyonu çağrıldı");
    if (!file) {
      setUploadError('Lütfen bir PDF dosyası seçin.');
      return;
    }
    
    if (!companyId) {
      setUploadError('Lütfen bir şirket seçin.');
      return;
    }
    
    if (taxNumberError) {
      setUploadError('Vergi kimlik numarası hatası: ' + taxNumberError);
      return;
    }
    
    // Seçilen şirketi bul
    const selectedCompany = companies.find(comp => comp.id.toString() === companyId.toString());
    
    // Duplicate bilanço kontrolü - aynı şirket, yıl ve dönem var mı?
    const existingBalance = balanceSheets.find(sheet => 
      sheet.company_name === selectedCompany?.name && 
      sheet.year === year && 
      sheet.period === period
    );
    
    if (existingBalance && !proceedWithUpdate) {
      setDuplicateBalanceData({
        existingBalance: existingBalance,
        newData: {
          company: selectedCompany.name,
          year: year,
          period: period
        }
      });
      setShowDuplicateWarning(true);
      return;
    }
    
    // Eğer otomatik tespit edilen şirket adı varsa ve seçilen şirketin unvanıyla farklıysa uyarı ver
    if (autoDetectedData && autoDetectedData.company_name && selectedCompany) {
      const pdfCompanyName = autoDetectedData.company_name.trim();
      const currentCompanyTitle = (selectedCompany.title || selectedCompany.name || '').trim();
      
      // Unvan benzerlik kontrolü (büyük/küçük harf ve boşluk farklarını yok say)
      const normalizedPdfName = pdfCompanyName.toLowerCase().replace(/\s+/g, ' ');
      const normalizedCurrentTitle = currentCompanyTitle.toLowerCase().replace(/\s+/g, ' ');
      
      if (normalizedPdfName !== normalizedCurrentTitle && pdfCompanyName.length > 3) {
        console.log('Unvan uyumsuzluğu tespit edildi:', {
          pdfName: pdfCompanyName,
          currentTitle: currentCompanyTitle
        });
        
        handleTitleMismatch(pdfCompanyName, selectedCompany);
        return;
      }
    }
    
    // Unvan kontrolü geçtiyse veya tespit edilmemişse bilanço yükleme işlemine devam et
    continueBalanceSheetSubmission();
  };
  
  // PDF analizi ve yükleme işlemi (form submit handler)
  const handlePdfUpload = (e) => {
    e.preventDefault();
    submitBalanceSheet();
  };

  // Modal'ı kapat ve state'i sıfırla
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setFile(null);
    setCompany('');
    setCompanyId('');
    setYear(new Date().getFullYear());
    setPeriod('YILLIK');
    setNotes('');
    setTaxNumber('');
    setTaxNumberError('');
    setUploadError(null);
    setPreview(null);
    setAutoDetectedData(null);
    setAutoDetectedCompany(null);
    setPdfUploadStep(1);
    setPdfAnalysisLoading(false);
    
    // Duplicate kontrolü state'lerini de temizle
    setShowDuplicateWarning(false);
    setDuplicateBalanceData(null);
    setProceedWithUpdate(false);
    
    // URL'den önizleme URL'sini temizle
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  };

  // Silme modalını aç
  const handleDeleteClick = (sheet) => {
    setAlertConfig({
      isOpen: true,
      type: 'warning',
      title: 'Bilanço Silinecek',
      message: `${sheet.company_name} şirketinin ${sheet.year} ${sheet.period} dönemi bilançosunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      showCancel: true,
      onConfirm: () => {
        setAlertConfig({ isOpen: false });
        handleDeleteBalanceSheet(sheet);
      },
      onClose: () => setAlertConfig({ isOpen: false })
    });
  };
  
  // Silme modalını kapat
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setBalanceSheetToDelete(null);
  };
  
  // Bilançoyu sil
  const handleDeleteBalanceSheet = async (sheet) => {
    try {
      setLoading(true);
      
      console.log('🗑️ Bilanço siliniyor:', sheet.id);
      await BalanceSheetAPI.deleteBalanceSheet(sheet.id);
      
      // Listeyi güncelle
      const updatedSheets = balanceSheets.filter(s => s.id !== sheet.id);
      setBalanceSheets(updatedSheets);
      setFilteredBalanceSheets(filteredBalanceSheets.filter(s => s.id !== sheet.id));
      
      setAlertConfig({
        isOpen: true,
        type: 'success',
        title: 'Bilanço Silindi',
        message: `${sheet.company_name} - ${sheet.year} ${sheet.period} bilançosu başarıyla silindi.`,
        onClose: () => setAlertConfig({ isOpen: false })
      });
      
      console.log('✅ Bilanço başarıyla silindi');
      
    } catch (error) {
      console.error("❌ Bilanço silme sırasında hata:", error);
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Silme Hatası',
        message: 'Bilanço silinirken bir hata oluştu. Lütfen tekrar deneyin.',
        onClose: () => setAlertConfig({ isOpen: false })
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme fonksiyonu
  const applyFilters = () => {
    let filtered = [...balanceSheets];
    
    if (filterCompany) {
      filtered = filtered.filter(sheet => 
        sheet.company_name.toLowerCase().includes(filterCompany.toLowerCase())
      );
    }
    
    if (filterYear) {
      filtered = filtered.filter(sheet => 
        sheet.year?.toString() === filterYear
      );
    }
    
    if (filterPeriod) {
      filtered = filtered.filter(sheet => 
        sheet.period === filterPeriod
      );
    }
    
    setFilteredBalanceSheets(filtered);
  };

  // Filtreleme değiştiğinde otomatik uygula
  useEffect(() => {
    applyFilters();
  }, [balanceSheets, filterCompany, filterYear, filterPeriod]);

  // Şirket açma/kapama fonksiyonu
  const toggleCompany = (companyName) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyName)) {
      newExpanded.delete(companyName);
    } else {
      newExpanded.add(companyName);
    }
    setExpandedCompanies(newExpanded);
  };

  if (loading && !balanceSheets.length) {
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
      
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bilanço Yönetimi</h1>
              <p className="text-blue-100 mt-1">Şirket bilançolarını yönetin ve analiz edin</p>
            </div>
          </div>
          
          {/* Hızlı İşlemler Butonu Header'da */}
          <div className="relative">
            <button 
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex items-center px-6 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-sm font-medium text-white hover:bg-opacity-30 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hızlı İşlemler
              <svg className={`w-4 h-4 ml-2 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Hızlı İşlemler Dropdown */}
            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {setShowUploadModal(true); setShowQuickActions(false);}}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center mr-3 text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    PDF'den Yükle
                  </button>
                  <Link 
                    to="/multi-balance-analysis"
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowQuickActions(false)}
                  >
                    <div className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center mr-3 text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Çoklu Bilanço Analizi
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link
                    to={filteredBalanceSheets.length > 0 ? `/balance-sheets/${getLatestBalanceSheetForCompany(filteredBalanceSheets)?.id}/analysis` : '#'}
                    className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${filteredBalanceSheets.length > 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                    onClick={() => {
                      if (filteredBalanceSheets.length > 0) {
                        setShowQuickActions(false);
                      }
                    }}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-white ${filteredBalanceSheets.length > 0 ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Analiz Raporu
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-lg flex items-center justify-center mr-3 text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    Ayarlar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div>
        </div>
        <div className="flex space-x-3">
          {/* Eski Hızlı İşlemler butonu kaldırıldı */}
        </div>
      </div>

      {/* Filtreleme Alanı */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
          Filtrele
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şirket Adı
            </label>
            <input
              type="text"
              placeholder="Şirket adı ile ara..."
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yıl
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tümü</option>
              {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dönem
            </label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tümü</option>
              <option value="YILLIK">Yıllık</option>
              <option value="Q1">1. Çeyrek</option>
              <option value="Q2">2. Çeyrek</option>
              <option value="Q3">3. Çeyrek</option>
              <option value="Q4">4. Çeyrek</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCompany('');
                setFilterYear('');
                setFilterPeriod('');
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
        
        {/* Filtre Sonucu Bilgisi */}
        <div className="mt-4 text-sm text-gray-600">
          <span className="font-medium">{filteredBalanceSheets.length}</span> adet bilanço 
          {balanceSheets.length !== filteredBalanceSheets.length && (
            <span> (toplam {balanceSheets.length} adet içinden filtrelendi)</span>
          )}
        </div>
      </div>

      {/* Accordion Şirket Listesi */}
      <div className="space-y-4">
        {filteredBalanceSheets.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {balanceSheets.length === 0 ? 'Henüz bilanço yok' : 'Filtreye uygun bilanço bulunamadı'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {balanceSheets.length === 0 
                ? 'İlk bilançonuzu eklemek için yukarıdaki Hızlı İşlemler butonunu kullanın.'
                : 'Farklı filtre seçenekleri deneyebilir veya filtreleri temizleyebilirsiniz.'
              }
            </p>
            {balanceSheets.length === 0 && (
              <div className="flex justify-center space-x-3">
                <button 
                  onClick={() => setShowUploadModal(true)} 
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
                >
                  PDF'den Yükle
                </button>
              </div>
            )}
          </div>
        ) : (
          Object.entries(groupBalanceSheetsByCompany(filteredBalanceSheets)).map(([companyName, companySheets]) => {
            const latestSheet = getLatestBalanceSheetForCompany(companySheets);
            const isExpanded = expandedCompanies.has(companyName);
            
            return (
              <div key={companyName} className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
                {/* Şirket Başlığı - Tıklanabilir */}
                <div 
                  className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                  onClick={() => toggleCompany(companyName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-lg font-bold text-gray-900">{companyName}</div>
                        <div className="text-sm text-gray-600">
                          {companySheets.length} bilanço • 
                          En güncel: {latestSheet.year}-{latestSheet.period}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Analiz Raporu Butonu */}
                      <Link 
                        to={`/balance-sheets/${latestSheet.id}/analysis`} 
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analiz Raporu
                      </Link>
                      
                      {/* Açma/Kapama İkonu */}
                      <div className="text-blue-600">
                        <svg 
                          className={`w-6 h-6 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Açılır Bilanço Listesi */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notlar</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {companySheets.map((sheet) => (
                            <tr key={sheet.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{sheet.year} - {sheet.period}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{formatDateDDMMYYYY(sheet.creation_date)}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500 max-w-xs truncate">{sheet.notes || 'Not yok'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center space-x-3">
                                  <Link 
                                    to={`/balance-sheets/${sheet.id}`} 
                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                    title="Detay"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                  </Link>
                                  <Link 
                                    to={`/balance-sheets/${sheet.id}/edit`} 
                                    className="text-amber-600 hover:text-amber-900 transition-colors"
                                    title="Düzenle"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </Link>
                                  <button 
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Sil"
                                    onClick={() => handleDeleteClick(sheet)}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Modern Alert */}
      <ModernAlert {...alertConfig} />
    </div>
  );
};

export default BalanceSheets; 