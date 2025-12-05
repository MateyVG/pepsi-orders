import React, { useEffect, useState } from 'react'
import { 
  Calendar, 
  Save, 
  Building2, 
  Check,
  X,
  Info
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Restaurant } from '../types'
import toast from 'react-hot-toast'

interface DeliverySchedule {
  id?: string
  restaurant_id: string
  allowed_days: number[]
  min_days_ahead: number
  max_days_ahead: number
  blocked_dates: string[]
  notes: string
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понеделник', short: 'Пон' },
  { value: 2, label: 'Вторник', short: 'Вто' },
  { value: 3, label: 'Сряда', short: 'Сря' },
  { value: 4, label: 'Четвъртък', short: 'Чет' },
  { value: 5, label: 'Петък', short: 'Пет' },
  { value: 6, label: 'Събота', short: 'Съб' },
  { value: 0, label: 'Неделя', short: 'Нед' },
]

const DeliverySchedulePage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [schedules, setSchedules] = useState<Record<string, DeliverySchedule>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null)
  const [newBlockedDate, setNewBlockedDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (restaurantsError) throw restaurantsError
      setRestaurants(restaurantsData || [])

      // Fetch existing schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('delivery_schedules')
        .select('*')

      if (schedulesError && schedulesError.code !== 'PGRST116') {
        console.error('Schedules error:', schedulesError)
      }

      // Convert to lookup object
      const schedulesMap: Record<string, DeliverySchedule> = {}
      if (schedulesData) {
        schedulesData.forEach(schedule => {
          schedulesMap[schedule.restaurant_id] = schedule
        })
      }
      setSchedules(schedulesMap)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Грешка при зареждане на данните')
    } finally {
      setLoading(false)
    }
  }

  const getScheduleForRestaurant = (restaurantId: string): DeliverySchedule => {
    return schedules[restaurantId] || {
      restaurant_id: restaurantId,
      allowed_days: [1, 2, 3, 4, 5], // Default: Mon-Fri
      min_days_ahead: 1,
      max_days_ahead: 14,
      blocked_dates: [],
      notes: '',
      is_active: true
    }
  }

  const toggleDay = (restaurantId: string, day: number) => {
    const current = getScheduleForRestaurant(restaurantId)
    const newDays = current.allowed_days.includes(day)
      ? current.allowed_days.filter(d => d !== day)
      : [...current.allowed_days, day].sort((a, b) => a - b)
    
    setSchedules(prev => ({
      ...prev,
      [restaurantId]: { ...current, allowed_days: newDays }
    }))
  }

  const updateScheduleField = (restaurantId: string, field: keyof DeliverySchedule, value: any) => {
    const current = getScheduleForRestaurant(restaurantId)
    setSchedules(prev => ({
      ...prev,
      [restaurantId]: { ...current, [field]: value }
    }))
  }

  const addBlockedDate = (restaurantId: string) => {
    if (!newBlockedDate) return
    
    const current = getScheduleForRestaurant(restaurantId)
    if (current.blocked_dates.includes(newBlockedDate)) {
      toast.error('Тази дата вече е добавена')
      return
    }
    
    setSchedules(prev => ({
      ...prev,
      [restaurantId]: {
        ...current,
        blocked_dates: [...current.blocked_dates, newBlockedDate].sort()
      }
    }))
    setNewBlockedDate('')
  }

  const removeBlockedDate = (restaurantId: string, date: string) => {
    const current = getScheduleForRestaurant(restaurantId)
    setSchedules(prev => ({
      ...prev,
      [restaurantId]: {
        ...current,
        blocked_dates: current.blocked_dates.filter(d => d !== date)
      }
    }))
  }

  const saveSchedule = async (restaurantId: string) => {
    setSaving(restaurantId)
    try {
      const schedule = getScheduleForRestaurant(restaurantId)
      
      const { error } = await supabase
        .from('delivery_schedules')
        .upsert({
          restaurant_id: restaurantId,
          allowed_days: schedule.allowed_days,
          min_days_ahead: schedule.min_days_ahead,
          max_days_ahead: schedule.max_days_ahead,
          blocked_dates: schedule.blocked_dates,
          notes: schedule.notes,
          is_active: schedule.is_active,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'restaurant_id'
        })

      if (error) throw error
      
      toast.success('Графикът е запазен')
      fetchData()
    } catch (error) {
      console.error('Error saving schedule:', error)
      toast.error('Грешка при запазване')
    } finally {
      setSaving(null)
    }
  }

  const applyToAll = async () => {
    if (!selectedRestaurant) {
      toast.error('Изберете ресторант като шаблон')
      return
    }

    const template = getScheduleForRestaurant(selectedRestaurant)
    
    if (confirm('Сигурни ли сте, че искате да приложите този график към всички ресторанти?')) {
      setSaving('all')
      try {
        for (const restaurant of restaurants) {
          if (restaurant.id !== selectedRestaurant) {
            await supabase
              .from('delivery_schedules')
              .upsert({
                restaurant_id: restaurant.id,
                allowed_days: template.allowed_days,
                min_days_ahead: template.min_days_ahead,
                max_days_ahead: template.max_days_ahead,
                blocked_dates: template.blocked_dates,
                notes: template.notes,
                is_active: template.is_active,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'restaurant_id'
              })
          }
        }
        toast.success('Графикът е приложен към всички ресторанти')
        fetchData()
      } catch (error) {
        console.error('Error applying to all:', error)
        toast.error('Грешка при прилагане')
      } finally {
        setSaving(null)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aladin-green"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            График за доставки
          </h1>
          <p className="text-gray-500 mt-1">
            Задайте разрешените дни за доставка за всеки ресторант
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedRestaurant || ''}
            onChange={(e) => setSelectedRestaurant(e.target.value || null)}
            className="input text-sm"
          >
            <option value="">Изберете шаблон...</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={applyToAll}
            disabled={!selectedRestaurant || saving === 'all'}
            className="btn btn-secondary text-sm whitespace-nowrap"
          >
            {saving === 'all' ? 'Запазване...' : 'Приложи към всички'}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Как работи:</p>
          <p>Когато ресторант създава поръчка, ще може да избира само от разрешените дни за доставка. 
          Можете да зададете различни дни за всеки ресторант или да приложите един график към всички.</p>
        </div>
      </div>

      {/* Restaurants list */}
      <div className="space-y-4">
        {restaurants.map(restaurant => {
          const schedule = getScheduleForRestaurant(restaurant.id)
          const isExpanded = selectedRestaurant === restaurant.id
          
          return (
            <div 
              key={restaurant.id} 
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Restaurant info */}
                <div className="flex items-center gap-3 lg:w-48 flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-aladin-green/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-aladin-green" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                    <p className="text-xs text-gray-500">{restaurant.code}</p>
                  </div>
                </div>

                {/* Days selection */}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">Разрешени дни:</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(restaurant.id, day.value)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${schedule.allowed_days.includes(day.value)
                            ? 'bg-aladin-green text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }
                        `}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Min/Max days */}
                <div className="flex gap-4 lg:w-64 flex-shrink-0">
                  <div>
                    <label className="text-xs text-gray-500">Мин. дни напред</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={schedule.min_days_ahead}
                      onChange={(e) => updateScheduleField(restaurant.id, 'min_days_ahead', parseInt(e.target.value) || 0)}
                      className="input w-20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Макс. дни напред</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={schedule.max_days_ahead}
                      onChange={(e) => updateScheduleField(restaurant.id, 'max_days_ahead', parseInt(e.target.value) || 14)}
                      className="input w-20 text-sm"
                    />
                  </div>
                </div>

                {/* Save button */}
                <button
                  onClick={() => saveSchedule(restaurant.id)}
                  disabled={saving === restaurant.id}
                  className="btn btn-primary flex items-center gap-2 lg:self-center"
                >
                  {saving === restaurant.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Запазване...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Запази
                    </>
                  )}
                </button>
              </div>

              {/* Blocked dates (expandable) */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Блокирани дати:</span>
                  {schedule.blocked_dates.length === 0 ? (
                    <span className="text-sm text-gray-400">Няма</span>
                  ) : (
                    schedule.blocked_dates.map(date => (
                      <span 
                        key={date}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm"
                      >
                        {new Date(date).toLocaleDateString('bg-BG')}
                        <button 
                          onClick={() => removeBlockedDate(restaurant.id, date)}
                          className="hover:text-red-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={newBlockedDate}
                      onChange={(e) => setNewBlockedDate(e.target.value)}
                      className="input text-sm py-1"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <button
                      onClick={() => addBlockedDate(restaurant.id)}
                      disabled={!newBlockedDate}
                      className="p-1 text-aladin-green hover:bg-aladin-green/10 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DeliverySchedulePage
