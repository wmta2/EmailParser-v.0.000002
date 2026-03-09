import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/types/product';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  async function searchProducts(query: string) {
    try {
      setLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (searchError) throw searchError;

      setProducts(data || []);
    } catch (err) {
      console.error('Error searching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to search products');
    } finally {
      setLoading(false);
    }
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchProducts();
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  }

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    searchProducts,
    updateProduct,
  };
}
