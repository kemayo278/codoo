"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/Shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Shared/ui/card"
import { Input } from "@/components/Shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Shared/ui/select"
import { PlusCircle, Edit2, Store } from "lucide-react"
import { ShopForm } from '../Setup/shop-form'
import { Switch } from "@/components/Shared/ui/switch"
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import { useAuthLayout } from '@/components/Shared/Layout/AuthLayout';
import AxiosClient from "@/lib/axiosClient"

// Interface for Shop
export interface Shop {
  id?: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  contactInfo: {
    email: string;
    phone: string;
  };
  manager: string;
  managerId?: string;
  location: {
    address: string;
    city: string;
    country: string;
    region?: string;
  };
  operatingHours: {
    [key: string]: string;
  };
  businessId: string;
  locationId: string;
}

interface ShopFormData {
  name: string;
  type: string;
  phone: string;
  email: string;
  operatingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  manager?: string;
  location: {
    address: string;
    city: string;
    country: string;
  };
}

interface ShopFormProps {
  shop?: Shop;
  onSave: (data: {
    shopData: {
      name: string;
      type: string;
      phone: string;
      email: string;
      operatingHours: {
        monday?: string;
        tuesday?: string;
        wednesday?: string;
        thursday?: string;
        friday?: string;
        saturday?: string;
        sunday?: string;
      };
      manager?: string;
    };
    locationData: {
      address: string;
      city: string;
      country: string;
    }
  }) => Promise<void>;
  onCancel: () => void;
}

interface UpdateShopResponse {
  success: boolean;
  message?: string;
}

export function Shops() {
  const [isAddingShop, setIsAddingShop] = useState<boolean>(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { business, user, availableShops, checkAuth, currentShop } = useAuthLayout();

  // Get shops from availableShops or business.shops
  const shops = availableShops || business?.shops || [];

  // Simplified fetch logic
  const fetchShops = async () => {
    try {
      setIsLoading(true);
      await checkAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShop = async (data: {
    shopData: {
      name: string;
      type: string;
      contactInfo: {
        phone: string;
        email: string;
      };
      operatingHours: {
        [key: string]: string;
      };
      manager: string;
      managerId?: string;
      status?: 'active' | 'inactive';
    };
    locationData: {
      address: string;
      city: string;
      country: {name : any};
      region?: string;
    };
  }) => {
    if (!business?.id) {
      toast({
        title: "Error",
        description: "Business ID not found",
        variant: "destructive",
      });
      return;
    }
    try {
      console.log("Data :", data);      
      const locationResponse = await AxiosClient.post('/locations', {
        address: data.locationData.address,
        city: data.locationData.city,
        country: data.locationData.country,
        region: data.locationData.region,
        // country: { name: data.locationData.country.name }
      });

      const { success: locationSuccess, data: locationData } = locationResponse.data;

      console.log("Location Data :", locationData);

      const shopResponse = await AxiosClient.post('/shops', {
        name: data.shopData.name,
        type: data.shopData.type,
        shop_type: data.shopData.type,
        business_id: business.id,
        location_id: locationData.id,
        contact_info: {
          phone: data.shopData.contactInfo.phone,
          email: data.shopData.contactInfo.email,
        },
        operating_hours: data.shopData.operatingHours,
        manager: data.shopData.manager,
        manager_id: data.shopData.managerId,
        status: data.shopData.status ?? 'active',
      });

      const { success: shopSuccess, data: shopData, message: shopMessage } = shopResponse.data;

      if (locationSuccess && shopSuccess) {
        toast({ title: "Success", description: "Shop created successfully"});
        setIsAddingShop(false);
        fetchShops();
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
    }
  };

  const handleUpdateShop = async (data: {
    shopData: {
      name: string;
      type: string;
      contactInfo: {
        phone: string;
        email: string;
      };
      operatingHours: {
        [key: string]: string;
      };
      manager: string;
      status?: 'active' | 'inactive';
    };
    locationData: {
      address: string;
      city: string;
      country: {name: any};
      region?: string;
    };
  }) => {
    if (!editingShop?.id) {
      toast({ title: "Error", description: "Shop ID not found", variant: "destructive" });
      return;
    }
    try {
      const updateShopResponse = await AxiosClient.put(`/shops/${editingShop.id}`, {
        name: data.shopData.name,
        type : data.shopData.type,
        business_id: business?.id,
        contact_info : {
          phone: data.shopData.contactInfo.phone,
          email: data.shopData.contactInfo.email,
        },
        operating_hours : data.shopData.operatingHours,
        manager: data.shopData.manager,
        status: data.shopData.status ?? 'active',
      });

      const updateLocationResponse = await AxiosClient.put(`/locations/${editingShop.locationId}`, {
        address: data.locationData.address,
        city: data.locationData.city,
        country: data.locationData.country,
        region: data.locationData.region,
      });      

      const { success: shopSuccess, message: shopMessage } = updateShopResponse.data;
      const { success: locationSuccess, message: locationMessage } = updateLocationResponse.data;

      if (shopSuccess && locationSuccess) {
        toast({ title: "Success", description: "Shop and location updated successfully", });
        setEditingShop(null);
        fetchShops();
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
    }
  };  

  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
  };

  const handleCancelEdit = () => {
    setEditingShop(null);
  };

  const handleToggleShop = async (shopId: number) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) throw new Error("Shop not found");
  
      const newStatus = shop.status === 'active' ? 'inactive' : 'active';
  
      const response = await AxiosClient.put(`/shops/${shopId}`, {
        name: shop.name,
        status: newStatus,
      });
  
      if (response.data?.success) {
        toast({ title: "Success", description: `Shop status updated to ${newStatus}`, variant: "primary" });
        fetchShops();
      } else {
        toast({ title: "Error", description: "Failed to update shop status", variant: "destructive"});
        throw new Error(response.data?.message ?? 'Failed to update shop status');
      }
    } catch (error) {
      console.error('Error toggling shop status:', error);
      toast({ title: "Error", description: "Failed to update shop status", variant: "destructive"});
    }
  };  

  return (
    <div className="container mx-auto py-10">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Shops</h1>
            <Button
              onClick={() => setIsAddingShop(true)}
              disabled={!business?.id}  
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Shop
            </Button>
          </div>

          {isAddingShop && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <ShopForm
                  onSave={handleAddShop}
                  onCancel={() => setIsAddingShop(false)}
                />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <Card key={shop.id} className="relative">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <Switch
                    checked={shop.status === 'active'}
                    onCheckedChange={() => handleToggleShop(shop.id!)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(shop)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {shop.name.length > 10 ? `${shop.name.substring(0, 10)}...` : shop.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingShop && editingShop.id === shop.id ? (
                    <ShopForm
                      shop={shop}
                      onSave={handleUpdateShop}
                      onCancel={handleCancelEdit}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-[#EBF5FF] rounded-full flex items-center justify-center">
                          <Store className="h-8 w-8 text-[#2E90FA]" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p><strong>Type:</strong> {shop.type}</p>
                        <p><strong>Manager:</strong> {shop.manager || 'Not assigned'}</p>
                        <p><strong>Status:</strong> {shop.status}</p>
                        <p><strong>Location:</strong> {shop.location?.address}, {shop.location?.city}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}