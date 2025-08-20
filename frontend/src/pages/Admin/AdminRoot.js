import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import Overview from './Overview';
import Farmers from './Farmers';
import Customers from './Customers';
import Orders from './Orders';
import Transport from './Transport';
import Notifications from './Notifications';
import Settings from './Settings';

const AdminRoot = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}> 
        <Route index element={<Overview />} />
        <Route path="farmers" element={<Farmers />} />
        <Route path="customers" element={<Customers />} />
        <Route path="orders" element={<Orders />} />
        <Route path="transport" element={<Transport />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
    </Routes>
  );
};

export default AdminRoot;



