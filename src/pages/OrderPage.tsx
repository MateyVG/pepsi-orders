import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, 
  Calendar, 
  Send, 
  Trash2, 
  Plus, 
  Minus,
  Package,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Product } from '../types'
import { useCartStore } from '../lib/store'
import { 
  PRIMARY_RECIPIENTS, 
  CC_RECIPIENTS, 
  generateOrderEmailHtml,
  EMAIL_SUBJECT_TEMPLATE,
  sendPepsiNotification,
  sendOrderEmail
} from '../lib/email'
import toast from 'react-hot-toast'
import { format, addDays, parseISO } from 'date-fns'
import { bg } from 'date-fns/locale'

interface ProductWithQuantity extends Product {
  quantity: number
}

interface DeliverySchedule {
  allowed_days: number[]
  min_days_ahead: number
  max_days_ahead: number
  blocked_dates: string[]
}

const OrderPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { 
    items, 
    deliveryDate, 
    notes,
    addItem, 
    updateQuantity, 
    removeItem, 
    setDeliveryDate,
    setNotes,
    clearCart,
    getTotalAmount 
  } = useCartStore()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [deliverySchedule, setDeliverySchedule] = useState<DeliverySchedule | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
    if (user?.restaurant_id) {
      fetchDeliverySchedule()
    }
  }, [user?.restaurant_id])

  useEffect(() => {
    if (deliverySchedule) {
      const dates = calculateAvailableDates(deliverySchedule)
      setAvailableDates(dates)
      
      if (!deliveryDate || !dates.includes(deliveryDate)) {
        if (dates.length > 0) {
          setDeliveryDate(dates[0])
        }
      }
    }
  }, [deliverySchedule])

  const fetchDeliverySchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_schedules')
        .select('*')
        .eq('restaurant_id', user?.restaurant_id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching schedule:', error)
      }

      if (data) {
        setDeliverySchedule(data)
      } else {
        setDeliverySchedule({
          allowed_days: [1, 2, 3, 4, 5],
          min_days_ahead: 1,
          max_days_ahead: 14,
          blocked_dates: []
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setDeliverySchedule({
        allowed_days: [1, 2, 3, 4, 5],
        min_days_ahead: 1,
        max_days_ahead: 14,
        blocked_dates: []
      })
    }
  }

  const calculateAvailableDates = (schedule: DeliverySchedule): string[] => {
    const dates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startDate = addDays(today, schedule.min_days_ahead)
    const endDate = addDays(today, schedule.max_days_ahead)
    
    let currentDate = startDate
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      
      if (schedule.allowed_days.includes(dayOfWeek) && 
          !schedule.blocked_dates.includes(dateStr)) {
        dates.push(dateStr)
      }
      
      currentDate = addDays(currentDate, 1)
    }
    
    return dates
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Грешка при зареждане на артикулите')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...new Set(products.map(p => p.category))]
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory)

  const handleQuantityChange = (product: Product, delta: number) => {
    const existingItem = items.find(i => i.product_id === product.id)
    const newQuantity = (existingItem?.quantity || 0) + delta

    if (newQuantity <= 0) {
      removeItem(product.id)
    } else if (existingItem) {
      updateQuantity(product.id, newQuantity)
    } else if (delta > 0) {
      addItem(product, delta)
    }
  }

  const getItemQuantity = (productId: string): number => {
    return items.find(i => i.product_id === productId)?.quantity || 0
  }

  const handleSubmit = async () => {
    if (!user || !user.restaurant_id) {
      toast.error('Грешка: Не е избран ресторант')
      return
    }

    if (items.length === 0) {
      toast.error('Моля, добавете поне един артикул')
      return
    }

    if (!deliveryDate) {
      toast.error('Моля, изберете дата за доставка')
      return
    }

    setSubmitting(true)

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: user.restaurant_id,
          delivery_date: deliveryDate,
          status: 'pending',
          total_amount: getTotalAmount(),
          notes: notes || null,
          created_by: user.id,
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        quantity: item.quantity,
        price_per_stack: item.price_per_stack,
        total_price: item.total_price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      const emailHtml = generateOrderEmailHtml({
        restaurantName: user.restaurant_name || 'Неизвестен ресторант',
        deliveryDate: format(new Date(deliveryDate), 'dd.MM.yyyy'),
        items: items.map(i => ({
          product_code: i.product_code,
          product_name: i.product_name,
          quantity: i.quantity,
          price_per_stack: i.price_per_stack,
          total_price: i.total_price
        })),
        totalAmount: getTotalAmount(),
        createdBy: user.name,
        notes
      })

      // Изпрати имейл до Aladin
      await sendOrderEmail(
        PRIMARY_RECIPIENTS,
        CC_RECIPIENTS,
        EMAIL_SUBJECT_TEMPLATE(user.restaurant_name || '', format(new Date(deliveryDate), 'dd.MM.yyyy')),
        emailHtml
      )

      // Изпрати нотификация до Pepsi
      await sendPepsiNotification({
        restaurantName: user.restaurant_name || 'Неизвестен ресторант',
        deliveryDate: format(new Date(deliveryDate), 'dd.MM.yyyy'),
        items: items.map(i => ({
          product_code: i.product_code,
          product_name: i.product_name,
          quantity: i.quantity
        })),
        createdBy: user.name,
        notes
      })

      clearCart()
      toast.success('Заявката е изпратена успешно!')
      navigate('/history')

    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Грешка при изпращане на заявката')
    } finally {
      setSubmitting(false)
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Нова заявка
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.restaurant_name} • Изберете продукти и количества
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <label className="text-sm text-gray-500">Дата на доставка</label>
            {availableDates.length > 0 ? (
              <select
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="input py-2"
              >
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: bg })}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Няма налични дати за доставка</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-aladin-green text-white shadow-button'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'Всички' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((product) => {
              const quantity = getItemQuantity(product.id)
              return (
                <div 
                  key={product.id}
                  className={`product-card ${quantity > 0 ? 'border-aladin-green bg-green-50/50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 font-mono">{product.code}</p>
                      <h3 className="font-semibold text-gray-800 text-sm mt-1">
                        {product.name}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-aladin-green">
                        {product.price_per_stack.toFixed(2)} лв.
                      </p>
                      <p className="text-xs text-gray-500">
                        / {product.unit} ({product.items_per_stack} бр.)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Количество:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(product, -1)}
                        disabled={quantity === 0}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          if (val >= 0) {
                            updateQuantity(product.id, val)
                          }
                        }}
                        className="quantity-input"
                        min="0"
                      />
                      <button
                        onClick={() => handleQuantityChange(product, 1)}
                        className="w-8 h-8 rounded-lg bg-aladin-green text-white flex items-center justify-center hover:bg-aladin-green-dark transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {quantity > 0 && (
                    <div className="mt-2 text-right">
                      <span className="text-sm font-semibold text-aladin-green">
                        = {(quantity * product.price_per_stack).toFixed(2)} лв.
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-24">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-aladin-green" />
                <h2 className="font-semibold text-gray-800">Вашата заявка</h2>
                <span className="ml-auto badge badge-info">
                  {items.length} артикула
                </span>
              </div>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Добавете артикули</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {item.price_per_stack.toFixed(2)} лв.
                      </p>
                    </div>
                    <p className="font-semibold text-aladin-green whitespace-nowrap">
                      {item.total_price.toFixed(2)} лв.
                    </p>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <FileText className="w-4 h-4" />
                Забележки (незадължително)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Добавете забележки към заявката..."
                className="input resize-none"
                rows={2}
              />
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Общо с ДДС:</span>
                <span className="text-2xl font-bold text-aladin-green">
                  {getTotalAmount().toFixed(2)} лв.
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Изпращане...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Изпрати заявката</span>
                    </>
                  )}
                </button>

                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Изчисти заявката
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderPage