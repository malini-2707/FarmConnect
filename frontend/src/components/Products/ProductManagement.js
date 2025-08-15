import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaTimes,
  FaImage,
  FaBox,
  FaTag,
  FaDollarSign,
  FaWeightHanging,
  FaExclamationTriangle
} from 'react-icons/fa';

const ProductManagement = ({ openAdd, onCloseAdd, onProductAdded }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
		category: 'vegetables',
		unit: 'kg',
    minOrderQuantity: '1',
    maxOrderQuantity: '100',
    lowStockThreshold: '10',
    tags: []
  });
  const [editProduct, setEditProduct] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

	useEffect(() => {
		fetchProducts();
	}, []);

	// Open Add modal when parent requests it
	useEffect(() => {
		if (openAdd) {
			setShowAddModal(true);
			onCloseAdd && onCloseAdd();
		}
	}, [openAdd]);

	const fetchProducts = async () => {
    try {
      setLoading(true);
			const sellerId = user?.id || user?._id;
			const response = await fetch(`/api/products/seller/${sellerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

	const handleAddProduct = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      // Add product data
      Object.keys(newProduct).forEach(key => {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(newProduct[key]));
        } else {
          formData.append(key, newProduct[key]);
        }
      });
      
      // Add image if selected
      if (imageFile) {
				formData.append('images', imageFile);
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

			const data = await response.json();
			if (response.ok) {
				setProducts(prev => [data.product, ...prev]);
				onProductAdded && onProductAdded(data.product);
        setShowAddModal(false);
        resetForm();
        toast.success('Product added successfully');
      } else {
				toast.error(data.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

	const handleEditProduct = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      
      // Add product data
      Object.keys(editProduct).forEach(key => {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(editProduct[key]));
        } else {
          formData.append(key, editProduct[key]);
        }
      });
      
      // Add image if selected
      if (imageFile) {
				formData.append('images', imageFile);
      }

      const response = await fetch(`/api/products/${editProduct._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

			const data = await response.json();
			if (response.ok) {
				setProducts(prev => prev.map(p => 
					p._id === data.product._id ? data.product : p
				));
        setShowEditModal(false);
        resetForm();
        toast.success('Product updated successfully');
      } else {
				toast.error(data.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setProducts(prev => prev.filter(p => p._id !== productId));
          toast.success('Product deleted successfully');
        } else {
          const error = await response.json();
          toast.error(error.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleUpdateStock = async (productId, newQuantity) => {
    try {
      const response = await fetch(`/api/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (response.ok) {
        setProducts(prev => prev.map(p => 
          p._id === productId ? { ...p, quantity: newQuantity } : p
        ));
        toast.success('Stock updated successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

	const openEditModal = (product) => {
    setEditProduct(product);
		setImagePreview((product.images && product.images[0]) || '');
    setImageFile(null);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: '',
      unit: 'kg',
      minOrderQuantity: '1',
      maxOrderQuantity: '100',
      lowStockThreshold: '10',
      tags: []
    });
    setImageFile(null);
    setImagePreview('');
  };

  const getStatusColor = (status) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStockColor = (quantity, threshold) => {
    if (quantity <= 0) return 'text-red-600';
    if (quantity <= threshold) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

	return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">My Products</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your product listings and inventory</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
          >
            <FaPlus className="mr-2" />
            Add New Product
          </button>
        </div>
      </div>

      <div className="p-6">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <FaBox className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No products yet</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by adding your first product to the marketplace.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                <FaPlus className="mr-2" />
                Add Your First Product
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div key={product._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-300 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{product.category}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      title="Edit Product"
                    >
                      <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      title="Delete Product"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {product.images && product.images[0] && (
                  <div className="mb-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Price:</span>
                    <span className="font-medium text-gray-900">₹{product.price}/{product.unit}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stock:</span>
                    <span className={`font-medium ${getStockColor(product.quantity, product.lowStockThreshold)}`}>
                      {product.quantity} {product.unit}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(product.isAvailable)}`}>
                      {product.isAvailable ? 'Available' : 'Out of Stock'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const newQuantity = prompt('Enter new quantity:', product.quantity);
                      if (newQuantity !== null && !isNaN(newQuantity)) {
                        handleUpdateStock(product._id, parseInt(newQuantity));
                      }
                    }}
                    className="flex-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 rounded px-3 py-2 hover:bg-blue-50 transition-colors"
                  >
                    Update Stock
                  </button>
                </div>

                {product.quantity <= product.lowStockThreshold && product.quantity > 0 && (
                  <div className="mt-3 flex items-center text-yellow-600 text-sm">
                    <FaExclamationTriangle className="mr-1" />
                    Low stock warning
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Product</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto rounded-lg" />
                      ) : (
                        <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      required
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
					<option value="vegetables">Vegetables</option>
					<option value="fruits">Fruits</option>
					<option value="grains">Grains</option>
					<option value="dairy">Dairy</option>
					<option value="herbs">Herbs</option>
					<option value="organic">Organic</option>
					<option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <select
                      required
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
					<option value="kg">Kilogram (kg)</option>
					<option value="gram">Gram (g)</option>
					<option value="liter">Liter (L)</option>
					<option value="piece">Piece</option>
					<option value="dozen">Dozen</option>
					<option value="bunch">Bunch</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Order</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newProduct.minOrderQuantity}
                      onChange={(e) => setNewProduct({...newProduct, minOrderQuantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Order</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newProduct.maxOrderQuantity}
                      onChange={(e) => setNewProduct({...newProduct, maxOrderQuantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Low Stock Alert</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduct.lowStockThreshold}
                      onChange={(e) => setNewProduct({...newProduct, lowStockThreshold: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Product</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 w-auto rounded-lg" />
                      ) : (
                        <FaImage className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={editProduct.name || ''}
                    onChange={(e) => setEditProduct({...editProduct, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    value={editProduct.description || ''}
                    onChange={(e) => setEditProduct({...editProduct, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={editProduct.price || ''}
                      onChange={(e) => setEditProduct({...editProduct, price: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editProduct.quantity || ''}
                      onChange={(e) => setEditProduct({...editProduct, quantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      required
                      value={editProduct.category || ''}
                      onChange={(e) => setEditProduct({...editProduct, category: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
					<option value="vegetables">Vegetables</option>
					<option value="fruits">Fruits</option>
					<option value="grains">Grains</option>
					<option value="dairy">Dairy</option>
					<option value="herbs">Herbs</option>
					<option value="organic">Organic</option>
					<option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <select
                      required
                      value={editProduct.unit || 'kg'}
                      onChange={(e) => setEditProduct({...editProduct, unit: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
					<option value="kg">Kilogram (kg)</option>
					<option value="gram">Gram (g)</option>
					<option value="liter">Liter (L)</option>
					<option value="piece">Piece</option>
					<option value="dozen">Dozen</option>
					<option value="bunch">Bunch</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Order</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editProduct.minOrderQuantity || '1'}
                      onChange={(e) => setEditProduct({...editProduct, minOrderQuantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Order</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editProduct.maxOrderQuantity || '100'}
                      onChange={(e) => setEditProduct({...editProduct, maxOrderQuantity: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Low Stock Alert</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editProduct.lowStockThreshold || '10'}
                      onChange={(e) => setEditProduct({...editProduct, lowStockThreshold: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Update Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
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

export default ProductManagement;
