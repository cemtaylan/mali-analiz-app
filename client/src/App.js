import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import BalanceSheets from './pages/BalanceSheets';
import BalanceSheetDetail from './pages/BalanceSheetDetail';
import BalanceSheetEdit from './pages/BalanceSheetEdit';
import BalanceSheetWithPlan from './pages/BalanceSheetWithPlan';
import BalanceSheetPreview from './pages/BalanceSheetPreview';
import BalanceSheetPreviewEdit from './pages/BalanceSheetPreviewEdit';
import MultiBalanceAnalysis from './pages/MultiBalanceAnalysis';
import RatioAnalysis from './pages/RatioAnalysis';
import AnalysisReport from './pages/AnalysisReport';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import AccountCategories from './pages/AccountCategories';
import NotFound from './pages/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Public Route Component (only accessible if not authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
    </div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        <PublicRoute>
          <AuthLayout>
            <Login />
          </AuthLayout>
        </PublicRoute>
      } />
      
      <Route path="/login" element={
        <PublicRoute>
          <AuthLayout>
            <Login />
          </AuthLayout>
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <AuthLayout>
            <Register />
          </AuthLayout>
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/companies" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Companies />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/companies/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CompanyDetail />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheets />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetDetail />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id/with-plan" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetWithPlan />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id/edit" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetEdit />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/preview" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetPreview />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/preview/edit" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetPreviewEdit />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id/preview" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetPreview />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id/preview/edit" element={
        <ProtectedRoute>
          <DashboardLayout>
            <BalanceSheetPreviewEdit />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/multi-balance-analysis" element={
        <ProtectedRoute>
          <DashboardLayout>
            <MultiBalanceAnalysis />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/ratio-analysis" element={
        <ProtectedRoute>
          <DashboardLayout>
            <RatioAnalysis />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/balance-sheets/:id/analysis" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AnalysisReport />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Reports />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/account-categories" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AccountCategories />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Profile />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App; 