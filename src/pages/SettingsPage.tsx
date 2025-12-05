import React, { useState } from 'react'
import { 
  User, 
  Lock, 
  Save,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: user?.name || ''
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleUpdateProfile = async () => {
    if (!profileData.name) {
      toast.error('Името е задължително')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: profileData.name })
        .eq('id', user?.id)

      if (error) throw error
      toast.success('Профилът е обновен')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Грешка при обновяване')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Моля, попълнете всички полета')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Паролите не съвпадат')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Паролата трябва да е поне 6 символа')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error
      
      toast.success('Паролата е променена')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Грешка при промяна на паролата')
    } finally {
      setSaving(false)
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор'
      case 'supplier': return 'Доставчик (Pepsi)'
      case 'restaurant': return 'Ресторант'
      default: return role
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">
          Настройки
        </h1>
        <p className="text-gray-500 mt-1">
          Управление на вашия профил и акаунт
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-aladin-green" />
              <h2 className="font-semibold text-gray-800">Профил</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="form-group">
              <label className="form-label">Имейл</label>
              <input
                type="email"
                value={user?.email || ''}
                className="input bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Имейлът не може да бъде променян</p>
            </div>

            <div className="form-group">
              <label className="form-label">Име</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="input"
                placeholder="Вашето име"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Роля</label>
              <input
                type="text"
                value={getRoleName(user?.role || '')}
                className="input bg-gray-50"
                disabled
              />
            </div>

            {user?.restaurant_name && (
              <div className="form-group">
                <label className="form-label">Ресторант</label>
                <input
                  type="text"
                  value={user.restaurant_name}
                  className="input bg-gray-50"
                  disabled
                />
              </div>
            )}

            <button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Запази промените
            </button>
          </div>
        </div>

        {/* Password Settings */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-pepsi-blue" />
              <h2 className="font-semibold text-gray-800">Смяна на парола</h2>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="form-group">
              <label className="form-label">Нова парола</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Потвърди новата парола</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={saving}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
              Промени паролата
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-3">За приложението</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Версия</p>
            <p className="font-medium">1.0.0</p>
          </div>
          <div>
            <p className="text-gray-500">Разработка</p>
            <p className="font-medium">MG</p>
          </div>
          <div>
            <p className="text-gray-500"></p>
            <p className="font-medium"></p>
          </div>
          <div>
            <p className="text-gray-500"></p>
            <p className="font-medium"></p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
          <img 
            src="https://www.aladinfoods.bg/assets/css/images/logo_mobile.png?ver=992" 
            alt="Aladin Foods" 
            className="h-8 object-contain"
          />
          <span className="text-gray-300">×</span>
          <img 
            src="https://www.pepsi.bg/themes/custom/pepsizero_fe/logo.png" 
            alt="Pepsi" 
            className="h-6 object-contain"
          />
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
