
export interface UserAttributes {
  id?: string;
  username: string;
  email: string;
  password_hash: string;
  isStaff?: boolean;
  role?: 'shop_owner' | 'manager' | 'seller' | 'admin';
  locationId?: string;
  shopId?: string;  
  businessId?: string;
}