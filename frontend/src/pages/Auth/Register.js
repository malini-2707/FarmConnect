import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    // Farmer-specific fields
    farmName: '',
    farmType: '',
    // Delivery partner-specific fields
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, farmName, farmType, vehicleType, vehicleNumber, licenseNumber, ...baseData } = formData;
      
      // Prepare registration data based on role
      const registrationData = { ...baseData };
      
      if (formData.role === 'farmer') {
        registrationData.farmName = farmName;
        registrationData.farmType = farmType;
      } else if (formData.role === 'delivery_partner') {
        registrationData.vehicleType = vehicleType;
        registrationData.vehicleNumber = vehicleNumber;
        registrationData.licenseNumber = licenseNumber;
      }
      
      const result = await register(registrationData);
      
      if (result.success) {
        toast.success('Registration successful!');
        
        // Route based on user role
        const userRole = result.user?.role || formData.role;
        switch (userRole) {
          case 'customer':
            navigate('/dashboard/customer');
            break;
          case 'farmer':
            navigate('/dashboard/farmer');
            break;
          case 'delivery_partner':
            navigate('/dashboard/delivery');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Join FarmConnect</h2>
          <p className="mt-2 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I want to join as:
              </label>
              <div className="grid grid-cols-1 gap-4">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="customer"
                    checked={formData.role === 'customer'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'customer' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="font-medium">Customer</div>
                    <div className="text-sm text-gray-500">Purchase fresh produce from farmers</div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="farmer"
                    checked={formData.role === 'farmer'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'farmer' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="font-medium">Farmer</div>
                    <div className="text-sm text-gray-500">Sell your farm produce directly to customers</div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="delivery_partner"
                    checked={formData.role === 'delivery_partner'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'delivery_partner' 
                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="font-medium">Delivery Partner</div>
                    <div className="text-sm text-gray-500">Deliver products from farmers to customers</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Role-specific fields */}
            {formData.role === 'farmer' && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800">Farm Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <input
                    name="farmName"
                    type="text"
                    value={formData.farmName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Farm Name"
                  />
                  <select
                    name="farmType"
                    value={formData.farmType}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Farm Type</option>
                    <option value="organic">Organic Farm</option>
                    <option value="conventional">Conventional Farm</option>
                    <option value="hydroponic">Hydroponic Farm</option>
                    <option value="greenhouse">Greenhouse Farm</option>
                    <option value="dairy">Dairy Farm</option>
                    <option value="poultry">Poultry Farm</option>
                    <option value="mixed">Mixed Farm</option>
                  </select>
                </div>
              </div>
            )}

            {formData.role === 'delivery_partner' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800">Vehicle Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="bike">Motorcycle/Bike</option>
                    <option value="scooter">Scooter</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                    <option value="bicycle">Bicycle</option>
                  </select>
                  <input
                    name="vehicleNumber"
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Vehicle Number (e.g., KA01AB1234)"
                  />
                  <input
                    name="licenseNumber"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Driving License Number"
                  />
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="input-icon">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="input-icon">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1 relative">
                <div className="input-icon">
                  <FiPhone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <div className="grid grid-cols-1 gap-4">
                <input
                  name="address.street"
                  type="text"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Street Address"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    name="address.city"
                    type="text"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="City"
                  />
                  <input
                    name="address.state"
                    type="text"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="State"
                  />
                </div>
                <input
                  name="address.zipCode"
                  type="text"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="ZIP Code"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="input-icon">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="input-icon">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
