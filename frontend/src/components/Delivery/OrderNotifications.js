import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaBell, 
  FaMapMarkerAlt, 
  FaClock, 
  FaRupeeSign, 
  FaCheck, 
  FaTimes,
  FaRoute,
  FaUser,
  FaBox,
  FaExclamationTriangle
} from 'react-icons/fa';
import io from 'socket.io-client';

const OrderNotifications = ({ onOrderAccepted }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (user && user.role === 'delivery_partner') {
      initializeSocket();
      getCurrentLocation();
      setupNotificationSound();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  const setupNotificationSound = () => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.preload = 'auto';
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const initializeSocket = () => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to notification server');
      
      // Join delivery partner room
      newSocket.emit('join-delivery-partner-room', user.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from notification server');
    });

    // Listen for new order notifications
    newSocket.on('new-order-notification', (orderData) => {
      handleNewOrderNotification(orderData);
    });

    // Listen for nearby orders when going online
    newSocket.on('nearby-orders-available', (data) => {
      toast.info(`${data.count} nearby orders available for delivery!`);
    });

    // Listen for order assignments (when another partner accepts)
    newSocket.on('order-assigned', (data) => {
      removeNotification(data.orderId);
    });

    setSocket(newSocket);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          updateLocationOnServer(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.warning('Please enable location access to receive nearby order notifications');
        }
      );
    }
  };

  const updateLocationOnServer = async (location) => {
    try {
      const response = await fetch('/api/order-notifications/update-location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          isAvailable: true,
          isOnline: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleNewOrderNotification = (orderData) => {
    // Add notification to list
    const notification = {
      id: `${orderData.orderId}_${Date.now()}`,
      ...orderData,
      receivedAt: new Date(),
      isNew: true
    };

    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications

    // Play notification sound
    playNotificationSound();

    // Show toast notification
    toast.info(
      <div className="flex items-center space-x-2">
        <FaBell className="text-blue-500" />
        <div>
          <p className="font-medium">New Order Available!</p>
          <p className="text-sm text-gray-600">{orderData.distance.toFixed(1)} km away</p>
        </div>
      </div>,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      }
    );

    // Mark as not new after 3 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isNew: false } : n)
      );
    }, 3000);
  };

  const acceptOrder = async (notification) => {
    try {
      const response = await fetch(`/api/order-notifications/accept-order/${notification.orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          estimatedPickupTime: new Date(Date.now() + 30 * 60000), // 30 minutes from now
          notes: 'Order accepted via notification'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to accept order');
      }

      const result = await response.json();
      
      // Remove notification from list
      removeNotification(notification.orderId);
      
      toast.success('Order accepted successfully!');
      
      // Notify parent component
      if (onOrderAccepted) {
        onOrderAccepted(result.order);
      }

    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Failed to accept order. It may have been assigned to another partner.');
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const removeNotification = (orderId) => {
    setNotifications(prev => prev.filter(n => n.orderId !== orderId));
  };

  const formatDistance = (distance) => {
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  if (!user || user.role !== 'delivery_partner') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-sm">
      {/* Connection Status */}
      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-medium ${
        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 ${
              getUrgencyColor(notification.urgency)
            } ${notification.isNew ? 'animate-pulse' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FaBell className={`${
                  notification.urgency === 'urgent' ? 'text-red-500' : 
                  notification.urgency === 'high' ? 'text-orange-500' : 'text-blue-500'
                }`} />
                <h3 className="font-semibold text-gray-900">New Order</h3>
                {notification.urgency === 'urgent' && (
                  <FaExclamationTriangle className="text-red-500" />
                )}
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Order Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Order #{notification.orderNumber}</span>
                <span className="text-sm text-gray-500">
                  {formatDistance(notification.distance)} away
                </span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaUser size={12} />
                <span>{notification.customer.name}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FaMapMarkerAlt size={12} />
                <span className="truncate">{notification.customer.address}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <FaBox size={12} />
                  <span>{notification.items} items</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600 font-medium">
                  <FaRupeeSign size={12} />
                  <span>{notification.orderValue}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <FaClock size={10} />
                <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => acceptOrder(notification)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center justify-center space-x-1 transition-colors"
              >
                <FaCheck size={12} />
                <span>Accept</span>
              </button>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4 text-center text-gray-500">
          <FaBell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm">No new orders</p>
          <p className="text-xs text-gray-400 mt-1">
            {isConnected ? 'Waiting for nearby orders...' : 'Connecting...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderNotifications;
