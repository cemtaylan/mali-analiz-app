import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Kullanıcı adı gereklidir'),
  password: Yup.string().required('Şifre gereklidir'),
});

const Login = () => {
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);

  const handleSubmit = async (values) => {
    setLoginError(null);
    const success = await login(values.username, values.password);
    if (success) {
      navigate('/dashboard');
    } else {
      setLoginError(error || 'Giriş yapılırken bir hata oluştu.');
    }
  };

  return (
    <div>
      <Formik
        initialValues={{ username: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form className="space-y-6">
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{loginError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="username" className="form-label">
                Kullanıcı Adı
              </label>
              <div className="mt-1">
                <Field
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="form-input"
                />
                <ErrorMessage
                  name="username"
                  component="p"
                  className="form-error"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Şifre
              </label>
              <div className="mt-1">
                <Field
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="form-input"
                />
                <ErrorMessage
                  name="password"
                  component="p"
                  className="form-error"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Beni hatırla
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Şifrenizi mi unuttunuz?
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setFieldValue('username', 'testkullanici');
                  setFieldValue('password', 'test123');
                }}
                className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Test Hesabı Bilgilerini Doldur
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  'Giriş Yap'
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">veya</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="mt-1">
            <p className="text-center text-sm text-gray-600">
              Hesabınız yok mu?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Kayıt olun
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 