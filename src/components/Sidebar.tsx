import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { 
  Home, 
  ShoppingCart, 
  History, 
  Users, 
  Package, 
  Settings,
  BarChart3,
  Building2,
  Mail,
  X,
  Truck,
  CalendarDays
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useUIStore } from '../lib/store'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
  roles: string[]
}

const navItems: NavItem[] = [
  { 
    path: '/dashboard', 
    icon: <Home className="w-5 h-5" />, 
    label: 'Начало', 
    roles: ['admin', 'restaurant', 'supplier'] 
  },
  { 
    path: '/order', 
    icon: <ShoppingCart className="w-5 h-5" />, 
    label: 'Нова заявка', 
    roles: ['restaurant'] 
  },
  { 
    path: '/history', 
    icon: <History className="w-5 h-5" />, 
    label: 'История', 
    roles: ['admin', 'restaurant', 'supplier'] 
  },
  { 
    path: '/orders', 
    icon: <Truck className="w-5 h-5" />, 
    label: 'Заявки', 
    roles: ['admin', 'supplier'] 
  },
  { 
    path: '/delivery-schedule', 
    icon: <CalendarDays className="w-5 h-5" />, 
    label: 'График доставки', 
    roles: ['admin', 'supplier'] 
  },
  { 
    path: '/reports', 
    icon: <BarChart3 className="w-5 h-5" />, 
    label: 'Справки', 
    roles: ['admin', 'supplier'] 
  },
  { 
    path: '/products', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Артикули', 
    roles: ['admin'] 
  },
  { 
    path: '/restaurants', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Ресторанти', 
    roles: ['admin'] 
  },
  { 
    path: '/users', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Потребители', 
    roles: ['admin'] 
  },
  { 
    path: '/email-settings', 
    icon: <Mail className="w-5 h-5" />, 
    label: 'Имейл настройки', 
    roles: ['admin'] 
  },
  { 
    path: '/settings', 
    icon: <Settings className="w-5 h-5" />, 
    label: 'Настройки', 
    roles: ['admin', 'restaurant', 'supplier'] 
  },
]

const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const location = useLocation()

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-aladin-green-dark via-aladin-green to-aladin-green-light
        text-white shadow-2xl z-[70] transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo Section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              
              <div>
                <h1 className="font-display font-bold text-lg">Pepsi Orders</h1>
                <p className="text-xs text-white/60">Aladin Foods</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 bg-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200
                    hover:bg-white/10 cursor-pointer
                    ${isActive ? 'bg-white/20 font-semibold' : ''}
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-white/60 truncate">
                {user?.restaurant_name || user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Brand logos */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-6 bg-white/90 rounded-lg p-3">
            <img 
              src="https://www.aladinfoods.bg/assets/css/images/logo_mobile.png?ver=992" 
              alt="Aladin Foods" 
              className="h-12 object-contain"
            />
            <img 
              src="https://www.pepsi.bg/themes/custom/pepsizero_fe/logo.png" 
              alt="Pepsi" 
              className="h-9 object-contain"
            />
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar