import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-toastify';
import { 
  FaTruck, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaEnvelope, 
  FaUser,
  FaBox,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes
} from 'react-icons/fa';

const OrderTracking = ({ orderId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
    
    // Socket listeners for real-time updates
    if (socket) {
      socket.on('order-status-updated', handleOrderUpdate);
      socket.on('delivery-status-updated', handleDeliveryUpdate);
      socket.on('delivery-location-updated', handleLocationUpdate);
      
      return () => {
        socket.off('order-status-updated');
        socket.off('delivery-status-updated');
        socket.off('delivery-location-updated');
      };
    }
  }, [socket, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const orderData = await response.json();
        setOrder(orderData);
      } else {
        toast.error('Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderUpdate = (orderData) => {
    if (orderData._id === orderId) {
      setOrder(prev => ({ ...prev, ...orderData }));
      toast.info(`Order status updated to ${orderData.orderStatus.replace('_', ' ')}`);
    }
  };

  const handleDeliveryUpdate = (deliveryData) => {
    if (deliveryData.order === orderId) {
      setOrder(prev => ({ 
        ...prev, 
        deliveryStatus: deliveryData.status,
        deliveryPartner: deliveryData.deliveryPartner
      }));
      toast.info(`Delivery status updated to ${deliveryData.status.replace('_', ' ')}`);
    }
  };

  const handleLocationUpdate = (locationData) => {
    if (locationData.order === orderId) {
      setOrder(prev => ({ 
        ...prev, 
        currentLocation: locationData.location
      }));
    }
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: FaClock,
      confirmed: FaCheckCircle,
      preparing: FaBox,
      ready_for_pickup: FaTruck,
      picked_up: FaTruck,
      in_transit: FaTruck,
      delivered: FaCheckCircle,
      cancelled: FaTimes
    };
    return icons[status] || FaClock;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      confirmed: 'text-blue-600 bg-blue-100',
      preparing: 'text-orange-600 bg-orange-100',
      ready_for_pickup: 'text-purple-600 bg-purple-100',
      picked_up: 'text-indigo-600 bg-indigo-100',
      in_transit: 'text-blue-600 bg-blue-100',
      delivered: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusDescription = (status) => {
    const descriptions = {
      pending: 'Order received, waiting for farmer confirmation',
      confirmed: 'Order confirmed by farmer, preparing your items',
      preparing: 'Farmer is preparing your order',
      ready_for_pickup: 'Order ready for pickup by delivery partner',
      picked_up: 'Order picked up by delivery partner',
      in_transit: 'Order is on its way to you',
      delivered: 'Order delivered successfully',
      cancelled: 'Order has been cancelled'
    };
    return descriptions[status] || 'Status unknown';
  };

  const getEstimatedTime = () => {
    if (!order) return null;
    
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    const estimatedDelivery = new Date(order.estimatedDeliveryTime);
    
    if (order.orderStatus === 'delivered') {
      return 'Delivered';
    }
    
    if (estimatedDelivery > now) {
      const diffMs = estimatedDelivery - now;
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    }
    
    return 'Overdue';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <FaExclamationTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Order not found</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load order details.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Order Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h2>
          <p className="text-gray-600">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.orderStatus)}`}>
            {order.orderStatus.replace('_', ' ')}
          </div>
          <p className="text-sm text-gray-600 mt-1">{getEstimatedTime()}</p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Progress</h3>
        <div className="space-y-4">
          {[
            'pending',
            'confirmed', 
            'preparing',
            'ready_for_pickup',
            'picked_up',
            'in_transit',
            'delivered'
          ].map((status, index) => {
            const Icon = getStatusIcon(status);
            const isCompleted = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered'].indexOf(order.orderStatus) >= index;
            const isCurrent = order.orderStatus === status;
            
            return (
              <div key={status} className="flex items-center">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <FaCheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-green-500' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className={`text-sm font-medium ${
                    isCompleted ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {status.replace('_', ' ')}
                  </p>
                  <p className={`text-xs ${
                    isCompleted ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {getStatusDescription(status)}
                  </p>
                </div>
                {isCurrent && (
                  <div className="ml-4">
                    <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Order Items</h3>
          <div className="space-y-3">
            {order.products.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex items-center space-x-3">
                  <FaBox className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-600">{item.quantity} {item.product.unit}</p>
                  </div>
                </div>
                <p className="font-medium text-gray-900">₹{item.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee:</span>
              <span className="font-medium">₹{order.deliveryFee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">₹{order.taxAmount}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span>Total:</span>
              <span>₹{order.finalAmount}</span>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="space-y-4">
          {/* Delivery Address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Address</h3>
            <div className="flex items-start space-x-3">
              <FaMapMarkerAlt className="text-gray-400 mt-1" />
              <div>
                <p className="text-gray-900">{order.deliveryAddress.street}</p>
                <p className="text-gray-600">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Partner */}
          {order.deliveryPartner && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Delivery Partner</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <FaUser className="text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{order.deliveryPartner.name}</p>
                    <p className="text-sm text-gray-600">Vehicle: {order.deliveryPartner.deliveryDetails?.vehicleType}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FaPhone className="text-gray-400" />
                  <span className="text-gray-900">{order.deliveryPartner.phone}</span>
                </div>
                {order.deliveryStatus && (
                  <div className="flex items-center space-x-3">
                    <FaTruck className="text-gray-400" />
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                      {order.deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Farmer Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Farmer Details</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FaUser className="text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{order.farmer.name}</p>
                  <p className="text-sm text-gray-600">{order.farmer.farmDetails?.farmName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FaPhone className="text-gray-400" />
                <span className="text-gray-900">{order.farmer.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <FaEnvelope className="text-gray-400" />
                <span className="text-gray-900">{order.farmer.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex space-x-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showDetails ? 'Hide Details' : 'Show Full Details'}
        </button>
        
        {order.orderStatus === 'delivered' && (
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Rate Order
          </button>
        )}
        
        {['pending', 'confirmed'].includes(order.orderStatus) && (
          <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
            Cancel Order
          </button>
        )}
      </div>

      {/* Full Order Details Modal */}
      {showDetails && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Complete Order Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-medium">Order ID:</span> {order._id}</p>
              <p><span className="font-medium">Payment Method:</span> {order.paymentMethod}</p>
              <p><span className="font-medium">Payment Status:</span> {order.paymentStatus}</p>
              <p><span className="font-medium">Created:</span> {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p><span className="font-medium">Estimated Delivery:</span> {new Date(order.estimatedDeliveryTime).toLocaleString()}</p>
              <p><span className="font-medium">Actual Delivery:</span> {order.actualDeliveryTime ? new Date(order.actualDeliveryTime).toLocaleString() : 'Not delivered yet'}</p>
              <p><span className="font-medium">Last Updated:</span> {new Date(order.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;
