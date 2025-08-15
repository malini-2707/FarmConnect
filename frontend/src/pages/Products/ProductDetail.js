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
  // Customer order flow
  const [orderData, setOrderData] = useState({
    quantity: 1,
    deliveryInstructions: '',
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    paymentMethod: 'cod'
  });
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
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
      // Prefill order address from user profile if available
      if (user && user.address) {
        setOrderData(prev => ({
          ...prev,
          deliveryAddress: {
            street: user.address.street || '',
            city: user.address.city || '',
            state: user.address.state || '',
            zipCode: user.address.zipCode || ''
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  // Customer order handlers
  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('deliveryAddress.')) {
      const addressField = name.split('.')[1];
      setOrderData(prev => ({
        ...prev,
        deliveryAddress: { ...prev.deliveryAddress, [addressField]: value }
      }));
    } else {
      setOrderData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }
    if (user.role !== 'customer') {
      toast.error('Only customers can place orders');
      return;
    }
    if (Number(orderData.quantity) > Number(product.quantity)) {
      toast.error('Requested quantity exceeds available stock');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        products: [{ product: product._id, quantity: Number(orderData.quantity) }],
        deliveryAddress: orderData.deliveryAddress,
        deliveryInstructions: orderData.deliveryInstructions,
        paymentMethod: orderData.paymentMethod
      };
      await axios.post('/api/orders', payload);
      toast.success('Order placed successfully');
      setShowOrderForm(false);
      navigate('/dashboard/customer');
    } catch (error) {
      console.error('Place order error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
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
                {isAuthenticated && user.role === 'customer' && user.id !== product.seller._id ? (
                  <>
                    <button
                      onClick={() => setShowOrderForm(!showOrderForm)}
                      className="w-full btn-primary"
                    >
                      Place Order
                    </button>
                    
                    {showOrderForm && (
                      <form onSubmit={handlePlaceOrder} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold">Order Details</h4>
                        
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
                              value={orderData.quantity}
                              onChange={handleOrderChange}
                              className="input-field"
                              required
                            />
                          </div>
                          <div className="pt-7 text-right">
                            <div className="text-sm text-gray-600">Total</div>
                            <div className="text-xl font-semibold">₹{(Number(orderData.quantity||0)*Number(product.price||0)).toFixed(2)}</div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Delivery Instructions (Optional)
                          </label>
                          <textarea
                            name="deliveryInstructions"
                            value={orderData.deliveryInstructions}
                            onChange={handleOrderChange}
                            className="input-field"
                            rows="3"
                            placeholder="Any special requirements for delivery..."
                          />
                        </div>

                        {/* Payment Method */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['cod','upi','card','net_banking'].map(pm => (
                              <label key={pm} className="flex items-center space-x-2 p-2 rounded border">
                                <input type="radio" name="paymentMethod" value={pm} checked={orderData.paymentMethod===pm} onChange={handleOrderChange} />
                                <span className="capitalize">{pm.replace('_',' ')}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Delivery Address
                          </label>
                          <input
                            type="text"
                            name="deliveryAddress.street"
                            value={orderData.deliveryAddress.street}
                            onChange={handleOrderChange}
                            className="input-field"
                            placeholder="Street Address"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              name="deliveryAddress.city"
                              value={orderData.deliveryAddress.city}
                              onChange={handleOrderChange}
                              className="input-field"
                              placeholder="City"
                            />
                            <input
                              type="text"
                              name="deliveryAddress.state"
                              value={orderData.deliveryAddress.state}
                              onChange={handleOrderChange}
                              className="input-field"
                              placeholder="State"
                            />
                            <input
                              type="text"
                              name="deliveryAddress.zipCode"
                              value={orderData.deliveryAddress.zipCode}
                              onChange={handleOrderChange}
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
                            {submitting ? 'Placing...' : 'Place Order'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowOrderForm(false)}
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
                    Login to Place Order
                  </button>
                ) : user.role === 'farmer' ? (
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-yellow-800">
                      Switch to a customer account to place orders
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
