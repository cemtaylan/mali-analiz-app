import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BalanceSheetAPI, CompanyAPI } from '../api';

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
    setBalanceSheetToDelete(sheet);
    setShowDeleteModal(true);
  };
  
  // Silme modalını kapat
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setBalanceSheetToDelete(null);
  };
  
  // Bilançoyu sil
  const handleDeleteBalanceSheet = async () => {
    try {
      setLoading(true);
      
      // Gerçek API çağrısını yap
      await BalanceSheetAPI.deleteBalanceSheet(balanceSheetToDelete.id);
      
      // Başarılı silme sonrası listeyi güncelle
      setBalanceSheets(balanceSheets.filter(sheet => sheet.id !== balanceSheetToDelete.id));
      setFilteredBalanceSheets(filteredBalanceSheets.filter(sheet => sheet.id !== balanceSheetToDelete.id));
      
      // Modern alert ile başarı mesajı göster
      setAlertConfig({
        isOpen: true,
        type: 'success',
        title: 'Bilanço Silindi',
        message: `${balanceSheetToDelete.company || balanceSheetToDelete.company_name} - ${balanceSheetToDelete.year} ${balanceSheetToDelete.period} bilançosu başarıyla silindi.`,
        confirmText: 'Tamam',
        onConfirm: () => setAlertConfig({ isOpen: false })
      });
      
    } catch (err) {
      console.error("Bilanço silme sırasında hata:", err);
      
      // Modern alert ile hata mesajı göster
      setAlertConfig({
        isOpen: true,
        type: 'error',
        title: 'Silme Hatası',
        message: 'Bilanço silinirken bir hata oluştu. Lütfen tekrar deneyin.',
        confirmText: 'Tamam',
        onConfirm: () => setAlertConfig({ isOpen: false })
      });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setBalanceSheetToDelete(null);
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

  // JSON verisi ile PDF analiz
  const analyzeWithJsonData = async () => {
    try {
      console.log('📄 JSON verisi ile demo analiz başlatılıyor...');
      
      // Demo JSON verisi
      const jsonData = {
        company_info: {
          name: "Test Demo Şirketi",
          tax_number: "1111111111",
          email: "demo@test.com",
          industry: "Test"
        },
        analysis_metadata: {
          filename: "demo_test.pdf",
          year: 2024,
          period: "YILLIK"
        },
        target_year: 2024,
        target_period: "YILLIK"
      };

      const response = await BalanceSheetAPI.getDemoAnalysisWithJson();
      
      if (response.success) {
        console.log('✅ Demo analiz başarılı:', response);
        
        // BalanceSheetPreview sayfasına yönlendir
        navigate('/balance-sheets/preview', {
          state: {
            analysisData: {
              success: true,
              detected_data: response.preview_data.detected_data,
              company_info: response.preview_data.company_info,
              analysis_metadata: response.preview_data.analysis_metadata
            },
            formData: {
              company_id: 1,
              year: 2024,
              period: "YILLIK",
              notes: "JSON Demo Analizi",
              filename: "demo_test.pdf"
            },
            isJsonDemo: true
          }
        });
      } else {
        setUploadError('Demo analiz başarısız: ' + response.error);
      }
      
    } catch (error) {
      console.error('❌ JSON demo analiz hatası:', error);
      setUploadError('JSON demo analiz hatası: ' + error.message);
    }
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
      
      <div className="flex justify-between items-center mb-6">
        <div>
        <h1 className="text-2xl font-semibold text-gray-800">Bilançolar</h1>
          <p className="text-sm text-gray-600 mt-1">Şirket bilançolarını yönetin ve analiz edin</p>
        </div>
        <div className="flex space-x-3">
          {/* Hızlı İşlemler Butonu */}
          <div className="relative">
          <button 
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-center mr-3 text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Analiz Raporu (Yakında)
                  </button>
                </div>
              </div>
            )}
          </div>
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

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yıl</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturma Tarihi</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBalanceSheets.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {balanceSheets.length === 0 ? 'Henüz bilanço yok' : 'Filtreye uygun bilanço bulunamadı'}
                    </h3>
                    <p className="text-gray-500 text-center mb-4">
                      {balanceSheets.length === 0 
                        ? 'İlk bilançonuzu eklemek için yukarıdaki butonları kullanın.'
                        : 'Farklı filtre seçenekleri deneyebilir veya filtreleri temizleyebilirsiniz.'
                      }
                    </p>
                    {balanceSheets.length === 0 && (
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => setShowUploadModal(true)} 
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
                        >
                          PDF'den Yükle
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredBalanceSheets.map((sheet) => (
              <tr key={sheet.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sheet.company_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{sheet.year || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{sheet.period || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDateDDMMYYYY(sheet.creation_date) || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-3">
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
                      to={`/balance-sheets/${sheet.id}/with-plan`} 
                      className="text-green-600 hover:text-green-900 transition-colors"
                      title="Hesap Planı"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* API Bilgi Notu */}
      <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mt-6" role="alert">
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
      
      {/* PDF Yükleme Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeUploadModal}></div>
          
          <div className="relative bg-white rounded-lg max-w-6xl w-full mx-4 md:mx-auto overflow-hidden shadow-xl transform transition-all">
            <div className="absolute top-0 right-0 pt-4 pr-4">
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                onClick={closeUploadModal}
              >
                <span className="sr-only">Kapat</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-5" id="modal-title">
                Bilanço PDF Yükle
              </h3>
              
              {/* Demo mod bilgilendirme mesajı */}
              <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 p-4 mb-6" role="alert">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 font-medium">
                      Sunucu bağlantısı bulunamadığında sistem otomatik olarak demo modda çalışır.
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Bu modda PDF içeriği gerçekten analiz edilmez, ancak arayüz test edilebilir.
                    </p>
                  </div>
                </div>
              </div>
              
              {uploadError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
                  <p className="font-bold">Hata</p>
                  <p>{uploadError}</p>
                </div>
              )}
              
              {/* Adım göstergesi */}
              <div className="mb-8">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${pdfUploadStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    1
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${pdfUploadStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${pdfUploadStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    2
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <div className="text-sm font-medium text-gray-700">PDF Seçimi</div>
                  <div className="text-sm font-medium text-gray-700">Bilanço Bilgileri</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sol panel - Her zaman görünür */}
                <div>
                  {pdfUploadStep === 1 ? (
                    /* Adım 1: PDF Seçimi */
                    <div>
                      <p className="text-gray-600 mb-6">
                        Lütfen bilanço dosyanızı seçin. Sistem, PDF içeriğindeki verileri otomatik olarak tarayacak ve mümkün olan bilgileri dolduracaktır.
                      </p>
                      
                      <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          PDF Dosyası
                        </label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col w-full h-56 border-2 border-blue-200 border-dashed hover:bg-gray-100 hover:border-blue-300 rounded-lg group cursor-pointer">
                            <div className="flex flex-col items-center justify-center pt-7 h-full">
                              {pdfAnalysisLoading ? (
                                <div className="text-center">
                                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                                  <p className="text-sm text-blue-600 font-medium">PDF analiz ediliyor...</p>
                                  <p className="text-xs text-gray-500 mt-2">PDF dosyasındaki veriler çıkarılıyor ve bilgiler tespit ediliyor</p>
                                </div>
                              ) : (
                                <>
                                  <svg className="w-14 h-14 text-blue-400 group-hover:text-blue-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                  </svg>
                                  <p className="text-sm text-gray-700 group-hover:text-gray-800 font-medium">
                                    PDF dosyasını seçmek için tıklayın
                                  </p>
                                  <p className="text-xs text-gray-500 mt-2">veya dosyayı sürükleyip bırakın</p>
                                  <p className="text-xs text-gray-400 mt-1">Maksimum dosya boyutu: 10MB</p>
                                  {file && (
                                    <p className="mt-4 text-sm font-medium text-green-600">
                                      {file.name} ({Math.round(file.size / 1024)} KB)
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="application/pdf"
                              onChange={handleFileChange}
                              disabled={pdfAnalysisLoading}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PDF Yükleme Modal - Adım 2: Bilanço Bilgilerini Düzenleme */
                    <form onSubmit={handlePdfUpload} className="mt-4">
                      {/* Dosya Bilgileri */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                        <h4 className="font-medium text-blue-800 mb-1">PDF Analiz Sonuçları</h4>
                        <p className="text-sm text-blue-600">
                          "{file?.name}" dosyasından aşağıdaki bilgiler tespit edildi.
                        </p>
                        
                        {autoDetectedData && autoDetectedData.detection_confidence && (
                          <div className="mt-1 text-xs text-blue-500">
                            <span className="font-medium">Tespit güvenilirliği:</span> %{Math.round(autoDetectedData.detection_confidence * 100)}
                          </div>
                        )}
                      </div>
                      
                      {/* Otomatik Tespit Edilen Şirket */}
                      {autoDetectedCompany && (
                        <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded-md">
                          <h4 className="font-medium text-green-800 mb-1">Tespit Edilen Şirket</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-green-700"><span className="font-medium">Şirket Adı:</span> {autoDetectedCompany.name}</div>
                            <div className="text-green-700"><span className="font-medium">VKN:</span> {autoDetectedCompany.tax_number}</div>
                          </div>
                          
                          <div className="mt-2">
                            <button
                              type="button" 
                              className="text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                setCompanyId('');
                                setCompany('');
                                setTaxNumber('');
                                setAutoDetectedCompany(null);
                              }}
                            >
                              Şirketi manuel seçmek istiyorum
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Şirket Seçimi */}
                      {!autoDetectedCompany && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="company">
                            Şirket Seçin
                          </label>
                          <select
                            id="company"
                            name="company"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={companyId}
                            onChange={(e) => {
                              setCompanyId(e.target.value);
                              
                              // Seçilen şirket adını ayarla
                              const selected = companies.find(c => c.id.toString() === e.target.value);
                              if (selected) {
                                setCompany(selected.name);
                                setTaxNumber(selected.tax_number || '');
                              }
                            }}
                            required
                          >
                            <option value="">-- Şirket Seçin --</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                          
                          {/* VKN ile aramayı ayrı bir bileşene almayı düşünebilirsiniz */}
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tax_number">
                              Vergi Kimlik Numarası ile Ara
                            </label>
                            <div className="flex items-center mt-1">
                              <input
                                type="text"
                                id="tax_number"
                                name="tax_number"
                                placeholder="VKN giriniz (10 haneli)"
                                value={taxNumber}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTaxNumber(value);
                                  
                                  // VKN formatını kontrol et
                                  if (value && !/^\d{10}$/.test(value)) {
                                    setTaxNumberError('VKN 10 haneli sayısal bir değer olmalıdır.');
                                  } else {
                                    setTaxNumberError('');
                                  }
                                }}
                                className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => findCompanyByTaxNumber(taxNumber)}
                                disabled={!taxNumber || taxNumberError}
                                className="p-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                              >
                                Ara
                              </button>
                            </div>
                            {taxNumberError && (
                              <p className="mt-1 text-sm text-red-600">
                                {taxNumberError}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Otomatik Tespit Edilen Dönem ve Yıl Bilgileri */}
                      {autoDetectedData && (autoDetectedData.period || autoDetectedData.year) && (
                        <div className="p-3 mb-4 bg-purple-50 border border-purple-200 rounded-md">
                          <h4 className="font-medium text-purple-800 mb-1">Tespit Edilen Dönem Bilgileri</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {autoDetectedData.period && (
                              <div className="text-purple-700"><span className="font-medium">Dönem:</span> {autoDetectedData.period}</div>
                            )}
                            {autoDetectedData.year && (
                              <div className="text-purple-700"><span className="font-medium">Yıl:</span> {autoDetectedData.year}</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Dönem Bilgileri */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="year">
                            Yıl
                          </label>
                          <input
                            type="number"
                            id="year"
                            name="year"
                            min="2000"
                            max="2100"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="period">
                            Dönem
                          </label>
                          <select
                            id="period"
                            name="period"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="YILLIK">Yıllık</option>
                            <option value="Q1">1. Çeyrek</option>
                            <option value="Q2">2. Çeyrek</option>
                            <option value="Q3">3. Çeyrek</option>
                            <option value="Q4">4. Çeyrek</option>
                            <option value="AYLIK-01">Ocak</option>
                            <option value="AYLIK-02">Şubat</option>
                            <option value="AYLIK-03">Mart</option>
                            <option value="AYLIK-04">Nisan</option>
                            <option value="AYLIK-05">Mayıs</option>
                            <option value="AYLIK-06">Haziran</option>
                            <option value="AYLIK-07">Temmuz</option>
                            <option value="AYLIK-08">Ağustos</option>
                            <option value="AYLIK-09">Eylül</option>
                            <option value="AYLIK-10">Ekim</option>
                            <option value="AYLIK-11">Kasım</option>
                            <option value="AYLIK-12">Aralık</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Notlar */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
                          Notlar (İsteğe Bağlı)
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows="2"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Bilanço ile ilgili notlar..."
                        ></textarea>
                      </div>
                      
                      {/* İşlem Butonları */}
                      <div className="flex justify-between space-x-3">
                        <button
                          type="button"
                          onClick={() => setPdfUploadStep(1)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <svg className="mr-2 -ml-1 h-4 w-4" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path>
                          </svg>
                          Geri
                        </button>
                        
                        <button
                          type="submit"
                          className="inline-flex items-center px-6 py-3 border border-transparent text-md font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          disabled={!companyId || uploadLoading}
                        >
                          {uploadLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              İşleniyor...
                            </>
                          ) : (
                            <>
                              <svg className="mr-2 -ml-1 h-5 w-5" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                              </svg>
                              Bilançoyu Kaydet
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                
                {/* Sağ panel - PDF Önizleme */}
                <div>
                  {preview ? (
                    <div className="w-full h-full flex flex-col">
                      <h2 className="text-xl font-semibold mb-4 text-gray-700">PDF Önizleme</h2>
                      <div className="flex-grow">
                        <iframe
                          src={preview}
                          title="PDF Preview"
                          className="w-full h-[400px] border border-gray-300 rounded"
                        ></iframe>
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">
                          Bilanço, hesap planına göre otomatik olarak işlenecektir.
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          PDF'den cari dönem ve geçmiş dönem verileri otomatik çıkarılacaktır.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col p-8">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <p className="text-gray-500 text-center">
                        Önizleme burada görüntülenecek.<br />
                        Lütfen önce PDF dosyası seçin.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bilgi kutusu */}
              <div className="mt-6 bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-700 mb-2">Önemli Bilgiler</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Yükleyeceğiniz PDF bilanço dosyası şu kriterlere uygun olmalıdır:
                </p>
                <ul className="list-disc pl-5 text-sm text-gray-600">
                  <li>PDF dosyası düzgün formatlı ve okunabilir olmalıdır</li>
                  <li>Bilanço verileri tek düzen hesap planına uygun olmalıdır</li>
                  <li>Hesap kodları ve tutarlar açıkça belirtilmiş olmalıdır</li>
                  <li>Cari dönem ve geçmiş dönem verileri ayrı sütunlarda yer almalıdır</li>
                  <li>Şirket bilgileri ve VKN dosya içeriğinde yer alırsa otomatik tespit edilecektir</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unvan Uyumsuzluğu Modalı */}
      {showTitleMismatchModal && titleMismatchData && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="title-mismatch-modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowTitleMismatchModal(false)}></div>
          
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 md:mx-auto overflow-hidden shadow-xl transform transition-all">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center" id="title-mismatch-modal-title">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Şirket Unvanı Uyumsuzluğu
              </h3>
              <p className="text-amber-100 mt-1">PDF'den tespit edilen unvan ile sistemdeki unvan farklı</p>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700">
                        PDF'den tespit edilen şirket unvanı ile sistemde kayıtlı unvan farklılık gösteriyor. 
                        Lütfen doğru unvanı seçin veya sistemdeki unvanı güncelleyin.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Sistemdeki Mevcut Unvan:</h4>
                    <p className="text-red-700 bg-white p-2 rounded border font-mono">
                      {titleMismatchData.currentTitle}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">PDF'den Tespit Edilen Unvan:</h4>
                    <p className="text-green-700 bg-white p-2 rounded border font-mono">
                      {titleMismatchData.pdfTitle}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Seçenekleriniz:</h4>
                  <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                    <li>PDF'den tespit edilen unvan ile sistemdeki şirket unvanını güncelleyin</li>
                    <li>Mevcut unvan ile devam edin (önerilmez)</li>
                    <li>İşlemi iptal edin ve doğru şirketi seçin</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => setShowTitleMismatchModal(false)}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={proceedWithUpload}
                >
                  Mevcut Unvan ile Devam Et
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => updateCompanyTitle(titleMismatchData.pdfTitle)}
                >
                  Unvanı Güncelle ve Devam Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteModal && balanceSheetToDelete && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="delete-modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDeleteModal}></div>
          
          <div className="relative bg-white rounded-lg max-w-md w-full mx-4 md:mx-auto overflow-hidden shadow-xl transform transition-all">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4" id="delete-modal-title">
                Bilançoyu Sil
              </h3>
              
              <div className="mb-6">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700 font-medium">
                        DİKKAT: Bu işlem geri alınamaz!
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Bilanço ve tüm ilgili veriler kalıcı olarak silinecektir.
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-3">
                  <strong>{balanceSheetToDelete.company_name}</strong> şirketinin <strong>{balanceSheetToDelete.year} {balanceSheetToDelete.period}</strong> dönemine ait bilançosunu silmek istediğinize emin misiniz?
                </p>
                
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm text-gray-600 mb-2">Silinecek veriler:</p>
                  <ul className="text-sm text-gray-600 list-disc pl-4">
                    <li>Bilanço hesap kalemleri ve tutarları</li>
                    <li>PDF dosyası ve analiz sonuçları</li>
                    <li>İlgili raporlar ve analizler</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={closeDeleteModal}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  onClick={handleDeleteBalanceSheet}
                >
                  Evet, Kalıcı Olarak Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Bilanço Uyarı Modalı */}
      {showDuplicateWarning && duplicateBalanceData && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="duplicate-warning-modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDuplicateWarning(false)}></div>
          
          <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 md:mx-auto overflow-hidden shadow-xl transform transition-all">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white flex items-center" id="duplicate-warning-modal-title">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Mevcut Bilanço Tespit Edildi
              </h3>
              <p className="text-amber-100 mt-1">Aynı dönem için zaten bilanço mevcut</p>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700 font-medium">
                        Bu şirket ve dönem için zaten bir bilanço sisteme kayıtlı!
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Devam ederseniz mevcut bilanço güncellenecektir ve eski veriler kalıcı olarak silinecektir.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Mevcut Bilanço:</h4>
                    <div className="space-y-2 text-red-700">
                      <p><strong>Şirket:</strong> {duplicateBalanceData.existingBalance.company_name}</p>
                      <p><strong>Dönem:</strong> {duplicateBalanceData.existingBalance.year} - {duplicateBalanceData.existingBalance.period}</p>
                      <p><strong>Oluşturulma:</strong> {formatDateDDMMYYYY(duplicateBalanceData.existingBalance.creation_date)}</p>
                      {duplicateBalanceData.existingBalance.notes && (
                        <p><strong>Notlar:</strong> {duplicateBalanceData.existingBalance.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Yüklenecek Yeni Bilanço:</h4>
                    <div className="space-y-2 text-green-700">
                      <p><strong>Şirket:</strong> {duplicateBalanceData.newData.company}</p>
                      <p><strong>Dönem:</strong> {duplicateBalanceData.newData.year} - {duplicateBalanceData.newData.period}</p>
                      <p><strong>PDF Dosyası:</strong> {file?.name}</p>
                      {notes && (
                        <p><strong>Notlar:</strong> {notes}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Seçenekleriniz:</h4>
                  <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
                    <li><strong>Güncelle:</strong> Mevcut bilançoyu yeni PDF ile değiştir (önerilen)</li>
                    <li><strong>İptal:</strong> Yükleme işlemini durdur ve farklı dönem seç</li>
                    <li><strong>Değiştir:</strong> Yıl veya dönem bilgisini değiştir</li>
                  </ul>
                  
                  <div className="mt-3 p-3 bg-blue-100 rounded border">
                    <p className="text-sm text-blue-800">
                      <strong>DİKKAT:</strong> Güncelleme işlemi geri alınamaz. Mevcut bilanço verileri kalıcı olarak değiştirilecektir.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setDuplicateBalanceData(null);
                    setProceedWithUpdate(false);
                  }}
                >
                  İptal Et
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    // Form alanlarını düzenleme moduna geç
                    setPdfUploadStep(2);
                  }}
                >
                  Dönem Bilgilerini Değiştir
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setProceedWithUpdate(true);
                    // Güncelleme ile devam et
                    submitBalanceSheet();
                  }}
                >
                  ✓ Mevcut Bilançoyu Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yeni JSON Analiz Butonu */}
      <div className="mb-6">
        <button
          onClick={analyzeWithJsonData}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        📊 JSON Verisi ile Analiz Dene
        </button>
      </div>
    </div>
  );
};

export default BalanceSheets; 