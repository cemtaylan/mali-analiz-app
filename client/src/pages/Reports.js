import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Normalde burası API'den raporları çekecek
    // Şimdilik örnek veri
    const demoReports = [
      { 
        id: 1, 
        title: 'ABC Şirketi 2024 Q1 Değerlendirme Raporu', 
        company_name: 'ABC Şirketi',
        created_at: '2024-04-05',
        type: 'quarterly'
      },
      { 
        id: 2, 
        title: 'XYZ Holding 2023 Yıllık Finansal Değerlendirme', 
        company_name: 'XYZ Holding',
        created_at: '2024-01-15',
        type: 'annual'
      },
      { 
        id: 3, 
        title: 'Örnek A.Ş. Trend Analizi', 
        company_name: 'Örnek Anonim Şirketi',
        created_at: '2023-12-10',
        type: 'custom'
      }
    ];
    
    setReports(demoReports);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Raporlar</h1>
        <Link 
          to="/reports/new" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Yeni Rapor Oluştur
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Henüz bir rapor oluşturulmamış. Yeni bir rapor oluşturmak için "Yeni Rapor Oluştur" butonuna tıklayın.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rapor Başlığı</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şirket</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturma Tarihi</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{report.company_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{report.created_at}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${report.type === 'annual' ? 'bg-green-100 text-green-800' : 
                        report.type === 'quarterly' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {report.type === 'annual' ? 'Yıllık' : 
                       report.type === 'quarterly' ? 'Çeyreklik' : 'Özel'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/reports/${report.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      Görüntüle
                    </Link>
                    <button className="text-gray-600 hover:text-gray-900 mr-4">
                      PDF İndir
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports; 