import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import Spinner from '@/components/ui/Spinner';

// Lazy-loaded pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const BatchPrediction = lazy(() => import('@/pages/BatchPrediction'));
const UrlAnalyzer = lazy(() => import('@/pages/UrlAnalyzer'));
const FeedbackCenter = lazy(() => import('@/pages/FeedbackCenter'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="lg" />
  </div>
);

const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route
        path="/"
        element={
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        }
      />
      <Route
        path="/batch"
        element={
          <Suspense fallback={<PageLoader />}>
            <BatchPrediction />
          </Suspense>
        }
      />
      <Route
        path="/url"
        element={
          <Suspense fallback={<PageLoader />}>
            <UrlAnalyzer />
          </Suspense>
        }
      />
      <Route
        path="/feedback"
        element={
          <Suspense fallback={<PageLoader />}>
            <FeedbackCenter />
          </Suspense>
        }
      />
      <Route
        path="/reports"
        element={
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        }
      />
      <Route
        path="/settings"
        element={
          <Suspense fallback={<PageLoader />}>
            <Settings />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default AppRoutes;