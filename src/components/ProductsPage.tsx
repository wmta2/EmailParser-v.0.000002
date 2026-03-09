import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Package, Search, RefreshCw, CreditCard as Edit, DollarSign, Box } from 'lucide-react';
import { Pagination } from './Pagination';

const ITEMS_PER_PAGE = 20;

export function ProductsPage() {
  const { products, loading, error, refetch, searchProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProducts = products.slice(startIndex, endIndex);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchProducts(searchQuery);
    } else {
      refetch();
    }
    setCurrentPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-slate-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Products</h1>
            <p className="text-slate-600 mt-1">Manage your product catalog</p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU, or description..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  refetch();
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-600">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Sync products from Orderwise to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">SKU</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Stock</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-slate-900">{product.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                              <Box className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            {product.brand && (
                              <div className="text-xs text-slate-500">{product.brand}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{product.category}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-900">
                          <DollarSign className="w-4 h-4 text-slate-400" />
                          {product.price_per_unit.toFixed(2)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm ${product.stock_level > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            product.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4 text-slate-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            <div className="mt-4 text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(endIndex, products.length)} of {products.length} products
            </div>
          </>
        )}
      </div>
    </div>
  );
}
