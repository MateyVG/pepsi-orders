// User types
export type UserRole = 'restaurant' | 'admin' | 'supplier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurant_id?: string;
  restaurant_name?: string;
  created_at: string;
  is_active: boolean;
}

// Restaurant
export interface Restaurant {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

// Product
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  price_per_stack: number;
  items_per_stack: number;
  unit: string; // 'стек', 'бр', etc.
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Order Item
export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  price_per_stack: number;
  total_price: number;
}

// Order Status
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled';

// Order
export interface Order {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  delivery_date: string;
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_by_name: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

// Email Settings
export interface EmailSettings {
  id: string;
  primary_recipients: string[];
  cc_recipients: string[];
  updated_at: string;
  updated_by: string;
}

// Category for grouping products
export interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  totalAmount: number;
}

// Filter options
export interface OrderFilters {
  status?: OrderStatus;
  restaurant_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

// API Response
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
