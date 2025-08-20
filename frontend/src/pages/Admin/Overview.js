import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiUsers, FiUserCheck, FiShoppingBag, FiTruck } from 'react-icons/fi';

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-md bg-green-50 text-green-600">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{title}</p>
        <p className="text-xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

const Overview = () => {
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalConsumers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalTransport: 0,
    monthlyOrders: []
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/admin/stats');
        setStats(data);
      } catch (e) {
        // ignore for now
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Farmers" value={stats.totalFarmers} icon={<FiUserCheck />} />
        <StatCard title="Total Customers" value={stats.totalConsumers} icon={<FiUsers />} />
        <StatCard title="Active Orders" value={stats.totalOrders - stats.completedOrders} icon={<FiShoppingBag />} />
        <StatCard title="Transport Partners" value={stats.totalTransport} icon={<FiTruck />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Orders Over Time</h2>
          <div className="h-64 grid place-items-center text-gray-400 text-sm">Chart placeholder</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-3">User Growth</h2>
          <div className="h-64 grid place-items-center text-gray-400 text-sm">Chart placeholder</div>
        </div>
      </div>
    </div>
  );
};

export default Overview;


