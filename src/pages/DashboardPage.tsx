import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  ArrowRight,
  Package,
  Truck
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'

interface Stats {
  totalOrders: number
  pendingOrders: number
  todayOrders: number
  totalAmount: number
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalAmount: 0
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      // Build query based on role
      let query = supabase.from('orders').select('*', { count: 'exact' })
      
      if (user.role === 'restaurant' && user.restaurant_id) {
        query = query.eq('restaurant_id', user.restaurant_id)
      }

      const { data: orders, count } = await query.order('created_at', { ascending: false })

      if (orders) {
        const today = new Date().toISOString().split('T')[0]
        const pending = orders.filter(o => o.status === 'pending').length
        const todayCount = orders.filter(o => o.created_at.split('T')[0] === today).length
        const total = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

        setStats({
          totalOrders: count || 0,
          pendingOrders: pending,
          todayOrders: todayCount,
          totalAmount: total
        })

        // Fetch recent orders with restaurant names
        const { data: recentData } = await supabase
          .from('orders')
          .select(`
            *,
            restaurants (name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentData) {
          setRecentOrders(recentData.map(o => ({
            ...o,
            restaurant_name: o.restaurants?.name || 'Неизвестен'
          })))
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      processing: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-error'
    }
    const labels: Record<string, string> = {
      pending: 'Чакаща',
      confirmed: 'Потвърдена',
      processing: 'В обработка',
      delivered: 'Доставена',
      cancelled: 'Отказана'
    }
    return <span className={`badge ${styles[status]}`}>{labels[status]}</span>
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Добро утро'
    if (hour < 18) return 'Добър ден'
    return 'Добър вечер'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="card p-6 bg-gradient-to-r from-aladin-green to-aladin-green-light text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {getGreeting()}, {user?.name}!
            </h1>
            <p className="text-white/80 mt-1">
              {user?.role === 'restaurant' 
                ? `Управлявайте поръчките за ${user?.restaurant_name}`
                : 'Преглед на всички поръчки в системата'}
            </p>
          </div>
          
          {user?.role === 'restaurant' && (
            <Link to="/order" className="btn-secondary inline-flex items-center gap-2 self-start">
              <ShoppingCart className="w-5 h-5" />
              <span>Нова заявка</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="pb-3 border-b-2 border-gray-300">
          <p className="text-4xl font-bold text-gray-800">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500 mt-1">Общо поръчки</p>
        </div>
        <div className="pb-3 border-b-2 border-yellow-400">
          <p className="text-4xl font-bold text-yellow-600">{stats.pendingOrders}</p>
          <p className="text-sm text-gray-500 mt-1">Чакащи</p>
        </div>
        <div className="pb-3 border-b-2 border-green-500">
          <p className="text-4xl font-bold text-green-600">{stats.todayOrders}</p>
          <p className="text-sm text-gray-500 mt-1">Днес</p>
        </div>
        <div className="pb-3 border-b-2 border-aladin-green">
          <p className="text-4xl font-bold text-gray-800">{stats.totalAmount.toFixed(2)} лв.</p>
          <p className="text-sm text-gray-500 mt-1">Оборот</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gray-800">
              Последни поръчки
            </h2>
            <Link 
              to="/history" 
              className="text-aladin-green hover:text-aladin-green-dark font-medium text-sm flex items-center gap-1"
            >
              Виж всички
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ресторант</th>
                <th>Дата на доставка</th>
                <th>Сума</th>
                <th>Статус</th>
                <th>Създадена</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Няма намерени поръчки
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="font-medium">{order.restaurant_name}</td>
                    <td>
                      {format(new Date(order.delivery_date), 'd MMM yyyy', { locale: bg })}
                    </td>
                    <td className="font-semibold">
                      {order.total_amount?.toFixed(2)} лв.
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td className="text-gray-500 text-sm">
                      {format(new Date(order.created_at), 'd MMM, HH:mm', { locale: bg })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions for Restaurant */}
      {user?.role === 'restaurant' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            to="/order" 
            className="card p-6 hover:shadow-card-hover transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-aladin-green to-aladin-green-light flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Създай нова заявка</h3>
                <p className="text-sm text-gray-500">Поръчай Pepsi продукти за вашия ресторант</p>
              </div>
            </div>
          </Link>

          <Link 
            to="/history" 
            className="card p-6 hover:shadow-card-hover transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-aladin-green to-aladin-green-light flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">История на поръчките</h3>
                <p className="text-sm text-gray-500">Прегледай и повтори предишни заявки</p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

export default DashboardPage