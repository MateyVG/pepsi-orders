import React, { useEffect, useState } from 'react'
import { 
  Calendar, 
  Download, 
  BarChart3,
  Building2,
  Package,
  TrendingUp,
  Filter
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Order, Restaurant } from '../types'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { bg } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

interface ProductStats {
  code: string
  name: string
  totalQuantity: number
  totalAmount: number
}

interface RestaurantStats {
  id: string
  name: string
  orderCount: number
  totalAmount: number
}

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all')
  
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    avgOrderValue: 0,
    uniqueRestaurants: 0
  })
  
  const [productStats, setProductStats] = useState<ProductStats[]>([])
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats[]>([])

  useEffect(() => {
    fetchRestaurants()
  }, [])

  useEffect(() => {
    fetchReports()
  }, [dateFrom, dateTo, selectedRestaurant])

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').eq('is_active', true)
    setRestaurants(data || [])
  }

  const fetchReports = async () => {
    try {
      setLoading(true)

      // Fetch orders
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          restaurants (name)
        `)
        .gte('delivery_date', dateFrom)
        .lte('delivery_date', dateTo)
        .neq('status', 'cancelled')

      if (selectedRestaurant !== 'all') {
        ordersQuery = ordersQuery.eq('restaurant_id', selectedRestaurant)
      }

      const { data: orders, error: ordersError } = await ordersQuery
      if (ordersError) throw ordersError

      // Calculate stats
      const totalOrders = orders?.length || 0
      const totalAmount = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const uniqueRestaurants = new Set(orders?.map(o => o.restaurant_id)).size

      setStats({
        totalOrders,
        totalAmount,
        avgOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
        uniqueRestaurants
      })

      // Fetch order items for product stats
      const orderIds = orders?.map(o => o.id) || []
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)

        // Calculate product stats
        const productMap: Record<string, ProductStats> = {}
        items?.forEach(item => {
          if (!productMap[item.product_code]) {
            productMap[item.product_code] = {
              code: item.product_code,
              name: item.product_name,
              totalQuantity: 0,
              totalAmount: 0
            }
          }
          productMap[item.product_code].totalQuantity += item.quantity
          productMap[item.product_code].totalAmount += item.total_price
        })

        setProductStats(Object.values(productMap).sort((a, b) => b.totalAmount - a.totalAmount))
      } else {
        setProductStats([])
      }

      // Calculate restaurant stats
      const restaurantMap: Record<string, RestaurantStats> = {}
      orders?.forEach(order => {
        const id = order.restaurant_id
        if (!restaurantMap[id]) {
          restaurantMap[id] = {
            id,
            name: order.restaurants?.name || 'Неизвестен',
            orderCount: 0,
            totalAmount: 0
          }
        }
        restaurantMap[id].orderCount++
        restaurantMap[id].totalAmount += order.total_amount || 0
      })

      setRestaurantStats(Object.values(restaurantMap).sort((a, b) => b.totalAmount - a.totalAmount))

    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Грешка при зареждане на справките')
    } finally {
      setLoading(false)
    }
  }

  const handleExportProducts = () => {
    if (productStats.length === 0) {
      toast.error('Няма данни за експорт')
      return
    }

    const exportData = productStats.map(p => ({
      'Код': p.code,
      'Артикул': p.name,
      'Общо количество': p.totalQuantity,
      'Обща сума': p.totalAmount.toFixed(2) + ' лв.'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'По артикули')
    XLSX.writeFile(wb, `report-products-${dateFrom}-${dateTo}.xlsx`)
    toast.success('Файлът е изтеглен')
  }

  const handleExportRestaurants = () => {
    if (restaurantStats.length === 0) {
      toast.error('Няма данни за експорт')
      return
    }

    const exportData = restaurantStats.map(r => ({
      'Ресторант': r.name,
      'Брой поръчки': r.orderCount,
      'Обща сума': r.totalAmount.toFixed(2) + ' лв.'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'По ресторанти')
    XLSX.writeFile(wb, `report-restaurants-${dateFrom}-${dateTo}.xlsx`)
    toast.success('Файлът е изтеглен')
  }

  const setPresetPeriod = (months: number) => {
    const end = new Date()
    const start = subMonths(end, months)
    setDateFrom(format(startOfMonth(start), 'yyyy-MM-dd'))
    setDateTo(format(endOfMonth(end), 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">
          Справки и анализи
        </h1>
        <p className="text-gray-500 mt-1">
          Преглед на статистики и експорт на данни
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="input pl-10"
            >
              <option value="all">Всички ресторанти</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-2 flex gap-2">
            <button
              onClick={() => setPresetPeriod(0)}
              className="btn-outline flex-1 text-sm py-2"
            >
              Този месец
            </button>
            <button
              onClick={() => setPresetPeriod(3)}
              className="btn-outline flex-1 text-sm py-2"
            >
              3 месеца
            </button>
            <button
              onClick={() => setPresetPeriod(6)}
              className="btn-outline flex-1 text-sm py-2"
            >
              6 месеца
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="pb-3 border-b-2 border-gray-300">
          <p className="text-4xl font-bold text-gray-800">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500 mt-1">Поръчки</p>
        </div>
        <div className="pb-3 border-b-2 border-green-500">
          <p className="text-3xl font-bold text-green-600">{stats.totalAmount.toFixed(2)} лв.</p>
          <p className="text-sm text-gray-500 mt-1">Общо</p>
        </div>
        <div className="pb-3 border-b-2 border-aladin-green">
          <p className="text-4xl font-bold text-gray-800">{stats.uniqueRestaurants}</p>
          <p className="text-sm text-gray-500 mt-1">Ресторанта</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Топ артикули</h2>
            <button
              onClick={handleExportProducts}
              className="text-aladin-green hover:text-aladin-green-dark text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Експорт
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loading-spinner"></div>
              </div>
            ) : productStats.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Няма данни за периода</p>
            ) : (
              <div className="space-y-3">
                {productStats.slice(0, 10).map((product, index) => (
                  <div key={product.code} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-aladin-green text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.totalQuantity} стека</p>
                    </div>
                    <p className="font-semibold text-aladin-green">
                      {product.totalAmount.toFixed(2)} лв.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Restaurants */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Топ ресторанти</h2>
            <button
              onClick={handleExportRestaurants}
              className="text-aladin-green hover:text-aladin-green-dark text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Експорт
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loading-spinner"></div>
              </div>
            ) : restaurantStats.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Няма данни за периода</p>
            ) : (
              <div className="space-y-3">
                {restaurantStats.slice(0, 10).map((restaurant, index) => (
                  <div key={restaurant.id} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-pepsi-blue text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{restaurant.name}</p>
                      <p className="text-xs text-gray-500">{restaurant.orderCount} поръчки</p>
                    </div>
                    <p className="font-semibold text-pepsi-blue">
                      {restaurant.totalAmount.toFixed(2)} лв.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage