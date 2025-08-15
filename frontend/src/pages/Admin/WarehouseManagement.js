import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiThermometer, FiDroplet, FiPackage, FiUsers, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [warehouseStatus, setWarehouseStatus] = useState(null);

  // Form states
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    location: {
      address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
      coordinates: { latitude: 0, longitude: 0 }
    },
    capacity: { total: 0, available: 0, unit: 'kg' },
    temperature: { current: 4, min: 2, max: 8, unit: 'celsius' },
    humidity: { current: 85, min: 80, max: 90, unit: 'percentage' },
    sections: [],
    manager: '',
    contactInfo: { phone: '', email: '', emergencyContact: '' }
  });

  const [sectionForm, setSectionForm] = useState({
    name: '',
    capacity: 0,
    temperature: 4,
    humidity: 85
  });

  const [productForm, setProductForm] = useState({
    sectionName: '',
    productId: '',
    quantity: 0,
    ripeningDays: 1,
    temperature: 4,
    humidity: 85,
    quality: 'good',
    notes: '',
    isOrganic: false,
    harvestDate: new Date().toISOString().split('T')[0],
    batchNumber: ''
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchWarehouseProducts(selectedWarehouse._id);
      fetchWarehouseStatus(selectedWarehouse._id);
    }
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouse');
      setWarehouses(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to fetch warehouses');
      setLoading(false);
    }
  };

  const fetchWarehouseProducts = async (warehouseId) => {
    try {
      const response = await axios.get(`/api/warehouse/${warehouseId}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch warehouse products');
    }
  };

  const fetchWarehouseStatus = async (warehouseId) => {
    try {
      const response = await axios.get(`/api/warehouse/${warehouseId}/status`);
      setWarehouseStatus(response.data);
    } catch (error) {
      toast.error('Failed to fetch warehouse status');
    }
  };

  const handleAddWarehouse = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/warehouse', warehouseForm);
      setWarehouses([...warehouses, response.data]);
      setShowAddModal(false);
      setWarehouseForm({
        name: '',
        location: {
          address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
          coordinates: { latitude: 0, longitude: 0 }
        },
        capacity: { total: 0, available: 0, unit: 'kg' },
        temperature: { current: 4, min: 2, max: 8, unit: 'celsius' },
        humidity: { current: 85, min: 80, max: 90, unit: 'percentage' },
        sections: [],
        manager: '',
        contactInfo: { phone: '', email: '', emergencyContact: '' }
      });
      toast.success('Warehouse added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add warehouse');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/warehouse/${selectedWarehouse._id}/sections`, sectionForm);
      setSelectedWarehouse(response.data);
      setShowSectionModal(false);
      setSectionForm({ name: '', capacity: 0, temperature: 4, humidity: 85 });
      toast.success('Section added successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add section');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/warehouse/${selectedWarehouse._id}/products`, productForm);
      setProducts([...products, response.data]);
      setShowProductModal(false);
      setProductForm({
        sectionName: '',
        productId: '',
        quantity: 0,
        ripeningDays: 1,
        temperature: 4,
        humidity: 85,
        quality: 'good',
        notes: '',
        isOrganic: false,
        harvestDate: new Date().toISOString().split('T')[0],
        batchNumber: ''
      });
      toast.success('Product added to warehouse successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await axios.delete(`/api/warehouse/${warehouseId}`);
        setWarehouses(warehouses.filter(w => w._id !== warehouseId));
        if (selectedWarehouse?._id === warehouseId) {
          setSelectedWarehouse(null);
        }
        toast.success('Warehouse deleted successfully');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete warehouse');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'out_of_service': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProductStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'stored': return 'text-blue-600 bg-blue-100';
      case 'ripening': return 'text-yellow-600 bg-yellow-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
        <p className="text-gray-600 mt-2">Manage cold storage facilities and product inventory</p>
      </div>

      {/* Warehouse List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Warehouses</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary-600 text-white p-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiPlus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse._id}
                  onClick={() => setSelectedWarehouse(warehouse)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWarehouse?._id === warehouse._id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{warehouse.name}</h3>
                      <p className="text-sm text-gray-600">{warehouse.location.address.city}, {warehouse.location.address.state}</p>
                      <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(warehouse.maintenance?.status)}`}>
                          {warehouse.maintenance?.status || 'operational'}
                        </span>
                        <span className="flex items-center">
                          <FiThermometer className="mr-1" />
                          {warehouse.temperature.current}°C
                        </span>
                        <span className="flex items-center">
                          <FiDroplet className="mr-1" />
                          {warehouse.humidity.current}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWarehouse(warehouse._id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warehouse Details */}
        <div className="lg:col-span-2">
          {selectedWarehouse ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedWarehouse.name}</h2>
                  <p className="text-gray-600">{selectedWarehouse.location.address.street}, {selectedWarehouse.location.address.city}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowSectionModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Section
                  </button>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Product
                  </button>
                </div>
              </div>

              {/* Warehouse Status */}
              {warehouseStatus && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiPackage className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm text-blue-600">Total Products</p>
                        <p className="text-xl font-bold text-blue-900">{warehouseStatus.products.total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiPackage className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm text-green-600">Ready for Sale</p>
                        <p className="text-xl font-bold text-green-900">{warehouseStatus.products.availableForSale}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiAlertCircle className="h-6 w-6 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-sm text-yellow-600">Expiring Soon</p>
                        <p className="text-xl font-bold text-yellow-900">{warehouseStatus.products.expiringSoon}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiUsers className="h-6 w-6 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm text-purple-600">Utilization</p>
                        <p className="text-xl font-bold text-purple-900">
                          {((selectedWarehouse.capacity.total - selectedWarehouse.capacity.available) / selectedWarehouse.capacity.total * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedWarehouse.sections.map((section, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{section.name}</h4>
                        <span className="text-sm text-gray-500">
                          {section.products.length} products
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span>{section.capacity} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span>{section.available} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Temperature:</span>
                          <span>{section.temperature}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Humidity:</span>
                          <span>{section.humidity}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Products</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ripening Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={product.product?.images?.[0] || '/default-product.png'}
                                  alt={product.product?.name}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{product.product?.name}</div>
                                <div className="text-sm text-gray-500">{product.product?.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.section}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.quantity} {product.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs ${getProductStatusColor(product.status)}`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(product.ripeningDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-primary-600 hover:text-primary-900 mr-3">Edit</button>
                            <button className="text-red-600 hover:text-red-900">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <FiPackage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Warehouse Selected</h3>
              <p className="text-gray-500">Select a warehouse from the list to view details and manage products.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Warehouse</h3>
              <form onSubmit={handleAddWarehouse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={warehouseForm.name}
                    onChange={(e) => setWarehouseForm({...warehouseForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={warehouseForm.location.address.city}
                    onChange={(e) => setWarehouseForm({
                      ...warehouseForm,
                      location: {
                        ...warehouseForm.location,
                        address: { ...warehouseForm.location.address, city: e.target.value }
                      }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Capacity (kg)</label>
                  <input
                    type="number"
                    value={warehouseForm.capacity.total}
                    onChange={(e) => setWarehouseForm({
                      ...warehouseForm,
                      capacity: { ...warehouseForm.capacity, total: parseInt(e.target.value), available: parseInt(e.target.value) }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Add Warehouse
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Section</h3>
              <form onSubmit={handleAddSection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section Name</label>
                  <input
                    type="text"
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({...sectionForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity (kg)</label>
                  <input
                    type="number"
                    value={sectionForm.capacity}
                    onChange={(e) => setSectionForm({...sectionForm, capacity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                  <input
                    type="number"
                    value={sectionForm.temperature}
                    onChange={(e) => setSectionForm({...sectionForm, temperature: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Humidity (%)</label>
                  <input
                    type="number"
                    value={sectionForm.humidity}
                    onChange={(e) => setSectionForm({...sectionForm, humidity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSectionModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Product to Warehouse</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section</label>
                  <select
                    value={productForm.sectionName}
                    onChange={(e) => setProductForm({...productForm, sectionName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select Section</option>
                    {selectedWarehouse?.sections.map((section, index) => (
                      <option key={index} value={section.name}>{section.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product ID</label>
                  <input
                    type="text"
                    value={productForm.productId}
                    onChange={(e) => setProductForm({...productForm, productId: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter product ID"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity (kg)</label>
                  <input
                    type="number"
                    value={productForm.quantity}
                    onChange={(e) => setProductForm({...productForm, quantity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ripening Days</label>
                  <input
                    type="number"
                    value={productForm.ripeningDays}
                    onChange={(e) => setProductForm({...productForm, ripeningDays: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                  <input
                    type="text"
                    value={productForm.batchNumber}
                    onChange={(e) => setProductForm({...productForm, batchNumber: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
