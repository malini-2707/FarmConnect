import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaShoppingCart, 
  FaBox, 
  FaTruck, 
  FaCheckCircle, 
  FaClock,
  FaMapMarkerAlt,
  FaSearch,
  FaFilter,
  FaPlus,
  FaMinus,
  FaTimes
} from 'react-icons/fa';

// Helper to resolve product image URL from various stored formats
function resolveProductImageUrl(raw) {
  if (!raw) return '/placeholder-product.jpg';
  // Already absolute or root-relative URL
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    // If it includes uploads path, normalize to served static path
    if (raw.includes('uploads/products/')) {
      const parts = raw.split(/[/\\]/);
      const filename = parts[parts.length - 1];
      return `/images/products/${filename}`;
    }
    return raw;
  }
  // If it's a Windows/Unix path or just a filename, extract filename
  const parts = raw.split(/[/\\]/);
  const filename = parts[parts.length - 1];
  return `/images/products/${filename}`;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [location, setLocation] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState({ show: false, product: null });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualLocation, setManualLocation] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            type: 'gps'
          });
          toast.success('Location detected successfully!');
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Location access denied';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = 'Unable to get location.';
          }
          
          toast.warning(errorMessage);
          setShowLocationModal(true);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      toast.warning('Geolocation is not supported by this browser');
      setShowLocationModal(true);
    }
  };

  const handleManualLocationSubmit = (e) => {
    e.preventDefault();
    if (manualLocation.city && manualLocation.state) {
      setLocation({
        type: 'manual',
        city: manualLocation.city,
        state: manualLocation.state,
        street: manualLocation.street,
        zipCode: manualLocation.zipCode
      });
      setShowLocationModal(false);
      toast.success('Location set manually!');
    } else {
      toast.error('Please enter at least city and state');
    }
  };

  const resetLocation = () => {
    setLocation(null);
    setManualLocation({ street: '', city: '', state: '', zipCode: '' });
    toast.info('Location reset. You can set it again.');
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/requests/my-requests');
      setOrders(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      console.log('Products response:', response.data); // Debug log
      
      if (Array.isArray(response.data)) {
        setProducts(response.data);
        console.log('Products set:', response.data.length); // Debug log
      } else if (response.data.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
        console.log('Products from data.products:', response.data.products.length); // Debug log
      } else {
        console.log('Unexpected products data structure:', response.data); // Debug log
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      toast.error('Failed to fetch products: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product._id === product._id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product._id === product._id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product._id !== productId));
    toast.success('Item removed from cart');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.product._id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const openPurchaseModal = (product) => {
    setPurchaseModal({ show: true, product });
  };

  const closePurchaseModal = () => {
    setPurchaseModal({ show: false, product: null });
  };

  const handlePurchase = async (product, quantity, message, deliveryAddress) => {
    try {
      const response = await axios.post('/api/requests', {
        product: product._id,
        quantity: parseFloat(quantity),
        message,
        deliveryAddress,
        proposedPrice: product.price * quantity
      });

      toast.success('Purchase request sent successfully!');
      closePurchaseModal();
      fetchOrders(); // Refresh orders
      setCart([]); // Clear cart
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send purchase request');
    }
  };

  const getOrderStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'accepted':
        return <FaBox className="text-blue-500" />;
      case 'rejected':
        return <FaTimes className="text-red-500" />;
      case 'completed':
        return <FaCheckCircle className="text-green-500" />;
      case 'cancelled':
        return <FaTimes className="text-red-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProducts = (products || []).filter(product => {
    if (!product || !product.name) return false;
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    // Debug log for first few products
    if (products.length > 0 && products.indexOf(product) < 3) {
      console.log('Filtering product:', product.name, 'search:', searchTerm, 'category:', selectedCategory);
      console.log('matchesSearch:', matchesSearch, 'matchesCategory:', matchesCategory);
    }
    
    return matchesSearch && matchesCategory;
  });

  const recentOrders = orders.slice(0, 5);
  const totalOrders = orders.length;
  const activeOrders = orders.filter(order => 
    ['pending', 'accepted'].includes(order.status)
  ).length;

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
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">Manage your orders and discover fresh products</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 text-gray-600 hover:text-green-600"
              >
                <FaShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
              
              {/* Location Section */}
              <div className="flex items-center space-x-2">
                <FaMapMarkerAlt className="text-green-500" />
                <div className="text-sm text-gray-600">
                  {location ? (
                    <div className="flex items-center space-x-2">
                      <span>
                        {location.type === 'gps' 
                          ? `GPS: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                          : `${location.city}, ${location.state}`
                        }
                      </span>
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        Change
                      </button>
                      <button
                        onClick={resetLocation}
                        className="text-red-600 hover:text-red-800 text-xs underline"
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Location not set</span>
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        Set Location
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Shopping Cart</h3>
                <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto h-full">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <FaShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 mt-2">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product._id} className="border rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={resolveProductImageUrl(item.product.images?.[0])}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded"
                          onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg'; }}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product.name}</h4>
                          <p className="text-sm text-gray-600">₹{item.product.price} per {item.product.unit}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() => updateCartQuantity(item.product._id, item.quantity - 1)}
                              className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              <FaMinus className="h-3 w-3" />
                            </button>
                            <span className="px-2">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.product._id, item.quantity + 1)}
                              className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                            >
                              <FaPlus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Total:</span>
                      <span className="font-semibold text-lg">₹{getCartTotal()}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (cart.length > 0) {
                          openPurchaseModal(cart[0].product);
                        }
                      }}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FaShoppingCart },
              { id: 'orders', label: 'My Orders', icon: FaBox },
              { id: 'products', label: 'Browse Products', icon: FaSearch }
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
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100">
                    <FaShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">{totalOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-orange-100">
                    <FaClock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Orders</p>
                    <p className="text-2xl font-semibold text-gray-900">{activeOrders}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100">
                    <FaCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {orders.filter(order => order.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order._id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getOrderStatusIcon(order.status)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {order.product?.name || 'Product'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            ₹{order.totalAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <FaShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start shopping to see your orders here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">My Orders</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div key={order._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getOrderStatusIcon(order.status)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.product?.name || 'Product'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Qty: {order.quantity} {order.product?.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{order.totalAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <FaBox className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't placed any orders yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Debug Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-blue-800">🔍 Search Debug Info</h4>
                <button
                  onClick={fetchProducts}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  🔄 Refresh Products
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-blue-700">
                <div>
                  <span className="font-medium">Total Products:</span> {products.length}
                </div>
                <div>
                  <span className="font-medium">Filtered Products:</span> {filteredProducts.length}
                </div>
                <div>
                  <span className="font-medium">Search Term:</span> "{searchTerm || 'none'}"
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedCategory}
                </div>
              </div>
              {products.length === 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-blue-600">
                    ⚠️ No products loaded. Check if backend is running and products exist in database.
                  </p>
                  <p className="text-xs text-blue-600">
                    💡 Try clicking "Refresh Products" button above.
                  </p>
                </div>
              )}
              {products.length > 0 && filteredProducts.length === 0 && searchTerm && (
                <p className="text-xs text-orange-600 mt-2">
                  🔍 No products match your search. Try different keywords or clear the search.
                </p>
              )}
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FaFilter className="text-gray-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                    <option value="dairy">Dairy</option>
                    <option value="herbs">Herbs</option>
                    <option value="organic">Organic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product._id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-w-1 aspect-h-1 w-full">
                    <img
                      src={resolveProductImageUrl(product.images?.[0])}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder-product.jpg'; }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-green-600">₹{product.price}</span>
                      <span className="text-sm text-gray-500">{product.unit}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => addToCart(product)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                      <button 
                        onClick={() => openPurchaseModal(product)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <FaSearch className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {purchaseModal.show && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Purchase {purchaseModal.product?.name}</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handlePurchase(
                purchaseModal.product,
                formData.get('quantity'),
                formData.get('message'),
                {
                  street: formData.get('street'),
                  city: formData.get('city'),
                  state: formData.get('state'),
                  zipCode: formData.get('zipCode')
                }
              );
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max={purchaseModal.product?.quantity || 100}
                    defaultValue="1"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message (Optional)</label>
                  <textarea
                    name="message"
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Any special instructions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="text"
                      name="street"
                      placeholder="Street"
                      required
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      name="city"
                      placeholder="City"
                      required
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      name="state"
                      placeholder="State"
                      required
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="ZIP Code"
                      required
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closePurchaseModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Purchase
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Your Location</h3>
            
            <div className="mb-4">
              <button
                onClick={getCurrentLocation}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors mb-3"
              >
                📍 Use GPS Location
              </button>
              <p className="text-xs text-gray-500 text-center">
                Allow location access when prompted by your browser
              </p>
            </div>

            <div className="text-center mb-4">
              <span className="text-gray-500">- OR -</span>
            </div>

            <form onSubmit={handleManualLocationSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Street Address (Optional)</label>
                  <input
                    type="text"
                    value={manualLocation.street}
                    onChange={(e) => setManualLocation({...manualLocation, street: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    value={manualLocation.city}
                    onChange={(e) => setManualLocation({...manualLocation, city: e.target.value})}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Chennai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State *</label>
                  <input
                    type="text"
                    value={manualLocation.state}
                    onChange={(e) => setManualLocation({...manualLocation, state: e.target.value})}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Tamil Nadu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ZIP Code (Optional)</label>
                  <input
                    type="text"
                    value={manualLocation.zipCode}
                    onChange={(e) => setManualLocation({...manualLocation, zipCode: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="600001"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Set Location
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Location helps us show you nearby products and delivery options. 
                You can always change it later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
