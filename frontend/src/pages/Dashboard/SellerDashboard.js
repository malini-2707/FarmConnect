import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { toast } from 'react-toastify';
import ProductManagement from '../../components/Products/ProductManagement';
import AllProductsView from '../../components/Products/AllProductsView'; // Added import for AllProductsView
import { 
  FaShoppingCart,
  FaChartLine,
  FaMapMarkerAlt,
  FaEye,
  FaCheck,
  FaTimes,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaPlus
} from 'react-icons/fa';

const SellerDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
      socket.on('new-order', handleNewOrder);
      socket.on('order-cancelled', handleOrderCancelled);
      return () => {
        socket.off('new-order');
        socket.off('order-cancelled');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const ordersResponse = await fetch('/api/orders/farmer', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const ordersData = await ordersResponse.json();
      setOrders(ordersData.orders || []);

      // Fetch products count for the farmer
      const productsResponse = await fetch('/api/products/seller/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const productsData = await productsResponse.json();
      const totalProducts = productsData.total || 0;

      const activeOrders = ordersData.orders?.filter(o =>
        ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.orderStatus)
      ).length || 0;
      const completedOrders = ordersData.orders?.filter(o => o.orderStatus === 'delivered').length || 0;
      const totalRevenue = ordersData.orders?.reduce((sum, o) => (
        o.orderStatus === 'delivered' ? sum + o.finalAmount : sum
      ), 0) || 0;

      setStats(prev => ({
        ...prev,
        totalProducts,
        activeOrders,
        completedOrders,
        totalRevenue,
        monthlyRevenue: totalRevenue * 0.3
      }));
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleNewOrder = (orderData) => {
    setOrders(prev => [orderData, ...prev]);
    setStats(prev => ({ ...prev, activeOrders: prev.activeOrders + 1 }));
  };

  const handleOrderCancelled = (orderData) => {
    setOrders(prev => prev.map(o => o._id === orderData._id ? { ...o, orderStatus: 'cancelled' } : o));
    setStats(prev => ({ ...prev, activeOrders: Math.max(0, prev.activeOrders - 1) }));
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
      if (newStatus === 'delivered') {
        setStats(prev => ({
          ...prev,
          activeOrders: Math.max(0, prev.activeOrders - 1),
          completedOrders: prev.completedOrders + 1
        }));
      }
    } catch (err) {
      console.error('Update status error:', err);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready_for_pickup: 'bg-purple-100 text-purple-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}! Manage your products and orders.</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setActiveTab('products');
                  setOpenAdd(true);
                }}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                <FaPlus className="mr-2" />
                Add Product
              </button>
              <button
                onClick={() => setActiveTab('allProducts')}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                Browse Marketplace
              </button>
            </div>
          </div>
        </div>

        {/* Quick Summary removed to avoid duplication */}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg"><FaChartLine className="h-6 w-6 text-blue-600" /></div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
            </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg"><FaShoppingCart className="h-6 w-6 text-yellow-600" /></div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeOrders}</p>
            </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg"><FaCheck className="h-6 w-6 text-green-600" /></div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedOrders}</p>
            </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg"><FaChartLine className="h-6 w-6 text-purple-600" /></div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('overview')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'overview' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Overview</button>
            <button onClick={() => setActiveTab('products')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'products' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>My Products</button>
            <button onClick={() => setActiveTab('allProducts')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'allProducts' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>All Products</button>
            <button onClick={() => setActiveTab('orders')} className={`py-2 px-1 border-b-2 text-sm font-medium ${activeTab === 'orders' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Orders</button>
          </nav>
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">Recent Orders</h2></div>
        <div className="p-6">
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map(order => (
                      <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
            <div>
                            <h3 className="font-medium text-gray-900">#{order.orderNumber}</h3>
                            <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}>{order.orderStatus.replace('_', ' ')}</span>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">Customer: {order.customer.name}</p>
                          <p className="text-sm text-gray-600">Total: ₹{order.finalAmount}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button onClick={() => setSelectedOrder(order)} className="text-sm text-blue-600 hover:text-blue-800"><FaEye className="inline mr-1" />View Details</button>
                          {['pending', 'confirmed'].includes(order.orderStatus) && (
                            <button onClick={() => handleUpdateOrderStatus(order._id, 'preparing')} className="text-sm text-green-600 hover:text-green-800">Start Preparing</button>
                          )}
                          {order.orderStatus === 'preparing' && (
                            <button onClick={() => handleUpdateOrderStatus(order._id, 'ready_for_pickup')} className="text-sm text-purple-600 hover:text-purple-800">Ready for Pickup</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div>
            <ProductManagement
              openAdd={openAdd}
              onCloseAdd={() => setOpenAdd(false)}
              onProductAdded={() =>
                setStats(prev => ({ ...prev, totalProducts: prev.totalProducts + 1 }))
              }
            />
          </div>
        )}

        {/* All Products */}
        {activeTab === 'allProducts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Products from Other Farmers</h2>
              <p className="text-sm text-gray-600 mt-1">Browse products from other farmers in the marketplace</p>
            </div>
            <div className="p-6">
              <AllProductsView />
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-lg font-medium text-gray-900">All Orders</h2></div>
            <div className="p-6">
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">#{order.orderNumber}</h3>
                          <p className="text-sm text-gray-600">{order.customer.name}</p>
                          <p className="text-sm text-gray-500">₹{order.finalAmount}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}>{order.orderStatus.replace('_', ' ')}</span>
                          <p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <button onClick={() => setSelectedOrder(order)} className="text-sm text-blue-600 hover:text-blue-800"><FaEye className="inline mr-1" />View Details</button>
                        {['pending', 'confirmed'].includes(order.orderStatus) && (
                          <button onClick={() => handleUpdateOrderStatus(order._id, 'preparing')} className="text-sm text-green-600 hover:text-green-800">Start Preparing</button>
                        )}
                        {order.orderStatus === 'preparing' && (
                          <button onClick={() => handleUpdateOrderStatus(order._id, 'ready_for_pickup')} className="text-sm text-yellow-600 hover:text-yellow-800">Mark Ready</button>
                        )}
                        {order.orderStatus === 'ready_for_pickup' && (
                          <button onClick={() => handleUpdateOrderStatus(order._id, 'delivered')} className="text-sm text-green-600 hover:text-green-800"><FaCheck className="inline mr-1" />Mark Delivered</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600"><FaTimes className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3">
                        <div>
                    <p className="text-sm font-medium text-gray-700">Order Number</p>
                    <p className="text-sm text-gray-900">#{selectedOrder.orderNumber}</p>
                        </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer</p>
                    <div className="flex items-center space-x-2">
                      <FaUser className="text-gray-400" />
                      <span className="text-sm text-gray-900">{selectedOrder.customer.name}</span>
                      </div>
                        </div>
                        <div>
                    <p className="text-sm font-medium text-gray-700">Contact</p>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2"><FaPhone className="text-gray-400" /><span className="text-sm text-gray-900">{selectedOrder.customer.phone}</span></div>
                      <div className="flex items-center space-x-2"><FaEnvelope className="text-gray-400" /><span className="text-sm text-gray-900">{selectedOrder.customer.email}</span></div>
                    </div>
                        </div>
                        <div>
                    <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                    <div className="flex items-start space-x-2"><FaMapMarkerAlt className="text-gray-400 mt-1" /><p className="text-sm text-gray-900">{selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.zipCode}</p></div>
                        </div>
                        <div>
                    <p className="text-sm font-medium text-gray-700">Products</p>
                    <div className="space-y-1">
                      {selectedOrder.products.map((item, index) => (
                        <div key={index} className="text-sm text-gray-900">{item.product.name} - {item.quantity} {item.product.unit} × ₹{item.price}</div>
                      ))}
                        </div>
                      </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                    <p className="text-lg font-semibold text-gray-900">₹{selectedOrder.finalAmount}</p>
                        </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.orderStatus)}`}>{selectedOrder.orderStatus.replace('_', ' ')}</span>
                        </div>
                    </div>
                <div className="mt-6 flex space-x-3">
                  <button onClick={() => setSelectedOrder(null)} className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400">Close</button>
                </div>
              </div>
            </div>
            </div>
          )}

      </div>
    </div>
  );
};

export default SellerDashboard;
