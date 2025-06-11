export interface Order {
  id: string;
  paymentStatus : 'completed' | 'pending' | 'cancelled' | 'paid' | 'unpaid' | string;
  deliveryStatus: 'pending' | 'shipped' | 'delivered';
  netAmount: number;
  amountPaid: string;
  changeGiven: string;
  deliveryFee: string;
  discount: string;
  profit: string;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | string;
  receiptId: string | null;
  invoiceId: string | null;
  shopId: string;
  customerId: string | null;
  ordersPersonId: string;
  shop: Shop;
  sales: Sale[];
  customer: Customer;
  user: User;
  createdAt: string;
  updatedAt: string;
}

interface Shop {
  id: string;
  name: string;
  businessId: string;
  locationId: string;
  status: 'active' | 'inactive' | string;
  type: string;
  shopType: string;
  shopLogo: string;
  contactInfo: string | null;
  operatingHours: string | null;
  manager: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Sale {
  id: string;
  orderId: string;
  productShopId: string;
  productName: string;
  quantity: number;
  sellingPrice: string;
  paymentStatus: 'paid' | 'unpaid' | 'refunded' | string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  dateOfBirth: string | null;
  status: string | null;
  segmentId: string | null;
  businessId: string | null;
  shopId: string | null;
}

interface User {
  id: string;
  username: string;
  email: string;
  image: string | null;
  isStaff: 0 | 1;
  status: 'enable' | 'disable' | string;
  role: 'shop_owner' | 'staff' | string;
  businessId: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}