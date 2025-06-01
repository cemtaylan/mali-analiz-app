const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Geçici dosya depolama için multer ayarları
const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite veritabanı bağlantısı
const dbPath = path.join(__dirname, 'mali_analiz.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err.message);
  } else {
    console.log('SQLite veritabanına bağlanıldı:', dbPath);
    initializeDatabase();
  }
});

// Veritabanı tablolarını oluştur
function initializeDatabase() {
  // Şirketler tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tax_number TEXT UNIQUE NOT NULL,
      email TEXT,
      trade_registry_number TEXT,
      address TEXT,
      industry TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      phone TEXT,
      establishment_date TEXT,
      activity_main_category TEXT,
      activity_subcategory TEXT,
      activity_notes TEXT,
      sector_size_dynamics TEXT,
      competitive_position_market_share TEXT,
      income_expenses_tax_compliance TEXT,
      regulation_monitoring TEXT,
      sector_notes TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Şirketler tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Şirketler tablosu hazır');
      addDemoCompanies();
    }
  });

  // Bilançolar tablosu (güncellenmiş)
  db.run(`
    CREATE TABLE IF NOT EXISTS balance_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      company_name TEXT NOT NULL,
      tax_number TEXT,
      year INTEGER NOT NULL,
      period TEXT NOT NULL,
      creation_date DATE DEFAULT CURRENT_DATE,
      pdf_filename TEXT,
      notes TEXT,
      raw_pdf_data TEXT,
      analysis_status TEXT DEFAULT 'pending',
      inflation_adjusted BOOLEAN DEFAULT 0,
      currency TEXT DEFAULT 'TL',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id)
    )
  `, (err) => {
    if (err) {
      console.error('Bilançolar tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Bilançolar tablosu hazır');
    }
  });

  // Bilanço kalemleri tablosu - PDF'den okunan tüm hesap kalemleri
  db.run(`
    CREATE TABLE IF NOT EXISTS balance_sheet_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance_sheet_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      account_code TEXT,
      account_name TEXT NOT NULL,
      account_category TEXT,
      account_type TEXT CHECK(account_type IN ('active', 'passive')),
      current_year_amount DECIMAL(15,2) DEFAULT 0,
      previous_year_amount DECIMAL(15,2) DEFAULT 0,
      inflation_adjusted_amount DECIMAL(15,2) DEFAULT 0,
      year INTEGER NOT NULL,
      period TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (balance_sheet_id) REFERENCES balance_sheets (id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies (id)
    )
  `, (err) => {
    if (err) {
      console.error('Bilanço kalemleri tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Bilanço kalemleri tablosu hazır');
    }
  });

  // Finansal oranlar tablosu - Hesaplanmış finansal analizler
  db.run(`
    CREATE TABLE IF NOT EXISTS financial_ratios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      balance_sheet_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      
      -- Likidite Oranları
      current_ratio DECIMAL(10,4),              -- Cari Oran
      quick_ratio DECIMAL(10,4),                -- Asit-Test Oranı
      cash_ratio DECIMAL(10,4),                 -- Nakit Oranı
      
      -- Finansal Yapı Oranları
      debt_to_equity_ratio DECIMAL(10,4),       -- Borç/Özkaynak Oranı
      debt_to_assets_ratio DECIMAL(10,4),       -- Borç/Varlık Oranı
      equity_ratio DECIMAL(10,4),               -- Özkaynak Oranı
      long_term_debt_ratio DECIMAL(10,4),       -- Uzun Vadeli Borç Oranı
      
      -- Faaliyet Oranları
      inventory_turnover DECIMAL(10,4),         -- Stok Devir Hızı
      receivables_turnover DECIMAL(10,4),       -- Alacak Devir Hızı
      asset_turnover DECIMAL(10,4),             -- Aktif Devir Hızı
      
      -- Karlılık Oranları
      gross_profit_margin DECIMAL(10,4),        -- Brüt Kar Marjı
      net_profit_margin DECIMAL(10,4),          -- Net Kar Marjı
      roa DECIMAL(10,4),                        -- Aktif Karlılığı
      roe DECIMAL(10,4),                        -- Özkaynak Karlılığı
      
      -- Büyüme Oranları
      revenue_growth DECIMAL(10,4),             -- Gelir Büyümesi
      asset_growth DECIMAL(10,4),               -- Varlık Büyümesi
      equity_growth DECIMAL(10,4),              -- Özkaynak Büyümesi
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id),
      FOREIGN KEY (balance_sheet_id) REFERENCES balance_sheets (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Finansal oranlar tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Finansal oranlar tablosu hazır');
    }
  });

  // Analiz raporları tablosu - Detaylı analiz sonuçları
  db.run(`
    CREATE TABLE IF NOT EXISTS analysis_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      balance_sheet_id INTEGER NOT NULL,
      report_type TEXT NOT NULL,               -- 'single_year', 'comparison', 'trend'
      year_from INTEGER,
      year_to INTEGER,
      
      -- Analiz Sonuçları
      financial_strength_score DECIMAL(5,2),   -- Mali Güç Skoru (0-100)
      liquidity_assessment TEXT,               -- Likidite Değerlendirmesi
      solvency_assessment TEXT,                -- Ödeme Gücü Değerlendirmesi
      profitability_assessment TEXT,           -- Karlılık Değerlendirmesi
      efficiency_assessment TEXT,              -- Verimlilik Değerlendirmesi
      
      -- Risk Analizi
      bankruptcy_risk_score DECIMAL(5,2),      -- İflas Riski Skoru
      credit_risk_assessment TEXT,             -- Kredi Riski Değerlendirmesi
      investment_risk_level TEXT,              -- Yatırım Riski Seviyesi
      
      -- Genel Değerlendirme
      overall_assessment TEXT,                 -- Genel Değerlendirme
      recommendations TEXT,                    -- Öneriler
      strengths TEXT,                          -- Güçlü Yönler
      weaknesses TEXT,                         -- Zayıf Yönler
      
      analyst_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id),
      FOREIGN KEY (balance_sheet_id) REFERENCES balance_sheets (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Analiz raporları tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Analiz raporları tablosu hazır');
    }
  });

  // Karşılaştırmalı analizler tablosu - Şirketler arası ve yıllar arası karşılaştırma
  db.run(`
    CREATE TABLE IF NOT EXISTS comparative_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_type TEXT NOT NULL,             -- 'company_comparison', 'year_comparison', 'industry_benchmark'
      
      -- Karşılaştırılan Şirketler/Yıllar
      primary_company_id INTEGER NOT NULL,
      secondary_company_id INTEGER,
      primary_year INTEGER NOT NULL,
      secondary_year INTEGER,
      
      -- Karşılaştırma Kriterleri
      comparison_criteria TEXT,                -- JSON format
      
      -- Sonuçlar
      performance_comparison TEXT,             -- Performans Karşılaştırması
      ratio_comparison TEXT,                   -- Oran Karşılaştırması
      trend_analysis TEXT,                     -- Trend Analizi
      competitive_position TEXT,               -- Rekabet Konumu
      
      -- Skorlama
      relative_performance_score DECIMAL(5,2), -- Göreceli Performans Skoru
      market_position_rank INTEGER,           -- Pazar Konumu Sıralaması
      
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (primary_company_id) REFERENCES companies (id),
      FOREIGN KEY (secondary_company_id) REFERENCES companies (id)
    )
  `, (err) => {
    if (err) {
      console.error('Karşılaştırmalı analizler tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Karşılaştırmalı analizler tablosu hazır');
    }
  });

  // Hesap planı kategorileri tablosu - Dinamik hesap planı yönetimi
  db.run(`
    CREATE TABLE IF NOT EXISTS account_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT CHECK(account_type IN ('active', 'passive')),
      parent_id INTEGER,
      level INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      is_summary BOOLEAN DEFAULT 0,           -- Toplam hesabı mı?
      is_active BOOLEAN DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES account_categories (id)
    )
  `, (err) => {
    if (err) {
      console.error('Hesap kategorileri tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Hesap kategorileri tablosu hazır');
      populateAccountCategories();
    }
  });

  // Sektör benchmarkları tablosu - Sektörel karşılaştırma verileri
  db.run(`
    CREATE TABLE IF NOT EXISTS industry_benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      industry_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      company_size TEXT,                       -- 'small', 'medium', 'large'
      
      -- Ortalama Oranlar
      avg_current_ratio DECIMAL(10,4),
      avg_quick_ratio DECIMAL(10,4),
      avg_debt_to_equity DECIMAL(10,4),
      avg_debt_to_assets DECIMAL(10,4),
      avg_roa DECIMAL(10,4),
      avg_roe DECIMAL(10,4),
      avg_profit_margin DECIMAL(10,4),
      
      -- Quartile Değerleri
      q1_current_ratio DECIMAL(10,4),
      q3_current_ratio DECIMAL(10,4),
      median_current_ratio DECIMAL(10,4),
      
      data_source TEXT,
      sample_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Sektör benchmarkları tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Sektör benchmarkları tablosu hazır');
    }
  });

  // Şirket ortakları tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS company_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      share_percentage DECIMAL(5,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Şirket ortakları tablosu oluşturma hatası:', err.message);
    } else {
      console.log('Şirket ortakları tablosu hazır');
    }
  });
}

// Demo şirketleri ekle
function addDemoCompanies() {
  const demoCompanies = [
    {
      name: 'ABC Şirketi',
      tax_number: '1234567890',
      email: 'info@abc.com',
      trade_registry_number: '',
      address: 'İstanbul',
      industry: 'Teknoloji'
    },
    {
      name: 'XYZ Holding',
      tax_number: '0987654321',
      email: 'contact@xyz.com',
      trade_registry_number: '',
      address: 'Ankara',
      industry: 'Finans'
    },
    {
      name: 'MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.',
      tax_number: '6140087281',
      email: 'info@memsan.com',
      trade_registry_number: '',
      address: 'İzmir',
      industry: 'İmalat'
    }
  ];

  demoCompanies.forEach(company => {
    db.get('SELECT id FROM companies WHERE tax_number = ?', [company.tax_number], (err, row) => {
      if (err) {
        console.error('Demo şirket kontrol hatası:', err.message);
      } else if (!row) {
        db.run(`
          INSERT INTO companies (name, tax_number, email, trade_registry_number, address, industry)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [company.name, company.tax_number, company.email, company.trade_registry_number, company.address, company.industry], 
        function(err) {
          if (err) {
            console.error('Demo şirket ekleme hatası:', err.message);
          } else {
            console.log(`Demo şirket eklendi: ${company.name} (ID: ${this.lastID})`);
          }
        });
      }
    });
  });
}

// Hesap planı kategorilerini veritabanına ekle
function populateAccountCategories() {
  // Önce account_categories tablosunun boş olup olmadığını kontrol et
  db.get('SELECT COUNT(*) as count FROM account_categories', (err, result) => {
    if (err) {
      console.error('Hesap kategorileri kontrol hatası:', err.message);
      return;
    }
    
    // Eğer zaten veri varsa, ekleme yapma
    if (result.count > 0) {
      console.log('Hesap planı kategorileri zaten mevcut');
      return;
    }

    console.log('Hesap planı kategorileri ekleniyor...');
    
    // Mevcut accountCategories array'ini veritabanına aktar
    accountCategories.forEach((category, index) => {
      db.run(`
        INSERT INTO account_categories (id, code, name, account_type, parent_id, level, display_order, is_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        category.id,
        category.code,
        category.name,
        category.type,
        category.parent_id,
        category.code ? category.code.split('.').length - 1 : 0,
        index + 1,
        category.parent_id ? 0 : 1  // Ana kategoriler summary olarak işaretlenir
      ], function(err) {
        if (err) {
          console.error(`Hesap kategorisi ekleme hatası (${category.code}):`, err.message);
        }
      });
    });
    
    console.log('Hesap planı kategorileri başarıyla eklendi');
  });
}

// API anahtarını çevre değişkenlerinden al veya doğrudan belirt
const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyDSBcGBvoH-lccVLydygux-sjSGcKWn4jw";
const genAI = new GoogleGenerativeAI(API_KEY);

// Hesap planı verileri - Gerçek Tek Düzen Hesap Planı
const accountCategories = [
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
  { id: 1020, name: '1-ALICILAR', code: 'A.1.3.1', type: 'active', parent_id: 102 },
  { id: 1021, name: '2-ALACAK SENETLERİ', code: 'A.1.3.2', type: 'active', parent_id: 102 },
  { id: 1022, name: '3-ALACAK SENETLERİ REESKONTU (-)', code: 'A.1.3.3', type: 'active', parent_id: 102 },
  { id: 1023, name: '4-KAZANILMAMIŞ FİNANSMAN GELİRLERİ (-)', code: 'A.1.3.4', type: 'active', parent_id: 102 },
  { id: 1024, name: '5-VERİLEN DEPOZİTO VE TEMİNATLAR', code: 'A.1.3.5', type: 'active', parent_id: 102 },
  { id: 1025, name: '6-DİĞER TİCARİ ALACAKLAR', code: 'A.1.3.6', type: 'active', parent_id: 102 },
  { id: 1026, name: '7-ŞÜPHELİ TİCARİ ALACAKLAR', code: 'A.1.3.7', type: 'active', parent_id: 102 },
  { id: 1027, name: '8-ŞÜPHELİ TİCARİ ALACAKLAR KARŞILIĞI (-)', code: 'A.1.3.8', type: 'active', parent_id: 102 },
  
  // D-DİĞER ALACAKLAR detayları
  { id: 1030, name: '1-ORTAKLARDAN ALACAKLAR', code: 'A.1.4.1', type: 'active', parent_id: 103 },
  { id: 1031, name: '2-İŞTİRAKLERDEN ALACAKLAR', code: 'A.1.4.2', type: 'active', parent_id: 103 },
  { id: 1032, name: '3-BAĞLI ORTAKLIKLARDAN ALACAKLAR', code: 'A.1.4.3', type: 'active', parent_id: 103 },
  { id: 1033, name: '4-PERSONELDEN ALACAKLAR', code: 'A.1.4.4', type: 'active', parent_id: 103 },
  { id: 1034, name: '5-DİĞER ÇEŞİTLİ ALACAKLAR', code: 'A.1.4.5', type: 'active', parent_id: 103 },
  { id: 1035, name: '6-DİĞER ALACAK SENETLERİ REESKONTU (-)', code: 'A.1.4.6', type: 'active', parent_id: 103 },
  { id: 1036, name: '7-ŞÜPHELİ DİĞER ALACAKLAR', code: 'A.1.4.7', type: 'active', parent_id: 103 },
  { id: 1037, name: '8-ŞÜPHELİ DİĞER ALACAKLAR KARŞILIĞI (-)', code: 'A.1.4.8', type: 'active', parent_id: 103 },
  
  // E-STOKLAR detayları
  { id: 1040, name: '1-İLK MADDE VE MALZEME', code: 'A.1.5.1', type: 'active', parent_id: 104 },
  { id: 1041, name: '2-YARI MAMULLER - ÜRETİM', code: 'A.1.5.2', type: 'active', parent_id: 104 },
  { id: 1042, name: '3-MAMULLER', code: 'A.1.5.3', type: 'active', parent_id: 104 },
  { id: 1043, name: '4-TİCARİ MALLAR', code: 'A.1.5.4', type: 'active', parent_id: 104 },
  { id: 1044, name: '5-DİĞER STOKLAR', code: 'A.1.5.5', type: 'active', parent_id: 104 },
  { id: 1045, name: '6-STOK DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.1.5.6', type: 'active', parent_id: 104 },
  { id: 1046, name: '7-VERİLEN SİPARİŞ AVANSLARI', code: 'A.1.5.7', type: 'active', parent_id: 104 },
  
  // II-DURAN VARLIKLAR alt grupları
  { id: 200, name: 'A-TİCARİ ALACAKLAR', code: 'A.2.1', type: 'active', parent_id: 20 },
  { id: 201, name: 'B-DİĞER ALACAKLAR', code: 'A.2.2', type: 'active', parent_id: 20 },
  { id: 202, name: 'C-MALİ DURAN VARLIKLAR', code: 'A.2.3', type: 'active', parent_id: 20 },
  { id: 204, name: 'D-MADDİ DURAN VARLIKLAR', code: 'A.2.4', type: 'active', parent_id: 20 },
  { id: 205, name: 'E-MADDİ OLMAYAN DURAN VARLIKLAR', code: 'A.2.5', type: 'active', parent_id: 20 },
  { id: 206, name: 'F-ÖZEL TÜKENMEKTE TABİ VARLIKLAR', code: 'A.2.6', type: 'active', parent_id: 20 },
  { id: 207, name: 'G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI', code: 'A.2.7', type: 'active', parent_id: 20 },
  { id: 208, name: 'H-DİĞER DURAN VARLIKLAR', code: 'A.2.8', type: 'active', parent_id: 20 },
  
  // A-TİCARİ ALACAKLAR (Duran Varlık) detayları
  { id: 2000, name: '1-ALICILAR', code: 'A.2.1.1', type: 'active', parent_id: 200 },
  { id: 2001, name: '2-ALACAK SENETLERİ', code: 'A.2.1.2', type: 'active', parent_id: 200 },
  { id: 2002, name: '3-ALACAK SENETLERİ REESKONTU (-)', code: 'A.2.1.3', type: 'active', parent_id: 200 },
  { id: 2003, name: '4-KAZANILMAMIŞ FİNANSAL KİRALAMA FAİZ GELİRLERİ (-)', code: 'A.2.1.4', type: 'active', parent_id: 200 },
  { id: 2004, name: '5-VERİLEN DEPOZİTO VE TEMİNATLAR', code: 'A.2.1.5', type: 'active', parent_id: 200 },
  { id: 2005, name: '6-ŞÜPHELİ ALACAKLAR KARŞILIĞI (-)', code: 'A.2.1.6', type: 'active', parent_id: 200 },
  
  // B-DİĞER ALACAKLAR (Duran Varlık) detayları
  { id: 2010, name: '1-ORTAKLARDAN ALACAKLAR', code: 'A.2.2.1', type: 'active', parent_id: 201 },
  { id: 2011, name: '2-İŞTİRAKLERDEN ALACAKLAR', code: 'A.2.2.2', type: 'active', parent_id: 201 },
  { id: 2012, name: '3-BAĞLI ORTAKLIKLARDAN ALACAKLAR', code: 'A.2.2.3', type: 'active', parent_id: 201 },
  { id: 2013, name: '4-PERSONELDEN ALACAKLAR', code: 'A.2.2.4', type: 'active', parent_id: 201 },
  { id: 2014, name: '5-DİĞER ÇEŞİTLİ ALACAKLAR', code: 'A.2.2.5', type: 'active', parent_id: 201 },
  { id: 2015, name: '6-DİĞER ALACAK SENETLERİ REESKONTU (-)', code: 'A.2.2.6', type: 'active', parent_id: 201 },
  { id: 2016, name: '7-ŞÜPHELİ DİĞER ALACAKLAR KARŞILIĞI (-)', code: 'A.2.2.7', type: 'active', parent_id: 201 },
  
  // C-MALİ DURAN VARLIKLAR detayları
  { id: 2020, name: '1-BAĞLI MENKUL KIYMETLER', code: 'A.2.3.1', type: 'active', parent_id: 202 },
  { id: 2021, name: '2-BAĞLI MENKUL KIYMETLER DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.2', type: 'active', parent_id: 202 },
  { id: 2022, name: '3-İŞTİRAKLER', code: 'A.2.3.3', type: 'active', parent_id: 202 },
  { id: 2023, name: '4-İŞTİRAKLER SERMAYE TAAHHÜTLERİ (-)', code: 'A.2.3.4', type: 'active', parent_id: 202 },
  { id: 2024, name: '5-İŞTİRAKLER SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.5', type: 'active', parent_id: 202 },
  { id: 2025, name: '6-BAĞLI ORTAKLIKLAR', code: 'A.2.3.6', type: 'active', parent_id: 202 },
  { id: 2026, name: '7-BAĞLI ORTAKLIKLARA SERMAYE TAAHHÜTLERİ (-)', code: 'A.2.3.7', type: 'active', parent_id: 202 },
  { id: 2027, name: '8-BAĞLI ORTAKLIKLAR SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.8', type: 'active', parent_id: 202 },
  { id: 2028, name: '9-DİĞER MALİ DURAN VARLIKLAR', code: 'A.2.3.9', type: 'active', parent_id: 202 },
  { id: 2029, name: '10-DİĞER MALİ DURAN VARLIKLAR KARŞILIĞI (-)', code: 'A.2.3.10', type: 'active', parent_id: 202 },
  
  // D-MADDİ DURAN VARLIKLAR detayları
  { id: 2040, name: '1-ARAZİ VE ARSALAR', code: 'A.2.4.1', type: 'active', parent_id: 204 },
  { id: 2041, name: '2-YERALTINA VE YER ÜSTÜ DÜZENLEMELER', code: 'A.2.4.2', type: 'active', parent_id: 204 },
  { id: 2042, name: '3-BİNALAR', code: 'A.2.4.3', type: 'active', parent_id: 204 },
  { id: 2043, name: '4-TESİS, MAKİNE VE CİHAZLAR', code: 'A.2.4.4', type: 'active', parent_id: 204 },
  { id: 2044, name: '5-TAŞITLAR', code: 'A.2.4.5', type: 'active', parent_id: 204 },
  { id: 2045, name: '6-DEMİRBAŞLAR', code: 'A.2.4.6', type: 'active', parent_id: 204 },
  { id: 2046, name: '7-DİĞER MADDİ DURAN VARLIKLAR', code: 'A.2.4.7', type: 'active', parent_id: 204 },
  { id: 2047, name: '8-BİRİKMİŞ AMORTİSMANLAR (-)', code: 'A.2.4.8', type: 'active', parent_id: 204 },
  { id: 2048, name: '9-YAPILMAKTA OLAN YATIRIMLAR', code: 'A.2.4.9', type: 'active', parent_id: 204 },
  { id: 2049, name: '10-VERİLEN AVANSLAR', code: 'A.2.4.10', type: 'active', parent_id: 204 },

  // E-MADDİ OLMAYAN DURAN VARLIKLAR detayları
  { id: 2050, name: '1-HAKLAR', code: 'A.2.5.1', type: 'active', parent_id: 205 },
  { id: 2051, name: '2-ŞEREFİYE', code: 'A.2.5.2', type: 'active', parent_id: 205 },
  { id: 2052, name: '3-KURULUŞ VE ÖRGÜTLENME GİDERLERİ', code: 'A.2.5.3', type: 'active', parent_id: 205 },
  { id: 2053, name: '4-ARAŞTIRMA VE GELİŞTİRME GİDERLERİ', code: 'A.2.5.4', type: 'active', parent_id: 205 },
  { id: 2054, name: '5-ÖZEL MALİYETLER', code: 'A.2.5.5', type: 'active', parent_id: 205 },
  { id: 2055, name: '6-DİĞER MADDİ OLMAYAN DURAN VARLIKLAR', code: 'A.2.5.6', type: 'active', parent_id: 205 },
  { id: 2056, name: '7-BİRİKMİŞ AMORTİSMANLAR (-)', code: 'A.2.5.7', type: 'active', parent_id: 205 },
  { id: 2057, name: '8-VERİLEN AVANSLAR', code: 'A.2.5.8', type: 'active', parent_id: 205 },
  
  // F-ÖZEL TÜKENMEKTE TABİİ VARLIKLAR detayları
  { id: 2060, name: '1-ARAMA GİDERLERİ', code: 'A.2.6.1', type: 'active', parent_id: 206 },
  { id: 2061, name: '2-HAZIRLIK VE GELİŞTİRME GİDERLERİ', code: 'A.2.6.2', type: 'active', parent_id: 206 },
  { id: 2062, name: '3-DİĞER ÖZEL TÜKENMEKTE TABİ VARLIKLAR', code: 'A.2.6.3', type: 'active', parent_id: 206 },
  { id: 2063, name: '4-BİRİKMİŞ TÜKENME PAYLARI (-)', code: 'A.2.6.4', type: 'active', parent_id: 206 },
  { id: 2064, name: '5-VERİLEN AVANSLAR', code: 'A.2.6.5', type: 'active', parent_id: 206 },
  
  // G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI detayları
  { id: 2070, name: '1-GELECEK YILLARA AİT GİDERLER', code: 'A.2.7.1', type: 'active', parent_id: 207 },
  { id: 2071, name: '2-GELİR TAHAKKUKLARI', code: 'A.2.7.2', type: 'active', parent_id: 207 },
  
  // H-DİĞER DURAN VARLIKLAR detayları
  { id: 2080, name: '1-GELECEK YILLARDA İNDİRİLECEK KATMA DEĞER VERGİSİ', code: 'A.2.8.1', type: 'active', parent_id: 208 },
  { id: 2081, name: '2-DİĞER KATMA DEĞER VERGİSİ', code: 'A.2.8.2', type: 'active', parent_id: 208 },
  { id: 2082, name: '3-GELECEK YILLAR İHTİYACI STOKLAR', code: 'A.2.8.3', type: 'active', parent_id: 208 },
  { id: 2083, name: '4-ELDEN ÇIKARILANACAK STOKLAR VE MADDİ DURAN VARLIKLAR', code: 'A.2.8.4', type: 'active', parent_id: 208 },
  { id: 2084, name: '5-PEŞİN ÖDENEN VERGİLER VE FONLAR', code: 'A.2.8.5', type: 'active', parent_id: 208 },
  { id: 2085, name: '6-GEÇİCİ HESAP', code: 'A.2.8.6', type: 'active', parent_id: 208 },
  { id: 2086, name: '7-DİĞER ÇEŞİTLİ DURAN VARLIKLAR', code: 'A.2.8.7', type: 'active', parent_id: 208 },
  { id: 2087, name: '8-STOK DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.8.8', type: 'active', parent_id: 208 },
  { id: 2088, name: '9-BİRİKMİŞ AMORTİSMANLAR (-)', code: 'A.2.8.9', type: 'active', parent_id: 208 },

  // PASİF - Ana gruplar
  { id: 30, name: 'I-KISA VADELİ YABANCI KAYNAKLAR', code: 'P.1', type: 'passive', parent_id: 2 },
  { id: 40, name: 'II-UZUN VADELİ YABANCI KAYNAKLAR', code: 'P.2', type: 'passive', parent_id: 2 },
  { id: 50, name: 'III-ÖZKAYNAKLAR', code: 'P.3', type: 'passive', parent_id: 2 },
  
  // I-KISA VADELİ YABANCI KAYNAKLAR alt grupları
  { id: 300, name: 'A-MALİ BORÇLAR', code: 'P.1.1', type: 'passive', parent_id: 30 },
  { id: 301, name: 'B-TİCARİ BORÇLAR', code: 'P.1.2', type: 'passive', parent_id: 30 },
  { id: 302, name: 'C-DİĞER BORÇLAR', code: 'P.1.3', type: 'passive', parent_id: 30 },
  { id: 303, name: 'D-ALINAN AVANSLAR', code: 'P.1.4', type: 'passive', parent_id: 30 },
  { id: 304, name: 'E-YILLARA YAYGIN İNŞAAT VE ONARIM HAKEDİŞLERİ', code: 'P.1.5', type: 'passive', parent_id: 30 },
  { id: 305, name: 'F-ÖDENECEK VERGİ VE DİĞER YÜKÜMLÜLÜKLER"', code: 'P.1.6', type: 'passive', parent_id: 30 },
  { id: 306, name: 'G-BORÇ VE GİDER KARŞILIKLARI', code: 'P.1.7', type: 'passive', parent_id: 30 },
  { id: 307, name: 'H-GELECEKTEKİ AYLARA AİT GELİRLER VE GİDER TAHAKKUKLARI', code: 'P.1.8', type: 'passive', parent_id: 30 },
  { id: 308, name: 'I-DİĞER KISA VADELİ YABANCI KAYNAKLAR', code: 'P.1.9', type: 'passive', parent_id: 30 },
  
  // A-FİNANSAL BORÇLAR detayları
  { id: 3000, name: '1-BANKA KREDİLERİ', code: 'P.1.1.1', type: 'passive', parent_id: 300 },
  { id: 3001, name: '2-FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: 'P.1.1.2', type: 'passive', parent_id: 300 },
  { id: 3002, name: '3-ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: 'P.1.1.3', type: 'passive', parent_id: 300 },
  { id: 3003, name: '4-UZUN VADELİ KREDİLERİN ANAPARA TAKSİTLERİ VE FAİZLERİ', code: 'P.1.1.4', type: 'passive', parent_id: 300 },
  { id: 3004, name: '5-TAHVİL ANAPARA BORÇ, TAKSİT VE FAİZLERİ', code: 'P.1.1.5', type: 'passive', parent_id: 300 },
  { id: 3005, name: '6-ÇIKARILMIŞ BONOLAR VE SENETLER', code: 'P.1.1.6', type: 'passive', parent_id: 300 },
  { id: 3006, name: '7-ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: 'P.1.1.7', type: 'passive', parent_id: 300 },
  { id: 3007, name: '8-MENKUL KIYMETLER İHRAÇ FARKI (-)', code: 'P.1.1.8', type: 'passive', parent_id: 300 },
  { id: 3008, name: '9-DİĞER MALİ BORÇLAR', code: 'P.1.1.9', type: 'passive', parent_id: 300 },
  
  // B-TİCARİ BORÇLAR detayları
  { id: 3010, name: '1-SATICILAR', code: 'P.1.2.1', type: 'passive', parent_id: 301 },
  { id: 3011, name: '2-BORÇ SENETLERİ', code: 'P.1.2.2', type: 'passive', parent_id: 301 },
  { id: 3012, name: '3-BORÇ SENETLERİ REESKONTU (-)', code: 'P.1.2.3', type: 'passive', parent_id: 301 },
  { id: 3013, name: '4-ALINAN DEPOZİTO VE TEMİNATLAR', code: 'P.1.2.4', type: 'passive', parent_id: 301 },
  { id: 3014, name: '5-DİĞER TİCARİ BORÇLAR', code: 'P.1.2.5', type: 'passive', parent_id: 301 },
  
  // C-DİĞER BORÇLAR detayları
  { id: 3020, name: '1-ORTAKLARA BORÇLAR', code: 'P.1.3.1', type: 'passive', parent_id: 302 },
  { id: 3021, name: '2-İŞTİRAKLERE BORÇLAR', code: 'P.1.3.2', type: 'passive', parent_id: 302 },
  { id: 3022, name: '3-BAĞLI ORTAKLIKLARA BORÇLAR', code: 'P.1.3.3', type: 'passive', parent_id: 302 },
  { id: 3024, name: '4-PERSONELE BORÇLAR"', code: 'P.1.3.4', type: 'passive', parent_id: 302 },
  { id: 3025, name: '5-DİĞER ÇEŞİTLİ BORÇLAR', code: 'P.1.3.5', type: 'passive', parent_id: 302 },
  { id: 3026, name: '6-DİĞER BORÇ SENETLERİ REESKONTU (-)', code: 'P.1.3.6', type: 'passive', parent_id: 302 },
  
  // D-ALINAN AVANSLAR detayları
  { id: 3030, name: '1-ALINAN SİPARİŞ AVANSLARI', code: 'P.1.4.1', type: 'passive', parent_id: 303 },
  { id: 3031, name: '2-ALINAN DİĞER AVANSLAR', code: 'P.1.4.2', type: 'passive', parent_id: 303 },
  
  // E-YILLARA YAYGIN İNŞAAT VE ONARIM HAKEDİŞLERİ detayları
  { id: 3040, name: '1-YILLARA YAYGIN İNŞAAT VE ONARIM HAKEDİŞ BEDELLERİ', code: 'P.1.5.1', type: 'passive', parent_id: 304 },
  { id: 3041, name: '2-YILLARA YAYGIN İNŞAAT ENFLASYON DÜZELTME HESABI', code: 'P.1.5.2', type: 'passive', parent_id: 304 },
  
  // F-ÖDENECEK VERGİ VE FONLAR detayları
  { id: 3042, name: '1-ÖDENECEK VERGİ VE FONLAR', code: 'P.1.6.1', type: 'passive', parent_id: 305 },
  { id: 3043, name: '2-ÖDENECEK SOSYAL GÜVENLİK KESİNTİLERİ', code: 'P.1.6.2', type: 'passive', parent_id: 305 },
  { id: 3044, name: '3-VADESİ GEÇMİŞ ERTELENMİŞ VEYA TAKSİTLENDİRİLMİŞ VERGİ VE DİĞER YÜKÜMLÜLÜKLER', code: 'P.1.6.3', type: 'passive', parent_id: 305 },
  { id: 3045, name: '4-ÖDENECEK DİĞER YÜKÜMLÜLÜKLER', code: 'P.1.6.4', type: 'passive', parent_id: 305 },
  
  // G-BORÇ VE GİDER KARŞILIKLARI detayları
  { id: 3046, name: '1-DÖNEM KARI VERGİ VE DİĞER YASAL YÜKÜMLÜLÜK KARŞILIKLARI', code: 'P.1.7.1', type: 'passive', parent_id: 306 },
  { id: 3047, name: '2-DÖNEM KARININ PEŞİN ÖDENEN VERGİ VE DİĞER YÜKÜMLÜLÜKLER (-)', code: 'P.1.7.2', type: 'passive', parent_id: 306 },
  { id: 3048, name: '3-KIDEM TAZMINATI KARŞILIĞI', code: 'P.1.7.3', type: 'passive', parent_id: 306 },
  { id: 3049, name: '4-MALİYET GİDERLERİ KARŞILIĞI', code: 'P.1.7.4', type: 'passive', parent_id: 306 },
  { id: 3050, name: '5-DİĞER BORÇ VE GİDER KARŞILIKLARI', code: 'P.1.7.5', type: 'passive', parent_id: 306 },
  
  // H-GELECEKTEKİ AYLARA AİT GELİRLER VE GİDER TAHAKKUKLARI detayları
  { id: 3051, name: '1-GELECEK AYLARA AİT GELİRLER', code: 'P.1.8.1', type: 'passive', parent_id: 307 },
  { id: 3052, name: '2-GİDER TAHAKKUKLARI', code: 'P.1.8.2', type: 'passive', parent_id: 307 },
  
  // I-DİĞER KISA VADELİ YABANCI KAYNAKLAR detayları
  { id: 3053, name: '1-HESAPLANAN KDV', code: 'P.1.9.1', type: 'passive', parent_id: 308 },
  { id: 3054, name: '2-DİĞER KDV', code: 'P.1.9.2', type: 'passive', parent_id: 308 },
  { id: 3055, name: '3-MERKEZİ VE ŞUBELERİ CARİ HESABI', code: 'P.1.9.3', type: 'passive', parent_id: 308 },
  { id: 3056, name: '4-SAYIM VE TESELLİM FAZLALARI', code: 'P.1.9.4', type: 'passive', parent_id: 308 },
  { id: 3057, name: '5-DİĞER YASAL YÜKÜMLÜLÜKLER', code: 'P.1.9.5', type: 'passive', parent_id: 308 },
  { id: 3058, name: '6-DİĞER ÇEŞİTLİ YABANCI KAYNAKLAR', code: 'P.1.9.6', type: 'passive', parent_id: 308 },
  
  // II-UZUN VADELİ YABANCI KAYNAKLAR alt grupları
  { id: 400, name: 'A-MALİ BORÇLAR', code: 'P.2.1', type: 'passive', parent_id: 40 },
  { id: 401, name: 'B-TİCARİ BORÇLAR', code: 'P.2.2', type: 'passive', parent_id: 40 },
  { id: 402, name: 'C-DİĞER BORÇLAR', code: 'P.2.3', type: 'passive', parent_id: 40 },
  { id: 403, name: 'D-ALINAN AVANSLAR', code: 'P.2.4', type: 'passive', parent_id: 40 },
  { id: 404, name: 'E-BORÇ VE GİDER KARŞILIKLARI', code: 'P.2.5', type: 'passive', parent_id: 40 },
  { id: 405, name: 'F-GELECEK YILLARA AİT GELİRLER VE GİDER TAHAKKUKLARI', code: 'P.2.6', type: 'passive', parent_id: 40 },
  { id: 406, name: 'G-DİĞER UZUN VADELİ YABANCI KAYNAKLAR', code: 'P.2.7', type: 'passive', parent_id: 40 },
  
  // A-FİNANSAL BORÇLAR (Uzun Vadeli) detayları
  { id: 4000, name: '1-BANKA KREDİLERİ', code: 'P.2.1.1', type: 'passive', parent_id: 400 },
  { id: 4001, name: '2-FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: 'P.2.1.2', type: 'passive', parent_id: 400 },
  { id: 4002, name: '3-ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: 'P.2.1.3', type: 'passive', parent_id: 400 },
  { id: 4003, name: '4-ÇIKARILMIŞ TAHVİLLER', code: 'P.2.1.4', type: 'passive', parent_id: 400 },
  { id: 4004, name: '5-ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: 'P.2.1.5', type: 'passive', parent_id: 400 },
  { id: 4005, name: '6-MENKUL KIYMETLER İHRAÇ FARKI (-)', code: 'P.2.1.6', type: 'passive', parent_id: 400 },
  { id: 4006, name: '7-DİĞER FİNANSAL BORÇLAR', code: 'P.2.1.7', type: 'passive', parent_id: 400 },
  
  // B-TİCARİ BORÇLAR (Uzun Vadeli) detayları
  { id: 4010, name: '1-SATICILAR', code: 'P.2.2.1', type: 'passive', parent_id: 401 },
  { id: 4011, name: '2-BORÇ SENETLERİ', code: 'P.2.2.2', type: 'passive', parent_id: 401 },
  { id: 4012, name: '3-BORÇ SENETLERİ REESKONTU (-)', code: 'P.2.2.3', type: 'passive', parent_id: 401 },
  { id: 4013, name: '4-ALINAN DEPOZİTO VE TEMİNATLAR', code: 'P.2.2.4', type: 'passive', parent_id: 401 },
  { id: 4014, name: '5-DİĞER TİCARİ BORÇLAR', code: 'P.2.2.5', type: 'passive', parent_id: 401 },
  
  // C-DİĞER BORÇLAR (Uzun Vadeli) detayları
  { id: 4020, name: '1-ORTAKLARA BORÇLAR', code: 'P.2.3.1', type: 'passive', parent_id: 402 },
  { id: 4021, name: '2-İŞTİRAKLERE BORÇLAR', code: 'P.2.3.2', type: 'passive', parent_id: 402 },
  { id: 4022, name: '3-BAĞLI ORTAKLIKLARA BORÇLAR', code: 'P.2.3.3', type: 'passive', parent_id: 402 },
  { id: 4024, name: '4-DİĞER ÇEŞİTLİ BORÇLAR', code: 'P.2.3.4', type: 'passive', parent_id: 402 },
  { id: 4025, name: '5-DİĞER BORÇ SENETLERİ REESKONTU (-)', code: 'P.2.3.5', type: 'passive', parent_id: 402 },
  { id: 4026, name: '6-KAMUYA OLAN ERTELENMİŞ VEYA TAKSİTLENDİRİLMİŞ BORÇLAR', code: 'P.2.3.6', type: 'passive', parent_id: 402 },
  
  // D-ALINAN AVANSLAR (Uzun Vadeli) detayları
  { id: 4030, name: '1-ALINAN SİPARİŞ AVANSLARI', code: 'P.2.4.1', type: 'passive', parent_id: 403 },
  { id: 4031, name: '2-ALINAN DİĞER AVANSLAR', code: 'P.2.4.2', type: 'passive', parent_id: 403 },
  
  // E-BORÇ VE GİDER KARŞILIKLARI (Uzun Vadeli) detayları
  { id: 4040, name: '1-KIDEM TAZMİNATI KARŞILIKLARI', code: 'P.2.5.1', type: 'passive', parent_id: 404 },
  { id: 4041, name: '2-DİĞER BORÇ VE GİDER KARŞILIKLARI', code: 'P.2.5.2', type: 'passive', parent_id: 404 },
  
  // F-GELECEKTEKİ YILLARA AİT GELİRLER detayları
  { id: 4050, name: '1-GELECEK YILLARA AİT GELİRLER', code: 'P.2.6.1', type: 'passive', parent_id: 405 },
  { id: 4051, name: '2-GİDER TAHAKKUKLARI', code: 'P.2.6.2', type: 'passive', parent_id: 405 },
  
  // G-DİĞER UZUN VADELİ YABANCI KAYNAKLAR detayları
  { id: 4060, name: '1-GELECEK YILLARA ERTELENEN VEYA TERKİN EDİLEN KATMA DEĞER VERGİSİ', code: 'P.2.7.1', type: 'passive', parent_id: 406 },
  { id: 4061, name: '2-TESİSE KATILMA PAYLARI', code: 'P.2.7.2', type: 'passive', parent_id: 406 },
  { id: 4062, name: '3-DİĞER ÇEŞİTLİ UZUN VADELİ YABANCI KAYNAKLAR', code: 'P.2.7.3', type: 'passive', parent_id: 406 },
  
  // III-ÖZKAYNAKLAR alt grupları
  { id: 500, name: 'A-ÖDENMİŞ SERMAYE', code: 'P.3.1', type: 'passive', parent_id: 50 },
  { id: 501, name: 'B-SERMAYE YEDEKLERİ', code: 'P.3.2', type: 'passive', parent_id: 50 },
  { id: 502, name: 'C-KAR YEDEKLERİ', code: 'P.3.3', type: 'passive', parent_id: 50 },
  { id: 503, name: 'D-GEÇMİŞ YILLAR KARLARI', code: 'P.3.4', type: 'passive', parent_id: 50 },
  { id: 504, name: 'E-GEÇMİŞ YILLAR ZARARLARI (-)', code: 'P.3.5', type: 'passive', parent_id: 50 },
  { id: 505, name: 'F-DÖNEM NET KARI (ZARARI)', code: 'P.3.6', type: 'passive', parent_id: 50 },
  
  // A-ÖDENMİŞ SERMAYE detayları
  { id: 5000, name: '1-SERMAYE', code: 'P.3.1.1', type: 'passive', parent_id: 500 },
  { id: 5001, name: '2-ÖDENMEMİŞ SERMAYE (-)', code: 'P.3.1.2', type: 'passive', parent_id: 500 },
  { id: 5002, name: '3-SERMAYE DÜZELTMESİ OLUMLU FARKLARI', code: 'P.3.1.3', type: 'passive', parent_id: 500 },
  { id: 5003, name: '4-SERMAYE DÜZELTMESİ OLUMSUZ FARKLARI (-)', code: 'P.3.1.4', type: 'passive', parent_id: 500 },
  
  // B-SERMAYE YEDEKLERİ detayları
  { id: 5010, name: '1-HİSSE SENETLERİ İHRAÇ PRİMLERİ', code: 'P.3.2.1', type: 'passive', parent_id: 501 },
  { id: 5011, name: '2-HİSSE SENETLERİ İPTAL KARLARI', code: 'P.3.2.2', type: 'passive', parent_id: 501 },
  { id: 5012, name: '3-M.D.V. YENİDEN DEĞERLEME ARTIŞLARI', code: 'P.3.2.3', type: 'passive', parent_id: 501 },
  { id: 5013, name: '4-İŞTİRAKLER YENİDEN DEĞERLEME ARTIŞLARI', code: 'P.3.2.4', type: 'passive', parent_id: 501 },
  { id: 5014, name: '5-MALİYET BEDELİ ARTIŞ FONDU', code: 'P.3.2.5', type: 'passive', parent_id: 501 },
  { id: 5015, name: '6-KAYDA ALINAN ENFLASYON DÜZELTME ÖZEL KARŞILIK HESABI', code: 'P.3.2.6', type: 'passive', parent_id: 501 },
  { id: 5016, name: '7-DEMİRBAŞ MAKİNE VE TEÇHİZAT ÖZEL KARŞILIK HESABI', code: 'P.3.2.7', type: 'passive', parent_id: 501 },
  { id: 5017, name: '8-DİĞER SERMAYE YEDEKLERİ', code: 'P.3.2.8', type: 'passive', parent_id: 501 },
  
  // C-KAR YEDEKLERİ detayları
  { id: 5020, name: '1-YASAL YEDEKLER', code: 'P.3.3.1', type: 'passive', parent_id: 502 },
  { id: 5021, name: '2-STATÜ YEDEKLERİ', code: 'P.3.3.2', type: 'passive', parent_id: 502 },
  { id: 5022, name: '3-OLAĞANÜSTÜ YEDEKLER', code: 'P.3.3.3', type: 'passive', parent_id: 502 },
  { id: 5023, name: '4-DİĞER KAR YEDEKLERİ', code: 'P.3.3.4', type: 'passive', parent_id: 502 },
  { id: 5024, name: '5-ÖZEL FONLAR', code: 'P.3.3.5', type: 'passive', parent_id: 502 },
  
  // D-GEÇMİŞ YILLAR KARLARI detayları
  { id: 5030, name: '1-GEÇMİŞ YILLAR KARLARI', code: 'P.3.4.1', type: 'passive', parent_id: 503 },
  
  // E-GEÇMİŞ YILLAR ZARARLARI detayları
  { id: 5040, name: '1-GEÇMİŞ YILLAR ZARARLARI', code: 'P.3.5.1', type: 'passive', parent_id: 504 },
  
  // F-DÖNEM NET KARI (ZARARI) detayları
  { id: 5050, name: '1-DÖNEM NET KARI', code: 'P.3.6.1', type: 'passive', parent_id: 505 },
  { id: 5060, name: '2-DÖNEM NET ZARARI (-)', code: 'P.3.6.2', type: 'passive', parent_id: 505 },
  

  // F-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ detayları
  { id: 1050, name: '1-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ', code: 'A.1.6.1', type: 'active', parent_id: 105 },
  { id: 1051, name: '2-YILLARA YAYGIN İNŞAAT ENFLASYON DÜZELTME HESABI', code: 'A.1.6.2', type: 'active', parent_id: 105 },
  { id: 1052, name: '3-TAŞERONLARA VERİLEN AVANSLAR', code: 'A.1.6.3', type: 'active', parent_id: 105 },
  
  // G-GELECEK AYLARA AİT GİDERLER VE GELİR TAHAKKUKLARI detayları
  { id: 1060, name: '1-GELECEK AYLARA AİT GİDERLER', code: 'A.1.7.1', type: 'active', parent_id: 106 },
  { id: 1061, name: '2-GELİR TAHAKKUKLARI', code: 'A.1.7.2', type: 'active', parent_id: 106 },
  
  // H-DİĞER DÖNEN VARLIKLAR kategorisi ve detayları
  { id: 1070, name: '1-DEVREDEN KATMA DEĞER VERGİSİ', code: 'A.1.8.1', type: 'active', parent_id: 107 },
  { id: 1071, name: '2-İNDİRİLECEK KATMA DEĞER VERGİSİ', code: 'A.1.8.2', type: 'active', parent_id: 107 },
  { id: 1072, name: '3-DİĞER KATMA DEĞER VERGİSİ', code: 'A.1.8.3', type: 'active', parent_id: 107 },
  { id: 1073, name: '4-PEŞİN ÖDENEN VERGİLER VE FONLAR', code: 'A.1.8.4', type: 'active', parent_id: 107 },
  { id: 1074, name: '5-İŞ AVANSLARI', code: 'A.1.8.5', type: 'active', parent_id: 107 },
  { id: 1075, name: '6-PERSONEL AVANSLARI', code: 'A.1.8.6', type: 'active', parent_id: 107 },
  { id: 1076, name: '7-SAYIM VE TESELLİM NOKSANLARI', code: 'A.1.8.7', type: 'active', parent_id: 107 },
  { id: 1077, name: '8-DİĞER ÇEŞİTLİ DÖNEN VARLIKLAR', code: 'A.1.8.8', type: 'active', parent_id: 107 },
  { id: 1078, name: '9-DİĞER DÖNEN VARLIKLAR KARŞILIĞI (-)', code: 'A.1.8.9', type: 'active', parent_id: 107 }
];

/**
 * Gemini AI ile mali verileri çıkarma fonksiyonu
 * @param {string} filePath - PDF dosyasının yolu
 * @returns {Promise<object>} - Çıkarılan mali veriler
 */
async function extractFinancialDataWithGemini(filePath) {
  const jsonData = await fs.readFile("account_codes.json");

  let prompt =
    `Bu PDF dosyasında yer alan "TEK DÜZEN HESAP PLANI AYRINTILI BİLANÇO VE AYRINTILI GELİR TABLOSU" altındaki **Aktif** ve **Pasif** tablolarını ayır.     

ÖNEMLI: Ayrıca PDF'te yer alan VKN (Vergi Kimlik Numarası), şirket adını, dönem yılını ve dönem tipini (YILLIK, Q1, Q2, Q3, Q4, vb.) da çıkar.

- Kolon isimininde açıklama geçiyorsa description yap. Yıl içeriyorsa sadece yıl değeri yap. Yıl ve enflasyon sonrası içeriyorsa yıl_E formatında isimlendir.

- Veriyi aşağıdaki JSON datasındaki açıklamalara yakın benzerliklerle eşleştir. Eşleşen kaydın code değerini "definition" alanına yaz. Eşleşme bulunamazsa "eşleşmedi" yaz.

- VKN, şirket adı, dönem yılı ve dönem tipini ayrı olarak çıkar.

-- JSON DATA: 

` +
    jsonData +
    `

--

  Bu tablolardaki verileri tamamen object içeren JSON array olarak dön.
  
  Ayrıca PDF'ten çıkardığın VKN, şirket adı, yıl ve dönem bilgilerini şu formatta ekle:
  {
    "company_info": {
      "tax_number": "bulunan_vkn",
      "company_name": "bulunan_şirket_adı",
      "year": bilanço_yılı_sayı_olarak,
      "period": "dönem_tipi_YILLIK_veya_Q1_Q2_vb"
    },
    "balance_data": [... bilanço verileri ...]
  }`;

  try {
    console.log(filePath);

    // PDF dosyasını oku
    const fileData = await fs.readFile(filePath);

    // Dosyayı yükle ve içeriği oluştur
    const fileObject = {
      inlineData: {
        data: fileData.toString("base64"),
        mimeType: "application/pdf",
      },
    };

    // Gemini modeli
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // İçerik oluştur
    const result = await model.generateContent([prompt, fileObject]);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "");

    console.log(text);

    // JSON yanıtını parse et
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Hatası:", error);
    return {
      error: `Gemini API hatası: ${error.message}`,
    };
  }
}

// PDF yükleme endpoint'i
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Dosya bulunamadı" });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (fileExtension !== ".pdf") {
      // Geçici dosyayı temizle
      await fs.remove(file.path);
      return res
        .status(400)
        .json({ error: "Sadece PDF dosyaları kabul edilir" });
    }

    // Mali verileri Gemini AI ile çıkar
    const financialData = await extractFinancialDataWithGemini(file.path);

    // Gemini'den gelen veriyi kontrol et
    if (financialData.error) {
      await fs.remove(file.path);
      return res.status(500).json({ error: financialData.error });
    }

    // VKN ve şirket bilgilerini çıkar
    let companyInfo = null;
    let balanceData = [];
    
    if (financialData.company_info && financialData.balance_data) {
      // Yeni format
      balanceData = financialData.balance_data;
      const taxNumber = financialData.company_info.tax_number;
      
      if (taxNumber) {
        // VKN ile şirket bilgilerini veritabanından getir
        const company = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM companies WHERE tax_number = ?', [taxNumber], (err, row) => {
            if (err) {
              console.error('Şirket bilgisi getirme hatası:', err.message);
              resolve(null);
            } else {
              resolve(row);
            }
          });
        });
        
        if (company) {
          companyInfo = company;
          console.log(`VKN ${taxNumber} ile şirket bulundu:`, company.name);
        } else {
          console.log(`VKN ${taxNumber} ile şirket bulunamadı`);
        }
      }
    } else if (Array.isArray(financialData)) {
      // Eski format
      balanceData = financialData;
    }

    // Gemini'den gelen veriyi frontend'in beklediği formata dönüştür
    let transformedData = {
      detected_data: {
        company_name: companyInfo ? companyInfo.name : (financialData.company_info?.company_name || "Bilinmeyen Şirket"),
        tax_number: companyInfo ? companyInfo.tax_number : (financialData.company_info?.tax_number || ""),
        year: financialData.company_info?.year || new Date().getFullYear(),
        period: financialData.company_info?.period || "YILLIK",
        items: []
      },
      company_info: companyInfo // Şirket bilgilerini de ekle
    };

    if (Array.isArray(balanceData)) {
      // Bilanço verilerini işle
      transformedData.detected_data.items = balanceData.map(item => {
        // Tüm yıl kolonlarını item'dan al
        const itemData = {};
        Object.keys(item).forEach(key => {
          if (/^\d{4}(_E)?$/.test(key)) {
            itemData[key] = item[key];
          }
        });
        
        return {
          description: item.description || "",
          definition: item.definition || "eşleşmedi",
          ...itemData // Tüm yıl verilerini dahil et
        };
      }).filter(item => item.definition !== "eşleşmedi");
    }

    // Başarılı yanıt
    res.json({
      success: true,
      filename: file.originalname,
      detected_data: {
        ...transformedData.detected_data,
        found_company: companyInfo // VKN ile bulunan şirket bilgilerini ekle
      },
      company_info: companyInfo, // Şirket bilgilerini döndür
      financial_data: financialData, // Orijinal veriyi de gönder
    });

    // İşlem tamamlandıktan sonra geçici dosyayı temizle
    await fs.remove(file.path);
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).json({ error: `Hata: ${error.message}` });

    // Hata durumunda da geçici dosyayı temizlemeye çalış
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error("Geçici dosya temizleme hatası:", cleanupError);
      }
    }
  }
});

// Sağlık kontrolü endpoint'i
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Mali Analiz API çalışıyor" });
});

// Hesap kategorileri endpoint'i
app.get("/account-categories", (req, res) => {
  try {
    console.log("Hesap kategorileri istendi");
    res.json(accountCategories);
  } catch (error) {
    console.error("Hesap kategorileri hatası:", error);
    res.status(500).json({ error: `Hesap kategorileri alınamadı: ${error.message}` });
  }
});

// Bilançolar endpoint'i
app.get("/balance-sheets", (req, res) => {
  try {
    console.log("Bilançolar listesi istendi");
    
    db.all(`
      SELECT 
        bs.id,
        bs.company_name,
        bs.tax_number,
        bs.year,
        bs.period,
        bs.creation_date,
        bs.pdf_filename,
        bs.analysis_status,
        bs.currency,
        bs.notes,
        bs.created_at,
        c.name as company_full_name,
        c.industry,
        COUNT(bsi.id) as items_count
      FROM balance_sheets bs
      LEFT JOIN companies c ON bs.company_id = c.id
      LEFT JOIN balance_sheet_items bsi ON bs.id = bsi.balance_sheet_id
      GROUP BY bs.id
      ORDER BY bs.created_at DESC
    `, [], (err, rows) => {
      if (err) {
        console.error("Bilançolar sorgu hatası:", err.message);
        
        // Hata durumunda demo veriler döndür
    const demoBalanceSheets = [
      { 
        id: 1, 
        company_name: 'ABC Şirketi', 
        year: 2024, 
        period: 'Q1', 
        creation_date: '2024-03-31',
            notes: 'İlk çeyrek bilançosu',
            items_count: 0,
            analysis_status: 'demo'
      },
      { 
        id: 2, 
        company_name: 'XYZ Holding', 
        year: 2023, 
        period: 'YILLIK', 
        creation_date: '2023-12-31',
            notes: '2023 yılsonu bilançosu',
            items_count: 0,
            analysis_status: 'demo'
      }
    ];
    res.json(demoBalanceSheets);
      } else {
        console.log(`${rows.length} bilanço bulundu`);
        
        // Gerçek veritabanı verilerini döndür
        const formattedRows = rows.map(row => ({
          id: row.id,
          company_name: row.company_full_name || row.company_name,
          tax_number: row.tax_number,
          year: row.year,
          period: row.period,
          creation_date: row.creation_date,
          pdf_filename: row.pdf_filename,
          analysis_status: row.analysis_status,
          currency: row.currency,
          notes: row.notes,
          items_count: row.items_count,
          industry: row.industry,
          created_at: row.created_at
        }));
        
        res.json(formattedRows);
      }
    });
    
  } catch (error) {
    console.error("Bilançolar hatası:", error);
    res.status(500).json({ error: `Bilançolar alınamadı: ${error.message}` });
  }
});

// Şirketler endpoint'i
app.get("/companies", (req, res) => {
  try {
    console.log("Şirketler listesi istendi");
    
    db.all(`
      SELECT id, name, tax_number, email, trade_registry_number, address, industry, 
             DATE(created_at) as created_at
      FROM companies 
      ORDER BY id DESC
    `, [], (err, rows) => {
      if (err) {
        console.error("Şirketler sorgu hatası:", err.message);
        res.status(500).json({ error: `Şirketler alınamadı: ${err.message}` });
      } else {
        console.log(`${rows.length} şirket bulundu`);
        res.json(rows);
      }
    });
    
  } catch (error) {
    console.error("Şirketler hatası:", error);
    res.status(500).json({ error: `Şirketler alınamadı: ${error.message}` });
  }
});

// Şirket oluşturma endpoint'i
app.post("/companies", (req, res) => {
  try {
    console.log("Yeni şirket oluşturma isteği:", req.body);
    
    const { 
      title, 
      tax_number, 
      email, 
      trade_registry_number, 
      address, 
      phone,
      establishment_date,
      activity_main_category,
      activity_subcategory,
      activity_notes,
      sector_size_dynamics,
      competitive_position_market_share,
      income_expenses_tax_compliance,
      regulation_monitoring,
      sector_notes,
      partners 
    } = req.body;
    
    // Basit validasyon
    if (!title || !tax_number) {
      return res.status(400).json({ 
        error: "Şirket unvanı ve vergi numarası gereklidir" 
      });
    }
    
    // VKN formatı kontrolü
    if (!/^\d{10}$/.test(tax_number)) {
      return res.status(400).json({ 
        error: "Vergi numarası 10 haneli sayısal değer olmalıdır" 
      });
    }
    
    // Önce aynı VKN'nin var olup olmadığını kontrol et
    db.get('SELECT id FROM companies WHERE tax_number = ?', [tax_number], (err, row) => {
      if (err) {
        console.error('VKN kontrol hatası:', err.message);
        return res.status(500).json({ 
          error: `Veritabanı hatası: ${err.message}` 
        });
      }
      
      if (row) {
        return res.status(400).json({ 
          error: "Bu vergi numarası ile kayıtlı şirket zaten mevcut" 
        });
      }
      
      // Şirketi veritabanına kaydet
      db.run(`
        INSERT INTO companies (
          name, 
          tax_number, 
          email, 
          trade_registry_number, 
          address, 
          industry,
          phone,
          establishment_date,
          activity_main_category,
          activity_subcategory,
          activity_notes,
          sector_size_dynamics,
          competitive_position_market_share,
          income_expenses_tax_compliance,
          regulation_monitoring,
          sector_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title, // name alanına title değerini kaydet
        tax_number, 
        email || "", 
        trade_registry_number || "", 
        address || "", 
        'Genel', // industry - varsayılan değer
        phone || "",
        establishment_date || "",
        activity_main_category || "",
        activity_subcategory || "",
        activity_notes || "",
        sector_size_dynamics || "",
        competitive_position_market_share || "",
        income_expenses_tax_compliance || "",
        regulation_monitoring || "",
        sector_notes || ""
      ], 
      function(err) {
        if (err) {
          console.error('Şirket kaydetme hatası:', err.message);
          return res.status(500).json({ 
            error: `Şirket kaydedilemedi: ${err.message}` 
          });
        }
        
        const newCompany = {
          id: this.lastID,
          name: title,
          title: title,
          tax_number,
          email: email || "",
          trade_registry_number: trade_registry_number || "",
          address: address || "",
          industry: 'Genel',
          phone: phone || "",
          establishment_date: establishment_date || "",
          activity_main_category: activity_main_category || "",
          activity_subcategory: activity_subcategory || "",
          activity_notes: activity_notes || "",
          sector_size_dynamics: sector_size_dynamics || "",
          competitive_position_market_share: competitive_position_market_share || "",
          income_expenses_tax_compliance: income_expenses_tax_compliance || "",
          regulation_monitoring: regulation_monitoring || "",
          sector_notes: sector_notes || "",
          created_at: new Date().toISOString().split('T')[0]
        };
        
        // Ortakları kaydet
        if (partners && Array.isArray(partners) && partners.length > 0) {
          const partnerPromises = partners.map(partner => {
            return new Promise((resolvePartner, rejectPartner) => {
              db.run(`
                INSERT INTO company_partners (company_id, name, share_percentage)
                VALUES (?, ?, ?)
              `, [this.lastID, partner.name, parseFloat(partner.sharePercentage)], (partnerErr) => {
                if (partnerErr) {
                  console.error('Ortak kaydetme hatası:', partnerErr.message);
                  rejectPartner(partnerErr);
                } else {
                  resolvePartner();
                }
              });
            });
          });
          
          Promise.all(partnerPromises)
            .then(() => {
              console.log(`${partners.length} ortak başarıyla kaydedildi`);
            })
            .catch((partnerError) => {
              console.error('Ortakları kaydetme hatası:', partnerError);
            });
        }
        
        console.log("Şirket başarıyla kaydedildi:", newCompany);
        
        res.status(201).json({
          success: true,
          message: "Şirket başarıyla oluşturuldu",
          company: newCompany
        });
      });
    });
    
  } catch (error) {
    console.error("Şirket oluşturma hatası:", error);
    res.status(500).json({ 
      error: `Şirket oluşturulamadı: ${error.message}` 
    });
  }
});

// Şirket detaylarını getir endpoint'i - ID ile (VKN kontrolünden ÖNCE olmalı)
app.get("/companies/:companyId", (req, res) => {
  try {
    const { companyId } = req.params;
    
    // ID'nin sayısal olup olmadığını kontrol et
    if (!/^\d+$/.test(companyId)) {
      return res.status(400).json({ 
        error: "Geçersiz şirket ID formatı" 
      });
    }
    
    console.log("Şirket detayları istendi:", companyId);
    
    db.get(`
      SELECT id, name, tax_number, email, trade_registry_number, address, industry, 
             phone, establishment_date, activity_main_category, activity_subcategory,
             activity_notes, sector_size_dynamics, competitive_position_market_share,
             income_expenses_tax_compliance, regulation_monitoring, sector_notes,
             DATE(created_at) as created_at, DATE(updated_at) as updated_at
      FROM companies 
      WHERE id = ?
    `, [companyId], (err, row) => {
      if (err) {
        console.error('Şirket detay sorgu hatası:', err.message);
        return res.status(500).json({ 
          error: `Şirket detayları alınamadı: ${err.message}` 
        });
      }
      
      if (!row) {
        return res.status(404).json({ 
          error: "Şirket bulunamadı" 
        });
      }
      
      // Şirket ortaklarını da getir
      db.all(`
        SELECT name, share_percentage
        FROM company_partners 
        WHERE company_id = ?
        ORDER BY share_percentage DESC
      `, [companyId], (partnerErr, partners) => {
        if (partnerErr) {
          console.error('Ortak listesi alınamadı:', partnerErr.message);
          // Ortak hatası olsa bile şirket bilgilerini döndür
          partners = [];
        }
        
        const companyWithPartners = {
          ...row,
          partners: partners || []
        };
        
        console.log(`Şirket detayları bulundu: ${row.name} (ID: ${companyId}), ${partners.length} ortak`);
        res.json(companyWithPartners);
      });
    });
    
  } catch (error) {
    console.error("Şirket detay hatası:", error);
    res.status(500).json({ 
      error: `Şirket detayları alınamadı: ${error.message}` 
    });
  }
});

// VKN ile şirket kontrol endpoint'i
app.get("/companies/check/:taxNumber", (req, res) => {
  try {
    const { taxNumber } = req.params;
    console.log("VKN kontrolü istendi:", taxNumber);
    
    // VKN formatı kontrolü - 10 haneli mi?
    const isValidFormat = /^\d{10}$/.test(taxNumber);
    
    if (!isValidFormat) {
      return res.json({
        exists: false,
        valid: false,
        message: "VKN geçersiz formatta. 10 haneli sayısal değer olmalıdır"
      });
    }
    
    // Veritabanında bu VKN'yi ara
    db.get('SELECT id, name, tax_number FROM companies WHERE tax_number = ?', [taxNumber], (err, row) => {
      if (err) {
        console.error('VKN kontrol veritabanı hatası:', err.message);
        return res.status(500).json({ 
          error: `VKN kontrolü yapılamadı: ${err.message}` 
        });
      }
      
      if (row) {
        return res.json({
          exists: true,
          valid: true,
          message: "Bu VKN ile kayıtlı şirket bulundu",
          company: row
        });
      } else {
        return res.json({
      exists: false,
          valid: true,
          message: "Bu VKN geçerli formatta ancak kayıtlı şirket bulunamadı"
        });
      }
    });
    
  } catch (error) {
    console.error("VKN kontrol hatası:", error);
    res.status(500).json({ 
      error: `VKN kontrolü yapılamadı: ${error.message}` 
    });
  }
});

// Test için demo PDF analiz verisi
app.get("/test-pdf-data", (req, res) => {
  try {
    console.log("Test PDF verisi istendi");
    const testData = {
      success: true,
      filename: "test-bilanço.pdf",
      detected_data: {
        company_name: "Test Şirketi A.Ş.",
        tax_number: "1234567890",
        year: 2024,
        period: "YILLIK",
        items: [
          {
            account_code: "A.1.1.1",
            account_name: "KASA",
            current_amount: 125000,
            previous_amount: 100000,
            inflation_amount: null
          },
          {
            account_code: "A.1.1.3",
            account_name: "BANKALAR",
            current_amount: 385000,
            previous_amount: 320000,
            inflation_amount: null
          },
          {
            account_code: "A.1.3.1",
            account_name: "ALICILAR",
            current_amount: 750000,
            previous_amount: 650000,
            inflation_amount: null
          },
          {
            account_code: "P.1.1.1",
            account_name: "BANKA KREDİLERİ",
            current_amount: 230000,
            previous_amount: 180000,
            inflation_amount: null
          },
          {
            account_code: "P.1.2.1",
            account_name: "SATICILAR",
            current_amount: 185000,
            previous_amount: 140000,
            inflation_amount: null
          },
          {
            account_code: "P.3.1.1",
            account_name: "SERMAYE",
            current_amount: 845000,
            previous_amount: 750000,
            inflation_amount: null
          }
        ]
      }
    };
    res.json(testData);
  } catch (error) {
    console.error("Test PDF verisi hatası:", error);
    res.status(500).json({ error: `Test verisi alınamadı: ${error.message}` });
  }
});

// Uploads klasörünü oluştur
fs.ensureDirSync("uploads");

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Mali Analiz API ${PORT} portunda çalışıyor`);
});

// PDF analiz verilerini veritabanına kaydet endpoint'i
app.post("/save-analysis", async (req, res) => {
  try {
    const { 
      company_info, 
      detected_data, 
      analysis_metadata 
    } = req.body;

    if (!company_info || !detected_data) {
      return res.status(400).json({ 
        error: "Şirket bilgileri ve analiz verileri gereklidir" 
      });
    }

    console.log("Analiz verisi kaydediliyor:", {
      company: company_info.name,
      tax_number: company_info.tax_number,
      items_count: detected_data.items?.length || 0
    });

    // Şirketi kontrol et veya oluştur
    let companyId;
    const existingCompany = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM companies WHERE tax_number = ?', [company_info.tax_number], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      // Yeni şirket oluştur
      companyId = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO companies (name, tax_number, email, industry)
          VALUES (?, ?, ?, ?)
        `, [
          company_info.name,
          company_info.tax_number,
          company_info.email || '',
          company_info.industry || 'Belirtilmemiş'
        ], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
    }

    // Bilanço kaydı oluştur
    const balanceSheetId = await new Promise((resolve, reject) => {
      // Yıl ve dönem bilgilerini önce detected_data'dan, sonra analysis_metadata'dan al
      const year = detected_data.year || analysis_metadata?.year || new Date().getFullYear();
      const period = detected_data.period || analysis_metadata?.period || 'Belirtilmemiş';
      
      db.run(`
        INSERT INTO balance_sheets (
          company_id, company_name, tax_number, year, period, 
          pdf_filename, raw_pdf_data, analysis_status, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        companyId,
        company_info.name,
        company_info.tax_number,
        year,
        period,
        analysis_metadata?.filename || 'Bilinmiyor',
        JSON.stringify(detected_data),
        'completed',
        'TL'
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Bilanço kalemlerini kaydet
    const items = detected_data.items || [];
    let savedItemsCount = 0;

    for (const item of items) {
      try {
        await new Promise((resolve, reject) => {
          // Yıl alanlarını dinamik olarak bul
          const yearFields = Object.keys(item).filter(key => /^\d{4}(_E)?$/.test(key));
          const currentYearField = yearFields.find(key => !key.includes('_E'));
          const previousYearField = yearFields.find(key => key.includes('_E')) || 
                                   yearFields.filter(key => !key.includes('_E')).sort()[0];
          const inflationField = yearFields.find(key => key.includes('_E'));

          const currentAmount = parseFloat(String(item[currentYearField] || '0').replace(/[^\d.-]/g, '')) || 0;
          const previousAmount = parseFloat(String(item[previousYearField] || '0').replace(/[^\d.-]/g, '')) || 0;
          const inflationAmount = parseFloat(String(item[inflationField] || '0').replace(/[^\d.-]/g, '')) || 0;

          // Hesap tipini definition koduna göre belirle
          let accountType = 'active'; // varsayılan
          if (item.definition) {
            if (item.definition.startsWith('P.')) {
              accountType = 'passive';
            } else if (item.definition.startsWith('A.')) {
              accountType = 'active';
            } else if (item.description && item.description.toUpperCase().includes('PASİF')) {
              accountType = 'passive';
            } else if (item.description && item.description.toUpperCase().includes('AKTİF')) {
              accountType = 'active';
            }
          }

          db.run(`
            INSERT INTO balance_sheet_items (
              balance_sheet_id, company_id, account_code, account_name, 
              account_type, current_year_amount, previous_year_amount, 
              inflation_adjusted_amount, year, period
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            balanceSheetId,
            companyId,
            item.definition || '',
            item.description || 'Bilinmiyor',
            accountType, // Düzeltildi: Dinamik hesap tipi
            currentAmount,
            previousAmount,
            inflationAmount,
            year, // detected_data'dan alınan yıl
            period // detected_data'dan alınan dönem
          ], function(err) {
            if (err) reject(err);
            else {
              savedItemsCount++;
              console.log(`✅ Kalem kaydedildi: ${item.definition} - ${accountType} - ${currentAmount}`);
              resolve();
            }
          });
        });
      } catch (itemError) {
        console.error('Bilanço kalemi kaydetme hatası:', itemError);
        // Devam et, tüm kalemlerin hata vermesini engelle
      }
    }

    console.log(`Analiz verisi başarıyla kaydedildi: ${savedItemsCount} kalem`);

    res.json({
      success: true,
      message: "Analiz verisi başarıyla kaydedildi",
      data: {
        balance_sheet_id: balanceSheetId,
        company_id: companyId,
        saved_items: savedItemsCount,
        total_items: items.length
      }
    });

  } catch (error) {
    console.error("Analiz kaydetme hatası:", error);
    res.status(500).json({ 
      error: `Analiz kaydedilemedi: ${error.message}` 
    });
  }
});

// Şirket analiz geçmişini getir endpoint'i
app.get("/companies/:companyId/analyses", (req, res) => {
  try {
    const { companyId } = req.params;
    
    db.all(`
      SELECT 
        bs.id,
        bs.year,
        bs.period,
        bs.creation_date,
        bs.pdf_filename,
        bs.analysis_status,
        bs.currency,
        bs.created_at,
        COUNT(bsi.id) as items_count
      FROM balance_sheets bs
      LEFT JOIN balance_sheet_items bsi ON bs.id = bsi.balance_sheet_id
      WHERE bs.company_id = ?
      GROUP BY bs.id
      ORDER BY bs.year DESC, bs.created_at DESC
    `, [companyId], (err, rows) => {
      if (err) {
        console.error("Analiz geçmişi sorgu hatası:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  } catch (error) {
    console.error("Analiz geçmişi hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bilanço detaylarını getir endpoint'i
app.get("/balance-sheets/:balanceSheetId/details", (req, res) => {
  try {
    const { balanceSheetId } = req.params;
    
    // Bilanço genel bilgileri
    db.get(`
      SELECT * FROM balance_sheets WHERE id = ?
    `, [balanceSheetId], (err, balanceSheet) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!balanceSheet) {
        return res.status(404).json({ error: "Bilanço bulunamadı" });
      }

      // Bilanço kalemleri
      db.all(`
        SELECT * FROM balance_sheet_items 
        WHERE balance_sheet_id = ?
        ORDER BY account_code
      `, [balanceSheetId], (err, items) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          balance_sheet: balanceSheet,
          items: items
        });
      });
    });
  } catch (error) {
    console.error("Bilanço detay hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bilanço kalemlerini getir endpoint'i
app.get("/balance-sheets/:balanceSheetId/items", (req, res) => {
  try {
    const { balanceSheetId } = req.params;
    
    db.all(`
      SELECT 
        bsi.*,
        ac.name as account_category_name,
        ac.account_type as category_type
      FROM balance_sheet_items bsi
      LEFT JOIN account_categories ac ON bsi.account_code = ac.code
      WHERE bsi.balance_sheet_id = ?
      ORDER BY bsi.account_code
    `, [balanceSheetId], (err, items) => {
      if (err) {
        console.error("Bilanço kalemleri sorgu hatası:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        console.log(`${items.length} bilanço kalemi bulundu`);
        
        // Aktif ve pasif toplamları hesapla
        const aktifToplam = items
          .filter(item => item.account_type === 'active')
          .reduce((sum, item) => sum + (item.current_year_amount || 0), 0);
        
        const pasifToplam = items
          .filter(item => item.account_type === 'passive')
          .reduce((sum, item) => sum + (item.current_year_amount || 0), 0);
        
        res.json({
          balance_sheet_id: parseInt(balanceSheetId),
          items: items,
          has_inflation_data: items.some(item => item.inflation_adjusted_amount > 0),
          aktif_toplam: aktifToplam,
          pasif_toplam: pasifToplam,
          is_balanced: Math.abs(aktifToplam - pasifToplam) < 0.01,
          total_count: items.length
        });
      }
    });
  } catch (error) {
    console.error("Bilanço kalemleri hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Finansal oran hesaplama endpoint'i
app.post("/calculate-ratios/:balanceSheetId", async (req, res) => {
  try {
    const { balanceSheetId } = req.params;
    
    // Bilanço verilerini al
    const balanceSheetData = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM balance_sheet_items 
        WHERE balance_sheet_id = ?
      `, [balanceSheetId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Temel hesapları bul (bu kısım hesap planı eşleştirmesi gerektirir)
    const calculations = calculateFinancialRatios(balanceSheetData);
    
    // Hesaplanan oranları veritabanına kaydet
    const balanceSheet = await new Promise((resolve, reject) => {
      db.get('SELECT company_id, year FROM balance_sheets WHERE id = ?', [balanceSheetId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO financial_ratios (
          company_id, balance_sheet_id, year,
          current_ratio, quick_ratio, debt_to_equity_ratio,
          debt_to_assets_ratio, equity_ratio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        balanceSheet.company_id,
        balanceSheetId,
        balanceSheet.year,
        calculations.current_ratio,
        calculations.quick_ratio,
        calculations.debt_to_equity_ratio,
        calculations.debt_to_assets_ratio,
        calculations.equity_ratio
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      ratios: calculations,
      message: "Finansal oranlar hesaplandı ve kaydedildi"
    });

  } catch (error) {
    console.error("Oran hesaplama hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Finansal oran hesaplama fonksiyonu (basit versiyon)
function calculateFinancialRatios(balanceSheetItems) {
  // Bu fonksiyon geliştirilmeli - hesap planı eşleştirmesi gerekiyor
  const totals = {
    current_assets: 0,
    total_assets: 0,
    current_liabilities: 0,
    total_liabilities: 0,
    equity: 0
  };

  // Basit toplam hesaplamaları (geliştirilmeli)
  balanceSheetItems.forEach(item => {
    const amount = item.current_year_amount || 0;
    
    // Bu kısım hesap kodlarına göre kategorize edilmeli
    if (item.account_type === 'active') {
      totals.total_assets += amount;
      // Dönen varlık kontrolü (geliştirilmeli)
      if (item.account_code && item.account_code.includes('1')) {
        totals.current_assets += amount;
      }
    } else {
      totals.total_liabilities += amount;
      // Kısa vadeli borç kontrolü (geliştirilmeli)
      if (item.account_code && item.account_code.includes('3')) {
        totals.current_liabilities += amount;
      }
    }
  });

  totals.equity = totals.total_assets - totals.total_liabilities;

  return {
    current_ratio: totals.current_liabilities > 0 ? 
      totals.current_assets / totals.current_liabilities : 0,
    quick_ratio: totals.current_liabilities > 0 ? 
      (totals.current_assets * 0.8) / totals.current_liabilities : 0, // Yaklaşık
    debt_to_equity_ratio: totals.equity > 0 ? 
      totals.total_liabilities / totals.equity : 0,
    debt_to_assets_ratio: totals.total_assets > 0 ? 
      totals.total_liabilities / totals.total_assets : 0,
    equity_ratio: totals.total_assets > 0 ? 
      totals.equity / totals.total_assets : 0
  };
}

// Sağlık kontrolü endpoint'i
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Mali Analiz API çalışıyor" });
});

// Bilanço kalemini güncelle endpoint'i
app.put("/balance-sheets/:balanceSheetId/items/:itemId", (req, res) => {
  try {
    const { balanceSheetId, itemId } = req.params;
    const { current_year_amount, previous_year_amount, inflation_adjusted_amount } = req.body;
    
    console.log(`Bilanço kalemi güncelleniyor: Sheet ${balanceSheetId}, Item ${itemId}`, {
      current_year_amount,
      previous_year_amount,
      inflation_adjusted_amount
    });
    
    db.run(`
      UPDATE balance_sheet_items 
      SET 
        current_year_amount = ?,
        previous_year_amount = ?,
        inflation_adjusted_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND balance_sheet_id = ?
    `, [
      current_year_amount || 0,
      previous_year_amount || 0,
      inflation_adjusted_amount || 0,
      itemId,
      balanceSheetId
    ], function(err) {
      if (err) {
        console.error("Bilanço kalemi güncelleme hatası:", err.message);
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Güncellenecek kalem bulunamadı" });
      } else {
        console.log(`✅ Bilanço kalemi güncellendi: ID ${itemId}`);
        
        // Güncellenmiş kalemi döndür
        db.get(`
          SELECT * FROM balance_sheet_items WHERE id = ?
        `, [itemId], (err, updatedItem) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({
              success: true,
              message: "Bilanço kalemi başarıyla güncellendi",
              item: updatedItem
            });
          }
        });
      }
    });
  } catch (error) {
    console.error("Bilanço kalemi güncelleme hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bilanço kalemini sil endpoint'i
app.delete("/balance-sheets/:balanceSheetId/items/:itemId", (req, res) => {
  try {
    const { balanceSheetId, itemId } = req.params;
    
    db.run(`
      DELETE FROM balance_sheet_items 
      WHERE id = ? AND balance_sheet_id = ?
    `, [itemId, balanceSheetId], function(err) {
      if (err) {
        console.error("Bilanço kalemi silme hatası:", err.message);
        res.status(500).json({ error: err.message });
      } else if (this.changes === 0) {
        res.status(404).json({ error: "Silinecek kalem bulunamadı" });
      } else {
        console.log(`✅ Bilanço kalemi silindi: ID ${itemId}`);
        res.json({
          success: true,
          message: "Bilanço kalemi başarıyla silindi"
        });
      }
    });
  } catch (error) {
    console.error("Bilanço kalemi silme hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bilanço toplamlarını hesapla endpoint'i
app.post("/balance-sheets/:balanceSheetId/calculate-totals", (req, res) => {
  try {
    const { balanceSheetId } = req.params;
    
    db.all(`
      SELECT * FROM balance_sheet_items 
      WHERE balance_sheet_id = ?
    `, [balanceSheetId], (err, items) => {
      if (err) {
        console.error("Toplam hesaplama hatası:", err.message);
        res.status(500).json({ error: err.message });
      } else {
        // Aktif ve pasif toplamları hesapla
        const aktifToplam = items
          .filter(item => item.account_type === 'active')
          .reduce((sum, item) => sum + (item.current_year_amount || 0), 0);
        
        const pasifToplam = items
          .filter(item => item.account_type === 'passive')
          .reduce((sum, item) => sum + (item.current_year_amount || 0), 0);
        
        const isBalanced = Math.abs(aktifToplam - pasifToplam) < 0.01;
        
        console.log(`📊 Toplam hesaplandı: Aktif=${aktifToplam}, Pasif=${pasifToplam}, Dengeli=${isBalanced}`);
        
        res.json({
          balance_sheet_id: parseInt(balanceSheetId),
          aktif_toplam: aktifToplam,
          pasif_toplam: pasifToplam,
          is_balanced: isBalanced,
          difference: aktifToplam - pasifToplam,
          item_count: items.length
        });
      }
    });
  } catch (error) {
    console.error("Toplam hesaplama hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Mevcut hesap tiplerini düzelt endpoint'i
app.post("/fix-account-types", (req, res) => {
  try {
    console.log("Mevcut hesap tipleri düzeltiliyor...");
    
    db.all(`SELECT id, account_code, account_name FROM balance_sheet_items`, [], (err, items) => {
      if (err) {
        console.error("Hesap tipleri düzeltme hatası:", err.message);
        return res.status(500).json({ error: err.message });
      }
      
      let updatedCount = 0;
      let processedCount = 0;
      
      items.forEach(item => {
        let accountType = 'active'; // varsayılan
        
        if (item.account_code) {
          if (item.account_code.startsWith('P.')) {
            accountType = 'passive';
          } else if (item.account_code.startsWith('A.')) {
            accountType = 'active';
          }
        }
        
        // Hesap adından da kontrol et
        if (item.account_name && item.account_name.toUpperCase().includes('PASİF')) {
          accountType = 'passive';
        } else if (item.account_name && item.account_name.toUpperCase().includes('AKTİF')) {
          accountType = 'active';
        }
        
        db.run(`
          UPDATE balance_sheet_items 
          SET account_type = ? 
          WHERE id = ?
        `, [accountType, item.id], function(err) {
          processedCount++;
          if (err) {
            console.error(`Hesap tipi güncelleme hatası (ID: ${item.id}):`, err.message);
          } else if (this.changes > 0) {
            updatedCount++;
            console.log(`✅ Hesap tipi güncellendi: ${item.account_code} -> ${accountType}`);
          }
          
          // Tüm kayıtlar işlendiyse yanıt döndür
          if (processedCount === items.length) {
            res.json({
              success: true,
              message: `${updatedCount}/${items.length} hesap tipi güncellendi`,
              updated: updatedCount,
              total: items.length
            });
          }
        });
      });
      
      if (items.length === 0) {
        res.json({
          success: true,
          message: "Güncellenecek hesap bulunamadı",
          updated: 0,
          total: 0
        });
      }
    });
  } catch (error) {
    console.error("Hesap tipleri düzeltme hatası:", error);
    res.status(500).json({ error: error.message });
  }
});

// Şirket silme endpoint'i
app.delete("/companies/:companyId", (req, res) => {
  try {
    const { companyId } = req.params;
    console.log("Şirket silme isteği:", companyId);
    
    // Önce şirketin var olup olmadığını kontrol et
    db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, company) => {
      if (err) {
        console.error('Şirket kontrol hatası:', err.message);
        return res.status(500).json({ 
          error: `Şirket kontrolü yapılamadı: ${err.message}` 
        });
      }
      
      if (!company) {
        return res.status(404).json({ 
          error: "Silinecek şirket bulunamadı" 
        });
      }
      
      // Şirketle bağlı bilançoları kontrol et
      db.all(`
        SELECT id, year, period, creation_date, pdf_filename, analysis_status
        FROM balance_sheets 
        WHERE company_id = ?
        ORDER BY year DESC, creation_date DESC
      `, [companyId], (err, balanceSheets) => {
        if (err) {
          console.error('Bilanço kontrol hatası:', err.message);
          return res.status(500).json({ 
            error: `Bilanço kontrolü yapılamadı: ${err.message}` 
          });
        }
        
        if (balanceSheets.length > 0) {
          // Bağlı bilançolar var, uyarı döndür
          return res.json({
            can_delete: false,
            company: company,
            related_balance_sheets: balanceSheets,
            message: `Bu şirketle bağlı ${balanceSheets.length} adet bilanço bulundu. Şirketi silmek için önce bu bilançoları silmeniz gerekir.`,
            warning: "Şirket silinirse tüm bağlı bilançolar ve analizler de silinecektir!"
          });
        }
        
        // Bağlı bilanço yok, şirketi sil
        db.run('DELETE FROM companies WHERE id = ?', [companyId], function(err) {
          if (err) {
            console.error('Şirket silme hatası:', err.message);
            return res.status(500).json({ 
              error: `Şirket silinemedi: ${err.message}` 
            });
          }
          
          if (this.changes === 0) {
            return res.status(404).json({ 
              error: "Silinecek şirket bulunamadı" 
            });
          }
          
          console.log(`✅ Şirket silindi: ${company.name} (ID: ${companyId})`);
          
          res.json({
            success: true,
            message: `"${company.name}" şirketi başarıyla silindi`,
            deleted_company: company
          });
        });
      });
    });
    
  } catch (error) {
    console.error("Şirket silme hatası:", error);
    res.status(500).json({ 
      error: `Şirket silinemedi: ${error.message}` 
    });
  }
});

// Şirketi zorla sil (tüm bağlı verilerle birlikte)
app.delete("/companies/:companyId/force", (req, res) => {
  try {
    const { companyId } = req.params;
    console.log("Şirket zorla silme isteği:", companyId);
    
    // Önce şirketin var olup olmadığını kontrol et
    db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, company) => {
      if (err) {
        console.error('Şirket kontrol hatası:', err.message);
        return res.status(500).json({ 
          error: `Şirket kontrolü yapılamadı: ${err.message}` 
        });
      }
      
      if (!company) {
        return res.status(404).json({ 
          error: "Silinecek şirket bulunamadı" 
        });
      }
      
      // Silme işlemini transaction olarak yap
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let deletedBalanceSheets = 0;
        let deletedItems = 0;
        let errors = [];
        
        // 1. Bilanço kalemlerini sil
        db.run('DELETE FROM balance_sheet_items WHERE company_id = ?', [companyId], function(err) {
          if (err) {
            errors.push(`Bilanço kalemleri silinemedi: ${err.message}`);
          } else {
            deletedItems = this.changes;
            console.log(`${deletedItems} bilanço kalemi silindi`);
          }
        });
        
        // 2. Finansal oranları sil
        db.run('DELETE FROM financial_ratios WHERE company_id = ?', [companyId], function(err) {
          if (err) {
            errors.push(`Finansal oranlar silinemedi: ${err.message}`);
          } else {
            console.log(`${this.changes} finansal oran silindi`);
          }
        });
        
        // 3. Analiz raporlarını sil
        db.run('DELETE FROM analysis_reports WHERE company_id = ?', [companyId], function(err) {
          if (err) {
            errors.push(`Analiz raporları silinemedi: ${err.message}`);
          } else {
            console.log(`${this.changes} analiz raporu silindi`);
          }
        });
        
        // 4. Karşılaştırmalı analizleri sil
        db.run('DELETE FROM comparative_analyses WHERE primary_company_id = ? OR secondary_company_id = ?', [companyId, companyId], function(err) {
          if (err) {
            errors.push(`Karşılaştırmalı analizler silinemedi: ${err.message}`);
          } else {
            console.log(`${this.changes} karşılaştırmalı analiz silindi`);
          }
        });
        
        // 5. Bilançoları sil
        db.run('DELETE FROM balance_sheets WHERE company_id = ?', [companyId], function(err) {
          if (err) {
            errors.push(`Bilançolar silinemedi: ${err.message}`);
          } else {
            deletedBalanceSheets = this.changes;
            console.log(`${deletedBalanceSheets} bilanço silindi`);
          }
        });
        
        // 6. Son olarak şirketi sil
        db.run('DELETE FROM companies WHERE id = ?', [companyId], function(err) {
          if (err) {
            errors.push(`Şirket silinemedi: ${err.message}`);
            db.run('ROLLBACK');
            return res.status(500).json({ 
              error: `Şirket silinemedi: ${errors.join(', ')}` 
            });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).json({ 
              error: "Silinecek şirket bulunamadı" 
            });
          }
          
          if (errors.length > 0) {
            db.run('ROLLBACK');
            return res.status(500).json({ 
              error: `Silme işlemi tamamlanamadı: ${errors.join(', ')}` 
            });
          }
          
          db.run('COMMIT');
          
          console.log(`✅ Şirket ve tüm bağlı verileri silindi: ${company.name} (ID: ${companyId})`);
          
          res.json({
            success: true,
            message: `"${company.name}" şirketi ve tüm bağlı verileri başarıyla silindi`,
            deleted_company: company,
            deleted_balance_sheets: deletedBalanceSheets,
            deleted_items: deletedItems
          });
        });
      });
    });
    
  } catch (error) {
    console.error("Şirket zorla silme hatası:", error);
    res.status(500).json({ 
      error: `Şirket silinemedi: ${error.message}` 
    });
  }
});

// JSON verisine göre PDF yükle ve analiz et endpoint'i
app.post("/analyze-pdf-with-json", upload.single("file"), async (req, res) => {
  try {
    console.log("📄 JSON verisi ile PDF analiz isteği alındı");
    
    if (!req.file) {
      return res.status(400).json({ error: "PDF dosyası bulunamadı" });
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (fileExtension !== ".pdf") {
      await fs.remove(file.path);
      return res.status(400).json({ error: "Sadece PDF dosyaları kabul edilir" });
    }

    // Request body'den JSON veri yapısını al
    const { 
      company_info, 
      analysis_metadata,
      target_year = null,
      target_period = "YILLIK"
    } = req.body;

    console.log("🏢 Şirket bilgileri:", company_info);
    console.log("📊 Analiz metadata:", analysis_metadata);

    // Mali verileri Gemini AI ile çıkar
    const financialData = await extractFinancialDataWithGemini(file.path);

    if (financialData.error) {
      await fs.remove(file.path);
      return res.status(500).json({ error: financialData.error });
    }

    // Şirket bilgilerini veritabanından kontrol et
    let companyId = null;
    let detectedCompany = null;

    if (company_info && company_info.tax_number) {
      const company = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM companies WHERE tax_number = ?', [company_info.tax_number], (err, row) => {
          if (err) {
            console.error('Şirket kontrolü hatası:', err.message);
            resolve(null);
          } else {
            resolve(row);
          }
        });
      });

      if (company) {
        companyId = company.id;
        detectedCompany = company;
        console.log(`✅ VKN ${company_info.tax_number} ile şirket bulundu:`, company.name);
      } else {
        console.log(`⚠️ VKN ${company_info.tax_number} ile şirket bulunamadı`);
      }
    }

    // PDF'den çıkarılan veriyi işle
    let detectedData = {
      company_name: detectedCompany ? detectedCompany.name : (company_info?.name || "Bilinmeyen Şirket"),
      tax_number: company_info?.tax_number || "",
      year: target_year || analysis_metadata?.year || new Date().getFullYear(),
      period: target_period || analysis_metadata?.period || "YILLIK",
      items: []
    };

    // Gemini'den gelen veriyi işle
    if (financialData.company_info) {
      // Yeni format - company_info ve balance_data ayrı
      detectedData = {
        ...detectedData,
        company_name: financialData.company_info.company_name || detectedData.company_name,
        tax_number: financialData.company_info.tax_number || detectedData.tax_number,
        year: financialData.company_info.year || detectedData.year,
        period: financialData.company_info.period || detectedData.period
      };

      if (financialData.balance_data && Array.isArray(financialData.balance_data)) {
        detectedData.items = financialData.balance_data.map(item => ({
          definition: item.definition || item.account_code || "eşleşmedi",
          account_name: item.account_name || item.description || "",
          description: item.description || item.account_name || "",
          ...Object.keys(item).reduce((acc, key) => {
            if (/^\d{4}(_E)?$/.test(key)) {
              acc[key] = item[key];
            }
            return acc;
          }, {})
        }));
      }
    } else if (Array.isArray(financialData)) {
      // Eski format - doğrudan array
      detectedData.items = financialData.map(item => ({
        definition: item.definition || "eşleşmedi",
        account_name: item.account_name || item.description || "",
        description: item.description || item.account_name || "",
        ...Object.keys(item).reduce((acc, key) => {
          if (/^\d{4}(_E)?$/.test(key)) {
            acc[key] = item[key];
          }
          return acc;
        }, {})
      }));
    }

    // Başarılı yanıt döndür
    const response = {
      success: true,
      filename: file.originalname,
      detected_data: detectedData,
      company_info: detectedCompany,
      analysis_metadata: {
        filename: file.originalname,
        year: detectedData.year,
        period: detectedData.period,
        processed_at: new Date().toISOString(),
        items_count: detectedData.items.length
      },
      raw_financial_data: financialData
    };

    console.log("✅ PDF analiz sonucu hazırlandı:", {
      company: detectedData.company_name,
      items_count: detectedData.items.length,
      year: detectedData.year,
      period: detectedData.period
    });

    res.json(response);

    // Geçici dosyayı temizle
    await fs.remove(file.path);

  } catch (error) {
    console.error("❌ JSON PDF analiz hatası:", error);
    
    // Geçici dosyayı temizle
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error("Dosya temizleme hatası:", cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: `PDF analiz hatası: ${error.message}`,
      details: error.stack
    });
  }
});

// Balance sheet preview için veri hazırlama endpoint'i
app.post("/balance-sheets/prepare-preview", async (req, res) => {
  try {
    console.log("📊 Bilanço önizleme verisi hazırlanıyor");
    
    const { 
      detected_data, 
      company_info, 
      analysis_metadata 
    } = req.body;

    if (!detected_data || !detected_data.items) {
      return res.status(400).json({ 
        error: "Analiz edilmiş veri bulunamadı" 
      });
    }

    // Account codes'u yükle
    const accountCodes = JSON.parse(await fs.readFile("account_codes.json", 'utf8'));
    
    // PDF'den gelen kalemlerle hesap planını eşleştir
    const mappedItems = detected_data.items.map(item => {
      // Account code'u hesap planından bul
      const accountCode = accountCodes.find(acc => 
        acc.code === item.definition || 
        acc.name.toLowerCase().includes(item.account_name.toLowerCase())
      );

      return {
        account_code: item.definition,
        account_name: item.account_name || item.description,
        description: item.description || item.account_name,
        matched_account: accountCode || null,
        year_data: Object.keys(item).reduce((acc, key) => {
          if (/^\d{4}(_E)?$/.test(key)) {
            acc[key] = item[key];
          }
          return acc;
        }, {}),
        raw_item: item
      };
    });

    // Yıl kolonlarını tespit et
    const allYears = new Set();
    mappedItems.forEach(item => {
      Object.keys(item.year_data).forEach(year => {
        allYears.add(year);
      });
    });

    const yearColumns = Array.from(allYears).sort();

    // Preview verisi oluştur
    const previewData = {
      company_info: {
        name: detected_data.company_name,
        tax_number: detected_data.tax_number,
        email: company_info?.email || "",
        industry: company_info?.industry || ""
      },
      detected_data: {
        company_name: detected_data.company_name,
        tax_number: detected_data.tax_number,
        year: detected_data.year,
        period: detected_data.period,
        items: mappedItems,
        year_columns: yearColumns,
        previous_period_year: yearColumns.length > 1 ? parseInt(yearColumns[yearColumns.length - 2]) : null,
        current_period_year: parseInt(yearColumns[yearColumns.length - 1]) || detected_data.year
      },
      analysis_metadata: {
        filename: analysis_metadata?.filename || "unknown.pdf",
        year: detected_data.year,
        period: detected_data.period,
        processed_at: new Date().toISOString(),
        total_items: mappedItems.length,
        matched_items: mappedItems.filter(item => item.matched_account).length
      }
    };

    console.log("✅ Önizleme verisi hazırlandı:", {
      company: previewData.company_info.name,
      total_items: previewData.analysis_metadata.total_items,
      matched_items: previewData.analysis_metadata.matched_items,
      year_columns: yearColumns
    });

    res.json({
      success: true,
      preview_data: previewData
    });

  } catch (error) {
    console.error("❌ Önizleme verisi hazırlama hatası:", error);
    res.status(500).json({ 
      error: `Önizleme verisi hazırlanırken hata: ${error.message}` 
    });
  }
});

// Balance sheet preview verilerini kaydet
app.post("/balance-sheets/save-preview", async (req, res) => {
  try {
    console.log("💾 Bilanço önizleme verisi kaydediliyor");
    
    const { preview_data } = req.body;
    
    if (!preview_data) {
      return res.status(400).json({ error: "Kaydedilecek veri bulunamadı" });
    }

    const { company_info, detected_data, analysis_metadata } = preview_data;

    // Şirketi kontrol et veya oluştur
    let companyId = null;
    if (company_info.tax_number) {
      const existingCompany = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM companies WHERE tax_number = ?', [company_info.tax_number], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        // Yeni şirket oluştur
        companyId = await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO companies (name, tax_number, email, industry)
            VALUES (?, ?, ?, ?)
          `, [
            company_info.name,
            company_info.tax_number,
            company_info.email || "",
            company_info.industry || "PDF'den"
          ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });
        console.log("🏢 Yeni şirket oluşturuldu, ID:", companyId);
      }
    }

    // Bilanço kaydı oluştur
    const balanceSheetId = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO balance_sheets (
          company_id, company_name, tax_number, year, period, 
          pdf_filename, raw_pdf_data, analysis_status, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        companyId,
        company_info.name,
        company_info.tax_number,
        detected_data.year,
        detected_data.period,
        analysis_metadata.filename,
        JSON.stringify(detected_data),
        'completed',
        'TL'
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Bilanço kalemlerini kaydet
    const items = detected_data.items || [];
    let savedItemsCount = 0;

    for (const item of items) {
      try {
        // Yıl verilerini parse et
        const yearData = item.year_data || {};
        const currentYearKey = detected_data.current_period_year?.toString();
        const previousYearKey = detected_data.previous_period_year?.toString();
        
        const currentAmount = yearData[currentYearKey] ? 
          parseFloat(yearData[currentYearKey].toString().replace(/[.,]/g, '').replace(/[^\d]/g, '')) / 100 : 0;
        const previousAmount = yearData[previousYearKey] ? 
          parseFloat(yearData[previousYearKey].toString().replace(/[.,]/g, '').replace(/[^\d]/g, '')) / 100 : 0;

        // Hesap tipini belirle (A = aktif, P = pasif)
        const accountType = item.account_code?.startsWith('A') ? 'active' : 'passive';

        await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO balance_sheet_items (
              balance_sheet_id, company_id, account_code, account_name, 
              account_type, current_year_amount, previous_year_amount, year, period
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            balanceSheetId, companyId, item.account_code, item.account_name,
            accountType, currentAmount, previousAmount, detected_data.year, detected_data.period
          ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          });
        });

        savedItemsCount++;
      } catch (itemError) {
        console.error(`❌ Kalem kaydetme hatası (${item.account_code}):`, itemError);
      }
    }

    console.log("✅ Bilanço başarıyla kaydedildi:", {
      balance_sheet_id: balanceSheetId,
      company_id: companyId,
      saved_items: savedItemsCount,
      company: company_info.name
    });

    res.json({
      success: true,
      message: "Bilanço başarıyla kaydedildi",
      balance_sheet_id: balanceSheetId,
      company_id: companyId,
      saved_items_count: savedItemsCount
    });

  } catch (error) {
    console.error("❌ Bilanço kaydetme hatası:", error);
    res.status(500).json({ 
      error: `Bilanço kaydedilirken hata: ${error.message}` 
    });
  }
});

// VKN ile şirket kontrol endpoint'i
app.get("/companies/check-tax/:taxNumber", (req, res) => {
  try {
    const { taxNumber } = req.params;
    console.log("VKN kontrolü istendi:", taxNumber);
    
    // VKN formatı kontrolü - 10 haneli mi?
    const isValidFormat = /^\d{10}$/.test(taxNumber);
    
    if (!isValidFormat) {
      return res.json({
        exists: false,
        valid: false,
        message: "VKN geçersiz formatta. 10 haneli sayısal değer olmalıdır"
      });
    }
    
    // Veritabanında bu VKN'yi ara
    db.get('SELECT id, name, tax_number FROM companies WHERE tax_number = ?', [taxNumber], (err, row) => {
      if (err) {
        console.error('VKN kontrol veritabanı hatası:', err.message);
        return res.status(500).json({ 
          error: `VKN kontrolü yapılamadı: ${err.message}` 
        });
      }
      
      if (row) {
        return res.json({
          exists: true,
          valid: true,
          message: "Bu VKN ile kayıtlı şirket bulundu",
          company: row
        });
      } else {
        return res.json({
      exists: false,
          valid: true,
          message: "Bu VKN geçerli formatta ancak kayıtlı şirket bulunamadı"
        });
      }
    });
    
  } catch (error) {
    console.error("VKN kontrol hatası:", error);
    res.status(500).json({ 
      error: `VKN kontrolü yapılamadı: ${error.message}` 
    });
  }
});

// Şirketin bilanço geçmişini getir
app.get("/companies/:companyId/balance-sheets", (req, res) => {
  try {
    const { companyId } = req.params;
    
    if (!/^\d+$/.test(companyId)) {
      return res.status(400).json({ 
        error: "Geçersiz şirket ID formatı" 
      });
    }
    
    console.log("Şirket bilanço geçmişi istendi:", companyId);
    
    db.all(`
      SELECT id, year, period, creation_date, analysis_status, 
             pdf_filename, currency, notes
      FROM balance_sheets 
      WHERE company_id = ?
      ORDER BY year DESC, 
               CASE period 
                 WHEN 'YILLIK' THEN 4
                 WHEN 'Q4' THEN 4  
                 WHEN 'Q3' THEN 3
                 WHEN 'Q2' THEN 2
                 WHEN 'Q1' THEN 1
                 ELSE 0
               END DESC
    `, [companyId], (err, rows) => {
      if (err) {
        console.error('Bilanço geçmişi sorgu hatası:', err.message);
        return res.status(500).json({ 
          error: `Bilanço geçmişi alınamadı: ${err.message}` 
        });
      }
      
      console.log(`${rows.length} bilanço kaydı bulundu (Şirket ID: ${companyId})`);
      res.json(rows);
    });
    
  } catch (error) {
    console.error("Bilanço geçmişi hatası:", error);
    res.status(500).json({ 
      error: `Bilanço geçmişi alınamadı: ${error.message}` 
    });
  }
});

// Şirket özet bilgilerini getir  
app.get("/companies/:companyId/summary", (req, res) => {
  try {
    const { companyId } = req.params;
    
    if (!/^\d+$/.test(companyId)) {
      return res.status(400).json({ 
        error: "Geçersiz şirket ID formatı" 
      });
    }
    
    console.log("Şirket özet bilgileri istendi:", companyId);
    
    // Şirket temel bilgileri ve istatistikleri
    db.get(`
      SELECT 
        c.name, c.tax_number, c.establishment_date, c.industry, c.created_at,
        COUNT(bs.id) as total_balance_sheets,
        MAX(bs.year) as latest_year,
        COUNT(DISTINCT bs.year) as years_count
      FROM companies c
      LEFT JOIN balance_sheets bs ON c.id = bs.company_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [companyId], (err, summary) => {
      if (err) {
        console.error('Şirket özet sorgu hatası:', err.message);
        return res.status(500).json({ 
          error: `Şirket özeti alınamadı: ${err.message}` 
        });
      }
      
      if (!summary) {
        return res.status(404).json({ 
          error: "Şirket bulunamadı" 
        });
      }
      
      // Ek istatistikler hesapla
      const responseData = {
        company_name: summary.name,
        tax_number: summary.tax_number,
        establishment_date: summary.establishment_date,
        industry: summary.industry,
        registration_date: summary.created_at,
        statistics: {
          total_balance_sheets: summary.total_balance_sheets,
          latest_year: summary.latest_year,
          years_analyzed: summary.years_count,
          analysis_period: summary.latest_year && summary.years_count > 1 
            ? `${summary.latest_year - summary.years_count + 1} - ${summary.latest_year}`
            : summary.latest_year?.toString() || 'Henüz analiz yok'
        }
      };
      
      console.log(`Şirket özet bilgileri hazırlandı (ID: ${companyId})`);
      res.json(responseData);
    });
    
  } catch (error) {
    console.error("Şirket özet hatası:", error);
    res.status(500).json({ 
      error: `Şirket özeti alınamadı: ${error.message}` 
    });
  }
});