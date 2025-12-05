import React from 'react'
import { Menu, Bell, LogOut, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useUIStore } from '../lib/store'

const Header: React.FC = () => {
  const { user, signOut } = useAuth()
  const { toggleSidebar } = useUIStore()

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор'
      case 'supplier': return 'Доставчик (Pepsi)'
      case 'restaurant': return 'Ресторант'
      default: return role
    }
  }

  return (
    <header className="glass sticky top-0 z-40 border-b border-gray-200/50">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 h-14 sm:h-16">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2.5 rounded-xl bg-aladin-green text-white hover:bg-aladin-green-dark transition-colors shadow-md"
            aria-label="Отвори меню"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          {/* Mobile title */}
          <div className="lg:hidden">
            <h1 className="font-display font-bold text-sm sm:text-base text-gray-800">Pepsi Orders</h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-pepsi-red rounded-full"></span>
          </button>

          {/* User info - hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {getRoleName(user?.role || '')}
                {user?.restaurant_name && ` • ${user.restaurant_name}`}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aladin-green to-pepsi-blue flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
            title="Изход"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header