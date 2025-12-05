import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const LoginPage: React.FC = () => {
  const { user, signIn, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  // Зареждане на запомнени данни
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedRemember = localStorage.getItem('rememberMe') === 'true'
    if (savedEmail && savedRemember) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Моля, попълнете всички полета')
      return
    }

    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast.error(error)
    } else {
      // Запомни имейла ако е избрано
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberMe')
      }
      toast.success('Успешно влизане!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <img 
            src="https://www.aladinfoods.bg/assets/css/images/logo_mobile.png?ver=992" 
            alt="Aladin Foods" 
            className="h-14 object-contain"
          />
          <div className="w-px h-10 bg-gray-300"></div>
          <img 
            src="https://www.pepsi.bg/themes/custom/pepsizero_fe/logo.png" 
            alt="Pepsi" 
            className="h-9 object-contain"
          />
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-bold text-gray-800">
              Вход в системата
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Система за поръчка на напитки
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Имейл адрес
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="вашият@имейл.bg"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Парола
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-11"
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-aladin-green focus:ring-aladin-green cursor-pointer"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-600 cursor-pointer select-none">
                Запомни ме
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Влизане...</span>
                </>
              ) : (
                <span>Вход</span>
              )}
            </button>
          </form>

          {/* Help */}
          <p className="text-center text-xs text-gray-400 mt-6">
            
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Aladin Foods | by MG
        </p>
      </div>
    </div>
  )
}

export default LoginPage
