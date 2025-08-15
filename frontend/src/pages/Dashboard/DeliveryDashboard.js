import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import OrderNotifications from '../../components/Orders/OrderNotifications';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaTruck, 
  FaMapMarkerAlt, 
  FaClock, 
  FaCheckCircle, 
  FaRoute,
  FaUser,
  FaPhone,
  FaBox,
  FaLocationArrow,
  FaToggleOn,
  FaToggleOff,
  FaBell
} from 'react-icons/fa';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    fetchDeliveries();
    getCurrentLocation();
    startLocationTracking();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          updateDeliveryPartnerLocation(location);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.warning('Please enable location access for delivery tracking');
        }
      );
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          if (activeDelivery) {
            updateDeliveryLocation(location);
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    }
  };

  const updateDeliveryPartnerLocation = async (location) => {
    try {
      await axios.put('/api/delivery/availability', {
        isAvailable: isOnline,
        isOnline: isOnline
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateDeliveryLocation = async (location) => {
    if (!activeDelivery) return;
    
    try {
      await axios.put(`/api/delivery/${activeDelivery._id}/location`, {
        latitude: location.latitude,
        longitude: location.longitude
      });
    } catch (error) {
      console.error('Error updating delivery location:', error);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get('/api/orders/delivery');
      setDeliveries(response.data.orders);
      
      // Find active delivery
      const active = response.data.orders.find(order => 
        order.orderStatus === 'picked_up' || order.orderStatus === 'in_transit'
      );
      setActiveDelivery(active);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      // Update user availability status
      await axios.put('/api/users/availability', {
        isActive: newStatus,
        location: currentLocation
      });
      
      setIsOnline(newStatus);
      toast.success(`You are now ${newStatus ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const acceptDelivery = async (deliveryId) => {
    try {
      await axios.put(`/api/orders/${deliveryId}/accept`);
      toast.success('Delivery accepted successfully');
      fetchDeliveries();
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Failed to accept delivery');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, {
        status: newStatus,
        note: `Status updated by delivery partner`
      });
      
      toast.success(`Order ${newStatus.replace('_', ' ')}`);
      fetchDeliveries();
      
      if (newStatus === 'delivered') {
        setActiveDelivery(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready_for_pickup':
        return <FaClock className="text-yellow-500" />;
      case 'picked_up':
        return <FaBox className="text-blue-500" />;
      case 'in_transit':
        return <FaTruck className="text-orange-500" />;
      case 'delivered':
        return <FaCheckCircle className="text-green-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const activeDeliveries = deliveries.filter(d => 
    ['ready_for_pickup', 'picked_up', 'in_transit'].includes(d.orderStatus)
  );
  const completedDeliveries = deliveries.filter(d => d.orderStatus === 'delivered');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Delivery Dashboard
              </h1>
              <p className="text-gray-600">Manage your deliveries and track orders</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaLocationArrow className="text-green-500" />
                <span className="text-sm text-gray-600">
                  {currentLocation ? 'Location active' : 'Location unavailable'}
                </span>
              </div>
              <button
                onClick={toggleOnlineStatus}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
                  isOnline
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isOnline ? <FaToggleOn /> : <FaToggleOff />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'available', label: 'Available Orders', icon: FaBell, count: 0 },
              { id: 'active', label: 'Active Deliveries', icon: FaTruck, count: activeDeliveries.length },
              { id: 'completed', label: 'Completed', icon: FaCheckCircle, count: completedDeliveries.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                <span>{tab.label}</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'active' && (
          <div className="space-y-6">
            {activeDeliveries.length > 0 ? (
              activeDeliveries.map((order) => (
                <div key={order._id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Customer: {order.customer.name}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.orderStatus === 'ready_for_pickup' ? 'bg-yellow-100 text-yellow-800' :
                      order.orderStatus === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                      order.orderStatus === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                      order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.orderStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Pickup Location</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FaMapMarkerAlt className="text-red-500" />
                        <span>{order.pickupLocation?.address || 'Address not available'}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Delivery Location</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FaMapMarkerAlt className="text-green-500" />
                        <span>{order.deliveryLocation?.address || 'Address not available'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Customer</p>
                          <p className="text-sm text-gray-900">{order.customer.name}</p>
                          <p className="text-sm text-gray-600">{order.customer.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Farmer</p>
                          <p className="text-sm text-gray-900">{order.farmer.name}</p>
                          <p className="text-sm text-gray-600">{order.farmer.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    {order.orderStatus === 'ready_for_pickup' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'picked_up')}
                        className="btn-primary text-sm"
                      >
                        <FaBox className="h-4 w-4 mr-1" />
                        Pick Up
                      </button>
                    )}
                    {order.orderStatus === 'picked_up' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'in_transit')}
                        className="btn-primary text-sm"
                      >
                        <FaTruck className="h-4 w-4 mr-1" />
                        Start Delivery
                      </button>
                    )}
                    {order.orderStatus === 'in_transit' && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, 'delivered')}
                        className="btn-primary text-sm"
                      >
                        <FaCheckCircle className="h-4 w-4 mr-1" />
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FaTruck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active deliveries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {isOnline ? 'You will receive delivery assignments when available.' : 'Go online to receive delivery assignments.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-6">
            {completedDeliveries.length > 0 ? (
              completedDeliveries.map((delivery) => (
                <div key={delivery._id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{delivery.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Completed on {new Date(delivery.deliveryTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      Delivered
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Pickup Time:</span>
                      <p className="font-medium">
                        {delivery.pickupTime ? new Date(delivery.pickupTime).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Delivery Time:</span>
                      <p className="font-medium">
                        {delivery.deliveryTime ? new Date(delivery.deliveryTime).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium">
                        {delivery.actualDuration ? `${delivery.actualDuration} minutes` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FaCheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No completed deliveries</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Complete your first delivery to see it here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
