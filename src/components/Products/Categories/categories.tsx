"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Input } from "@/components/Shared/ui/input"
import { Label } from "@/components/Shared/ui/label"
import { Textarea } from "@/components/Shared/ui/textarea"
import { Card, CardContent } from "@/components/Shared/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/Shared/ui/dialog"
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import Image from 'next/image'
import { useAuthLayout } from "@/components/Shared/Layout/AuthLayout"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { ConfirmationDialog } from '@/components/Shared/ui/Modal/confirmation-dialog';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import AxiosClient from "@/lib/axiosClient"
import { uploadFile } from "@/services/uploadFile"
import { ButtonSpinner } from "@/components/Shared/ui/ButtonSpinner"
import { LoadingSpinner } from "@/components/Shared/ui/LoadingSpinner"
import ErrorAlert from "@/components/Shared/ui/ErrorAlert"
import TableEmptyRow from "@/components/Shared/ui/TableEmptyRow"
import LoadingIndicator from "@/components/Shared/ui/LoadingIndicator"

interface Category {
  id: string;
  name: string;
  image?: File | null | string;
  description?: string;
  businessId?: string;
  shopId?: string;
  itemCount?: number;
}

interface DeleteCategoryResult {
  success: boolean;
  message?: string;
}

interface GetCategoriesResult {
  success: boolean;
  categories?: Category[];
  message?: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputLoading, setInputLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { business, currentShop } = useAuthLayout();
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({ name: "", description: "", image: null })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  useEffect(() => {
    const init = async () => {
      try {        
        await loadCategories();
      } catch (err) {
        console.error('Initialization error:', err);
      } 
    };
    init();
  }, []);

  const loadCategories = async () => {
    setError(null)
    setIsLoading(true)
    let url = "/categories/shop/" + currentShop?.id;
    AxiosClient.get(url).then((response) => {
      const { success, data } = response.data
      if (success && data?.categories) {
        setCategories(data.categories)
      }
    }).catch((err: any) => {
      let message = 'Error loading categories';
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }
      setError(message);
    }).finally(() => {
      setIsLoading(false)
    })
  }

  const filteredCategories = categories.filter(category =>
    category?.name?.toLowerCase().includes(searchTerm?.toLowerCase() ?? '') ?? false
  )
  
  const handleAddCategory = async () => {
    try {
      let imagePath: string | null = null;

      setInputLoading(true);
      setError(null)
  
      if (newCategory.image instanceof File) {
        const response = await uploadFile(newCategory.image, "category");
        imagePath = response.name ?? null;
      }
  
      const payload = {
        ...newCategory,
        image: imagePath,
        business_id: business?.id,
        shop_id : currentShop?.id
      };
  
      const response = await AxiosClient.post("/categories", payload);
      const { success, data, message } = response.data;
  
      if (success && data?.category) {
        setCategories((prev) => [data.category,...prev]);
        handleModalClose();  
        toast({title: "Success", description: "Category created successfully"});
      } else {
        setError(message || "Failed to create category");
      }
    } catch (err: any) {
      const response = err?.response;
      let message = "Error processing your request";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || "Error processing your request";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});
    } finally {
      setInputLoading(false);
    }
  };

  const handleModalOpen = async () => {
    setIsAddCategoryOpen(true)
    setNewCategory({ name: "", description: "", image: null })
    setEditingCategory(null)
  }

  const handleModalClose = () => {
    setIsAddCategoryOpen(false)
    setNewCategory({ name: "", description: "", image: null })
    setEditingCategory(null)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setNewCategory({ 
      name: category.name, 
      description: category.description, 
      image: typeof category.image === 'string' ? category.image : null
    })
    setIsAddCategoryOpen(true)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
  
    try {
      setError(null);
      let imagePath: string | null = null;

      setInputLoading(true);
  
      if (newCategory.image instanceof File) {
        const response = await uploadFile(newCategory.image, "category");
        imagePath = response.name ?? null;
      }
      
      const response = await AxiosClient.put(`/categories/${editingCategory.id}`, {
        ...newCategory,
        image: imagePath,
      });
  
      const { success, data } = response.data;
  
      if (success && data?.category) {
        const updatedCategories = categories.map((cat) =>
            cat.id === editingCategory.id ? data.category : cat
          )
          .filter((category): category is Category => category !== null);
  
        setCategories(updatedCategories);
        toast({ title: "Success", description: "Category updated successfully"});        
        handleModalClose()
      }
    } catch (err: any) {
      const response = err?.response;
      let message = "Error processing your request";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || "Error processing your request";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});
    } finally {
      setInputLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    try {
      if (!categoryToDelete) return;
  
      const response = await AxiosClient.delete(`/categories/${categoryToDelete.id}`);
      const { success } = response.data;
  
      if (success) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
        toast({ title: "Success", description: "Category deleted successfully"});
      }
    } catch (err: any) {
      const response = err?.response;
      let message = "";
      if(err && err.message === 'Network Error') {
        message = process.env.NEXT_PUBLIC_ERROR_CONNECTION as string;
      }else{
        message = response?.data?.error || "Failed to delete category";
      }      
      toast({ title: "Error", description: message, variant: "destructive"});      
    } finally {
      setCategoryToDelete(null);
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Dialog open={isAddCategoryOpen} onOpenChange={(open) => open ? handleModalOpen() : setIsAddCategoryOpen(false)}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            className="col-span-3"
          />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Textarea
            id="description"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            className="col-span-3"
          />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="image" className="text-right">
            Image
          </Label>
          <Input
            id="image"
            type="file"
            onChange={(e) => {
              const file = e.target.files ? e.target.files[0] : null;
              setNewCategory({ ...newCategory, image: file });
            }}
            className="col-span-3"
          />
              </div>
            </div>
            <Button onClick={editingCategory ? handleUpdateCategory : handleAddCategory} disabled={inputLoading}>
              {inputLoading ? (
                <ButtonSpinner/>
              ) : (
                editingCategory ? "Update Category" : "Add Category"
              )}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <LoadingIndicator title="Loading categories..." subtitle="This may take a few moments" />  
      ) : error ? (
        <ErrorAlert
          title="Error"
          message={error}
          onRetry={() => {
            setError(null);
            loadCategories();
          }}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <ToggleGroup 
              type="single" 
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "cards" | "list")}
            >
              <ToggleGroupItem value="cards" aria-label="Card view">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="7" height="7" x="3" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="14" rx="1"/>
                  <rect width="7" height="7" x="3" y="14" rx="1"/>
                </svg>
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" x2="21" y1="6" y2="6"/>
                  <line x1="8" x2="21" y1="12" y2="12"/>
                  <line x1="8" x2="21" y1="18" y2="18"/>
                  <line x1="3" x2="3.01" y1="6" y2="6"/>
                  <line x1="3" x2="3.01" y1="12" y2="12"/>
                  <line x1="3" x2="3.01" y1="18" y2="18"/>
                </svg>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          {filteredCategories.length === 0 ? (
            // <TableEmptyRow title="No categories found" colSpan={6} subtitle="Try adjusting your search or filter criteria"  />              
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No categories found</p>
              <Button onClick={() => handleModalOpen()}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Category
              </Button>
            </div>            
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <Image 
                      src={typeof category.image === 'string' && category.image ? category.image : "/assets/images/categories.png"} 
                      alt={category.name} 
                      width={100}
                      height={100}
                      className="w-full h-40 object-cover mb-2 rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/images/categories.png';
                      }}
                    />
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.itemCount} items</p>
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Image 
                      src={typeof category.image === 'string' && category.image ? category.image : "/assets/images/categories.png"} 
                      alt={category.name} 
                      width={60}
                      height={60}
                      className="w-15 h-15 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/images/categories.png';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.itemCount} items</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description={`Are you sure you want to delete ${categoryToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

export default Categories