import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SSOCallback from './pages/SSOCallback';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/DocumentsPage';
import UploadDocumentPage from './pages/UploadDocumentPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyFormPage from './pages/CompanyFormPage';
import BanksPage from './pages/BanksPage';
import BankFormPage from './pages/BankFormPage';
import FacilitiesPage from './pages/FacilitiesPage';
import FacilityFormPage from './pages/FacilityFormPage';
import UsersPage from './pages/UsersPage';
import UserFormPage from './pages/UserFormPage';
import UserEditPage from './pages/UserEditPage';
import AuditLogsPage from './pages/AuditLogsPage';

// Guard: if user is already logged in, redirect away from login page
function LoginGuard({ children }) {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch {}
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
        />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginGuard><LoginPage /></LoginGuard>} />
          <Route path="/login/callback" element={<SSOCallback />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password/confirm" element={<ResetPasswordConfirmPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/upload" element={<UploadDocumentPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/new" element={<CompanyFormPage />} />
            <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
            <Route path="/banks" element={<BanksPage />} />
            <Route path="/banks/new" element={<BankFormPage />} />
            <Route path="/banks/:id/edit" element={<BankFormPage />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/facilities/new" element={<FacilityFormPage />} />
            <Route path="/facilities/:id/edit" element={<FacilityFormPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/:id/edit" element={<UserEditPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
