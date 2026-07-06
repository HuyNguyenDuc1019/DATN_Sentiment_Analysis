import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';

import AuthLayout from './components/layout/AuthLayout';
import UserLayout from './components/layout/UserLayout';

import LoginScreen from './pages/auth/Login';
import RegisterScreen from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import Dashboard from './pages/user/Dashboard';
import UrlAnalyzer from './pages/user/UrlAnalyzer';
import BatchPrediction from './pages/user/BatchPrediction';
import FeedbackCenter from './pages/user/FeedbackCenter';
import Report from './pages/user/Report';
import Settings from './pages/user/Settings';
import Profile from './pages/user/Profile';
import RestaurantCompare from './pages/user/RestaurantCompare';
import UpgradeVIP from './pages/user/UpgradeVIP';

import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTransactions from './pages/admin/AdminTransactions';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="feedback" element={<AdminFeedback />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="transactions" element={<AdminTransactions />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/url-analyzer" element={<UrlAnalyzer />} />
              <Route path="/compare" element={<RestaurantCompare />} />
              <Route path="/batch-prediction" element={<BatchPrediction />} />
              <Route path="/feedback" element={<FeedbackCenter />} />
              <Route path="/report" element={<Report />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;