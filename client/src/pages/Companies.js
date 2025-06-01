import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CompanyAPI } from '../api';
import AddressAutocomplete from '../components/AddressAutocomplete';

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

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Yeni şirket form state'i
  const [formData, setFormData] = useState({
    // Genel Bilgiler
    tax_number: '',
    email: '',
    trade_registry_number: '',
    title: '', // Unvan (ana alan)
    address: '',
    phone: '',
    establishment_date: '',
    
    // Faaliyet Konusu
    activity_main_category: '',
    activity_subcategory: '',
    activity_notes: '',
    
    // Sektör Bilgileri
    sector_size_dynamics: '',
    competitive_position_market_share: '',
    income_expenses_tax_compliance: '',
    regulation_monitoring: '',
    sector_notes: '' // Free text alan
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [taxNumberChecking, setTaxNumberChecking] = useState(false);
  const [taxNumberStatus, setTaxNumberStatus] = useState(null);
  
  // Silme modal state'leri
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [deleteCheckResult, setDeleteCheckResult] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Ana Ortaklar ve Paylaşım için ayrı state
  const [partners, setPartners] = useState([
    { name: '', sharePercentage: '' }
  ]);
  
  // Faaliyet konusu kategorileri (NACE Rev.2 kodları)
  const activityCategories = {
    'A': {
      name: 'A - TARIM, ORMANCILIK VE BALIKÇILIK',
      subcategories: {
        '01': '01 - Tek yıllık ve iki yıllık bitkisel ürünlerin yetiştirilmesi',
        '02': '02 - Çok yıllık bitkisel ürünlerin yetiştirilmesi',
        '03': '03 - Hayvan yetiştiriciliği',
        '04': '04 - Karma çiftçilik',
        '05': '05 - Diğer bitkisel ve hayvansal üretim',
        '06': '06 - Tarımı destekleyici faaliyetler ve hasat sonrası faaliyetler',
        '07': '07 - Tohum işleme için faaliyetler',
        '08': '08 - Ormancılık ve ilgili hizmet faaliyetleri',
        '09': '09 - Balıkçılık ve su ürünleri yetiştiriciliği'
      }
    },
    'B': {
      name: 'B - MADENCİLİK VE TAŞ OCAKLARI',
      subcategories: {
        '10': '10 - Kömür ve linyit çıkarımı',
        '11': '11 - Ham petrol ve doğal gaz çıkarımı',
        '12': '12 - Metal cevherleri madenciliği',
        '13': '13 - Diğer madencilik ve taş ocakçılığı',
        '14': '14 - Madenciliği destekleyici hizmet faaliyetleri'
      }
    },
    'C': {
      name: 'C - İMALAT',
      subcategories: {
        '15': '15 - Gıda ürünleri imalatı',
        '16': '16 - Tütün ürünleri imalatı',
        '17': '17 - Tekstil ürünleri imalatı',
        '18': '18 - Giyim eşyası imalatı',
        '19': '19 - Deri ve ilgili ürünlerin imalatı',
        '20': '20 - Ağaç ve mantar ürünleri imalatı (mobilya hariç)',
        '21': '21 - Kağıt ve kağıt ürünleri imalatı',
        '22': '22 - Kayıtlı medyanın basılması ve çoğaltılması',
        '23': '23 - Kok kömürü ve rafine edilmiş petrol ürünleri imalatı',
        '24': '24 - Kimyasalların ve kimyasal ürünlerin imalatı',
        '25': '25 - Kauçuk ve plastik ürünleri imalatı',
        '26': '26 - Diğer metalik olmayan mineral ürünlerin imalatı',
        '27': '27 - Ana metal sanayii',
        '28': '28 - Metal eşya sanayii (makine ve teçhizat hariç)',
        '29': '29 - Motorlu kara taşıtları, treyler ve yarı treyler imalatı',
        '30': '30 - Diğer ulaşım araçları imalatı',
        '31': '31 - Mobilya imalatı',
        '32': '32 - Diğer imalatlar',
        '33': '33 - Makine ve teçhizatların kurulumu ve onarımı'
      }
    },
    'D': {
      name: 'D - ELEKTRİK, GAZ, BUHAR VE İKLİMLENDİRME ÜRETİMİ VE DAĞITIMI',
      subcategories: {
        '35': '35 - Elektrik, gaz, buhar ve iklimlendirme üretimi ve dağıtımı'
      }
    },
    'E': {
      name: 'E - SU TEMİNİ; KANALİZASYON, ATIK YÖNETİMİ VE İYİLEŞTİRME FAALİYETLERİ',
      subcategories: {
        '36': '36 - Su toplama, arıtma ve dağıtımı',
        '37': '37 - Kanalizasyon',
        '38': '38 - Atık toplama, işleme ve bertarafı; geri kazanım',
        '39': '39 - İyileştirme faaliyetleri ve diğer atık yönetimi hizmetleri'
      }
    },
    'F': {
      name: 'F - İNŞAAT',
      subcategories: {
        '41': '41 - Bina inşaatı',
        '42': '42 - Bina dışı yapıların inşaatı',
        '43': '43 - Özel inşaat faaliyetleri'
      }
    },
    'G': {
      name: 'G - TOPTAN VE PERAKENDE TİCARET; MOTORLU KARA TAŞITLARININ VE MOTOSİKLETLERİNİN ONARIMI',
      subcategories: {
        '45': '45 - Motorlu kara taşıtlarının ve motosikletlerin toptan ve perakende ticareti ve onarımı',
        '46': '46 - Toptan ticaret (motorlu kara taşıtları ve motosikletler hariç)',
        '47': '47 - Perakende ticaret (motorlu kara taşıtları ve motosikletler hariç)'
      }
    },
    'H': {
      name: 'H - ULAŞTIRMA VE DEPOLAMA',
      subcategories: {
        '49': '49 - Kara taşımacılığı ve boru hattı taşımacılığı',
        '50': '50 - Su yolu taşımacılığı',
        '51': '51 - Hava taşımacılığı',
        '52': '52 - Depolama ve taşımacılığı destekleyici faaliyetler',
        '53': '53 - Posta ve kurye faaliyetleri'
      }
    },
    'I': {
      name: 'I - KONAKLAMA VE YİYECEK HİZMETİ FAALİYETLERİ',
      subcategories: {
        '55': '55 - Konaklama faaliyetleri',
        '56': '56 - Yiyecek ve içecek hizmeti faaliyetleri'
      }
    },
    'J': {
      name: 'J - BİLGİ VE İLETİŞİM',
      subcategories: {
        '58': '58 - Yayıncılık faaliyetleri',
        '59': '59 - Sinema filmi, video ve televizyon programları yapımcılığı, ses kaydı ve müzik yayıncılığı faaliyetleri',
        '60': '60 - Radyo ve televizyon yayıncılığı faaliyetleri',
        '61': '61 - Telekomünikasyon',
        '62': '62 - Bilgisayar programlama, danışmanlık ve ilgili faaliyetler',
        '63': '63 - Bilgi hizmeti faaliyetleri'
      }
    },
    'K': {
      name: 'K - FİNANS VE SİGORTA FAALİYETLERİ',
      subcategories: {
        '64': '64 - Finansal hizmet faaliyetleri (sigorta ve emeklilik fonları hariç)',
        '65': '65 - Sigorta, reasürans ve emeklilik fonları (zorunlu sosyal güvenlik hariç)',
        '66': '66 - Finansal hizmetlerle ilgili yardımcı faaliyetler ve sigorta faaliyetleri'
      }
    },
    'L': {
      name: 'L - GAYRİMENKUL FAALİYETLERİ',
      subcategories: {
        '68': '68 - Gayrimenkul faaliyetleri'
      }
    },
    'M': {
      name: 'M - MESLEKİ, BİLİMSEL VE TEKNİK FAALİYETLER',
      subcategories: {
        '69': '69 - Hukuk ve muhasebe faaliyetleri',
        '70': '70 - Ana merkez faaliyetleri; yönetim danışmanlığı faaliyetleri',
        '71': '71 - Mimarlık ve mühendislik faaliyetleri; teknik test ve analiz faaliyetleri',
        '72': '72 - Bilimsel araştırma ve geliştirme faaliyetleri',
        '73': '73 - Reklamcılık ve pazar araştırması',
        '74': '74 - Diğer mesleki, bilimsel ve teknik faaliyetler',
        '75': '75 - Veterinerlik faaliyetleri'
      }
    },
    'N': {
      name: 'N - İDARİ VE DESTEK HİZMETİ FAALİYETLERİ',
      subcategories: {
        '77': '77 - Kiralama ve leasing faaliyetleri',
        '78': '78 - İstihdam faaliyetleri',
        '79': '79 - Seyahat acentesi, tur operatörü ve diğer rezervasyon hizmetleri ile ilgili faaliyetler',
        '80': '80 - Güvenlik ve soruşturma faaliyetleri',
        '81': '81 - Binalara yönelik hizmetler ve çevre düzenlemesi faaliyetleri',
        '82': '82 - Büro yönetimi, büro destek ve diğer iş destek faaliyetleri'
      }
    },
    'O': {
      name: 'O - KAMU YÖNETİMİ VE SAVUNMA; ZORUNLU SOSYAL GÜVENLİK',
      subcategories: {
        '84': '84 - Kamu yönetimi ve savunma; zorunlu sosyal güvenlik'
      }
    },
    'P': {
      name: 'P - EĞİTİM',
      subcategories: {
        '85': '85 - Eğitim'
      }
    },
    'Q': {
      name: 'Q - İNSAN SAĞLIĞI VE SOSYAL HİZMET FAALİYETLERİ',
      subcategories: {
        '86': '86 - İnsan sağlığı hizmetleri',
        '87': '87 - Yatılı bakım faaliyetleri',
        '88': '88 - Ayakta bakım sosyal yardım faaliyetleri'
      }
    },
    'R': {
      name: 'R - KÜLTÜR, SANAT, EĞLENCE, DİNLENCE VE SPOR',
      subcategories: {
        '90': '90 - Yaratıcı sanatlar ve gösteri sanatları faaliyetleri',
        '91': '91 - Kütüphaneler, arşivler, müzeler ve diğer kültürel faaliyetler',
        '92': '92 - Kumar ve bahis faaliyetleri',
        '93': '93 - Spor faaliyetleri ve eğlence hizmetleri'
      }
    },
    'S': {
      name: 'S - DİĞER HİZMET FAALİYETLERİ',
      subcategories: {
        '94': '94 - Üyelik gerektiren kuruluşların faaliyetleri',
        '95': '95 - Bilgisayarların ve kişisel ve ev eşyalarının onarımı',
        '96': '96 - Diğer kişisel hizmet faaliyetleri'
      }
    },
    'T': {
      name: 'T - HANE HALKI (İŞVERENLERİN HANE HALKLARI OLARAK FAALİYETLERİ)',
      subcategories: {
        '97': '97 - Ev içi personelin işverenleri olarak hane halklarının faaliyetleri',
        '98': '98 - Kendi tüketimi için mal ve hizmet üreten ayrılmamış hane halklarının faaliyetleri'
      }
    },
    'U': {
      name: 'U - ULUSLARARASI KURULUŞLAR VE TEMSİLCİLİKLERİ',
      subcategories: {
        '99': '99 - Uluslararası kuruluşların faaliyetleri'
      }
    }
  };
  
  // Ortak ekleme/çıkarma fonksiyonları
  const addPartner = () => {
    setPartners([...partners, { name: '', sharePercentage: '' }]);
  };
  
  const removePartner = (index) => {
    if (partners.length > 1) {
      const newPartners = partners.filter((_, i) => i !== index);
      setPartners(newPartners);
    }
  };
  
  const updatePartner = (index, field, value) => {
    const newPartners = [...partners];
    newPartners[index][field] = value;
    setPartners(newPartners);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);
  
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Companies.js: Şirketler getiriliyor...");
      console.log("CompanyAPI object:", CompanyAPI);
      
      const companiesData = await CompanyAPI.getAllCompanies();
      
      console.log("Companies.js: API yanıtı alındı");
      console.log("Companies data:", companiesData);
      console.log("Data türü:", typeof companiesData);
      console.log("Array mi?", Array.isArray(companiesData));
      
      setCompanies(companiesData);
      setLoading(false);
    } catch (err) {
      console.error("Şirketler yüklenirken hata oluştu:", err);
      console.error("Hata detayları:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // API hatası durumunda boş array ve hata mesajı göster
      setCompanies([]);
      
      if (err.message && err.message.includes('Network Error')) {
        setError("Sunucu bağlantısı kurulamadı. Lütfen backend sunucusunun çalıştığını kontrol edin.");
      } else if (err.response?.status === 500) {
        setError("Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.");
      } else {
        setError(`Şirket verileri yüklenirken hata oluştu: ${err.message}`);
      }
      setLoading(false);
    }
  };
  
  // Form alanı değişikliği
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Ana faaliyet kategorisi değiştiğinde alt kategoriyi sıfırla
    if (name === 'activity_main_category') {
      setFormData({
        ...formData,
        [name]: value,
        activity_subcategory: '' // Alt kategoriyi sıfırla
      });
    } else {
    setFormData({
      ...formData,
      [name]: value
    });
    }
    
    if (formErrors[name]) {
      validateField(name, value);
    }
  };
  
  // VKN kontrolü yap
  const handleTaxNumberBlur = async () => {
    const taxNumber = formData.tax_number;
    
    if (!taxNumber || taxNumber.length !== 10 || !/^\d+$/.test(taxNumber)) {
      setFormErrors({
        ...formErrors,
        tax_number: 'Vergi Kimlik Numarası 10 haneli sayısal bir değer olmalıdır'
      });
      setTaxNumberStatus(null);
      return;
    }
    
    try {
      setTaxNumberChecking(true);
      const taxCheckResult = await CompanyAPI.checkCompanyByTaxNumber(taxNumber);
      setTaxNumberChecking(false);
      
      if (taxCheckResult.exists) {
        setFormErrors({
          ...formErrors,
          tax_number: 'Bu Vergi Kimlik Numarası ile kayıtlı bir şirket zaten mevcut'
        });
        setTaxNumberStatus({
          exists: true,
          company: taxCheckResult.company
        });
      } else {
        setFormErrors({
          ...formErrors,
          tax_number: null
        });
        setTaxNumberStatus({
          exists: false
        });
      }
    } catch (err) {
      setTaxNumberChecking(false);
      console.error("VKN kontrolü sırasında hata:", err);
      setFormErrors({
        ...formErrors,
        tax_number: 'VKN kontrolü sırasında bir hata oluştu'
      });
    }
  };
  
  // Alan validasyonu
  const validateField = (name, value) => {
    let errors = { ...formErrors };
    
    switch (name) {
      case 'tax_number':
        if (!value) {
          errors.tax_number = 'Vergi Kimlik Numarası zorunludur';
        } else if (value.length !== 10 || !/^\d+$/.test(value)) {
          errors.tax_number = 'Vergi Kimlik Numarası 10 haneli sayısal bir değer olmalıdır';
        } else {
          errors.tax_number = null;
        }
        break;
      
      case 'email':
        if (!value) {
          errors.email = 'E-posta adresi zorunludur';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errors.email = 'Geçerli bir e-posta adresi giriniz';
        } else {
          errors.email = null;
        }
        break;
        
      case 'title':
        if (!value) {
          errors.title = 'Şirket adı zorunludur';
        } else {
          errors.title = null;
        }
        break;
        
      case 'address':
        if (!value) {
          errors.address = 'Adres zorunludur';
        } else {
          errors.address = null;
        }
        break;
        
      default:
        break;
    }
    
    setFormErrors(errors);
    return !errors[name];
  };
  
  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Tüm alanların validasyonu
    let isValid = true;
    const requiredFields = ['tax_number', 'email', 'title', 'address'];
    
    let errors = {};
    requiredFields.forEach(field => {
      if (!validateField(field, formData[field])) {
        isValid = false;
        errors[field] = `${field} zorunlu alan`;
      }
    });
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    if (taxNumberStatus && taxNumberStatus.exists) {
      setFormErrors({
        ...formErrors,
        tax_number: 'Bu Vergi Kimlik Numarası ile kayıtlı bir şirket zaten mevcut'
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Form verilerini API'ye gönder - partners array'i de dahil et
      const submitData = {
        ...formData,
        partners: partners.filter(p => p.name.trim() || p.sharePercentage.trim()) // Boş olmayan partnerleri filtrele
      };
      
      const newCompany = await CompanyAPI.createCompany(submitData);
      
      console.log("Şirket ekleme başarılı:", newCompany);
      
      setSubmitting(false);
      setShowAddModal(false);
      
      // Form state'ini temizle
      setFormData({
        tax_number: '',
        email: '',
        trade_registry_number: '',
        title: '',
        address: '',
        phone: '',
        establishment_date: '',
        activity_main_category: '',
        activity_subcategory: '',
        activity_notes: '',
        sector_size_dynamics: '',
        competitive_position_market_share: '',
        income_expenses_tax_compliance: '',
        regulation_monitoring: '',
        sector_notes: ''
      });
      setFormErrors({});
      setTaxNumberStatus(null);
      
      // Partners state'ini de sıfırla
      setPartners([{ name: '', sharePercentage: '' }]);
      
      // Şirket listesini API'den yenile
      console.log("Şirket listesi yenileniyor...");
      await fetchCompanies();
      console.log("Şirket listesi yenilendi.");
      
      // Başarı mesajı - newCompany.name veya title kullan
      const companyName = newCompany.name || newCompany.title || submitData.title || 'Yeni şirket';
      setSuccessMessage(`"${companyName}" şirketi başarıyla eklendi.`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (err) {
      setSubmitting(false);
      console.error("Şirket oluşturma sırasında hata:", err);
      
      // Hata mesajını belirle
      let errorMessage = 'Şirket oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.';
      
      if (err.response && err.response.data) {
        if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Hata mesajını form hatası olarak göster
      setFormErrors({
        ...formErrors,
        form: errorMessage
      });
    }
  };
  
  // Modal'ı kapat
  const closeModal = () => {
    setShowAddModal(false);
    setFormData({
      tax_number: '',
      email: '',
      trade_registry_number: '',
      title: '',
      address: '',
      phone: '',
      establishment_date: '',
      activity_main_category: '',
      activity_subcategory: '',
      activity_notes: '',
      sector_size_dynamics: '',
      competitive_position_market_share: '',
      income_expenses_tax_compliance: '',
      regulation_monitoring: '',
      sector_notes: ''
    });
    setFormErrors({});
    setTaxNumberStatus(null);
    // Partners state'ini de sıfırla
    setPartners([{ name: '', sharePercentage: '' }]);
  };

  // Test şirketi verilerini doldur
  const fillTestCompany = () => {
    const testData = {
      tax_number: Math.floor(Math.random() * 9000000000 + 1000000000).toString(), // Rastgele 10 haneli VKN
      email: 'test@ornek.com',
      trade_registry_number: 'TEST-' + Math.floor(Math.random() * 1000),
      title: 'Test Anonim Şirketi',
      address: 'Test Mahallesi, Test Caddesi No:123, Kadıköy/İstanbul',
      phone: '0212 123 45 67',
      establishment_date: '2020-01-15',
      activity_main_category: 'C',
      activity_subcategory: '15',
      activity_notes: 'Gıda ürünleri imalatı ve satışı. Test amaçlı oluşturulan şirket.',
      sector_size_dynamics: 'Orta ölçekli sektör, istikrarlı büyüme',
      competitive_position_market_share: 'Güçlü rekabet ortamı, %5 pazar payı',
      income_expenses_tax_compliance: 'Düzenli gelir akışı, kontrollü maliyetler',
      regulation_monitoring: 'Gıda güvenliği mevzuatına tam uyum',
      sector_notes: 'Test amaçlı oluşturulan örnek şirket verileri.'
    };
    
    setFormData(testData);
    
    // Test ortakları da ekle
    setPartners([
      { name: 'Ahmet Test', sharePercentage: '60.00' },
      { name: 'Mehmet Test', sharePercentage: '40.00' }
    ]);
    
    // Hataları temizle
    setFormErrors({});
    setTaxNumberStatus(null);
  };

  // Şirket silme fonksiyonu
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    try {
      setDeleting(true);
      
      // Önce şirketin silinip silinemeyeceğini kontrol et
      const deleteResult = await CompanyAPI.deleteCompany(companyToDelete.id);
      
      if (deleteResult.can_delete === false) {
        // Bağlı bilançolar var, kullanıcıya göster
        setDeleteCheckResult(deleteResult);
        setDeleting(false);
        return;
      }
      
      // Silme başarılı
      setShowDeleteModal(false);
      setCompanyToDelete(null);
      setDeleteCheckResult(null);
      setDeleting(false);
      
      // Şirket listesini yenile
      await fetchCompanies();
      
      setSuccessMessage(deleteResult.message);
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (err) {
      setDeleting(false);
      console.error("Şirket silme sırasında hata:", err);
      alert(`Hata: ${err.message}`);
    }
  };

  // Şirketi zorla silme fonksiyonu
  const handleForceDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    try {
      setDeleting(true);
      
      const deleteResult = await CompanyAPI.forceDeleteCompany(companyToDelete.id);
      
      // Silme başarılı
      setShowDeleteModal(false);
      setCompanyToDelete(null);
      setDeleteCheckResult(null);
      setDeleting(false);
      
      // Şirket listesini yenile
      await fetchCompanies();
      
      setSuccessMessage(deleteResult.message);
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (err) {
      setDeleting(false);
      console.error("Şirket zorla silme sırasında hata:", err);
      alert(`Hata: ${err.message}`);
    }
  };

  // Sektör gösterim adını al
  const getSectorDisplayName = (industryCode) => {
    if (!industryCode) return 'Belirtilmemiş';
    
    const category = activityCategories[industryCode];
    if (!category) return industryCode; // Kod bulunamadıysa kodun kendisini göster
    
    // "A - TARIM, ORMANCILIK VE BALIKÇILIK" formatından sadece açıklamayı al
    const name = category.name.split(' - ')[1] || category.name;
    
    // 20 karakterle sınırla
    return name.length > 20 ? name.substring(0, 17) + '...' : name;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Şirket Yönetimi</h1>
              <p className="text-sm text-gray-600">Şirket bilgilerini yönetin ve yeni şirket ekleyin</p>
            </div>
          </div>
          
        <button 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
          onClick={() => setShowAddModal(true)}
        >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          Yeni Şirket Ekle
        </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Hata</p>
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p className="font-bold">Başarılı</p>
          <p>{successMessage}</p>
        </div>
      )}

      {/* Companies Table */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-blue-600 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Kayıtlı Şirketler
          </h2>
          <div className="text-white text-sm">
            Toplam: {companies?.length || 0} şirket
          </div>
        </div>

        {companies && companies.length > 0 ? (
          <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Şirket Adı</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">VKN</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">E-Posta</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Sektör</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                {companies.map((company) => (
                  <tr key={`company-${company.id}-${company.tax_number}`} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        </div>
                      </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{company.tax_number}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.email}</div>
                </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getSectorDisplayName(company.industry)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-3">
                    <Link 
                      to={`/companies/${company.id}`} 
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                      title="Detaylar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <button 
                          className="text-red-600 hover:text-red-900 p-1 transition-colors"
                      title="Sil"
                      onClick={() => {
                        setShowDeleteModal(true);
                        setCompanyToDelete(company);
                      }}
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
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz şirket yok</h3>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? "Şirketler yükleniyor..." : "Yeni bir şirket ekleyerek başlayın."}
            </p>
          </div>
        )}
      </div>
      
      {/* Şirket Ekleme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={closeModal}></div>
          
          <div className="relative bg-white rounded-2xl max-w-5xl w-full mx-4 md:mx-auto overflow-hidden shadow-2xl transform transition-all">
            <div className="absolute top-0 right-0 pt-6 pr-6 z-10">
              <button
                type="button"
                className="bg-white rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none shadow-md"
                onClick={closeModal}
              >
                <span className="sr-only">Kapat</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
              <h3 className="text-3xl font-bold text-white flex items-center" id="modal-title">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni Şirket Ekle
              </h3>
              <p className="text-blue-100 mt-2">Şirket bilgilerini eksiksiz doldurun</p>
              
              {/* Test Şirketi Butonu */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={fillTestCompany}
                  className="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Test Şirketi Doldur
                </button>
                <span className="ml-2 text-xs text-blue-200">Hızlı test için örnek veriler</span>
              </div>
            </div>
              
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {formErrors.form && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg" role="alert">
                  <p className="font-bold">Hata</p>
                  <p>{formErrors.form}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Genel Bilgiler Bölümü */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Genel Bilgiler
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tax_number">
                        Vergi Kimlik Numarası *
                    </label>
                    <input
                      id="tax_number"
                      type="text"
                      name="tax_number"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.tax_number ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="10 haneli VKN"
                      value={formData.tax_number}
                      onChange={handleInputChange}
                      onBlur={handleTaxNumberBlur}
                      maxLength={10}
                      required
                    />
                    {formErrors.tax_number && (
                      <p className="text-red-500 text-xs italic mt-1">{formErrors.tax_number}</p>
                    )}
                    {taxNumberChecking && (
                      <p className="text-blue-500 text-xs italic mt-1">VKN kontrol ediliyor...</p>
                    )}
                    {taxNumberStatus && taxNumberStatus.exists && (
                      <p className="text-red-500 text-xs italic mt-1">
                        Bu VKN "{taxNumberStatus.company.name}" şirketine aittir.
                      </p>
                    )}
                    {taxNumberStatus && !taxNumberStatus.exists && !formErrors.tax_number && (
                      <p className="text-green-500 text-xs italic mt-1">VKN kullanılabilir.</p>
                    )}
                  </div>
                  
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                        Şirket Adı *
                      </label>
                      <input
                        id="title"
                        type="text"
                        name="title"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Şirket adını giriniz (örn: ABC LTD. ŞTİ.)"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                      {formErrors.title && (
                        <p className="text-red-500 text-xs italic mt-1">{formErrors.title}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="trade_registry_number">
                        Ticaret Sicil No
                      </label>
                      <input
                        id="trade_registry_number"
                        type="text"
                        name="trade_registry_number"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="Sicil No (isteğe bağlı)"
                        value={formData.trade_registry_number}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                        E-Posta Adresi *
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="ornek@sirket.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs italic mt-1">{formErrors.email}</p>
                    )}
                  </div>
                  
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                        Telefon
                    </label>
                    <input
                        id="phone"
                      type="text"
                        name="phone"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        placeholder="Şirket telefonu"
                        value={formData.phone}
                      onChange={handleInputChange}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="establishment_date">
                        Kuruluş Tarihi
                      </label>
                      <input
                        id="establishment_date"
                        type="date"
                        name="establishment_date"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        value={formData.establishment_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="lg:col-span-3">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                        Adres *
                      </label>
                      <AddressAutocomplete
                        value={formData.address}
                        onChange={(value) => setFormData({ ...formData, address: value })}
                      />
                      {formErrors.address && (
                        <p className="text-red-500 text-xs italic mt-1">{formErrors.address}</p>
                      )}
                    </div>
                  </div>
                  </div>
                  
                {/* Faaliyet Konusu Bölümü */}
                <div className="bg-purple-50 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h4a2 2 0 002-2V4h-8zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2z" />
                    </svg>
                    Faaliyet Konusu
                  </h4>
                  
                  <div className="mb-4 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Önemli:</strong> Ticaret sicil kayıtlarındaki değil, şirketinizin gerçekte yaptığı faaliyet alanına göre seçim yapın. Daha detaylı açıklama için "Faaliyet Detayları" kısmını mutlaka doldurun.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="activity_main_category">
                        Ana Faaliyet Alanı *
                      </label>
                      <select
                        id="activity_main_category"
                        name="activity_main_category"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                        value={formData.activity_main_category}
                        onChange={handleInputChange}
                      >
                        <option value="">-- Ana Faaliyet Alanını Seçin --</option>
                        {Object.entries(activityCategories).map(([key, category]) => (
                          <option key={key} value={key}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="activity_subcategory">
                        Alt Faaliyet Dalı
                      </label>
                      <select
                        id="activity_subcategory"
                        name="activity_subcategory"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                        value={formData.activity_subcategory}
                        onChange={handleInputChange}
                        disabled={!formData.activity_main_category}
                      >
                        <option value="">-- Alt Faaliyet Dalını Seçin --</option>
                        {formData.activity_main_category && activityCategories[formData.activity_main_category] && 
                          Object.entries(activityCategories[formData.activity_main_category].subcategories).map(([key, subcategory]) => (
                            <option key={key} value={key}>
                              {subcategory}
                            </option>
                          ))
                        }
                      </select>
                      {!formData.activity_main_category && (
                        <p className="text-sm text-gray-500 mt-1">Önce ana faaliyet alanını seçin</p>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="activity_notes">
                        Faaliyet Detayları ve Notlar
                      </label>
                      <textarea
                        id="activity_notes"
                        name="activity_notes"
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                        placeholder="Şirketin faaliyet konusu ile ilgili detaylar, özel durumlar ve ek bilgiler..."
                        value={formData.activity_notes}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    {/* Seçilen faaliyet bilgilerinin özeti */}
                    {(formData.activity_main_category || formData.activity_subcategory) && (
                      <div className="md:col-span-2 mt-4 p-4 bg-purple-100 rounded-lg">
                        <h5 className="font-medium text-purple-800 mb-2">Seçilen Faaliyet Konusu Özeti:</h5>
                        <div className="text-sm text-purple-700 space-y-1">
                          {formData.activity_main_category && (
                            <p><strong>Ana Alan:</strong> {activityCategories[formData.activity_main_category]?.name}</p>
                          )}
                          {formData.activity_subcategory && formData.activity_main_category && (
                            <p><strong>Alt Dal:</strong> {activityCategories[formData.activity_main_category]?.subcategories[formData.activity_subcategory]}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Sektör Bilgileri Bölümü */}
                <div className="bg-indigo-50 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Sektör Bilgileri
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sector_size_dynamics">
                        Sektör Büyüklüğü ve Dinamikleri
                    </label>
                    <input
                        id="sector_size_dynamics"
                      type="text"
                        name="sector_size_dynamics"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Sektör boyutu ve dinamikleri"
                        value={formData.sector_size_dynamics}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="competitive_position_market_share">
                        Rekabet Ortamı ve Arz Zinciri
                    </label>
                    <input
                        id="competitive_position_market_share"
                      type="text"
                        name="competitive_position_market_share"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Rekabet ortamı"
                        value={formData.competitive_position_market_share}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="income_expenses_tax_compliance">
                        Gelir Maliyetleri ve Arz Zinciri
                    </label>
                    <input
                        id="income_expenses_tax_compliance"
                      type="text"
                        name="income_expenses_tax_compliance"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Gelir maliyetleri"
                        value={formData.income_expenses_tax_compliance}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="regulation_monitoring">
                        Düzenleme Denetim ve İzleme
                    </label>
                    <input
                        id="regulation_monitoring"
                      type="text"
                        name="regulation_monitoring"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Düzenleme denetimi"
                        value={formData.regulation_monitoring}
                      onChange={handleInputChange}
                    />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="sector_notes">
                        Ek Sektör Notları
                      </label>
                      <textarea
                        id="sector_notes"
                        name="sector_notes"
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Sektör hakkında ek notlar ve detaylar..."
                        value={formData.sector_notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Ana Ortaklar ve Paylaşım Bölümü */}
                <div className="bg-green-50 rounded-xl p-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Ana Ortaklar ve Paylaşım
                  </h4>
                  
                  <div className="space-y-4">
                    {partners.map((partner, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Ortak Adı
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                            placeholder="Ortak adı"
                            value={partner.name}
                            onChange={(e) => updatePartner(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Pay (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                            placeholder="0.00"
                            value={partner.sharePercentage}
                            onChange={(e) => updatePartner(index, 'sharePercentage', e.target.value)}
                          />
                        </div>
                        {partners.length > 1 && (
                  <button
                    type="button"
                            onClick={() => removePartner(index)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Ortağı kaldır"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addPartner}
                      className="flex items-center px-4 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Yeni Ortak Ekle
                    </button>
                    
                    <div className="mt-4 p-3 bg-green-100 rounded-lg">
                      <p className="text-sm text-green-700">
                        <strong>Toplam Pay:</strong> {partners.reduce((total, partner) => total + (parseFloat(partner.sharePercentage) || 0), 0).toFixed(2)}%
                      </p>
                      {partners.reduce((total, partner) => total + (parseFloat(partner.sharePercentage) || 0), 0) > 100 && (
                        <p className="text-sm text-red-600 mt-1">
                          ⚠️ Toplam pay %100'ü aştı!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    className="mr-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
                    onClick={closeModal}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Kaydediliyor...
                      </span>
                    ) : (
                      'Şirketi Kaydet'
                    )}
                  </button>
                </div>
              </form>
              
              <div className="mt-8 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bilgilendirme
                </h4>
                <p className="text-sm text-amber-700 mb-2">
                  Şirket ekleme işlemi için aşağıdaki bilgilerin doğru ve eksiksiz girilmesi gerekmektedir:
                </p>
                <ul className="list-disc pl-5 text-sm text-amber-700">
                  <li>Vergi Kimlik Numarası (VKN) sistem içinde benzersiz olmalıdır</li>
                  <li>Şirket unvanı (Ad ve Soyad/Unvan) resmî belgelerdeki gibi girilmelidir</li>
                  <li>Ticaret Sicil No doğru formatta yazılmalıdır</li>
                  <li>Sektör bilgileri şirketin risk analizinde kullanılacaktır</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
          
          <div className="relative bg-white rounded-2xl max-w-5xl w-full mx-4 md:mx-auto overflow-hidden shadow-2xl transform transition-all">
            <div className="absolute top-0 right-0 pt-6 pr-6 z-10">
              <button
                type="button"
                className="bg-white rounded-full p-2 text-gray-400 hover:text-gray-500 focus:outline-none shadow-md"
                onClick={() => setShowDeleteModal(false)}
              >
                <span className="sr-only">Kapat</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
              <h3 className="text-3xl font-bold text-white flex items-center" id="modal-title">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Şirket Silme
              </h3>
              <p className="text-blue-100 mt-2">Şirketi silmek istediğinize emin misiniz?</p>
            </div>
              
            <div className="p-8 max-h-[70vh] overflow-y-auto">
              {companyToDelete && (
                <div className="space-y-6">
                  {/* Şirket Bilgileri */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Silinecek Şirket
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Şirket Adı</label>
                        <p className="text-lg font-semibold text-gray-900">{companyToDelete.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">VKN</label>
                        <p className="text-lg font-mono text-gray-900">{companyToDelete.tax_number}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">E-Posta</label>
                        <p className="text-lg text-gray-900">{companyToDelete.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sektör</label>
                        <p className="text-lg text-gray-900">{getSectorDisplayName(companyToDelete.industry)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bağlı Bilançolar Uyarısı */}
                  {deleteCheckResult && deleteCheckResult.can_delete === false && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                      <h4 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Uyarı: Bağlı Bilançolar Bulundu
                      </h4>
                      
                      <p className="text-red-700 mb-4">{deleteCheckResult.message}</p>
                      
                      <div className="bg-white rounded-lg p-4">
                        <h5 className="font-medium text-red-800 mb-3">Bağlı Bilançolar ({deleteCheckResult.related_balance_sheets?.length || 0} adet):</h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {deleteCheckResult.related_balance_sheets?.map((balanceSheet, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded border">
                              <div>
                                <span className="font-medium">{balanceSheet.year} - {balanceSheet.period}</span>
                                {balanceSheet.pdf_filename && (
                                  <span className="text-sm text-gray-600 ml-2">({balanceSheet.pdf_filename})</span>
                                )}
                              </div>
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                {balanceSheet.analysis_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                        <p className="text-yellow-800 text-sm font-medium">
                          ⚠️ {deleteCheckResult.warning}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Silme Onayı */}
                  {(!deleteCheckResult || deleteCheckResult.can_delete !== false) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                      <h4 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Silme Onayı
                      </h4>
                      
                      <p className="text-yellow-700 mb-4">
                        Bu şirketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Butonlar */}
              <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-200 space-x-4">
                <button
                  type="button"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCompanyToDelete(null);
                    setDeleteCheckResult(null);
                  }}
                >
                  İptal
                </button>
                
                {deleteCheckResult && deleteCheckResult.can_delete === false ? (
                  <button
                    type="button"
                    onClick={handleForceDeleteCompany}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Siliniyor...
                      </span>
                    ) : (
                      'Yine de Sil (Tüm Verilerle)'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteCompany}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Siliniyor...
                      </span>
                    ) : (
                      'Şirketi Sil'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies; 