import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { useAuthStore } from '../lib/store'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, setLoading, isLoading, logout } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*, restaurants(id, name)')
          .eq('auth_id', session.user.id)
          .single()

        if (userData) {
          setUser({ ...userData, restaurant_name: userData.restaurants?.name })
        }
      }
      
      setInitialized(true)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') logout()
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setLoading(false)
        return { error: error.message === 'Invalid login credentials' ? 'Грешен имейл или парола' : error.message }
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*, restaurants(id, name)')
          .eq('auth_id', data.user.id)
          .single()

        if (userError || !userData) {
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Потребителят не е намерен в системата' }
        }

        if (!userData.is_active) {
          await supabase.auth.signOut()
          setLoading(false)
          return { error: 'Акаунтът е деактивиран' }
        }

        setUser({ ...userData, restaurant_name: userData.restaurants?.name })
      }

      setLoading(false)
      return { error: null }
    } catch (err) {
      setLoading(false)
      return { error: 'Грешка при свързване със сървъра' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    logout()
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}