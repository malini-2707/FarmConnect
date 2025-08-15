import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaBell, 
  FaCheck, 
  FaTimes, 
  FaMapMarkerAlt, 
  FaDollarSign,
  FaBox,
  FaClock
} from 'react-icons/fa';

const OrderNotifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'delivery_partner') {
      fetchAvailableOrders();
      setupSocketListeners();
    }

    return () => {
      if (socket) {
        socket.off('new-order-available');
        socket.off('order-taken');
      }
    };
  }, [user, socket]);

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('new-order-available', (orderData) => {
      setNotifications(prev => [...prev, {
        id: orderData.orderId,
        type: 'new-order',
        message: `New order available: ${orderData.orderNumber}`,
        orderData,
        timestamp: new Date()
      }]);
      
      toast.info('New delivery order available!', {
        position: "top-right",
        autoClose: 5000,
      });
      
      // Refresh available orders
      fetchAvailableOrders();
    });

    socket.on('order-taken', (data) => {
      // Remove order from available orders
      setAvailableOrders(prev => prev.filter(order => order._id !== data.orderId));
      setNotifications(prev => prev.filter(notif => notif.id !== data.orderId));
    });
  };

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/orders/available');
      setAvailableOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching available orders:', error);
      toast.error('Failed to fetch available orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      await axios.post(`/api/orders/${orderId}/accept`);
      toast.success('Order accepted successfully!');
      
      // Remove from available orders and notifications
      setAvailableOrders(prev => prev.filter(order => order._id !== orderId));
      setNotifications(prev => prev.filter(notif => notif.id !== orderId));
      
      // Refresh to get updated data
      fetchAvailableOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error(error.response?.data?.message || 'Failed to accept order');
    }
  };

  const handleDeclineOrder = async (orderId) => {
    try {
      await axios.post(`/api/orders/${orderId}/decline`);
      toast.info('Order declined');
      
      // Remove from notifications
      setNotifications(prev => prev.filter(notif => notif.id !== orderId));
    } catch (error) {
      console.error('Error declining order:', error);
      toast.error('Failed to decline order');
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  if (user?.role !== 'delivery_partner') {
    return null;
  }

  return (
    <div className="order-notifications">
      {/* Notification Bell */}
      {notifications.length > 0 && (
        <div className="notification-bell">
          <FaBell className="bell-icon" />
          <span className="notification-count">{notifications.length}</span>
        </div>
      )}

      {/* Available Orders Section */}
      <div className="available-orders-section">
        <h3 className="section-title">
          <FaBox className="section-icon" />
          Available Orders ({availableOrders.length})
        </h3>

        {loading ? (
          <div className="loading">Loading available orders...</div>
        ) : availableOrders.length === 0 ? (
          <div className="no-orders">
            <p>No orders available at the moment</p>
            <button onClick={fetchAvailableOrders} className="refresh-btn">
              Refresh
            </button>
          </div>
        ) : (
          <div className="orders-grid">
            {availableOrders.map(order => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <h4>Order #{order.orderNumber}</h4>
                  <span className="order-status">{order.orderStatus}</span>
                </div>

                <div className="order-details">
                  <div className="detail-item">
                    <FaDollarSign className="detail-icon" />
                    <span>₹{order.totalAmount}</span>
                  </div>
                  
                  <div className="detail-item">
                    <FaMapMarkerAlt className="detail-icon" />
                    <span>
                      {order.deliveryAddress.city}, {order.deliveryAddress.state}
                    </span>
                  </div>

                  <div className="detail-item">
                    <FaClock className="detail-icon" />
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="customer-info">
                    <strong>Customer:</strong> {order.customer.name}
                  </div>

                  <div className="farmer-info">
                    <strong>Farmer:</strong> {order.farmer.name}
                  </div>
                </div>

                <div className="order-actions">
                  <button 
                    onClick={() => handleAcceptOrder(order._id)}
                    className="accept-btn"
                  >
                    <FaCheck /> Accept
                  </button>
                  <button 
                    onClick={() => handleDeclineOrder(order._id)}
                    className="decline-btn"
                  >
                    <FaTimes /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-list">
          <h4>Recent Notifications</h4>
          {notifications.map(notification => (
            <div key={notification.id} className="notification-item">
              <div className="notification-content">
                <FaBell className="notification-icon" />
                <span>{notification.message}</span>
                <small>{notification.timestamp.toLocaleTimeString()}</small>
              </div>
              <button 
                onClick={() => dismissNotification(notification.id)}
                className="dismiss-btn"
              >
                <FaTimes />
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .order-notifications {
          padding: 20px;
        }

        .notification-bell {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff6b35;
          color: white;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1000;
          animation: pulse 2s infinite;
        }

        .notification-count {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff0000;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          color: #2c3e50;
          font-size: 1.5rem;
        }

        .orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .order-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-left: 4px solid #3498db;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .order-header h4 {
          margin: 0;
          color: #2c3e50;
        }

        .order-status {
          background: #3498db;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          text-transform: capitalize;
        }

        .order-details {
          margin-bottom: 15px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #666;
        }

        .detail-icon {
          color: #3498db;
        }

        .customer-info, .farmer-info {
          margin-bottom: 5px;
          font-size: 0.9rem;
        }

        .order-actions {
          display: flex;
          gap: 10px;
        }

        .accept-btn, .decline-btn {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .accept-btn {
          background: #27ae60;
          color: white;
        }

        .accept-btn:hover {
          background: #219a52;
        }

        .decline-btn {
          background: #e74c3c;
          color: white;
        }

        .decline-btn:hover {
          background: #c0392b;
        }

        .no-orders {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .refresh-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          margin-top: 10px;
        }

        .notifications-list {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .notification-icon {
          color: #ff6b35;
        }

        .dismiss-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 5px;
        }

        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default OrderNotifications;
