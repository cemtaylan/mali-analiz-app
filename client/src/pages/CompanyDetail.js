import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CompanyAPI } from '../api';
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

// NACE kodları lookup
const getActivityCategoryName = (code) => {
  const activityCategories = {
    'A': 'A - TARIM, ORMANCILIK VE BALIKÇILIK',
    'B': 'B - MADENCİLİK VE TAŞ OCAKLARI',
    'C': 'C - İMALAT',
    'D': 'D - ELEKTRİK, GAZ, BUHAR VE İKLİMLENDİRME ÜRETİMİ VE DAĞITIMI',
    'E': 'E - SU TEMİNİ; KANALİZASYON, ATIK YÖNETİMİ VE İYİLEŞTİRME FAALİYETLERİ',
    'F': 'F - İNŞAAT',
    'G': 'G - TOPTAN VE PERAKENDE TİCARET',
    'H': 'H - ULAŞTIRMA VE DEPOLAMA',
    'I': 'I - KONAKLAMA VE YİYECEK HİZMETİ FAALİYETLERİ',
    'J': 'J - BİLGİ VE İLETİŞİM',
    'K': 'K - FİNANS VE SİGORTA FAALİYETLERİ',
    'L': 'L - GAYRİMENKUL FAALİYETLERİ',
    'M': 'M - MESLEKİ, BİLİMSEL VE TEKNİK FAALİYETLER',
    'N': 'N - İDARİ VE DESTEK HİZMETİ FAALİYETLERİ',
    'O': 'O - KAMU YÖNETİMİ VE SAVUNMA',
    'P': 'P - EĞİTİM',
    'Q': 'Q - İNSAN SAĞLIĞI VE SOSYAL HİZMET FAALİYETLERİ',
    'R': 'R - KÜLTÜR, SANAT, EĞLENCE, DİNLENCE VE SPOR',
    'S': 'S - DİĞER HİZMET FAALİYETLERİ',
    'T': 'T - HANE HALKI',
    'U': 'U - ULUSLARARASI KURULUŞLAR VE TEMSİLCİLİKLERİ'
  };
  return activityCategories[code] || code;
};

const CompanyDetail = () => {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [balanceSheets, setBalanceSheets] = useState([]);
  const [companySummary, setCompanySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      
      // Paralel API çağrıları
      const [companyData, balanceSheetsData, summaryData] = await Promise.all([
        CompanyAPI.getCompanyById(id),
        CompanyAPI.getCompanyBalanceSheets(id),
        CompanyAPI.getCompanySummary(id)
      ]);
      
      console.log('Şirket detayı alındı:', companyData);
      console.log('Bilanço geçmişi alındı:', balanceSheetsData);
      console.log('Özet bilgiler alındı:', summaryData);
      
      setCompany(companyData);
      setBalanceSheets(balanceSheetsData);
      setCompanySummary(summaryData);
      setLoading(false);
    } catch (error) {
      console.error('Şirket detayları yüklenirken hata:', error);
      setLoading(false);
    }
  };

  // En güncel bilanço ID'sini bul
  const getLatestBalanceSheetId = () => {
    if (!balanceSheets || balanceSheets.length === 0) {
      return null;
    }
    
    // Bilançoları yıl ve döneme göre sırala (en güncel önce)
    const sortedSheets = balanceSheets.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      
      const periodOrder = { 'YILLIK': 5, 'Q4': 4, 'Q3': 3, 'Q2': 2, 'Q1': 1 };
      return (periodOrder[b.period] || 0) - (periodOrder[a.period] || 0);
    });
    
    return sortedSheets[0].id;
  };

  // Finansal rapor sayfasına git
  const handleFinancialReport = () => {
    const latestBalanceSheetId = getLatestBalanceSheetId();
    
    if (latestBalanceSheetId) {
      setShowQuickActions(false);
      navigate(`/balance-sheets/${latestBalanceSheetId}/analysis`);
    } else {
      setShowQuickActions(false);
      setAlertConfig({
        isOpen: true,
        type: 'warning',
        title: 'Finansal Analiz Yapılamıyor',
        message: 'Bu şirket için henüz finansal analiz yapılabilecek bilanço bulunmamaktadır. Lütfen önce bilanço ekleyin.',
        confirmText: 'Bilanço Ekle',
        cancelText: 'Tamam',
        showCancel: true,
        onConfirm: () => {
          setAlertConfig({ isOpen: false });
          navigate('/balance-sheets/new');
        },
        onClose: () => setAlertConfig({ isOpen: false })
      });
    }
  };

  // Hızlı işlemler
  const quickActions = [
    {
      name: 'Yeni Bilanço Ekle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: () => navigate('/balance-sheets/new'),
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      name: 'PDF Yükle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      action: () => navigate('/balance-sheets'),
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Finansal Rapor',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      action: handleFinancialReport,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'Şirket Düzenle',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      action: () => setAlertConfig({
        isOpen: true,
        type: 'info',
        title: 'Yakında Gelecek',
        message: 'Şirket düzenleme özelliği yakında eklenecek.',
        onClose: () => setAlertConfig({ isOpen: false })
      }),
      color: 'bg-amber-600 hover:bg-amber-700'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
        <p className="font-bold">Uyarı</p>
        <p>Şirket bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/companies" className="mr-4 p-3 rounded-xl bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="text-blue-100 mt-1">VKN: {company.tax_number} | Şirket Detay Sayfası</p>
            </div>
          </div>

          {/* Hızlı İşlemler Butonu */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="inline-flex items-center px-6 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-sm font-medium text-white hover:bg-opacity-30 transition-all duration-200"
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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mr-3 text-white`}>
                        {action.icon}
                      </div>
                      {action.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Old Header - Hidden */}
      <div className="mb-6" style={{display: 'none'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link to="/companies" className="mr-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
        </Link>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-sm text-gray-600">VKN: {company.tax_number}</p>
            </div>
          </div>

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
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mr-3 text-white`}>
                        {action.icon}
                      </div>
                      {action.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ana Bilgiler */}
        <div className="lg:col-span-2 space-y-6">
          {/* Genel Bilgiler */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-blue-600 flex items-center">
              <svg className="w-6 h-6 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Genel Bilgiler</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vergi Kimlik No</p>
                    <p className="text-gray-900 font-mono">{company.tax_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ticaret Sicil No</p>
                    <p className="text-gray-900">{company.trade_registry_number || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">E-posta</p>
                    <p className="text-gray-900">{company.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <p className="text-gray-900">{company.phone || 'Belirtilmemiş'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kuruluş Tarihi</p>
                    <p className="text-gray-900">{formatDateDDMMYYYY(company.establishment_date) || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Adres</p>
                <p className="text-gray-900">{company.address}</p>
              </div>
            </div>
          </div>

          {/* Faaliyet Konusu */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-purple-600 flex items-center">
              <svg className="w-6 h-6 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h4a2 2 0 002-2V4h-8zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Faaliyet Konusu</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ana Faaliyet Alanı (NACE)</p>
                  <p className="text-gray-900">{getActivityCategoryName(company.activity_main_category)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Alt Faaliyet Dalı</p>
                  <p className="text-gray-900">{company.activity_subcategory ? `${company.activity_subcategory} - Motorlu kara taşıtları, treyler ve yarı treyler imalatı` : 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Faaliyet Detayları</p>
                  <p className="text-gray-900">{company.activity_notes || 'Belirtilmemiş'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ana Ortaklar */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-green-600 flex items-center">
              <svg className="w-6 h-6 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Ana Ortaklar ve Paylaşım</h2>
            </div>
            <div className="p-6">
              {company.partners && company.partners.length > 0 ? (
                <div className="space-y-3">
                  {company.partners.map((partner, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-gray-900 font-medium">{partner.name}</span>
                      </div>
                      <span className="text-green-700 font-semibold">%{partner.share_percentage || partner.sharePercentage}</span>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Toplam Pay:</strong> %{company.partners.reduce((total, partner) => total + parseFloat(partner.share_percentage || partner.sharePercentage || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Ortak bilgisi bulunmamaktadır.</p>
              )}
            </div>
          </div>

          {/* Sektör Bilgileri */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-indigo-600 flex items-center">
              <svg className="w-6 h-6 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-semibold text-white">Sektör Bilgileri</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Sektör Büyüklüğü ve Dinamikleri</p>
                  <p className="text-gray-900">{company.sector_size_dynamics || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Rekabet Ortamı ve Pazar Payı</p>
                  <p className="text-gray-900">{company.competitive_position_market_share || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gelir Maliyetleri ve Uyum</p>
                  <p className="text-gray-900">{company.income_expenses_tax_compliance || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Düzenleme Denetim ve İzleme</p>
                  <p className="text-gray-900">{company.regulation_monitoring || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Ek Sektör Notları</p>
                  <p className="text-gray-900">{company.sector_notes || 'Belirtilmemiş'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Yan Panel */}
        <div className="space-y-6">
          {/* Özet Bilgiler */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Özet</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-900">Aktif Bilançolar</span>
                <span className="text-lg font-bold text-blue-600">{companySummary?.statistics?.total_balance_sheets || balanceSheets.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-900">Toplam Ortak</span>
                <span className="text-lg font-bold text-green-600">{company?.partners?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-900">NACE Kodu</span>
                <span className="text-lg font-bold text-purple-600">{company?.activity_main_category || '-'}</span>
              </div>
              {companySummary?.statistics?.analysis_period && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm font-medium text-amber-900">Analiz Dönemi</span>
                  <span className="text-lg font-bold text-amber-600">{companySummary.statistics.analysis_period}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bilanço Geçmişi */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-amber-600 flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Bilanço Geçmişi</h3>
              </div>
              <span className="text-white text-sm">{balanceSheets.length} kayıt</span>
            </div>
            <div className="p-6">
              {balanceSheets.length > 0 ? (
                <div className="space-y-3">
                  {balanceSheets.map((sheet, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{sheet.year} - {sheet.period}</p>
                        <p className="text-sm text-gray-500">{formatDateDDMMYYYY(sheet.creation_date)}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          sheet.analysis_status === 'completed' || sheet.status === 'Onaylandı'
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sheet.analysis_status === 'completed' ? 'Tamamlandı' : (sheet.status || 'İşleniyor')}
                        </span>
                        <Link 
                          to={`/balance-sheets/${sheet.id}`}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Detay"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Henüz bilanço yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern Alert */}
      <ModernAlert {...alertConfig} />
    </div>
  );
};

export default CompanyDetail; 