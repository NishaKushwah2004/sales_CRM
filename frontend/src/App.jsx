import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AuthHomePage from './pages/AuthHomePage'
function App() { return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute />}><Route path="/" element={<AuthHomePage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></AuthProvider> }
export default App
