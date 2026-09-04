import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AuthHomePage from './pages/AuthHomePage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import DealsPage from './pages/DealsPage'
import DealDetailPage from './pages/DealDetailPage'
import DashboardPage from './pages/DashboardPage'
function App() { return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute />}><Route path="/" element={<DashboardPage />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/account" element={<AuthHomePage />} /><Route path="/companies" element={<CompaniesPage />} /><Route path="/companies/:id" element={<CompanyDetailPage />} /><Route path="/deals" element={<DealsPage />} /><Route path="/deals/:id" element={<DealDetailPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider> }
export default App

