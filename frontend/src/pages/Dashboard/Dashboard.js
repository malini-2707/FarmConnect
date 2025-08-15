import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage, FiShoppingCart, FiTrendingUp, FiUsers } from 'react-icons/fi';
import SellerDashboard from './SellerDashboard';
import BuyerDashboard from './BuyerDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // This would be implemented based on your specific needs
      // For now, we'll use placeholder data
      setStats({
        totalProducts: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            {['seller', 'farmer'].includes(user?.role) 
              ? 'Manage your products and track your sales' 
              : 'Browse products and manage your purchase requests'}
          </p>
        </div>

        {/* Role-specific Dashboard */}
        {['seller', 'farmer'].includes(user?.role) ? (
          <SellerDashboard stats={stats} />
        ) : (
          <BuyerDashboard stats={stats} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
