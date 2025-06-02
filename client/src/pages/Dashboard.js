import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    companyCount: 0,
    balanceSheetCount: 0,
    recentBalanceSheets: [],
    recentReports: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Bu kısım gerçek API'ye bağlanacak şekilde güncellenecek
        // Şimdilik örnek veriler kullanıyoruz
        
        // Gerçek uygulamada burası şöyle olacak:
        // const response = await axios.get('/api/dashboard');
        // setStats(response.data);
        
        // Örnek veriler
        setTimeout(() => {
          setStats({
            companyCount: user.role === 'admin' ? 10 : 1,
            balanceSheetCount: 24,
            recentBalanceSheets: [
              {
                id: 1,
                year: 2023,
                period: 'Q3',
                company: { name: 'Örnek A.Ş.' },
                upload_date: '2023-10-15T14:30:00Z'
              },
              {
                id: 2,
                year: 2023,
                period: 'Q2',
                company: { name: 'Örnek A.Ş.' },
                upload_date: '2023-07-15T10:45:00Z'
              },
              {
                id: 3,
                year: 2023,
                period: 'Q1',
                company: { name: 'Örnek A.Ş.' },
                upload_date: '2023-04-12T09:15:00Z'
              },
            ],
            recentReports: [
              {
                id: 1,
                title: '2023 Q3 Mali Analiz Raporu',
                generated_at: '2023-10-20T16:45:00Z'
              },
              {
                id: 2,
                title: '2023 Q2 Mali Analiz Raporu',
                generated_at: '2023-07-22T11:30:00Z'
              },
            ],
          });
          setLoading(false);
        }, 1000);
        
      } catch (err) {
        console.error('Dashboard data error:', err);
        setError('Gösterge paneli verileri yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 mb-8 text-white">
        <div className="flex items-center">
          <div className="bg-white bg-opacity-20 p-4 rounded-xl mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Gösterge Paneli</h1>
            <p className="text-teal-100 mt-1">
              Hoş geldiniz, {user.full_name || user.username}! Mali analiz sisteminize genel bakış.
            </p>
          </div>
        </div>
      </div>

      {/* Old Header - Hidden */}
      <div className="pb-5 border-b border-gray-200" style={{display: 'none'}}>
        <h1 className="text-3xl font-bold leading-tight text-gray-900">
          Gösterge Paneli
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Hoş geldiniz, {user.full_name || user.username}! Mali analiz sisteminize genel bakış.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Company count */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Şirketler
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats.companyCount}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/companies"
                className="font-medium text-primary-700 hover:text-primary-900"
              >
                Tümünü görüntüle
              </Link>
            </div>
          </div>
        </div>

        {/* Balance Sheet count */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Bilançolar
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats.balanceSheetCount}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/balance-sheets"
                className="font-medium text-primary-700 hover:text-primary-900"
              >
                Tümünü görüntüle
              </Link>
            </div>
          </div>
        </div>

        {/* Liquidity Ratio */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Cari Oran (Son Bilanço)
                  </dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      1.85
                    </div>
                    <span className="ml-2 flex items-center text-sm font-medium text-green-600">
                      <ArrowUpIcon
                        className="self-center flex-shrink-0 h-5 w-5 text-green-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Artış</span>
                      12%
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/balance-sheets/1"
                className="font-medium text-primary-700 hover:text-primary-900"
              >
                Detayları görüntüle
              </Link>
            </div>
          </div>
        </div>

        {/* Debt Ratio */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Borç Oranı (Son Bilanço)
                  </dt>
                  <dd className="flex items-center">
                    <div className="text-lg font-medium text-gray-900">
                      0.45
                    </div>
                    <span className="ml-2 flex items-center text-sm font-medium text-red-600">
                      <ArrowDownIcon
                        className="self-center flex-shrink-0 h-5 w-5 text-red-500"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Azalış</span>
                      8%
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/balance-sheets/1"
                className="font-medium text-primary-700 hover:text-primary-900"
              >
                Detayları görüntüle
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent balance sheets */}
      <div className="mt-8">
        <h2 className="text-lg font-medium leading-6 text-gray-900">
          Son Yüklenen Bilançolar
        </h2>
        <div className="mt-2 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  Şirket
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Yıl
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Dönem
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Yükleme Tarihi
                </th>
                <th
                  scope="col"
                  className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                >
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stats.recentBalanceSheets.map((balanceSheet) => (
                <tr key={balanceSheet.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {balanceSheet.company.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {balanceSheet.year}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {balanceSheet.period}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(balanceSheet.upload_date)}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <Link
                      to={`/balance-sheets/${balanceSheet.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link
            to="/balance-sheets"
            className="text-sm font-medium text-primary-600 hover:text-primary-900"
          >
            Tüm bilançoları görüntüle →
          </Link>
        </div>
      </div>

      {/* Recent reports */}
      <div className="mt-8">
        <h2 className="text-lg font-medium leading-6 text-gray-900">
          Son Oluşturulan Raporlar
        </h2>
        <div className="mt-2 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                >
                  Rapor Adı
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  Oluşturulma Tarihi
                </th>
                <th
                  scope="col"
                  className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                >
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stats.recentReports.map((report) => (
                <tr key={report.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {report.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatDate(report.generated_at)}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <Link
                      to={`/reports/${report.id}`}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Görüntüle
                    </Link>
                    <a
                      href="#"
                      className="text-primary-600 hover:text-primary-900"
                    >
                      İndir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link
            to="/reports"
            className="text-sm font-medium text-primary-600 hover:text-primary-900"
          >
            Tüm raporları görüntüle →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 