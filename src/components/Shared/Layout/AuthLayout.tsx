'use client'

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { safeIpcInvoke } from '@/lib/ipc';
import { toast } from '@/hooks/use-toast';
import AxiosClient from '@/lib/axiosClient';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  shopId?: string;
  businessId?: string;
}

interface Business {
  id: string;
  fullBusinessName: string;
  shopLogo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  businessType: string;
  numberOfEmployees?: number;
  taxIdNumber?: string;
  shops?: Array<any>;
}

interface Shop {
  id: string;
  name: string;
  type: string;
  status: string;
  contactInfo: any;
  shopLogo?: string;
  manager: string;
  managerId: string;
  businessId: string;
  location?: {
    address: string;
    city: string;
    country: string;
    region: string;
    postalCode?: string;
  };
  operatingHours: any;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    locationId?: string;
    isActive: boolean;
  };
  business?: Business | null;
  shops?: Shop[];
  shop?: Shop;
  isSetupComplete?: boolean;
  token?: string;
}

interface LogoutResponse {
  success: boolean;
  message?: string;
}

interface BusinessResponse {
  success: boolean;
  business?: Business;
  message?: string;
}

interface SetupResponse {
  success: boolean;
  message?: string;
  business?: Business;
  shop?: any;
  location?: any;
  isSetupComplete?: boolean;
}

interface UpdateUserResponse {
  success: boolean;
  user?: User;
  message?: string;
}

interface AuthLayoutContextType {
  isAuthenticated: boolean;
  user: User | null;
  business: Business | null;
  currentShopId: string | null;
  currentShop : Shop | null,
  availableShops: Array<{
    id: string;
    name: string;
    type: string;
  }> | null;
  setCurrentShop: (shopId: string) => void;
  setCurrentShopModel: (shop: Shop) => void;
  setupAccount: (setupData: any) => Promise<{ success: boolean; message?: string }>;
  checkSetupStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; token: string | null }>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  register: (userData: any) => Promise<{ success: boolean; message?: string }>;
  checkAuth: () => Promise<void>;
}

export const AuthLayoutContext = createContext<AuthLayoutContextType | undefined>(undefined);

export const useAuthLayout = () => {
  const context = useContext(AuthLayoutContext);
  if (context === undefined) {
    throw new Error('useAuthLayout must be used within an AuthLayoutProvider');
  }
  return context;
};

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [currentShop, setCurrentLyShop] = useState<Shop | null>(null);
  const [availableShops, setAvailableShops] = useState<Array<{
    id: string;
    name: string;
    type: string;
  }> | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const setCurrentShop = (shopId: string) => {
    setCurrentShopId(shopId);
    localStorage.setItem('currentShopId', shopId);
  };

  const setCurrentShopModel = (shop: Shop) => {
    setCurrentLyShop(shop);
    localStorage.setItem('currentShop', JSON.stringify(shop));
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting login process...');
  
      const { data: loginResponse } = await AxiosClient.post("/auth/login", { email, password });
      const { success, data, message } = loginResponse;
  
      console.log('[Auth] Login response received:', {
        success,
        hasUser: !!data?.user,
        hasBusiness: !!data?.business,
        hasShops: !!data?.shops,
        hasToken: !!data?.token,
        message
      });
  
      if (!success || !data?.user || !data?.token) {
        throw new Error(message || 'Login failed');
      }
  
      // === Stockage des données utilisateur ===
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('access_token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      setUser(data.user);
      setAccessToken(data.token);
      setIsAuthenticated(true);
  
      // === Stockage des données business si disponibles ===
      if (data.business) {
        localStorage.setItem('business', JSON.stringify(data.business));
        setBusiness(data.business);
      }
  
      // === Stockage des shops si disponibles ===
      if (data.shops && data.shops.length > 0) {
        const firstShop = data.shops[0];
        localStorage.setItem('availableShops', JSON.stringify(data.shops));
        localStorage.setItem('currentShop', JSON.stringify(firstShop));
        localStorage.setItem('currentShopId', firstShop.id);
        setAvailableShops(data.shops);
        setCurrentLyShop(firstShop);
        setCurrentShopId(firstShop.id);
      }
  
      toast({ title: "Success", description: "Logged in successfully" });
  
      // === Redirection selon le rôle et setup ===
      setTimeout(() => {
        console.log('Redirecting based on user role and setup status...');
        if (data.user.role === 'admin') {
          router.push('/dashboard');
        } else if (data.user.role === 'shop_owner') {
          const isSetupComplete = data.isSetupComplete ?? (data.shops?.length > 0);
          isSetupComplete ? router.push('/select-shop') : router.push('/account-setup');
        } else {
          router.push('/select-shop');
        }
      }, 100);
  
      return {
        success: true,
        user: data.user,
        business: data.business,
        shopId: data.shop?.id ?? data.shops?.[0]?.id ?? null,
        isSetupComplete: data.isSetupComplete,
        token: data.token
      };
  
    } catch (error: any) {
      const response = error.response;
      let message = 'Login failed';
      if(error && error.message === 'Network Error') {
        message = 'Network error, please check your connection';
        toast({ title: "Error", description: message , variant: "destructive" });
      }
      if (response && response.status === 422) {
        message = response.data.error;
      } else if (response && response.status === 401) {
        message = response.data.error || 'Invalid credentials';
      } else {
        console.error('Login error:', error);
      }
      toast({ title: "Error", description: message, variant: "destructive" });
      return { success: false, message: message, token: null };
    }
  };
  
  const handleLogout = () => {
    console.log('Logging out, clearing all state and storage');
    // Clear all state
    setUser(null);
    setBusiness(null);
    setIsAuthenticated(false);
    setAvailableShops(null);
    setCurrentShopId(null);
    setCurrentLyShop(null);
    
    // Clear all storage in one go
    localStorage.clear();
    
    // Redirect to login
    router.push('/auth/login');
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const response = await AxiosClient.patch(`/users/${userData.id}`, {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        shop_id: userData.shopId,
        is_staff: userData.isActive,
      });
  
      if (response.data.success && response.data.data) {
        setUser(prevUser => {
          if (prevUser) {
            return { ...prevUser, ...response.data.data };
          }
          return null;
        });
  
        toast({
          title: "Success",
          description: "User updated successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response?.data?.message || 'Failed to update user',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast({
        title: "Error",
        description: 'Failed to update user',
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await AxiosClient.post("/auth/register", userData);
      const { success, data, message } = response.data;
  
      if (success && data?.user) {
        // Save basic user data to localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('access_token', data.token);
  
        // Update state with basic user info
        setIsAuthenticated(true);
        setUser(data.user);
        setAccessToken(data.token);
        setBusiness(null); // No business yet until setup
        setAvailableShops(null); // No shops yet until setup
        setCurrentShopId(null); // No current shop until setup
        setCurrentLyShop(null); // No current shop until setup
  
        toast({title: "Success", description: "Registration successful"});
  
        console.log('Registration successful, redirecting to account setup...');
        router.push('/account-setup');
  
        return { 
          success: true, 
          user: data.user
        };
      }
  
      toast({ title: "Error", description: message || 'Registration failed', variant: "destructive" });
      return { success: false, message };
      
    } catch (error: any) {
      const response = error.response;
      if (response.status === 422) {
        toast({ title: "Error", description: response.data.error, variant: "destructive" });     
      }
      return { 
        success: false, 
        message: error instanceof Error ? response.data.error : 'Registration failed' 
      };       
    }
  };

  const setupAccount = async (setupData: any) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
  
      // 1. Create Business
      const { data: businessResponse } = await AxiosClient.post("/business-informations", {
        owner_id: user.id,
        full_business_name: setupData.businessData.fullBusinessName,
        business_type: setupData.businessData.businessType,
        number_of_employees: setupData.businessData.numberOfEmployees,
        tax_id_number: setupData.businessData.taxIdNumber || null,
        shop_logo: setupData.businessData.shopLogo,
        taxation_documents: setupData.businessData.taxationDocuments,
        national_id_card: setupData.businessData.nationalIdCard
          ? {
              front: setupData.businessData.nationalIdCard.front,
              back: setupData.businessData.nationalIdCard.back
            }
          : null
      });
  
      const { success: businessSuccess, data: businessData, message: businessMessage } = businessResponse;
  
      if (!businessSuccess || !businessData?.business) {
        throw new Error(businessMessage || 'Failed to create business');
      }
  
      // 2. Create Location
      const { data: locationResponse } = await AxiosClient.post("/locations", {
        address: setupData.locationData.address,
        city: setupData.locationData.city,
        region: setupData.locationData.region,
        country: { name: setupData.locationData.country.name }
      });
  
      const { success: locationSuccess, data: locationData, message: locationMessage } = locationResponse;
  
      if (!locationSuccess || !locationData?.id) {
        throw new Error(locationMessage || 'Failed to create location');
      }
  
      // 3. Create Shop
      const { data: shopResponse } = await AxiosClient.post("/shops", {
        name: setupData.shopData.name,
        type: setupData.shopData.type,
        shop_type: setupData.shopData.type,
        shop_logo: setupData.shopData.shopLogo,
        status: setupData.shopData.status,
        contactInfo: {
          email: setupData.shopData.contactInfo.email,
          phone: setupData.shopData.contactInfo.phone
        },
        manager: setupData.shopData.manager,
        location_id: locationData.id,
        business_id: businessData.business.id
      });
  
      const { success: shopSuccess, data: shopData, message: shopMessage } = shopResponse;
  
      if (!shopSuccess || !shopData?.shops || shopData.shops.length === 0) {
        throw new Error(shopMessage || 'Failed to create shop');
      }
  
      // 4. Mise à jour des états locaux + localStorage
      const shops = shopData.shops;
      const firstShop = shops[0];
  
      setBusiness(businessData.business);
      setAvailableShops(shops);
      setCurrentShopId(firstShop.id);
  
      localStorage.setItem('business', JSON.stringify(businessData.business));
      localStorage.setItem('availableShops', JSON.stringify(shops));
      localStorage.setItem('currentShopId', firstShop.id);
      localStorage.setItem('currentShop', JSON.stringify(firstShop));
      localStorage.setItem('setupComplete', 'true');
  
      // Update user data with shop assignment if needed
      if (user && !user.shopId) {

        const updatedUserPayload = {
          _method: 'PUT',
          shop_id: firstShop.id,
          business_id: businessData.business.id
        };

        try {
          const responseUserUpdate = await AxiosClient.post(`/users-edit/${user.id}`, updatedUserPayload);
          const { success: userUpdateSuccess, data: updatedUserData, message: userUpdateMessage } = responseUserUpdate.data;

          console.log("User update response:", { updatedUserData });

          if (!userUpdateSuccess || !updatedUserData) {
            throw new Error(userUpdateMessage || 'User update failed');
          }

          const updatedUser = updatedUserData.user;
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));

          console.log("User updated successfully");
        } catch (userUpdateError) {
          console.error("User update failed:", userUpdateError);
          toast({
            title: "Warning",
            description: "User was created but not linked to shop. You may need to fix this manually.",
            variant: "destructive",
          });
        }
      }

  
      toast({
        title: "Success",
        description: "Account setup completed successfully",
      });
  
      router.push('/dashboard');
      return { success: true };
  
    } catch (error) {
      console.error('Setup error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, message: errorMessage };
    }
  };
  
  const checkSetupStatus = async () => {
    try {
      if (!user?.id) {
        return false;
      }
      
      const response = await safeIpcInvoke<SetupResponse>('setup:check-status', {
        userId: user.id
      }, {
        success: false,
        isSetupComplete: false
      });
      
      return response?.isSetupComplete || false;
    } catch (error) {
      console.error('Error checking setup status:', error);
      toast({ title: "Error", description: 'Failed to check setup status', variant: "destructive"});
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      // setIsLoading(true);
  
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      const storedToken = localStorage.getItem('access_token');
      const storedShop = localStorage.getItem('currentShop');
      const currentShopId = localStorage.getItem('currentShopId');
  
      if (!storedToken || isAuthenticated !== 'true') {
        console.log('No token or not authenticated');
        handleLogout();
        return;
      }
  
      const response = await AxiosClient.post('/auth/check');
      const { success, data, message } = response.data;
  
      if (!success || !data?.user) {
        throw new Error(message || 'Invalid session');
      }
  
      const { user, business, shops } = data;
      console.log('Auth check response:', { success, user, business, shops });
      const parsedCurrentShop = storedShop ? JSON.parse(storedShop) : null;
  
      // Mettre à jour localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(business));
      localStorage.setItem('availableShops', JSON.stringify(shops));
      localStorage.setItem('isAuthenticated', 'true');
  
      // Mettre à jour l'état
      setUser(user);
      setBusiness(business);
      setAvailableShops(shops);
      setCurrentLyShop(parsedCurrentShop);
      setCurrentShopId(currentShopId);
      setAccessToken(storedToken);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Auth check failed:', error);
      if (error.response?.status === 401) {
        toast({ title: 'Error', description: 'Session expired, please log in again.', variant: 'destructive'});
        handleLogout();
      } else {
        console.error('Error checking authentication:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
  
    console.log('Persisting auth state:', {
      isAuthenticated,
      user,
      business,
      availableShops,
      currentShopId,
      currentShop
    });
  
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(user));
  
    if (accessToken) {
      localStorage.setItem('access_token', accessToken);
    }
  
    if (business) {
      localStorage.setItem('business', JSON.stringify(business));
    }
  
    if (availableShops?.length) {
      localStorage.setItem('availableShops', JSON.stringify(availableShops));
    }
  
    if (currentShopId) {
      localStorage.setItem('currentShopId', currentShopId);
    }
  
    if (currentShop) {
      localStorage.setItem('currentShop', JSON.stringify(currentShop));
    }
  }, [isAuthenticated, user, business, availableShops, currentShopId, currentShop, accessToken]);

  const value = {
    isAuthenticated,
    accessToken,
    user,
    business,
    currentShopId,
    currentShop,
    availableShops,
    setCurrentShop,
    setCurrentShopModel,
    setupAccount,
    checkSetupStatus,
    login,
    logout: handleLogout,
    updateUser,
    register,
    checkAuth,
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthLayoutContext.Provider value={value}>{children}</AuthLayoutContext.Provider>;
}

export default AuthLayout;
