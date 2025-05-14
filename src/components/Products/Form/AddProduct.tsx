'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { Checkbox } from "@/components/Shared/ui/checkbox"
import { Switch } from "@/components/Shared/ui/switch"
import { Label } from "@/components/Shared/ui/label"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { ChevronLeft, Camera } from 'lucide-react'
import { ChangeEvent } from 'react'
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { Category, fetchProductDependencies, TypeProduct } from '../utils/productUtils';
import Shop from '@/models/Shop';
import type { ProductAttributes } from '@/models/Product'
import { fileStorage } from '@/services/fileStorage';
import AxiosClient from '@/lib/axiosClient'
import { uploadFile } from '@/services/uploadFile'
import { ButtonSpinner } from '@/components/Shared/ui/ButtonSpinner'
import { ProductShopAttributes } from '../List/ProductList'

interface AddProductProps {
  onBack: () => void;
  editMode?: boolean;
  productToEdit?: ProductShopAttributes;
  onEditComplete?: () => void;
}

interface ProductData {
  name: string;
  description: string;
  sellingPrice: number;
  discountPrice: number | null;
  category_id: string;
  shop_id: string;
  productType: string;
  businessId?: string;
  featuredImage: string | null;
  additionalImages: string[];
  status: 'active' | 'inactive';
  quantity: number;
  reorderPoint: number;
  purchasePrice: number;
}

interface ProductResponse {
  success: boolean;
  product?: Product;
  error?: string;
}

interface CategoryResponse {
  success: boolean;
  data?: Category[];
  message?: string;
}

interface ShopResponse {
  success: boolean;
  data?: Shop[];
  message?: string;
}

interface FormData {
  name: string;
  description: string | null;
  sellingPrice: string;
  sku: string;
  category_id: string | undefined;
  shop_id: string;
  status: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  unitType: string;
  purchasePrice: string;
  quantity: string;
  reorderPoint: string;
  featuredImage: string | null;
  additionalImages: (File | string)[];
  businessId?: string;
  userId?: string;
  productType: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  category_id: string;
  shop_id: string;
  status: string;
  businessId: string;
}

export function AddProduct({ onBack, editMode = false, productToEdit, onEditComplete }: AddProductProps) {
  const { business, user, availableShops, currentShop } = useAuthLayout();

  // Get shop ID based on user role
  const defaultShopId = (user?.role === 'admin' || user?.role === 'shop_owner') 
    ? business?.shops?.[0]?.id 
    : availableShops?.[0]?.id;

    const [formData, setFormData] = useState<FormData>(() => {
      if (editMode && productToEdit) {
        return {
          name: productToEdit.product.name,
          description: productToEdit.product.description,
          sellingPrice: String(productToEdit.sellingPrice),
          sku: productToEdit.product.sku || '',
          category_id: productToEdit.product.categoryId,
          shop_id: '',
          status: productToEdit.status as "high_stock" | "medium_stock" | "low_stock" | "out_of_stock",
          unitType: productToEdit.product.unitType || '',
          purchasePrice: String(productToEdit.purchasePrice),
          quantity: String(productToEdit.quantity),
          reorderPoint: String(productToEdit.reorderPoint),
          featuredImage: productToEdit.product.featuredImage || null,
          additionalImages: (productToEdit.product.additionalImages ?? []) as (File | string)[],
          businessId: business?.id,
          userId: user?.id,
          productType: productToEdit.product.typeId
        };
      }
    
      return {
        name: '',
        description: null,
        sellingPrice: '',
        sku: '',
        category_id: undefined,
        shop_id: defaultShopId || '',
        status: 'high_stock', // OK ici, c’est une valeur valide de l’union
        unitType: '',
        purchasePrice: '',
        quantity: '0',
        reorderPoint: '10',
        featuredImage: null,
        additionalImages: [],
        businessId: business?.id,
        userId: user?.id,
        productType: ''
      };
    });
    

  const [loading, setLoading] = useState(false);
  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [typeProducts, setTypeProducts] = useState<TypeProduct[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
      const [categoriesResponse, typeProductsResponse] = await Promise.all([
        AxiosClient.get("/categories"),
        AxiosClient.get("/type-products")
      ]);

      if (categoriesResponse.data.success && categoriesResponse.data.data?.categories) {
        setCategories(categoriesResponse.data.data.categories);
      }

      if (typeProductsResponse.data.success && typeProductsResponse.data?.data) {
        setTypeProducts(typeProductsResponse.data.data);
      }
      } catch (err) {
        console.error("Error while fetching initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [business?.id]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      shop_id: defaultShopId || '',
      businessId: business?.id,
      userId: user?.id
    }));
  }, [business?.id, user?.id, defaultShopId, editMode, productToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!formData.name || !formData.sellingPrice || !formData.purchasePrice || !formData.productType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
  
    setLoading(true);
  
    try {
      // Upload featured image if necessary
      let featuredImagePath = formData.featuredImage;
      if (featuredImage instanceof File) {
        const uploadResponse = await uploadFile(featuredImage, "product");
        featuredImagePath = uploadResponse.name ?? null;
      }
  
      // Upload additional images if necessary
      const additionalImagePaths = await Promise.all(
        additionalImages.map(async (file) => {
          if (file instanceof File) {
            const uploadResponse = await uploadFile(file, "product");
            return uploadResponse.name ?? null;
          }
          return file;
        })
      );
  
      // Prepare data payload
      const productPayload = {
        name: formData.name,
        description: formData.description,
        category_id: formData.category_id,
        type_id: formData.productType,
        sku: formData.sku,
        unit_type: formData.unitType,
        featured_image: featuredImagePath,
        additional_images: additionalImagePaths.length > 0 ? additionalImagePaths : formData.additionalImages,
      };
  
      // Create or update product
      if (editMode && productToEdit?.id) {
        // TODO: implement update logic here
        console.log(formData)
        
      } else {
        const { data, success } = (await AxiosClient.post("/products", productPayload)).data;
  
        if (!success) {
          throw new Error("Product creation failed.");
        }
  
        // Link product to shop
        const productShopPayload = {
          product_id: data.product.id,
          shop_id: currentShop?.id,
          selling_price: Number(formData.sellingPrice),
          purchase_price: Number(formData.purchasePrice),
          quantity: Number(formData.quantity),
          reorder_point: Number(formData.reorderPoint),
          status: '',
          user_id: formData.userId,
        };
  
        const { success: successProductShop } = (await AxiosClient.post("/product-shops", productShopPayload)).data;
  
        if (!successProductShop) {
          throw new Error("Failed to link product to shop.");
        }
  
        toast({
          title: "Success",
          description: "Product created successfully"
        });

        onBack();
      }
    } catch (error) {
      console.error("Error during product submission:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : editMode ? "Failed to update product" : "Failed to create product", variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  

  const handleButtonClick = (inputId: string) => {
    const inputElement = document.getElementById(inputId) as HTMLInputElement;
    if (inputElement) {
      inputElement.click();
    }
  };

  const handleFeaturedImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropFeaturedImage = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFeaturedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeaturedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAdditionalImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setAdditionalImagePreviews(previews);
  };

  const handleDropAdditionalImages = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setAdditionalImages(files);
    const previews = files.map(file => URL.createObjectURL(file));
    setAdditionalImagePreviews(previews);
  };

  return (
    <>
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ChevronLeft className="mr-2 h-5 w-5" /> Back
      </Button>
      
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold flex items-center text-gray-800">
            {editMode ? 'Edit Product' : 'Add Product'}
          </h1>
          <div className="space-x-2">
            <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50" onClick={onBack}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-[#1A7DC4] hover:bg-[#1565a0]" 
              disabled={loading}
            >
              {loading ? (
                <ButtonSpinner/>
              ) : ( editMode ? "Save Changes" : "Create Product" )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Information</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="productName" className="text-sm font-medium text-gray-700">
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="productName" 
                      placeholder="Enter a short name for your product" 
                      className="mt-1" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="productDescription" className="text-sm font-medium text-gray-700">Product Description</Label>
                    <Textarea 
                      id="productDescription" 
                      placeholder="Product description" 
                      className="mt-1 h-32"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Featured Image</h2>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                      onDragOver={handleDragOver}
                      onDrop={handleDropFeaturedImage}
                    >
                      <label htmlFor="featuredImage" className="cursor-pointer">
                        <Button
                          variant="outline"
                          className="w-full text-[#1A7DC4] border-[#1A7DC4] hover:bg-[#1A7DC4] hover:text-white"
                          onClick={() => handleButtonClick('featuredImage')}
                        >
                          Add File
                        </Button>
                        <input
                          id="featuredImage"
                          type="file"
                          className="hidden"
                          onChange={handleFeaturedImageChange}
                          accept="image/*"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">Or drag and drop files</p>
                      {featuredImagePreview && (
                        <div className="mt-4">
                          <Image src={featuredImagePreview} alt="Featured preview" width={200} height={200} objectFit="cover" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-4 text-gray-800">Additional Images(Optional)</h2>
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center"
                      onDragOver={handleDragOver}
                      onDrop={handleDropAdditionalImages}
                    >
                      <label htmlFor="additionalImages" className="cursor-pointer">
                        <Button
                          variant="outline"
                          className="w-full text-[#1A7DC4] border-[#1A7DC4] hover:bg-[#1A7DC4] hover:text-white"
                          onClick={() => handleButtonClick('additionalImages')}
                        >
                          Add Files
                        </Button>
                        <input
                          id="additionalImages"
                          type="file"
                          className="hidden"
                          onChange={handleAdditionalImagesChange}
                          accept="image/*"
                          multiple
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">Or drag and drop files</p>
                      {additionalImages.length > 0 && (
                        <p className="text-sm text-green-600 mt-2">{additionalImages.length} images selected</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Price/Type</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="purchasePrice" className="text-sm font-medium text-gray-700">
                      Purchase Price <span className="text-red-500">*</span> (FCFA)
                    </Label>
                    <Input 
                      id="purchasePrice" 
                      type="number"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      className="mt-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sellingPrice" className="text-sm font-medium text-gray-700">
                      Selling Price <span className="text-red-500">*</span> (FCFA)
                    </Label>
                    <Input 
                      id="sellingPrice" 
                      type="number"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                      className="mt-1"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productType" className="text-sm font-medium text-gray-700">
                      Product Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.productType} onValueChange={(value) => setFormData(prev => ({ ...prev, productType: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Product Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {typeProducts.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}                        
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* <div className="flex items-center space-x-2 mt-4">
                  <Switch id="tax" checked={addTax} onCheckedChange={setAddTax} />
                  <Label htmlFor="tax" className="text-sm font-medium text-gray-700">Add tax for this product(optional)</Label>
                </div> */}
                {/* <p className="text-sm text-gray-500 mt-2">This is digital item</p> */}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Stock Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">
                      Initial Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="quantity" 
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">Default is 0</p>
                  </div>
                  <div>
                    <Label htmlFor="reorderPoint" className="text-sm font-medium text-gray-700">Reorder Point</Label>
                    <Input 
                      id="reorderPoint" 
                      type="number"
                      min="0"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">Stock level that triggers low stock warning</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800"> Category</h2>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select 
                          value={formData.category_id || ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category_id: value })
                          }
                          disabled={categories.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Scan(Not available)</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Camera className="mx-auto mb-2 text-gray-400" size={24} />
                  <p className="text-sm text-gray-500">Scan Image</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add required fields guidance */}
        <p className="text-sm text-gray-500 mt-4">
          <span className="text-red-500">*</span> Fields marked with this asterisk are required
        </p>
      </form>
    </>
  )
}