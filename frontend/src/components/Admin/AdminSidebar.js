import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiUserCheck, FiShoppingBag, FiTruck, FiBell, FiSettings } from 'react-icons/fi';

const navItems = [
  { to: '/dashboard/admin', icon: <FiHome size={18} />, label: 'Dashboard', end: true },
  { to: '/dashboard/admin/farmers', icon: <FiUserCheck size={18} />, label: 'Farmers' },
  { to: '/dashboard/admin/customers', icon: <FiUsers size={18} />, label: 'Customers' },
  { to: '/dashboard/admin/orders', icon: <FiShoppingBag size={18} />, label: 'Orders' },
  { to: '/dashboard/admin/transport', icon: <FiTruck size={18} />, label: 'Transport' },
  { to: '/dashboard/admin/notifications', icon: <FiBell size={18} />, label: 'Notifications' },
  { to: '/dashboard/admin/settings', icon: <FiSettings size={18} />, label: 'Settings' }
];

const AdminSidebar = ({ isOpen, onToggle }) => {
  return (
    <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed z-30 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}> 
      <div className="h-16 flex items-center px-4 border-b">
        <span className="text-lg font-semibold text-green-600">Admin Panel</span>
      </div>
      <nav className="p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            onClick={() => onToggle && onToggle(false)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;



