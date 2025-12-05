import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Layout
import Layout from './components/Layout'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrderPage from './pages/OrderPage'
import HistoryPage from './pages/HistoryPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'
import UsersPage from './pages/UsersPage'
import RestaurantsPage from './pages/RestaurantsPage'
import EmailSettingsPage from './pages/EmailSettingsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import DeliverySchedulePage from './pages/DeliverySchedulePage'

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="order" element={<OrderPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="email-settings" element={<EmailSettingsPage />} />
          <Route path="delivery-schedule" element={<DeliverySchedulePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
