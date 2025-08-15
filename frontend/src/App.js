import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Components
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import WarehouseManagement from './pages/Admin/WarehouseManagement';
import ProductDetail from './pages/Products/ProductDetail';
import Products from './pages/Products/Products';
import Profile from './pages/Profile/Profile';

// Dashboard Pages
import Dashboard from './pages/Dashboard/Dashboard';
import CustomerDashboard from './pages/Dashboard/CustomerDashboard';
import SellerDashboard from './pages/Dashboard/SellerDashboard';
import DeliveryDashboard from './pages/Dashboard/DeliveryDashboard';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Navbar />
            <main className="min-h-screen">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />

                {/* Role-based Dashboard Routes */}
                <Route path="/dashboard/customer" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard/farmer" element={
                  <ProtectedRoute allowedRoles={['farmer']}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard/delivery" element={
                  <ProtectedRoute allowedRoles={['delivery_partner']}>
                    <DeliveryDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
