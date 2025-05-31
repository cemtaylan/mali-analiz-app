const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Geçici dosya depolama için multer ayarları
const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

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
  { id: 206, name: 'F-ÖZEL TÜKENMEKTE TABİİ VARLIKLAR', code: 'A.2.6', type: 'active', parent_id: 20 },
  { id: 207, name: 'G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI', code: 'A.2.7', type: 'active', parent_id: 20 },
  { id: 208, name: 'H-DİĞER DURAN VARLIKLAR', code: 'A.2.8', type: 'active', parent_id: 20 },
  
  // A-TİCARİ ALACAKLAR (Duran Varlık) detayları
  { id: 2000, name: '1-ALICILAR', code: 'A.2.1.1', type: 'active', parent_id: 200 },
  { id: 2001, name: '2-ALACAK SENETLERİ', code: 'A.2.1.2', type: 'active', parent_id: 200 },
  { id: 2002, name: '3-ALACAK SENETLERİ REESKONTU (-)', code: 'A.2.1.3', type: 'active', parent_id: 200 },
  { id: 2003, name: '4-KAZANILMAMIŞ FİNANSMAN KİRALAMA FAİZ GELİRLERİ (-)', code: 'A.2.1.4', type: 'active', parent_id: 200 },
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
  { id: 2021, name: '2-MALİ DURAN VARLIKLAR DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.2', type: 'active', parent_id: 202 },
  { id: 2022, name: '3-İŞTİRAKLER', code: 'A.2.3.3', type: 'active', parent_id: 202 },
  { id: 2023, name: '4-İŞTİRAKLER SERMAYE TAAHHÜTLERI (-)', code: 'A.2.3.4', type: 'active', parent_id: 202 },
  { id: 2024, name: '5-İŞTİRAKLER SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.5', type: 'active', parent_id: 202 },
  { id: 2025, name: '6-BAĞLI ORTAKLIKLAR', code: 'A.2.3.6', type: 'active', parent_id: 202 },
  { id: 2026, name: '7-BAĞLI ORTAKLIKLARA SERMAYE TAAHHÜTLERI (-)', code: 'A.2.3.7', type: 'active', parent_id: 202 },
  { id: 2027, name: '8-BAĞLI ORTAKLIKLAR SERMAYE PAYLARI DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.8', type: 'active', parent_id: 202 },
  { id: 2028, name: '9-DİĞER MALİ DURAN VARLIKLAR', code: 'A.2.3.9', type: 'active', parent_id: 202 },
  { id: 2029, name: '10-DİĞER MALİ DURAN VARLIKLAR DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.3.10', type: 'active', parent_id: 202 },
  
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
  { id: 2061, name: '2-HAZİRLIK VE GELİŞTİRME GİDERLERİ', code: 'A.2.6.2', type: 'active', parent_id: 206 },
  { id: 2062, name: '3-DİĞER ÖZEL TÜKENMEKTE TABİİ VARLIKLAR', code: 'A.2.6.3', type: 'active', parent_id: 206 },
  { id: 2063, name: '4-BİRİKMİŞ TÜKENME PAYLARI (-)', code: 'A.2.6.4', type: 'active', parent_id: 206 },
  { id: 2064, name: '5-VERİLEN AVANSLAR', code: 'A.2.6.5', type: 'active', parent_id: 206 },

  // G-GELECEK YILLARA AİT GİDERLER VE GELİR TAHAKKUKLARI detayları
  { id: 2070, name: '1-GELECEK YILLARA AİT GİDERLER', code: 'A.2.7.1', type: 'active', parent_id: 207 },
  { id: 2071, name: '2-GELİR TAHAKKUKLARI', code: 'A.2.7.2', type: 'active', parent_id: 207 },
  
  // H-DİĞER DURAN VARLIKLAR detayları
  { id: 2080, name: '1-GELECEK YILLARDA İNDİRİLECEK KATMA DEĞER VERGİSİ', code: 'A.2.8.1', type: 'active', parent_id: 208 },
  { id: 2081, name: '2-DİĞER KATMA DEĞER VERGİSİ', code: 'A.2.8.2', type: 'active', parent_id: 208 },
  { id: 2082, name: '3-GELECEK YILLARA AİT İNTO STOKLARI', code: 'A.2.8.3', type: 'active', parent_id: 208 },
  { id: 2083, name: '4-ELDEN ÇIKARILANACAK STOKLAR VE MADDİ DURAN VARLIKLAR', code: 'A.2.8.4', type: 'active', parent_id: 208 },
  { id: 2084, name: '5-PEŞİN ÖDENEN VERGİLER VE FONLAR', code: 'A.2.8.5', type: 'active', parent_id: 208 },
  { id: 2085, name: '6-DİĞER HESAP', code: 'A.2.8.6', type: 'active', parent_id: 208 },
  { id: 2086, name: '7-DİĞER ÇEŞİTLİ DURAN VARLIKLAR', code: 'A.2.8.7', type: 'active', parent_id: 208 },
  { id: 2087, name: '8-STOK DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.2.8.8', type: 'active', parent_id: 208 },
  { id: 2088, name: '9-BİRİKMİŞ AMORTİSMANLAR (-)', code: 'A.2.8.9', type: 'active', parent_id: 208 },

  // PASİF - Ana gruplar
  { id: 30, name: 'I-KISA VADELİ YABANCI KAYNAKLAR', code: 'P.1', type: 'passive', parent_id: 2 },
  { id: 40, name: 'II-UZUN VADELİ YABANCI KAYNAKLAR', code: 'P.2', type: 'passive', parent_id: 2 },
  { id: 50, name: 'III-ÖZKAYNAKLAR', code: 'P.3', type: 'passive', parent_id: 2 },
  
  // I-KISA VADELİ YABANCI KAYNAKLAR alt grupları
  { id: 300, name: 'A-FİNANSAL BORÇLAR', code: 'P.1.1', type: 'passive', parent_id: 30 },
  { id: 301, name: 'B-TİCARİ BORÇLAR', code: 'P.1.2', type: 'passive', parent_id: 30 },
  { id: 302, name: 'C-DİĞER BORÇLAR', code: 'P.1.3', type: 'passive', parent_id: 30 },
  { id: 303, name: 'Ç-ALINAN AVANSLAR', code: 'P.1.4', type: 'passive', parent_id: 30 },
  { id: 304, name: 'D-YILLARA YAYGIN İNŞAAT VE ONARIM HAKEDİŞLERİ', code: 'P.1.5', type: 'passive', parent_id: 30 },
  { id: 305, name: 'E-ÖDENECEK VERGİ VE FONLAR', code: 'P.1.6', type: 'passive', parent_id: 30 },
  { id: 306, name: 'F-BORÇ VE GİDER KARŞILIKLARI', code: 'P.1.7', type: 'passive', parent_id: 30 },
  { id: 307, name: 'G-GELECEKTEKİ AYLARA AİT GELİRLER VE GİDER TAHAKKUKLARI', code: 'P.1.8', type: 'passive', parent_id: 30 },
  
  // A-FİNANSAL BORÇLAR detayları
  { id: 3000, name: 'BANKA KREDİLERİ', code: 'P.1.1.1', type: 'passive', parent_id: 300 },
  { id: 3001, name: 'UZUN VADELİ KREDİLERİN ANAPARA TAKSİTLERİ VE FAİZLERİ', code: 'P.1.1.2', type: 'passive', parent_id: 300 },
  { id: 3002, name: 'ÇIKARILMIŞ TAHVILLER', code: 'P.1.1.3', type: 'passive', parent_id: 300 },
  { id: 3003, name: 'ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: 'P.1.1.4', type: 'passive', parent_id: 300 },
  { id: 3004, name: 'MENKUL KIYMETLER İHRAÇ FARKI', code: 'P.1.1.5', type: 'passive', parent_id: 300 },
  { id: 3005, name: 'DİĞER FİNANSAL BORÇLAR', code: 'P.1.1.6', type: 'passive', parent_id: 300 },
  { id: 3006, name: 'FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: 'P.1.1.7', type: 'passive', parent_id: 300 },
  { id: 3007, name: 'ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: 'P.1.1.8', type: 'passive', parent_id: 300 },
  
  // B-TİCARİ BORÇLAR detayları
  { id: 3010, name: 'SATICILAR', code: 'P.1.2.1', type: 'passive', parent_id: 301 },
  { id: 3011, name: 'BORÇ SENETLERİ', code: 'P.1.2.2', type: 'passive', parent_id: 301 },
  { id: 3012, name: 'BORÇ SENETLERİ REESKONTU (-)', code: 'P.1.2.3', type: 'passive', parent_id: 301 },
  { id: 3013, name: 'ALINAN DEPOZİTO VE TEMİNATLAR', code: 'P.1.2.4', type: 'passive', parent_id: 301 },
  { id: 3014, name: 'DİĞER TİCARİ BORÇLAR', code: 'P.1.2.5', type: 'passive', parent_id: 301 },
  
  // C-DİĞER BORÇLAR detayları
  { id: 3020, name: 'ORTAKLARA BORÇLAR', code: 'P.1.3.1', type: 'passive', parent_id: 302 },
  { id: 3021, name: 'İŞTİRAKLERE BORÇLAR', code: 'P.1.3.2', type: 'passive', parent_id: 302 },
  { id: 3022, name: 'BAĞLI ORTAKLIKLARA BORÇLAR', code: 'P.1.3.3', type: 'passive', parent_id: 302 },
  { id: 3023, name: 'PERSONELE BORÇLAR', code: 'P.1.3.4', type: 'passive', parent_id: 302 },
  { id: 3024, name: 'DİĞER ÇEŞİTLİ BORÇLAR', code: 'P.1.3.5', type: 'passive', parent_id: 302 },
  { id: 3025, name: 'DİĞER BORÇ SENETLERİ REESKONTU (-)', code: 'P.1.3.6', type: 'passive', parent_id: 302 },
  
  // Ç-ALINAN AVANSLAR detayları
  { id: 3030, name: 'ALINAN SİPARİŞ AVANSLARI', code: 'P.1.4.1', type: 'passive', parent_id: 303 },
  { id: 3031, name: 'ALINAN DİĞER AVANSLAR', code: 'P.1.4.2', type: 'passive', parent_id: 303 },
  
  // E-ÖDENECEK VERGİ VE FONLAR detayları
  { id: 3040, name: 'ÖDENECEK VERGİ VE FONLAR', code: 'P.1.6.1', type: 'passive', parent_id: 305 },
  { id: 3041, name: 'ÖDENECEK SOSYAL GÜVENLİK KESİNTİLERİ', code: 'P.1.6.2', type: 'passive', parent_id: 305 },
  { id: 3042, name: 'VADESİ GEÇMİŞ ERTELENMİŞ VEYA TAKSİTLENDİRİLMİŞ VERGİ VE DİĞER YÜKÜMLÜLÜKLER', code: 'P.1.6.3', type: 'passive', parent_id: 305 },
  { id: 3043, name: 'ÖDENECEK DİĞER YÜKÜMLÜLÜKLER', code: 'P.1.6.4', type: 'passive', parent_id: 305 },
  
  // F-BORÇ VE GİDER KARŞILIKLARI detayları
  { id: 3050, name: 'DÖNEM KARI VERGİ VE DİĞER YASAL YÜKÜMLÜLÜK KARŞILIKLARI', code: 'P.1.7.1', type: 'passive', parent_id: 306 },
  { id: 3051, name: 'DÖNEM KARININ PEŞİN ÖDENEN VERGİ VE DİĞER YÜKÜMLÜLÜKLER (-)', code: 'P.1.7.2', type: 'passive', parent_id: 306 },
  { id: 3052, name: 'DÖNEM TAZMINATI KARŞILIĞI', code: 'P.1.7.3', type: 'passive', parent_id: 306 },
  { id: 3053, name: 'MALİYET GİDERLERİ KARŞILIĞI', code: 'P.1.7.4', type: 'passive', parent_id: 306 },
  { id: 3054, name: 'DİĞER BORÇ VE GİDER KARŞILIKLARI', code: 'P.1.7.5', type: 'passive', parent_id: 306 },
  
  // II-UZUN VADELİ YABANCI KAYNAKLAR alt grupları
  { id: 400, name: 'A-FİNANSAL BORÇLAR', code: 'P.2.1', type: 'passive', parent_id: 40 },
  { id: 401, name: 'B-TİCARİ BORÇLAR', code: 'P.2.2', type: 'passive', parent_id: 40 },
  { id: 402, name: 'C-DİĞER BORÇLAR', code: 'P.2.3', type: 'passive', parent_id: 40 },
  { id: 403, name: 'Ç-ALINAN AVANSLAR', code: 'P.2.4', type: 'passive', parent_id: 40 },
  { id: 404, name: 'D-BORÇ VE GİDER KARŞILIKLARI', code: 'P.2.5', type: 'passive', parent_id: 40 },
  { id: 405, name: 'E-GELECEKTEKİ YILLARA AİT GELİRLER', code: 'P.2.6', type: 'passive', parent_id: 40 },
  
  // A-FİNANSAL BORÇLAR (Uzun Vadeli) detayları
  { id: 4000, name: '1-BANKA KREDİLERİ', code: 'P.2.1.1', type: 'passive', parent_id: 400 },
  { id: 4001, name: '2-FİNANSAL KİRALAMA İŞLEMLERİNDEN BORÇLAR', code: 'P.2.1.2', type: 'passive', parent_id: 400 },
  { id: 4002, name: '3-ERTELENMİŞ FİNANSAL KİRALAMA BORÇLANMA MALİYETLERİ (-)', code: 'P.2.1.3', type: 'passive', parent_id: 400 },
  { id: 4003, name: '4-ÇIKARILMIŞ TAHVILLER', code: 'P.2.1.4', type: 'passive', parent_id: 400 },
  { id: 4004, name: '5-ÇIKARILMIŞ DİĞER MENKUL KIYMETLER', code: 'P.2.1.5', type: 'passive', parent_id: 400 },
  { id: 4005, name: '6-MENKUL KIYMETLER İHRAÇ FARKI', code: 'P.2.1.6', type: 'passive', parent_id: 400 },
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
  { id: 4023, name: '4-PERSONELE BORÇLAR', code: 'P.2.3.4', type: 'passive', parent_id: 402 },
  { id: 4024, name: '5-DİĞER ÇEŞİTLİ BORÇLAR', code: 'P.2.3.5', type: 'passive', parent_id: 402 },
  { id: 4025, name: '6-DİĞER BORÇ SENETLERİ REESKONTU (-)', code: 'P.2.3.6', type: 'passive', parent_id: 402 },
  
  // Ç-ALINAN AVANSLAR (Uzun Vadeli) detayları
  { id: 4030, name: '1-ALINAN SİPARİŞ AVANSLARI', code: 'P.2.4.1', type: 'passive', parent_id: 403 },
  { id: 4031, name: '2-ALINAN DİĞER AVANSLAR', code: 'P.2.4.2', type: 'passive', parent_id: 403 },
  
  // D-BORÇ VE GİDER KARŞILIKLARI (Uzun Vadeli) detayları
  { id: 4040, name: 'KIDEM TAZMİNATI KARŞILIĞI', code: 'P.2.5.1', type: 'passive', parent_id: 404 },
  { id: 4041, name: 'DİĞER BORÇ VE GİDER KARŞILIKLARI', code: 'P.2.5.2', type: 'passive', parent_id: 404 },
  
  // E-GELECEKTEKİ YILLARA AİT GELİRLER detayları
  { id: 4050, name: '1-GELECEKTEKİ YILLARA AİT GELİRLER', code: 'P.2.6.1', type: 'passive', parent_id: 405 },
  { id: 4051, name: '2-GİDER TAHAKKUKLARI', code: 'P.2.6.2', type: 'passive', parent_id: 405 },
  
  // III-ÖZKAYNAKLAR alt grupları
  { id: 500, name: 'A-ÖDENMİŞ SERMAYE', code: 'P.3.1', type: 'passive', parent_id: 50 },
  { id: 501, name: 'B-SERMAYE YEDEKLERİ', code: 'P.3.2', type: 'passive', parent_id: 50 },
  { id: 502, name: 'C-KAR YEDEKLERİ', code: 'P.3.3', type: 'passive', parent_id: 50 },
  { id: 503, name: 'Ç-GEÇMİŞ YIL KARLARI', code: 'P.3.4', type: 'passive', parent_id: 50 },
  { id: 504, name: 'D-GEÇMİŞ YIL ZARARLARI (-)', code: 'P.3.5', type: 'passive', parent_id: 50 },
  { id: 505, name: 'E-DÖNEM NET KARI', code: 'P.3.6', type: 'passive', parent_id: 50 },
  { id: 506, name: 'F-DÖNEM NET ZARARI (-)', code: 'P.3.7', type: 'passive', parent_id: 50 },
  
  // A-ÖDENMİŞ SERMAYE detayları
  { id: 5000, name: 'SERMAYE', code: 'P.3.1.1', type: 'passive', parent_id: 500 },
  { id: 5001, name: 'ÖDENMEMİŞ SERMAYE (-)', code: 'P.3.1.2', type: 'passive', parent_id: 500 },
  
  // B-SERMAYE YEDEKLERİ detayları
  { id: 5010, name: 'HİSSE SENETLERİ İHRAÇ PRİMLERİ', code: 'P.3.2.1', type: 'passive', parent_id: 501 },
  { id: 5011, name: 'HİSSE SENETLERİ İPTAL KARLARI', code: 'P.3.2.2', type: 'passive', parent_id: 501 },
  { id: 5012, name: 'M.D.V. YENİDEN DEĞERLEME ARTIŞLARI', code: 'P.3.2.3', type: 'passive', parent_id: 501 },
  { id: 5013, name: 'İŞTİRAKLER YENİDEN DEĞERLEME ARTIŞLARI', code: 'P.3.2.4', type: 'passive', parent_id: 501 },
  { id: 5014, name: 'MALİYET BEDELİ ARTIŞI FONDU', code: 'P.3.2.5', type: 'passive', parent_id: 501 },
  { id: 5015, name: 'KAYNAK ALINAN ENFLASYON DÜZELTME ÖZEL KARŞILIK HESABI', code: 'P.3.2.6', type: 'passive', parent_id: 501 },
  { id: 5016, name: 'SERMAYE DÜZELTME FARKLARI', code: 'P.3.2.7', type: 'passive', parent_id: 501 },
  { id: 5017, name: 'DİĞER SERMAYE YEDEKLERİ', code: 'P.3.2.8', type: 'passive', parent_id: 501 },
  
  // C-KAR YEDEKLERİ detayları
  { id: 5020, name: 'YASAL YEDEKLER', code: 'P.3.3.1', type: 'passive', parent_id: 502 },
  { id: 5021, name: 'STATÜ YEDEKLERİ', code: 'P.3.3.2', type: 'passive', parent_id: 502 },
  { id: 5022, name: 'OLAĞANÜSTÜ YEDEKLER', code: 'P.3.3.3', type: 'passive', parent_id: 502 },
  { id: 5023, name: 'DİĞER KAR YEDEKLERİ', code: 'P.3.3.4', type: 'passive', parent_id: 502 },
  { id: 5024, name: 'ÖZEL FONLAR', code: 'P.3.3.5', type: 'passive', parent_id: 502 },
  
  // Ç-GEÇMİŞ YIL KARLARI detayları
  { id: 5030, name: 'GEÇMİŞ YIL KARLARI', code: 'P.3.4.1', type: 'passive', parent_id: 503 },
  
  // D-GEÇMİŞ YIL ZARARLARI detayları
  { id: 5040, name: 'GEÇMİŞ YIL ZARARLARI (-)', code: 'P.3.5.1', type: 'passive', parent_id: 504 },
  
  // E-DÖNEM NET KARI detayları
  { id: 5050, name: 'DÖNEM NET KARI', code: 'P.3.6.1', type: 'passive', parent_id: 505 },
  
  // F-DÖNEM NET ZARARI detayları
  { id: 5060, name: 'DÖNEM NET ZARARI (-)', code: 'P.3.7.1', type: 'passive', parent_id: 506 },
  
  // Ek özkaynaklar hesapları
  { id: 507, name: 'G-AZINLIK PAYLARı', code: 'P.3.8', type: 'passive', parent_id: 50 },
  { id: 5070, name: 'AZINLIK PAYLARI', code: 'P.3.8.1', type: 'passive', parent_id: 507 },

  // F-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ detayları
  { id: 1050, name: '1-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ', code: 'A.1.6.1', type: 'active', parent_id: 105 },
  { id: 1051, name: '2-YILLARA YAYGIN İNŞAAT VE ONARIM MALİYETLERİ DEĞER DÜŞÜKLÜĞÜ KARŞILIĞI (-)', code: 'A.1.6.2', type: 'active', parent_id: 105 },
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

- Kolon isimininde açıklama geçiyorsa description yap. Yıl içeriyorsa sadece yıl değeri yap. Yıl ve enflasyon sonrası içeriyorsa yıl_E formatında isimlendir.

- Veriyi aşağıdaki JSON datasındaki açıklamalara yakın benzerliklerle eşleştir. Eşleşen kaydın code değerini "definition" alanına yaz. Eşleşme bulunamazsa "eşleşmedi" yaz.

-- JSON DATA: 

` +
    jsonData +
    `

--

  Bu tablolardaki verileri tamamen object içeren JSON array olarak dön.`;

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

    // Gemini'den gelen veriyi frontend'in beklediği formata dönüştür
    let transformedData = {
      detected_data: {
        company_name: "Bilinmeyen Şirket",
        tax_number: "",
        year: new Date().getFullYear(),
        period: "YILLIK",
        items: []
      }
    };

    if (Array.isArray(financialData)) {
      // Gemini'den gelen array'i işle
      transformedData.detected_data.items = financialData.map(item => {
        // Yıl kolonlarını bul
        const keys = Object.keys(item);
        const yearColumns = keys.filter(key => /^\d{4}(_E)?$/.test(key));
        
        // En son yılı current, bir öncekini previous olarak al
        yearColumns.sort();
        const currentYear = yearColumns[yearColumns.length - 1];
        const previousYear = yearColumns[yearColumns.length - 2];
        
        return {
          account_code: item.definition || "eşleşmedi",
          account_name: item.description || "",
          current_amount: item[currentYear] || 0,
          previous_amount: item[previousYear] || 0,
          inflation_amount: item[currentYear + "_E"] || null
        };
      }).filter(item => item.account_code !== "eşleşmedi");
    }

    // Başarılı yanıt
    res.json({
      success: true,
      filename: file.originalname,
      detected_data: transformedData.detected_data,
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
    // Demo bilançolar
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
      }
    ];
    res.json(demoBalanceSheets);
  } catch (error) {
    console.error("Bilançolar hatası:", error);
    res.status(500).json({ error: `Bilançolar alınamadı: ${error.message}` });
  }
});

// Şirketler endpoint'i
app.get("/companies", (req, res) => {
  try {
    console.log("Şirketler listesi istendi");
    // Demo şirketler
    const demoCompanies = [
      { 
        id: 1, 
        name: 'ABC Şirketi',
        tax_number: '1234567890',
        created_at: '2024-01-01'
      },
      { 
        id: 2, 
        name: 'XYZ Holding',
        tax_number: '0987654321',
        created_at: '2023-06-15'
      }
    ];
    res.json(demoCompanies);
  } catch (error) {
    console.error("Şirketler hatası:", error);
    res.status(500).json({ error: `Şirketler alınamadı: ${error.message}` });
  }
});

// Şirket oluşturma endpoint'i
app.post("/companies", (req, res) => {
  try {
    console.log("Yeni şirket oluşturma isteği:", req.body);
    
    const { first_name, last_name, tax_number, email, trade_registry_number, address, industry } = req.body;
    
    // Basit validasyon
    if (!first_name || !last_name || !tax_number) {
      return res.status(400).json({ 
        error: "Ad, soyad ve vergi numarası gereklidir" 
      });
    }
    
    // Demo yanıt - gerçek uygulamada veritabanına kaydedilir
    const newCompany = {
      id: Math.floor(Math.random() * 1000) + 100, // Rastgele ID
      name: `${first_name} ${last_name}`,
      first_name,
      last_name,
      tax_number,
      email: email || "",
      trade_registry_number: trade_registry_number || "",
      address: address || "",
      industry: industry || "",
      created_at: new Date().toISOString().split('T')[0]
    };
    
    console.log("Oluşturulan şirket (demo):", newCompany);
    
    res.status(201).json({
      success: true,
      message: "Şirket başarıyla oluşturuldu",
      company: newCompany
    });
    
  } catch (error) {
    console.error("Şirket oluşturma hatası:", error);
    res.status(500).json({ 
      error: `Şirket oluşturulamadı: ${error.message}` 
    });
  }
});

// VKN ile şirket kontrol endpoint'i
app.get("/companies/check/:taxNumber", (req, res) => {
  try {
    const { taxNumber } = req.params;
    console.log("VKN kontrolü istendi:", taxNumber);
    
    // Demo şirketler
    const knownCompanies = {
      "1234567890": { id: 1, name: "ABC Şirketi", tax_number: "1234567890" },
      "0987654321": { id: 2, name: "XYZ Holding", tax_number: "0987654321" },
      "5555555555": { id: 3, name: "Örnek Anonim Şirketi", tax_number: "5555555555" },
      "6140087281": { id: 4, name: "MEMSAN MAKİNA İMALAT SANAYİ VE TİCARET LTD.ŞTİ.", tax_number: "6140087281" }
    };
    
    // Bilinen VKN'leri kontrol et
    if (knownCompanies[taxNumber]) {
      return res.json({
        exists: true,
        valid: true,
        message: "Bu VKN ile kayıtlı şirket bulundu",
        company: knownCompanies[taxNumber]
      });
    }
    
    // VKN formatı kontrolü - 10 haneli mi?
    const isValidFormat = /^\d{10}$/.test(taxNumber);
    
    res.json({
      exists: false,
      valid: isValidFormat,
      message: isValidFormat 
        ? "Bu VKN geçerli formatta ancak kayıtlı şirket bulunamadı" 
        : "VKN geçersiz formatta. 10 haneli sayısal değer olmalıdır"
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
