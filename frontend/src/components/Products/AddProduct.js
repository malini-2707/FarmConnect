import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUpload, FiX, FiSave } from 'react-icons/fi';

const AddProduct = ({ onClose, onProductAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'vegetables',
    price: '',
    unit: 'kg',
    quantity: '',
    location: {
      city: '',
      state: ''
    },
    isOrganic: false,
    harvestDate: '',
    expiryDate: '',
    tags: ''
  });
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState('file'); // 'file' or 'url'
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'herbs', label: 'Herbs' },
    { value: 'organic', label: 'Organic' },
    { value: 'other', label: 'Other' }
  ];

  const units = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'piece', label: 'Piece' },
    { value: 'dozen', label: 'Dozen' },
    { value: 'bunch', label: 'Bunch' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = images.length + imageUrls.length;
    
    if (files.length + totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum 5MB per image.`);
        return;
      }
    });
    
    setImages(prev => [...prev, ...files]);
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) {
      toast.error('Please enter a valid image URL');
      return;
    }
    
    const totalImages = images.length + imageUrls.length;
    if (totalImages >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(newImageUrl);
      setImageUrls(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
      toast.success('Image URL added successfully');
    } catch (error) {
      toast.error('Please enter a valid URL');
    }
  };

  const removeFileImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeUrlImage = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        if (key === 'location') {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else if (key === 'tags') {
          const tagsArray = formData[key].split(',').map(tag => tag.trim()).filter(tag => tag);
          formDataToSend.append(key, JSON.stringify(tagsArray));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add file images
      images.forEach(image => {
        formDataToSend.append('images', image);
      });
      
      // Add URL images
      if (imageUrls.length > 0) {
        formDataToSend.append('imageUrls', JSON.stringify(imageUrls));
      }

      const response = await axios.post('/api/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Product added successfully!');
      onProductAdded && onProductAdded(response.data.product);
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                required
                placeholder="e.g., Fresh Tomatoes"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input-field"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="input-field"
                required
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="input-field"
                required
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isOrganic"
                  checked={formData.isOrganic}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Organic Product</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              rows="4"
              required
              placeholder="Describe your product, its quality, farming methods, etc."
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="location.city"
                value={formData.location.city}
                onChange={handleChange}
                className="input-field"
                placeholder="Your city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="location.state"
                value={formData.location.state}
                onChange={handleChange}
                className="input-field"
                placeholder="Your state"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harvest Date
              </label>
              <input
                type="date"
                name="harvestDate"
                value={formData.harvestDate}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., fresh, local, pesticide-free"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images (Max 5)
            </label>
            
            {/* Upload Mode Tabs */}
            <div className="flex mb-4 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setImageUploadMode('file')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  imageUploadMode === 'file'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📁 Upload Files
              </button>
              <button
                type="button"
                onClick={() => setImageUploadMode('url')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  imageUploadMode === 'url'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔗 Add from URL
              </button>
            </div>

            {/* File Upload Mode */}
            {imageUploadMode === 'file' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload product images
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      PNG, JPG, GIF up to 5MB each
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* URL Input Mode */}
            {imageUploadMode === 'url' && (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Paste image URL (e.g., from Google Images)"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="btn-primary whitespace-nowrap"
                    disabled={images.length + imageUrls.length >= 5}
                  >
                    Add Image
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  💡 Tip: Right-click on any image online → "Copy image address" → Paste here
                </p>
              </div>
            )}

            {/* Image Preview */}
            {(images.length > 0 || imageUrls.length > 0) && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Added Images ({images.length + imageUrls.length}/5)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* File Images */}
                  {images.map((image, index) => (
                    <div key={`file-${index}`} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`File ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-blue-200"
                      />
                      <div className="absolute top-1 left-1 bg-blue-500 text-white px-1 py-0.5 rounded text-xs">
                        📁
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFileImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  {/* URL Images */}
                  {imageUrls.map((url, index) => (
                    <div key={`url-${index}`} className="relative">
                      <img
                        src={url}
                        alt={`URL ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-green-200"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/150/150';
                          e.target.className += ' opacity-50';
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-green-500 text-white px-1 py-0.5 rounded text-xs">
                        🔗
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUrlImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="h-4 w-4 mr-2" />
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
