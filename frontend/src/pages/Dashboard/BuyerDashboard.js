import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiShoppingCart, FiPackage, FiClock, FiCheck, FiX } from 'react-icons/fi';

const BuyerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBuyerRequests();
  }, []);

  const fetchBuyerRequests = async () => {
    try {
      const response = await axios.get('/api/requests/my-requests');
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching buyer requests:', error);
      toast.error('Failed to fetch your requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await axios.patch(`/api/requests/${requestId}/status`, { status: 'cancelled' });
        toast.success('Request cancelled successfully');
        fetchBuyerRequests();
      } catch (error) {
        console.error('Error cancelling request:', error);
        toast.error('Failed to cancel request');
      }
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="h-4 w-4" />;
      case 'accepted': return <FiCheck className="h-4 w-4" />;
      case 'rejected': return <FiX className="h-4 w-4" />;
      case 'completed': return <FiPackage className="h-4 w-4" />;
      case 'cancelled': return <FiX className="h-4 w-4" />;
      default: return <FiClock className="h-4 w-4" />;
    }
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
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <FiClock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FiCheck className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="text-2xl font-semibold text-gray-900">
                {requests.filter(r => r.status === 'accepted').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FiPackage className="h-6 w-6" />
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

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/products" className="btn-primary">
            <FiShoppingCart className="h-4 w-4 mr-2" />
            Browse Products
          </Link>
          <Link to="/products?category=organic" className="btn-outline">
            Browse Organic Products
          </Link>
          <Link to="/products?category=vegetables" className="btn-outline">
            Fresh Vegetables
          </Link>
          <Link to="/products?category=fruits" className="btn-outline">
            Fresh Fruits
          </Link>
        </div>
      </div>

      {/* Purchase Requests */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">My Purchase Requests</h2>
            
            {/* Filter Buttons */}
            <div className="flex space-x-2">
              {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FiShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                {filter === 'all' ? 'No purchase requests yet' : `No ${filter} requests`}
              </p>
              <Link to="/products" className="btn-primary">
                <FiShoppingCart className="h-4 w-4 mr-2" />
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(request => (
                <div key={request._id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {request.product?.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Seller: {request.seller?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested on: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        ₹{request.totalAmount}
                      </p>
                      <p className="text-sm text-gray-500">
                        {request.quantity} {request.product?.unit}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Quantity</span>
                      <p className="font-medium">{request.quantity} {request.product?.unit}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Price per {request.product?.unit}</span>
                      <p className="font-medium">₹{request.proposedPrice}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Total Amount</span>
                      <p className="font-medium">₹{request.totalAmount}</p>
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Your message:</span>
                      <p className="text-sm text-gray-700 mt-1 bg-white p-3 rounded border">
                        {request.message}
                      </p>
                    </div>
                  )}

                  {request.deliveryAddress && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500">Delivery Address:</span>
                      <p className="text-sm text-gray-700 mt-1">
                        {request.deliveryAddress.street}, {request.deliveryAddress.city}, {request.deliveryAddress.state} {request.deliveryAddress.zipCode}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <Link
                        to={`/products/${request.product?._id}`}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View Product
                      </Link>
                      {request.seller && (
                        <span className="text-sm text-gray-500">
                          Contact: {request.seller.email}
                        </span>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleCancelRequest(request._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>

                  {/* Status-specific information */}
                  {request.status === 'accepted' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        🎉 Great! Your request has been accepted. The seller will contact you soon for delivery arrangements.
                      </p>
                    </div>
                  )}

                  {request.status === 'completed' && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ Order completed! We hope you enjoyed your fresh produce.
                      </p>
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        ❌ Unfortunately, this request was declined. You can try contacting the seller or look for similar products.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
