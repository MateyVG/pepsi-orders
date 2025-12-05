import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Order, Product, Restaurant, OrderItem } from '../types'

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
)

// Cart store for order creation
interface CartItem extends OrderItem {
  product: Product;
}

interface CartState {
  items: CartItem[];
  deliveryDate: string;
  notes: string;
  addItem: (product: Product, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDeliveryDate: (date: string) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  deliveryDate: '',
  notes: '',
  
  addItem: (product, quantity) => {
    const items = get().items
    const existingItem = items.find(item => item.product_id === product.id)
    
    if (existingItem) {
      set({
        items: items.map(item =>
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                total_price: (item.quantity + quantity) * item.price_per_stack
              }
            : item
        )
      })
    } else {
      set({
        items: [...items, {
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          quantity,
          price_per_stack: product.price_per_stack,
          total_price: quantity * product.price_per_stack,
          product
        }]
      })
    }
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    
    set({
      items: get().items.map(item =>
        item.product_id === productId
          ? { ...item, quantity, total_price: quantity * item.price_per_stack }
          : item
      )
    })
  },
  
  removeItem: (productId) => {
    set({ items: get().items.filter(item => item.product_id !== productId) })
  },
  
  setDeliveryDate: (deliveryDate) => set({ deliveryDate }),
  
  setNotes: (notes) => set({ notes }),
  
  clearCart: () => set({ items: [], deliveryDate: '', notes: '' }),
  
  getTotalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.total_price, 0)
  },
  
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0)
  }
}))

// UI State
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
