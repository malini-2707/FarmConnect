import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { FiMapPin, FiStar, FiCalendar, FiUser, FiPhone, FiMail } from 'react-icons/fi';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState({
    quantity: 1,
    message: '',
    proposedPrice: '',
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    deliveryDate: ''
  });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
      setRequestData(prev => ({
        ...prev,
        proposedPrice: response.data.price
      }));
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('deliveryAddress.')) {
      const addressField = name.split('.')[1];
      setRequestData(prev => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [addressField]: value
        }
      }));
    } else {
      setRequestData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to make a request');
      navigate('/login');
      return;
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can make purchase requests');
      return;
    }

    if (requestData.quantity > product.quantity) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post('/api/requests', {
        product: product._id,
        quantity: parseFloat(requestData.quantity),
        message: requestData.message,
        proposedPrice: parseFloat(requestData.proposedPrice),
        deliveryAddress: requestData.deliveryAddress,
        deliveryDate: requestData.deliveryDate ? new Date(requestData.deliveryDate) : undefined
      });

      toast.success('Purchase request sent successfully!');
      setShowRequestForm(false);
      setRequestData({
        quantity: 1,
        message: '',
        proposedPrice: product.price,
        deliveryAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        deliveryDate: ''
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div>
              <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden mb-4">
                <img
                  src={product.images?.[0] ? (product.images[0].startsWith('http') ? product.images[0] : `http://localhost:5000/images/${product.images[0]}`) : '/api/placeholder/500/500'}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    e.target.src = '/api/placeholder/500/500';
                  }}
                />
              </div>
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(1, 5).map((image, index) => (
                    <img
                      key={index}
                      src={image.startsWith('http') ? image : `http://localhost:5000/images/${image}`}
                      alt={`${product.name} ${index + 2}`}
                      className="w-full h-20 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = '/api/placeholder/150/150';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-3xl font-bold text-primary-600">
                    ₹{product.price}
                    <span className="text-lg font-normal text-gray-500">/{product.unit}</span>
                  </span>
                  {product.isOrganic && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Organic
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{product.description}</p>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500">Category</span>
                  <p className="font-medium capitalize">{product.category}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Available Quantity</span>
                  <p className="font-medium">{product.quantity} {product.unit}</p>
                </div>
                {product.harvestDate && (
                  <div>
                    <span className="text-sm text-gray-500">Harvest Date</span>
                    <p className="font-medium flex items-center">
                      <FiCalendar className="h-4 w-4 mr-1" />
                      {new Date(product.harvestDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {product.location?.city && (
                  <div>
                    <span className="text-sm text-gray-500">Location</span>
                    <p className="font-medium flex items-center">
                      <FiMapPin className="h-4 w-4 mr-1" />
                      {product.location.city}, {product.location.state}
                    </p>
                  </div>
                )}
              </div>

              {/* Seller Info */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Seller Information</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="font-medium flex items-center">
                      <FiUser className="h-4 w-4 mr-2" />
                      {product.seller.name}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <FiMail className="h-4 w-4 mr-2" />
                      {product.seller.email}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <FiPhone className="h-4 w-4 mr-2" />
                      {product.seller.phone}
                    </p>
                  </div>
                  {product.seller.rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <FiStar className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="font-medium">{product.seller.rating}</span>
                      <span className="text-sm text-gray-500">
                        ({product.seller.totalRatings} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {isAuthenticated && user.role === 'buyer' && user.id !== product.seller._id ? (
                  <>
                    <button
                      onClick={() => setShowRequestForm(!showRequestForm)}
                      className="w-full btn-primary"
                    >
                      Make Purchase Request
                    </button>
                    
                    {showRequestForm && (
                      <form onSubmit={handleSubmitRequest} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold">Purchase Request Details</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity ({product.unit})
                            </label>
                            <input
                              type="number"
                              name="quantity"
                              min="1"
                              max={product.quantity}
                              value={requestData.quantity}
                              onChange={handleRequestChange}
                              className="input-field"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Proposed Price (₹/{product.unit})
                            </label>
                            <input
                              type="number"
                              name="proposedPrice"
                              min="0"
                              step="0.01"
                              value={requestData.proposedPrice}
                              onChange={handleRequestChange}
                              className="input-field"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message (Optional)
                          </label>
                          <textarea
                            name="message"
                            value={requestData.message}
                            onChange={handleRequestChange}
                            className="input-field"
                            rows="3"
                            placeholder="Any special requirements or message for the seller..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Delivery Date (Optional)
                          </label>
                          <input
                            type="date"
                            name="deliveryDate"
                            value={requestData.deliveryDate}
                            onChange={handleRequestChange}
                            className="input-field"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Delivery Address
                          </label>
                          <input
                            type="text"
                            name="deliveryAddress.street"
                            value={requestData.deliveryAddress.street}
                            onChange={handleRequestChange}
                            className="input-field"
                            placeholder="Street Address"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              name="deliveryAddress.city"
                              value={requestData.deliveryAddress.city}
                              onChange={handleRequestChange}
                              className="input-field"
                              placeholder="City"
                            />
                            <input
                              type="text"
                              name="deliveryAddress.state"
                              value={requestData.deliveryAddress.state}
                              onChange={handleRequestChange}
                              className="input-field"
                              placeholder="State"
                            />
                            <input
                              type="text"
                              name="deliveryAddress.zipCode"
                              value={requestData.deliveryAddress.zipCode}
                              onChange={handleRequestChange}
                              className="input-field"
                              placeholder="ZIP"
                            />
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRequestForm(false)}
                            className="btn-secondary flex-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                ) : !isAuthenticated ? (
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full btn-primary"
                  >
                    Login to Make Purchase Request
                  </button>
                ) : user.role === 'seller' ? (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-yellow-800">
                      Switch to a buyer account to make purchase requests
                    </p>
                  </div>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">
                      This is your own product
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
