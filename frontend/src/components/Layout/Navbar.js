import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { FiUser, FiShoppingCart, FiBell, FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { notifications, clearNotification } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardHref = user?.role === 'admin'
    ? '/dashboard/admin'
    : user?.role === 'farmer'
      ? '/dashboard/farmer'
      : user?.role === 'delivery_partner'
        ? '/dashboard/delivery'
        : '/dashboard/customer';

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-primary-600 p-2 rounded-lg">
                <FiShoppingCart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">FarmConnect</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="navbar-link">Home</Link>
            <Link to="/products" className="navbar-link">Products</Link>
            
            {isAuthenticated ? (
              <>
                <Link to={dashboardHref} className="navbar-link">{user?.role === 'admin' ? 'Admin' : 'Dashboard'}</Link>
                
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-primary-600"
                  >
                    <FiBell className="h-6 w-6" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-gray-500 text-center">
                            No new notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                              <p className="text-sm text-gray-800">{notification.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                              <button
                                onClick={() => clearNotification(notification.id)}
                                className="text-xs text-primary-600 hover:text-primary-800 mt-1"
                              >
                                Dismiss
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Menu */}
                <div className="flex items-center space-x-4">
                  <Link to="/profile" className="flex items-center space-x-2 navbar-link">
                    <FiUser className="h-5 w-5" />
                    <span>{user?.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-outline"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="navbar-link">Sign In</Link>
                <Link to="/register" className="btn-primary">Sign Up</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-primary-600"
            >
              {isOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              <Link to="/" className="block px-3 py-2 navbar-link">Home</Link>
              <Link to="/products" className="block px-3 py-2 navbar-link">Products</Link>
              
              {isAuthenticated ? (
                <>
                  <Link to={dashboardHref} className="block px-3 py-2 navbar-link">{user?.role === 'admin' ? 'Admin' : 'Dashboard'}</Link>
                  <Link to="/profile" className="block px-3 py-2 navbar-link">Profile</Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary-600"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 navbar-link">Sign In</Link>
                  <Link to="/register" className="block px-3 py-2 navbar-link">Sign Up</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
