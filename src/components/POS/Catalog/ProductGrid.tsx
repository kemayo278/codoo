"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select" // Removed SelectPortal
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Minus, Plus, X, RefreshCcw, AlertCircle } from "lucide-react"
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { AddProduct } from "@/components/Products/Form/AddProduct"
import EmptyState from './Empty/EmptyState'
import { PrinterService } from "@/services/printerService";
import AxiosClient from "@/lib/axiosClient"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"

// Define the Product interface
interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  featuredImage: string | null;
  status: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  quantity: number;
  category_id: string;
  category?: {
    id: string;
    name: string;
  };
  inventories?: InventoryItem[]; // Add inventories to track warehouse information
}

// Define the CartItem interface (extends Product with quantity and inventory)
interface CartItem extends ProductShopAttributes {
  quantity: number;
  actualPrice: number;
  selectedInventory?: InventoryItem; // Keep this for compatibility
}

// Define the Inventory interface
interface Inventory {
  id: string;
  name: string;
  description?: string;
  shopId?: string | null;
}

// Define the InventoryItem interface
interface InventoryItem {
  id: string;
  product_id: string;
  inventory_id: string;
  inventory?: Inventory;
  quantity: number;
  unit_cost: number;
  selling_price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

// Define the Customer interface
interface Customer {
  id: string | null; // Use string for ID to match Select value type
  name: string;
  phone: string;
  email?: string;
}

// Define the TreasuryAccount interface
interface TreasuryAccount {
  id: number;
  name: string;
  type: string;
  number: string;
  description?: string;
  openingBalance: number;
  recurringBalance: number;
}

// Define the Category interface
interface Category {
  id: string;
  name: string;
  image?: string;
  description?: string;
  itemCount?: number;
}

interface ProductCardProps {
  product: ProductShopAttributes;
  onAddToCart: (product: ProductShopAttributes) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // Normalize the image path by converting backslashes to forward slashes
  const normalizedImagePath = product.product.featuredImage?.replace(/\\/g, '/');
  
  // Check if product has multiple inventories
  const hasMultipleInventories = product.inventories && product.inventories.length > 1;

  return (
    <Card
      className="w-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onAddToCart(product)}
    >
      <CardContent className="p-2 relative">
        <span className={`absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded-full 
          whitespace-nowrap z-10 shadow-sm
          ${product.status === 'high_stock' ? 'bg-green-100 text-green-800' :
            product.status === 'medium_stock' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'}`}
        >
          {/* in stock */}
            {product.status.replace(/_/g, ' ')}
        </span>

        {/* Removed warehouse count badge */}

        <div className="flex justify-center mb-2">
          <Image
            src={normalizedImagePath || '/assets/images/box.png'}
            alt={product.product.name}
            className="w-full h-16 object-contain"
            width={64}
            height={64}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-medium truncate">
            {product.product.name}
          </h3>
          <p className="text-xs font-semibold">
            {product.sellingPrice} XAF
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateItemWarehouse: (itemId: string, inventoryId: string) => void; // Added prop
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdatePrice,
  onUpdateItemWarehouse // Added prop
}) => {
  // Filter valid inventories directly without enforcing uniqueness by inventory_id
  const validInventoriesForDropdown = React.useMemo(() => {
    if (!Array.isArray(item.inventories)) {
      return []; // Return empty array if inventories is not an array
    }
    // Filter out items without a valid inventory_id or inventory object
    return item.inventories.filter(inv => 
      inv && 
      typeof inv.id === 'string' && inv.id.trim() !== '' && // Use the InventoryItem ID as the key/value
      inv.inventory && // Ensure inventory details exist
      typeof inv.inventory_id === 'string' && inv.inventory_id.trim() !== ''
    );
  }, [item.inventories]); // Recalculate only when item.inventories changes

  return (
    <div className="flex flex-col py-2 border-b px-2"> {/* Removed cursor-pointer */}
      <div className="flex justify-between items-start mb-1 pb-1"> {/* Added mb-1 and pb-1 */}
        <div className="space-y-1 flex-1 mr-2"> {/* Added flex-1 mr-2 */}
          <h4 className="font-medium text-sm truncate">{item.product.name}</h4> {/* Added truncate */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={item.actualPrice}
              onChange={(e) => {
                const newPrice = parseFloat(e.target.value);
                if (!isNaN(newPrice) && newPrice >= 0) {
                  onUpdatePrice(item.id, newPrice);
                }
              }}
              className="w-24 h-8 text-sm"
            />
            <span className="text-xs text-gray-500">XAF</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="h-7 w-7"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="h-7 w-7"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="h-7 w-7 ml-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* REMOVED Duplicated Quantity Controls */}
        {/* <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="h-7 w-7"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="h-7 w-7"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="h-7 w-7 ml-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div> */}
      </div>

      {/* Warehouse Selection for this item - Use the filtered (but not unique by ID) list */}
      {/* Show dropdown if there's at least one valid inventory item */}
      {validInventoriesForDropdown.length > 0 && (
        <Select
          // Use the specific InventoryItem ID (inv.id) for the value if available, fallback needed if selectedInventory isn't set yet
          value={item.selectedInventory?.id ?? ''} 
          // Pass the InventoryItem ID (inv.id) to the handler
          onValueChange={(inventoryItemId) => onUpdateItemWarehouse(item.id, inventoryItemId)} 
        >
          <SelectTrigger className="h-8 text-xs w-full relative z-10">
            <SelectValue placeholder="Select Stock Entry / Warehouse" />
          </SelectTrigger>
          <SelectContent className="z-50">
            {validInventoriesForDropdown.map((inv) => { // Map over the filtered list
                // Log the inventory item being rendered to check its quantity
                console.log(`Rendering dropdown item for ${item.product.name} - Warehouse ${inv.inventory?.name} (Item ID: ${inv.id}):`, inv);
                return (
                  // Use the InventoryItem's own ID (inv.id) as the key and value
                  <SelectItem key={`${item.id}-${inv.id}`} value={inv.id} className="text-xs">
                    {/* Display warehouse name and quantity for this specific inventory item */}
                    {inv.inventory?.name || 'Unnamed Warehouse'} ({inv.quantity} in stock)
                    {/* Optionally add more details like batch number if available */}
                  </SelectItem>
                );
            })}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

// Define the default walk-in customer
const defaultCustomer: Customer = {
  id: null,
  name: 'Walk-in Customer',
  phone: ''
};

interface ProductShopAttributes {
  id: string;
  quantity: number;
  sellingPrice: string;
  status: string;
  shopId: string;
  productId: string;
  purchasePrice: string;
  reorderPoint: number;
  minimumStockLevel: number | null;
  maximumStockLevel: number | null;
  valuationMethod: string;
  hasExpiryDate: number;
  hasBatchTracking: number;
  priceHistories: any[]; // À adapter si tu as la structure des historiques de prix
  inventories?: InventoryItem[]; // Add inventories to track warehouse information
  product: Product;
  createdAt: string;
  updatedAt: string;
}

export function Pos() {
  const { user, business, availableShops, currentShop } = useAuthLayout();
  const [selectedShopId, setSelectedShopId] = useState<string>(
    (user?.role === 'admin' || user?.role === 'shop_owner') 
      ? business?.shops?.[0]?.id || ''
      : availableShops?.[0]?.id || ''
  );
  // const [shopId, setShopId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentType, setPaymentType] = useState("CASH")
  const [currentPage, setCurrentPage] = useState(1)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const itemsPerPage = 36
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(defaultCustomer);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // const [selectedAccount, setSelectedAccount] = useState<TreasuryAccount | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  // const [products, setProducts] = useState<Product[]>([]);
  const [products, setProducts] = useState<ProductShopAttributes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  // Removed selectedWarehouse state
  const [availableWarehouses, setAvailableWarehouses] = useState<Inventory[]>([]); // Keep this to know *which* warehouses exist

  // Extract fetchProducts function to make it available throughout the component
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const shopId = currentShop?.id;
      const [productsResponse, categoriesResponse] = await Promise.all([
        AxiosClient.get(`/products/price-history/shop/${shopId}`),
        AxiosClient.get("/categories"),
      ]);

      const { success: productsSuccess, data: productsData, } = productsResponse.data;

      const { success: categoriesSuccess, data: categoriesData } = categoriesResponse.data;

      if (productsSuccess && productsData?.productShops) {
        setProducts(productsData.productShops);
      }

      if (categoriesSuccess && categoriesData?.categories) {
        setCategories(categoriesData.categories);
      }
    } catch (err) {
      console.error("Unexpected error while loading products or categories:", err);
      setError("Unexpected error occurred while loading data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = () => {
    setShowAddProductForm(true);
  };

  const handleCloseAddProductForm = () => {
    setShowAddProductForm(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const addToCart = (product: ProductShopAttributes) => {
    if (product.quantity <= 0 || product.status === 'out_of_stock') {
      setAlertMessage("This product is out of stock.");
      return;
    }
    console.log("Adding product to cart:", product);
    
    // If product has inventories, use the first one as default or the selected warehouse
    let selectedInventory: InventoryItem | undefined = undefined;
    
    if (product.inventories && product.inventories.length > 0) {
      // If no warehouse selected or no match found, use the first inventory as default
      // Removed the check for the now non-existent selectedWarehouse state
      if (!selectedInventory) {
        selectedInventory = product.inventories[0];
        // No need to set global selectedWarehouse anymore
      }
    }
    
    const existingItem = cartItems.find(item => item.id === product.id)
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      // --- Start Corrected Logic ---
      // Directly use product.inventories. Ensure it's an array.
      const productInventories = Array.isArray(product.inventories) ? product.inventories : [];

      // Select the default inventory from the full list (e.g., the first one if available)
      let defaultInventoryForItem: InventoryItem | undefined = undefined;
      if (productInventories.length > 0) {
          // Simple selection of the first item as default for now
          defaultInventoryForItem = productInventories[0]; 
      }

      // Add the new item to the cart, passing the *complete* inventories list.
      // Ensure we are creating a new object for the cart item.
      const newItem: CartItem = {
        ...product,
        quantity: 1, // Default quantity for new items
        actualPrice: parseFloat(product.sellingPrice), // Use sellingPrice as actualPrice
        selectedInventory: defaultInventoryForItem, // Set the selected inventory
        inventories: productInventories // Include all inventories for this product
      };

      setCartItems(prevCartItems => [...prevCartItems, newItem]);
      // --- End Corrected Logic ---
    }
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCartItems(cartItems.filter(item => item.id !== id));
    } else {
      setCartItems(cartItems.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((total, item) => total + item.actualPrice * item.quantity, 0);
    return subtotal - discount;
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePayment = async () => {
    try {
      setIsLoadingPayment(true);

      const currentShopId = currentShop?.id || selectedShopId;

      const customer = selectedCustomer || {
        id: null,
        name: 'Walk-in Customer',
        phone: ''
      };

      const total = calculateTotal();

      // Include inventory information with each cart item
      const cartItemsWithInventory = cartItems.map(item => ({
        // ...item,
        product_shop_id : item.id,
        product_name : item.product.name,
        quantity : item.quantity,
        selling_price : item.actualPrice,
        payment_status : "paid", // Assuming payment status is handled separately
        // inventoryId: item.selectedInventory?.inventory_id || null,
        // warehouseId: item.selectedInventory?.inventory_id || null
      }));

      const orderData = {
        shop_id : currentShopId,
        customer_id : customer.id,
        sales : cartItemsWithInventory,
        net_amount : total,
        payment_method : paymentType.toLowerCase(),
        amount_paid : amountPaid,
        change_given : changeAmount,
        discount : discount,
        orders_person_id : user?.id || '',
        status : amountPaid >= total ? "completed" : amountPaid > 0 ? "partially_paid" : "unpaid",
        delivery_status : "delivered", // Assuming delivery is handled separately
        delivery_fee : 0, // Assuming no delivery fee for now
        profit : 0, // Assuming profit calculation is handled elsewhere
      };

      console.log("Order data to be sent:", orderData);

      const response = await AxiosClient.post("/orders", orderData);
      const { success, data } = response.data;

      if (success && data?.order) {
        setPaymentSuccess(true);
        // setLastSaleData(response.sale);
        // setLastReceiptData(response.receipt);

        // Try to print receipt automatically
        // await handlePrintReceipt(response);

        clearCart();
        setAmountPaid(0);
        setChangeAmount(0);
        setSelectedCustomer(null);
        setDiscount(0);

        // Refresh product data to show updated inventory quantities
        fetchProducts();

        toast({ title: "Success", description: "Payment processed successfully"});
      }

      // const response = await safeIpcInvoke<{
      //   success: boolean;
      //   message?: string;
      //   sale?: any;
      //   receipt?: {
      //     saleId: string;
      //     receiptId: string;
      //     date: Date;
      //     items: Array<{ name: string; quantity: number; sellingPrice: number; }>;
      //     customerName: string;
      //     customerPhone: string;
      //     subtotal: number;
      //     discount: number;
      //     total: number;
      //     amountPaid: number;
      //     change: number;
      //     paymentMethod: string;
      //     salesPersonId: string;
      //     salesPersonName: string;
      //   };
      // }>('pos:sale:create', saleData);

      // if (response?.success && response.sale && response.receipt) {
      //   setPaymentSuccess(true);
      //   setLastSaleData(response.sale);
      //   setLastReceiptData(response.receipt);

      //   // Try to print receipt automatically
      //   await handlePrintReceipt(response);

      //   clearCart();
      //   setAmountPaid(0);
      //   setChangeAmount(0);
      //   setSelectedCustomer(null);
      //   setDiscount(0);

      //   // Refresh product data to show updated inventory quantities
      //   fetchProducts();

      //   toast({
      //     title: "Success",
      //     description: "Payment processed successfully",
      //   });
      // }
    } catch (err: any) {
      const response = err?.response;
      console.log("Error processing payment:", response);
      let message = "Payment failed";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || "Payment failed";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});
      setAlertMessage('An error occurred while processing payment');
    }finally {
      setIsLoadingPayment(false);
    }
  };

  const handlePrintReceipt = async (saleResponse: any) => {
    if (!business || !user) {
      toast({
        title: "Error",
        description: "Business or user information not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const printerService = new PrinterService();
      
      const currentShop = (user?.role === 'admin' || user?.role === 'shop_owner')
        ? business?.shops?.find(shop => shop.id === selectedShopId)
        : availableShops?.[0];

      if (!currentShop) {
        throw new Error('Shop information not found');
      }

      const businessInfo = {
        fullBusinessName: business.fullBusinessName,
        shopLogo: business.shopLogo,
        address: business.address,
        taxIdNumber: business.taxIdNumber,
        shop: {
          id: currentShop.id,
          name: currentShop.name
        }
      };

      try {
        await printerService.printReceipt(businessInfo, saleResponse.receipt);
      } catch (error) {
        console.error('Error showing print preview:', error);
        toast({
          title: "Error",
          description: "Failed to show print preview",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error preparing receipt:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare receipt",
        variant: "destructive",
      });
    }
  };

  const clearCart = () => {
    setCartItems([])
    setPaymentSuccess(false)
    setPaymentType("CASH")
  }; // Added missing closing brace

  const updatePrice = (id: string, newPrice: number) => {
    setCartItems(cartItems.map(item =>
      item.id === id ? { ...item, actualPrice: newPrice } : item
    ));
  };

  // Handler to update the selected inventory item for a specific cart item
  const handleUpdateItemWarehouse = (itemId: string, inventoryItemId: string) => {
    // Use functional update for safety when new state depends on previous state
    setCartItems(currentCartItems =>
      currentCartItems.map(item => {
        if (item.id === itemId) {
          // Find the specific InventoryItem by its own ID (inventoryItemId)
          const newSelectedInventory = item.inventories?.find(inv => inv.id === inventoryItemId);
          // Ensure a new object is created for the item AND the inventory to trigger re-render reliably
          return {
            ...item,
            // Create a new object reference for selectedInventory
            selectedInventory: newSelectedInventory ? { ...newSelectedInventory } : undefined
          };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    setChangeAmount(amountPaid - calculateTotal());
  }, [amountPaid, cartItems]);

  useEffect(() => {
    if (business?.id && !authChecked) {
      fetchProducts();
    }
  }, [business?.id, authChecked, selectedShopId]);

  useEffect(() => {
    const fetchCustomers = async () => {
      AxiosClient.get("/customers").then((response) => {
        const { success, data } = response.data
        if (success && data?.customers) {
          setCustomers(data.customers)
        }
      }).catch((err) => {
        console.error("error loading customers :", err)
        setError("error loading customers")
      }).finally(() => {
        setIsLoading(false);
      })
    };

    fetchCustomers();
  }, [user?.id, user?.role, business?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <AlertCircle className="mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)]"> {/* Removed overflow-hidden */}
      <div className="flex flex-col md:flex-row gap-4 p-4 h-full">
        {/* Left Section - Product Catalog */}
        <div className="w-full md:w-3/4 bg-white rounded-lg shadow-sm p-4 flex flex-col h-full">
          {/* Alert Message */}
          {alertMessage && (
            <div className="flex items-center bg-red-100 text-red-800 p-2 rounded mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAlertMessage(null)}
              className="h-5 w-5 mr-2"
            >
              <X className="h-4 w-4" />
            </Button>
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{alertMessage}</span>
          </div>
          )}

          {/* Filter and Search Header */}
          <div className="flex gap-3 mb-4">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Product Grid - 6x6 Layout */}
          {products.length === 0 ? (
            <EmptyState onAddProduct={handleAddProduct} />
          ) : (
            <div className="flex-1 min-h-0 pb-4"> {/* Removed overflow-y-auto */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {currentProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="pt-4 border-t mt-auto">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Cart */}
        <div className="w-full md:w-1/3 h-full flex">
          <Card className="flex-1 flex flex-col">
            <CardContent className="py-4 flex flex-col h-full"> {/* Changed p-4 to py-4 */}
              <div className="flex justify-between items-center mb-4 px-4"> {/* Added px-4 */}
                <h2 className="text-xl font-bold">Cart</h2>
                <Button variant="ghost" size="icon" onClick={clearCart}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Customer Selection */}
              <div className="mb-4 px-4"> {/* Added px-4 */}
                <Select
                  value={selectedCustomer?.id?.toString() || ''} // Use '0' for walk-in customer
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setSelectedCustomer(customer || defaultCustomer);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Walk-in Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id?.toString() || ''}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Removed Global Warehouse Selection Dropdown */}

              {/* Cart Items (Removed scroll) */}
              <div className="overflow-y-auto">
                <div className="flex-1 min-h-0 border-y"> {/* Removed overflow-y-auto */}
                  {cartItems.map(item => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                      onUpdatePrice={updatePrice}
                      onUpdateItemWarehouse={handleUpdateItemWarehouse} // Pass handler down
                    />
                  ))}
                </div>
              </div>

              {/* Fixed Cart Footer */}
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{calculateTotal()} XAF</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery</span>
                    <span className="text-green-500">Free</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{calculateTotal()} XAF</span>
                  </div>
                </div>

                {/* Amount Paid Input */}
                <div className="space-y-2">
                  <Label>Amount Paid</Label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="text-right"
                  />
                </div>

                {/* Change Amount Display */}
                {amountPaid > 0 && (
                  <div className="flex justify-between font-bold text-green-600">
                    <span>Change</span>
                    <span>{changeAmount} XAF</span>
                  </div>
                )}

                {/* Payment Account Selection */}
                {/* <Select 
                  value={selectedAccount?.id.toString()} 
                  onValueChange={(value) => {
                    const account = treasuryAccounts.find(a => a.id.toString() === value);
                    setSelectedAccount(account || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select> */}

                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">CASH</SelectItem>
                    <SelectItem value="CARD">CARD</SelectItem>
                    <SelectItem value="MOBILE">MOBILE MONEY</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="text-right"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handlePayment}
                  disabled={amountPaid < calculateTotal()  && isLoadingPayment}
                >
                  {isLoadingPayment ? ( <ButtonSpinner/> ) : ( "PAY" )}
                </Button>
                {paymentSuccess && lastSaleData && lastReceiptData && (
                  <div className="space-y-2">
                    <div className="text-green-500 text-sm">
                      Payment Successful! <span className="font-bold">Receipt #{lastReceiptData.receiptId}</span>
                    </div>
                    <div className="text-sm">
                      Customer: <span className="font-medium">{lastReceiptData.customerName}</span>
                    </div>
                    <div className="text-sm">
                      Total: <span className="font-medium">{lastReceiptData.total.toFixed(2)} XAF</span>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handlePrintReceipt({ receipt: lastReceiptData })}
                      variant="outline"
                    >
                      Print Receipt
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
