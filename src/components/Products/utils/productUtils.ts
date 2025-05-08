import { safeIpcInvoke } from '@/lib/ipc';

// Interface for Category
export interface Category {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  businessId: string;
}

export interface TypeProduct {
  id: string;
  name: string;
}

// Interface for Supplier
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  businessId: string;
  inventoryItems?: Array<{
    id: string;
    product_id: string;
    quantity_supplied: number;
    cost_price: number;
    selling_price: number;
    quantity_left: number;
    product?: {
      id: string;
      name: string;
    };
  }>; // Array of inventory items supplied by this supplier
}

// Function to fetch categories for a business
export async function fetchCategories(businessId: string): Promise<Category[] | undefined> {
  try {
    const response = await safeIpcInvoke('inventory:category:get-all', { businessId }, { success: false, categories: [], message: '' });
    if (response?.success && response.categories && response.categories.length > 0) {
      return response.categories;
    }
    console.error("Error fetching categories:", response?.message);
    return undefined;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return undefined;
  }
}

// Function to fetch suppliers for a business
export async function fetchSuppliers(businessId: string, shopIds: string[]): Promise<Supplier[] | undefined> {
  try {
    const response = await safeIpcInvoke('entities:supplier:get-all', { shopIds }, { success: false, suppliers: [], message: '' });
    if (response?.success && response.suppliers && response.suppliers.length > 0) {
      return response.suppliers;
    }
    console.error("Error fetching suppliers:", response?.message);
    return undefined;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return undefined;
  }
}

// Function to fetch both categories and suppliers at once
export async function fetchProductDependencies(businessId: string, shopIds: string[]): Promise<{ categories?: Category[]; suppliers?: Supplier[] } | undefined> {
  try {
    const [categories, suppliers] = await Promise.all([
      fetchCategories(businessId),
      fetchSuppliers(businessId, shopIds)
    ]);

    return { categories, suppliers };
  } catch (error) {
    console.error('Error fetching product dependencies:', error);
    return undefined;
  }
}
