import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Sayfaları içe aktar
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import BalanceSheets from './pages/BalanceSheets';
import BalanceSheetDetail from './pages/BalanceSheetDetail';
import BalanceSheetEdit from './pages/BalanceSheetEdit';
import BalanceSheetWithPlan from './pages/BalanceSheetWithPlan';
import MultiBalanceAnalysis from './pages/MultiBalanceAnalysis';
import AccountCategories from './pages/AccountCategories';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Login from './pages/auth/Login';
import NotFound from './pages/NotFound';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/balance-sheets" element={<BalanceSheets />} />
        <Route path="/balance-sheets/:id" element={<BalanceSheetDetail />} />
        <Route path="/balance-sheets/:id/edit" element={<BalanceSheetEdit />} />
        <Route path="/balance-sheets/:id/with-plan" element={<BalanceSheetWithPlan />} />
        <Route path="/multi-balance-analysis" element={<MultiBalanceAnalysis />} />
        <Route path="/account-categories" element={<AccountCategories />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default AppRouter; 