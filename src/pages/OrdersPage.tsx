import React, { useEffect, useState, useRef } from 'react'
import { 
  Search, 
  Calendar, 
  Download, 
  Eye,
  Check,
  X,
  Truck,
  Building2,
  Package,
  Filter,
  FileSpreadsheet,
  FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Order, OrderItem, Restaurant } from '../types'
import { format } from 'date-fns'
import { bg } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

const OrdersPage: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'restaurant' | 'product'>('none')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [showModal, setShowModal] = useState(false)
  const [pdfOrder, setPdfOrder] = useState<Order | null>(null)
  const [pdfItems, setPdfItems] = useState<OrderItem[]>([])
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOrders()
    fetchRestaurants()
  }, [statusFilter, dateFrom, dateTo, restaurantFilter])

  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*').eq('is_active', true)
    setRestaurants(data || [])
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          restaurants (name, code)
        `)
        .order('delivery_date', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      if (restaurantFilter !== 'all') {
        query = query.eq('restaurant_id', restaurantFilter)
      }
      if (dateFrom) {
        query = query.gte('delivery_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('delivery_date', dateTo)
      }

      const { data, error } = await query

      if (error) throw error

      const ordersWithNames = data?.map(o => ({
        ...o,
        restaurant_name: o.restaurants?.name || 'Неизвестен'
      })) || []

      setOrders(ordersWithNames)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Грешка при зареждане на заявките')
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
    }
  }

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updateData: Record<string, unknown> = { status }
      
      if (status === 'confirmed' && user) {
        updateData.confirmed_by = user.id
        updateData.confirmed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error

      toast.success('Статусът е обновен')
      fetchOrders()
      setShowModal(false)
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Грешка при обновяване на статуса')
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

  const handleExportExcel = async () => {
    try {
      // Fetch all order items for current orders
      const orderIds = orders.map(o => o.id)
      const { data: allItems } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds)

      if (groupBy === 'product') {
        // Group by product
        const productTotals: Record<string, { code: string; name: string; quantity: number; total: number }> = {}
        
        allItems?.forEach(item => {
          if (!productTotals[item.product_code]) {
            productTotals[item.product_code] = {
              code: item.product_code,
              name: item.product_name,
              quantity: 0,
              total: 0
            }
          }
          productTotals[item.product_code].quantity += item.quantity
          productTotals[item.product_code].total += item.total_price
        })

        const exportData = Object.values(productTotals).map(p => ({
          'Код': p.code,
          'Артикул': p.name,
          'Общо количество': p.quantity,
          'Обща сума': p.total.toFixed(2) + ' лв.'
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'По артикули')
        XLSX.writeFile(wb, `orders-by-product-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      } else if (groupBy === 'restaurant') {
        // Group by restaurant
        const restaurantData = orders.map(o => ({
          'Ресторант': o.restaurant_name,
          'Дата доставка': format(new Date(o.delivery_date), 'dd.MM.yyyy'),
          'Сума': o.total_amount?.toFixed(2) + ' лв.',
          'Статус': o.status
        }))

        const ws = XLSX.utils.json_to_sheet(restaurantData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'По ресторанти')
        XLSX.writeFile(wb, `orders-by-restaurant-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      } else {
        // Full export
        const exportData: Record<string, unknown>[] = []
        
        for (const order of orders) {
          const items = allItems?.filter(i => i.order_id === order.id) || []
          items.forEach(item => {
            exportData.push({
              'ID Заявка': order.id.slice(0, 8),
              'Ресторант': order.restaurant_name,
              'Дата доставка': format(new Date(order.delivery_date), 'dd.MM.yyyy'),
              'Код артикул': item.product_code,
              'Артикул': item.product_name,
              'Количество': item.quantity,
              'Цена': item.price_per_stack.toFixed(2),
              'Общо': item.total_price.toFixed(2),
              'Статус': order.status
            })
          })
        }

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Всички заявки')
        XLSX.writeFile(wb, `all-orders-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
      }

      toast.success('Файлът е изтеглен')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Грешка при експорт')
    }
  }

  // Export single order to Excel (WITHOUT PRICES)
  const exportSingleOrderExcel = async (order: Order) => {
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      const exportData = items?.map(item => ({
        'Код': item.product_code,
        'Артикул': item.product_name,
        'Количество': item.quantity
      })) || []

      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Add header info
      XLSX.utils.sheet_add_aoa(ws, [
        [`Заявка #${order.id.slice(0, 8)}`],
        [`Ресторант: ${order.restaurant_name}`],
        [`Дата на доставка: ${format(new Date(order.delivery_date), 'dd.MM.yyyy')}`],
        [`Дата на създаване: ${format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}`],
        [],
      ], { origin: 'A1' })
      
      // Move data down
      const dataWithHeaders = [
        [`Заявка #${order.id.slice(0, 8)}`],
        [`Ресторант: ${order.restaurant_name}`],
        [`Дата на доставка: ${format(new Date(order.delivery_date), 'dd.MM.yyyy')}`],
        [`Дата на създаване: ${format(new Date(order.created_at), 'dd.MM.yyyy HH:mm')}`],
        [],
        ['Код', 'Артикул', 'Количество'],
        ...(items?.map(item => [item.product_code, item.product_name, item.quantity]) || [])
      ]
      
      const wsWithHeaders = XLSX.utils.aoa_to_sheet(dataWithHeaders)
      
      // Set column widths
      wsWithHeaders['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 12 }]
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, wsWithHeaders, 'Заявка')
      XLSX.writeFile(wb, `заявка-${order.id.slice(0, 8)}-${format(new Date(order.delivery_date), 'dd-MM-yyyy')}.xlsx`)
      
      toast.success('Excel файлът е изтеглен')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Грешка при експорт')
    }
  }

  // Transliteration function for Cyrillic to Latin
  const transliterate = (text: string): string => {
    const map: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
      'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
      'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
      'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': '',
      'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
      'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
      'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
      'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': '',
      'Ю': 'Yu', 'Я': 'Ya'
    }
    return text.split('').map(char => map[char] || char).join('')
  }

  // Export single order to PDF (WITHOUT PRICES) - Direct download
  const exportSingleOrderPDF = async (order: Order) => {
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(20)
      doc.setTextColor(25, 94, 51)
      doc.text('Aladin Foods', 20, 20)
      
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text(`Zayavka #${order.id.slice(0, 8)}`, 20, 32)
      
      // Order info
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Restorant:', 20, 45)
      doc.text('Data na dostavka:', 20, 52)
      doc.text('Data na sazdavane:', 20, 59)
      
      doc.setTextColor(0, 0, 0)
      doc.text(transliterate(order.restaurant_name || ''), 55, 45)
      doc.text(format(new Date(order.delivery_date), 'dd.MM.yyyy'), 55, 52)
      doc.text(format(new Date(order.created_at), 'dd.MM.yyyy HH:mm'), 55, 59)
      
      // Table with products
      const tableData = items?.map(item => [
        item.product_code,
        transliterate(item.product_name),
        item.quantity.toString()
      ]) || []

      autoTable(doc, {
        startY: 70,
        head: [['Kod', 'Artikul', 'Kolichestvo']],
        body: tableData,
        headStyles: {
          fillColor: [25, 94, 51],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 249]
        },
        styles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 30, halign: 'center' }
        }
      })
      
      // Footer
      const pageHeight = doc.internal.pageSize.height
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Generirano na: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 20, pageHeight - 10)
      
      // Save
      doc.save(`zayavka-${order.id.slice(0, 8)}-${format(new Date(order.delivery_date), 'dd-MM-yyyy')}.pdf`)
      
      toast.success('PDF файлът е изтеглен')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Грешка при експорт')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Управление на заявки
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'supplier' ? 'Преглед и обработка на получени заявки' : 'Администриране на всички заявки'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'none' | 'restaurant' | 'product')}
            className="input py-2"
          >
            <option value="none">Без групиране</option>
            <option value="restaurant">По ресторанти</option>
            <option value="product">По артикули</option>
          </select>
          <button
            onClick={handleExportExcel}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Експорт</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={restaurantFilter}
              onChange={(e) => setRestaurantFilter(e.target.value)}
              className="input pl-10"
            >
              <option value="all">Всички ресторанти</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">От дата</label>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                // If dateTo is empty, set it to the same date for single day filter
                if (!dateTo && e.target.value) {
                  setDateTo(e.target.value)
                }
              }}
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">До дата</label>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pl-10"
            >
              <option value="all">Всички статуси</option>
              <option value="pending">Чакащи</option>
              <option value="confirmed">Потвърдени</option>
              <option value="processing">В обработка</option>
              <option value="delivered">Доставени</option>
            </select>
          </div>

          {/* Clear filters button */}
          {(dateFrom || dateTo || statusFilter !== 'all' || restaurantFilter !== 'all') && (
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setStatusFilter('all')
                setRestaurantFilter('all')
              }}
              className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Изчисти филтрите
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="pb-3 border-b-2 border-gray-300">
          <p className="text-4xl font-bold text-gray-800">{orders.length}</p>
          <p className="text-sm text-gray-500 mt-1">Общо заявки</p>
        </div>
        <div className="pb-3 border-b-2 border-yellow-400">
          <p className="text-4xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
          <p className="text-sm text-gray-500 mt-1">Чакащи</p>
        </div>
        <div className="pb-3 border-b-2 border-green-500">
          <p className="text-4xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
          <p className="text-sm text-gray-500 mt-1">Доставени</p>
        </div>
        <div className="pb-3 border-b-2 border-aladin-green">
          <p className="text-3xl font-bold text-gray-800">{orders.reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(2)} лв.</p>
          <p className="text-sm text-gray-500 mt-1">Обща сума</p>
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
                <th>Дата доставка</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Няма намерени заявки
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-sm">#{order.id.slice(0, 8)}</td>
                    <td className="font-medium">{order.restaurant_name}</td>
                    <td>{format(new Date(order.delivery_date), 'd MMM yyyy', { locale: bg })}</td>
                    <td className="font-semibold">{order.total_amount?.toFixed(2)} лв.</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td className="text-gray-500 text-sm">
                      {format(new Date(order.created_at), 'd MMM, HH:mm', { locale: bg })}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => fetchOrderDetails(order)}
                          className="p-2 text-aladin-green hover:bg-blue-50 rounded-lg"
                          title="Преглед"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Потвърди"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Откажи"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Маркирай като доставена"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exportSingleOrderExcel(order)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Експорт Excel (без цени)"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exportSingleOrderPDF(order)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Експорт PDF (без цени)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {order.status === 'delivered' && (
                          <>
                            <button
                              onClick={() => exportSingleOrderExcel(order)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Експорт Excel (без цени)"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => exportSingleOrderPDF(order)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Експорт PDF (без цени)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-aladin-green to-aladin-green-light text-white rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-lg">Заявка #{selectedOrder.id.slice(0, 8)}</h3>
                <p className="text-white/80 text-sm">{selectedOrder.restaurant_name}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-96">
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
              </div>

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

            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2">
              {selectedOrder.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Потвърди заявката
                  </button>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 text-red-600 border-red-600 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                    Откажи
                  </button>
                </>
              )}
              {selectedOrder.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    Маркирай като доставена
                  </button>
                  <button
                    onClick={() => exportSingleOrderExcel(selectedOrder)}
                    className="btn-outline flex items-center justify-center gap-2 text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white px-4"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportSingleOrderPDF(selectedOrder)}
                    className="btn-outline flex items-center justify-center gap-2 text-red-500 border-red-500 hover:bg-red-500 hover:text-white px-4"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </>
              )}
              {selectedOrder.status === 'delivered' && (
                <>
                  <button
                    onClick={() => exportSingleOrderExcel(selectedOrder)}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Експорт Excel
                  </button>
                  <button
                    onClick={() => exportSingleOrderPDF(selectedOrder)}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <FileText className="w-4 h-4" />
                    Експорт PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Import Clock for the stats
import { Clock } from 'lucide-react'

export default OrdersPage