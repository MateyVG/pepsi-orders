import React, { useEffect, useState } from 'react'
import { 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Order, OrderItem } from '../types'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

const HistoryPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const perPage = 10

  useEffect(() => {
    fetchOrders()
  }, [user, page, statusFilter, dateFrom, dateTo])

  const fetchOrders = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          restaurants (name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      // Filter by restaurant for restaurant users
      if (user.role === 'restaurant' && user.restaurant_id) {
        query = query.eq('restaurant_id', user.restaurant_id)
      }

      // Status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Date filters
      if (dateFrom) {
        query = query.gte('delivery_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('delivery_date', dateTo)
      }

      // Pagination
      const from = (page - 1) * perPage
      const to = from + perPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      const ordersWithNames = data?.map(o => ({
        ...o,
        restaurant_name: o.restaurants?.name || 'Неизвестен'
      })) || []

      setOrders(ordersWithNames)
      setTotalPages(Math.ceil((count || 0) / perPage))

    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Грешка при зареждане на историята')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderDetails = async (order: Order) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (error) throw error
      setOrderItems(data || [])
      setSelectedOrder(order)
      setShowModal(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Грешка при зареждане на детайлите')
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

  const handleExportExcel = () => {
    if (orders.length === 0) {
      toast.error('Няма данни за експорт')
      return
    }

    const exportData = orders.map(o => ({
      'ID': o.id.slice(0, 8),
      'Ресторант': o.restaurant_name,
      'Дата на доставка': format(new Date(o.delivery_date), 'dd.MM.yyyy'),
      'Сума': o.total_amount?.toFixed(2) + ' лв.',
      'Статус': o.status,
      'Създадена': format(new Date(o.created_at), 'dd.MM.yyyy HH:mm')
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'История')
    XLSX.writeFile(wb, `pepsi-orders-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    toast.success('Файлът е изтеглен')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportOrderExcel = () => {
    if (!selectedOrder || orderItems.length === 0) return

    const exportData = orderItems.map(item => ({
      'Код': item.product_code,
      'Артикул': item.product_name,
      'Количество': item.quantity,
      'Цена/стек': item.price_per_stack.toFixed(2) + ' лв.',
      'Общо': item.total_price.toFixed(2) + ' лв.'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Заявка')
    XLSX.writeFile(wb, `order-${selectedOrder.id.slice(0, 8)}.xlsx`)
    toast.success('Файлът е изтеглен')
  }

  const filteredOrders = orders.filter(o => 
    o.restaurant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            История на поръчките
          </h1>
          <p className="text-gray-500 mt-1">
            Преглед и експорт на всички ваши заявки
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="btn-outline flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Експорт Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn-outline flex items-center gap-2 no-print"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Принтирай</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Търси по ID или ресторант..."
              className="input pl-10"
            />
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input pl-10"
              placeholder="От дата"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input pl-10"
              placeholder="До дата"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pl-10 appearance-none"
            >
              <option value="all">Всички статуси</option>
              <option value="pending">Чакащи</option>
              <option value="confirmed">Потвърдени</option>
              <option value="processing">В обработка</option>
              <option value="delivered">Доставени</option>
              <option value="cancelled">Отказани</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ресторант</th>
                <th>Дата на доставка</th>
                <th>Сума</th>
                <th>Статус</th>
                <th>Създадена</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="loading-spinner mx-auto"></div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Няма намерени поръчки
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
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
                    <td>
                      <button
                        onClick={() => fetchOrderDetails(order)}
                        className="p-2 text-aladin-green hover:bg-green-50 rounded-lg transition-colors"
                        title="Преглед"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Страница {page} от {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-aladin-green to-aladin-green-light text-white rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-lg">
                  Заявка #{selectedOrder.id.slice(0, 8)}
                </h3>
                <p className="text-white/80 text-sm">
                  {selectedOrder.restaurant_name}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-96">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Дата на доставка</p>
                  <p className="font-semibold">
                    {format(new Date(selectedOrder.delivery_date), 'd MMMM yyyy', { locale: bg })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Статус</p>
                  <p>{getStatusBadge(selectedOrder.status)}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Забележки</p>
                    <p className="font-medium">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Код</th>
                      <th>Артикул</th>
                      <th className="text-center">К-во</th>
                      <th className="text-right">Цена</th>
                      <th className="text-right">Общо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-sm">{item.product_code}</td>
                        <td>{item.product_name}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.price_per_stack.toFixed(2)} лв.</td>
                        <td className="text-right font-semibold">{item.total_price.toFixed(2)} лв.</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="text-right font-semibold">ОБЩО С ДДС:</td>
                      <td className="text-right font-bold text-lg text-aladin-green">
                        {selectedOrder.total_amount?.toFixed(2)} лв.
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={handleExportOrderExcel}
                className="btn-outline flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Свали Excel
              </button>
              <button
                onClick={() => window.print()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Принтирай
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryPage
