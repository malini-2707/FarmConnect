import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  FaSearch, 
  FaFilter, 
  FaMapPin, 
  FaStar, 
  FaEye,
  FaShoppingCart
} from 'react-icons/fa';

const AllProductsView = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    isOrganic: false,
    city: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'vegetables', label: 'Vegetables' },
    { value: 'fruits', label: 'Fruits' },
    { value: 'grains', label: 'Grains' },
    { value: 'dairy', label: 'Dairy' },
    { value: 'herbs', label: 'Herbs' },
    { value: 'organic', label: 'Organic' }
  ];

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 12,
        ...filters
      });

      const response = await fetch(`/api/products?${params}`);
      const data = await response.json();
      
      // Filter out current user's products
      const otherProducts = data.products.filter(product => 
        product.seller._id !== user.id && product.seller._id !== user._id
      );
      
      setProducts(otherProducts);
      setPagination({
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        total: otherProducts.length
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const ProductCard = ({ product }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="relative">
        <img
          src={product.images?.[0] || '/placeholder-product.jpg'}
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-product.jpg';
          }}
        />
        {product.isOrganic && (
          <span className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Organic
          </span>
        )}
        {product.quantity <= product.lowStockThreshold && product.quantity > 0 && (
          <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Low Stock
          </span>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-green-600">
            ₹{product.price}
            <span className="text-sm font-normal text-gray-500">/{product.unit}</span>
          </span>
          <span className="text-sm text-gray-500">
            {product.quantity} {product.unit} available
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1">
            <FaMapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {product.location?.city || 'Location not specified'}
            </span>
          </div>
          {product.seller?.rating > 0 && (
            <div className="flex items-center space-x-1">
              <FaStar className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">{product.seller.rating}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            by {product.seller?.name}
          </span>
          <div className="flex space-x-2">
            <Link
              to={`/products/${product._id}`}
              className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 text-sm rounded hover:bg-blue-50"
            >
              <FaEye className="h-3 w-3 mr-1" />
              View
            </Link>
            <button
              onClick={() => handleAddToCart(product)}
              className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <FaShoppingCart className="h-3 w-3 mr-1" />
              Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleAddToCart = (product) => {
    // This would typically add to cart or create a purchase request
    toast.info(`Request feature for ${product.name} coming soon!`);
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search and Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="City"
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Price Range and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />

            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="createdAt">Latest</option>
              <option value="price">Price</option>
              <option value="name">Name</option>
              <option value="rating">Rating</option>
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.isOrganic}
                onChange={(e) => handleFilterChange('isOrganic', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Organic only</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <FaFilter className="h-4 w-4 mr-2" />
            Apply Filters
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {products.length} products from other farmers
        </p>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found from other farmers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {products.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-gray-700">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AllProductsView;
