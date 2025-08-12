import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiPackage, FiShoppingCart, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import AddProduct from '../../components/Products/AddProduct';

const SellerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    fetchSellerData();
  }, []);

  const fetchSellerData = async () => {
    try {
      const [productsRes, requestsRes] = await Promise.all([
        axios.get('/api/products/seller/me'),
        axios.get('/api/requests/my-requests')
      ]);
      
      setProducts(productsRes.data.products || []);
      setRequests(requestsRes.data.requests || []);
    } catch (error) {
      console.error('Error fetching seller data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    try {
      await axios.patch(`/api/requests/${requestId}/status`, { status });
      toast.success(`Request ${status} successfully`);
      fetchSellerData();
    } catch (error) {
      console.error('Error updating request status:', error);
      toast.error('Failed to update request status');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${productId}`);
        toast.success('Product deleted successfully');
        fetchSellerData();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleProductAdded = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    setShowAddProduct(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FiPackage className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <FiShoppingCart className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">{requests.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <FiShoppingCart className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FiShoppingCart className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Products
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Purchase Requests
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">My Products</h2>
                <button 
                  onClick={() => setShowAddProduct(true)}
                  className="btn-primary"
                >
                  <FiPlus className="h-4 w-4 mr-2" />
                  Add New Product
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-12">
                  <FiPackage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No products yet</p>
                  <button 
                    onClick={() => setShowAddProduct(true)}
                    className="btn-primary"
                  >
                    <FiPlus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
                    <div key={product._id} className="bg-gray-50 rounded-lg p-4">
                      <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden mb-4">
                        <img
                          src={product.images?.[0] ? (product.images[0].startsWith('http') ? product.images[0] : `/images/${product.images[0]}`) : '/api/placeholder/300/300'}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-bold text-primary-600">
                          ₹{product.price}/{product.unit}
                        </span>
                        <span className="text-sm text-gray-500">
                          {product.quantity} {product.unit} left
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          to={`/products/${product._id}`}
                          className="btn-outline flex-1 text-center text-sm"
                        >
                          <FiEye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                        <button className="btn-secondary flex-1 text-sm">
                          <FiEdit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="btn-secondary text-red-600 hover:bg-red-50 text-sm"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Purchase Requests</h2>

              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <FiShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No purchase requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map(request => (
                    <div key={request._id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {request.product?.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            From: {request.buyer?.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Email: {request.buyer?.email}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-gray-500">Quantity</span>
                          <p className="font-medium">{request.quantity} {request.product?.unit}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Proposed Price</span>
                          <p className="font-medium">₹{request.proposedPrice}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Total Amount</span>
                          <p className="font-medium">₹{request.totalAmount}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Date</span>
                          <p className="font-medium">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {request.message && (
                        <div className="mb-4">
                          <span className="text-sm text-gray-500">Message:</span>
                          <p className="text-sm text-gray-700 mt-1">{request.message}</p>
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'accepted')}
                            className="btn-primary"
                          >
                            Accept Request
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            className="btn-secondary text-red-600 hover:bg-red-50"
                          >
                            Reject Request
                          </button>
                        </div>
                      )}

                      {request.status === 'accepted' && (
                        <button
                          onClick={() => handleStatusUpdate(request._id, 'completed')}
                          className="btn-primary"
                        >
                          Mark as Completed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <AddProduct
          onClose={() => setShowAddProduct(false)}
          onProductAdded={handleProductAdded}
        />
      )}
    </div>
  );
};

export default SellerDashboard;
