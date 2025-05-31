import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

const Profile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Kullanıcı bilgilerini form verilerine yükle
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        company: user.company || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Parola kontrolü
    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Parolalar eşleşmiyor.'
      });
      setLoading(false);
      return;
    }

    try {
      // Normalde burası API'ye profil güncelleme isteği gönderecek
      // Şimdilik simüle ediyoruz
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({
        type: 'success',
        text: 'Profil bilgileriniz başarıyla güncellendi.'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Profil güncellenirken bir hata oluştu.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
        <p className="font-bold">Uyarı</p>
        <p>Profil bilgilerinizi görüntülemek için giriş yapmalısınız.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Profil Ayarları</h1>

      {message && (
        <div 
          className={`p-4 mb-6 ${
            message.type === 'success' 
            ? 'bg-green-100 border-l-4 border-green-500 text-green-700' 
            : 'bg-red-100 border-l-4 border-red-500 text-red-700'
          }`} 
          role="alert"
        >
          <p className="font-bold">{message.type === 'success' ? 'Başarılı' : 'Hata'}</p>
          <p>{message.text}</p>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                Şirket
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-700 mb-4">Parola Değişikliği</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Parola
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Değiştirmek istemiyorsanız boş bırakın
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Parolayı Doğrula
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⟳</span>
                  Kaydediliyor...
                </>
              ) : (
                'Değişiklikleri Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile; 