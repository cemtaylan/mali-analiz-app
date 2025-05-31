import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create Authentication Context
export const AuthContext = createContext();

// Test kullanıcısı bilgileri
const TEST_USER = {
  username: 'testkullanici',
  password: 'test123',
  fullName: 'Test Kullanıcı',
  email: 'test@ornek.com',
  company: 'Test Şirketi',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Check if it's the test token
        if (token === 'test-token') {
          setUser({
            id: 1,
            username: TEST_USER.username,
            fullName: TEST_USER.fullName,
            email: TEST_USER.email,
            company: TEST_USER.company,
          });
          setLoading(false);
          return;
        }
        
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch current user data
        const response = await axios.get('/api/auth/users/me');
        
        if (response.data) {
          setUser(response.data);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Test kullanıcısı kontrolü
      if (username === TEST_USER.username && password === TEST_USER.password) {
        // Test token'ı localStorage'a kaydet
        localStorage.setItem('authToken', 'test-token');
        
        // Kullanıcı bilgilerini ayarla
        setUser({
          id: 1,
          username: TEST_USER.username,
          fullName: TEST_USER.fullName,
          email: TEST_USER.email,
          company: TEST_USER.company,
        });
        
        return true;
      }
      
      const response = await axios.post('/api/auth/login', { username, password });
      
      if (response.data && response.data.access_token) {
        // Save token to localStorage
        localStorage.setItem('authToken', response.data.access_token);
        
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        
        // Fetch user data
        const userResponse = await axios.get('/api/auth/users/me');
        setUser(userResponse.data);
        
        return true;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post('/api/auth/register', userData);
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Kayıt olurken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 