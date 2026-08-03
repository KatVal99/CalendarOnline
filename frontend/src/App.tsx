import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PixelStars from './components/PixelStars';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OperationsPage from './pages/OperationsPage';
import ReportPage from './pages/ReportPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HelpPage from './pages/HelpPage';
import GamePage from './pages/GamePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <PixelStars />
      {isAuthenticated && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/operations" element={<ProtectedRoute><OperationsPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

