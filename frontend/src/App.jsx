import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';

import AuthLayout from './components/layout/AuthLayout';
import UserLayout from './components/layout/UserLayout';

import AdminLayout from './components/layout/AdminLayout';

const LoginScreen = lazy(() => import('./pages/auth/Login'));
const RegisterScreen = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const UrlAnalyzer = lazy(() => import('./pages/user/UrlAnalyzer'));
const BatchPrediction = lazy(() => import('./pages/user/BatchPrediction'));
const FeedbackCenter = lazy(() => import('./pages/user/FeedbackCenter'));
const Report = lazy(() => import('./pages/user/Report'));
const Settings = lazy(() => import('./pages/user/Settings'));
const Profile = lazy(() => import('./pages/user/Profile'));
const RestaurantCompare = lazy(() => import('./pages/user/RestaurantCompare'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminFeedback = lazy(() => import('./pages/admin/AdminFeedback'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex items-center gap-3 text-sm font-medium">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Đang tải trang...
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
