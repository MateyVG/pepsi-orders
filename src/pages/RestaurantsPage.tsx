import React, { useEffect, useState } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Building2,
  Save,
  X,
  Loader2,
  MapPin,
  Phone
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Restaurant } from '../types'
import toast from 'react-hot-toast'

const RestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    is_active: true
  })

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name')

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      toast.error('Грешка при зареждане на ресторантите')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setFormData({
      name: restaurant.name,
      code: restaurant.code,
      address: restaurant.address || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      is_active: restaurant.is_active
    })
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingRestaurant(null)
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      is_active: true
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Моля, попълнете задължителните полета')
      return
    }

    setSaving(true)
    try {
      const restaurantData = {
        name: formData.name,
        code: formData.code,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        is_active: formData.is_active
      }

      if (editingRestaurant) {
        const { error } = await supabase
          .from('restaurants')
          .update(restaurantData)
          .eq('id', editingRestaurant.id)

        if (error) throw error
        toast.success('Ресторантът е обновен')
      } else {
        const { error } = await supabase
          .from('restaurants')
          .insert(restaurantData)

        if (error) throw error
        toast.success('Ресторантът е добавен')
      }

      setShowModal(false)
      fetchRestaurants()
    } catch (error: any) {
      console.error('Error saving restaurant:', error)
      toast.error(error.message || 'Грешка при запазване')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (restaurant: Restaurant) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${restaurant.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurant.id)

      if (error) throw error
      toast.success('Ресторантът е изтрит')
      fetchRestaurants()
    } catch (error) {
      console.error('Error deleting restaurant:', error)
      toast.error('Грешка при изтриване')
    }
  }

  const toggleActive = async (restaurant: Restaurant) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !restaurant.is_active })
        .eq('id', restaurant.id)

      if (error) throw error
      toast.success(restaurant.is_active ? 'Ресторантът е деактивиран' : 'Ресторантът е активиран')
      fetchRestaurants()
    } catch (error) {
      console.error('Error toggling restaurant:', error)
      toast.error('Грешка при обновяване')
    }
  }

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Управление на ресторанти
          </h1>
          <p className="text-gray-500 mt-1">
            Добавяне и управление на ресторанти от веригата
          </p>
        </div>

        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Добави ресторант
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Търси по име или код..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Няма намерени ресторанти
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <div 
              key={restaurant.id} 
              className={`card p-5 ${!restaurant.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-aladin-green to-pepsi-blue flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{restaurant.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{restaurant.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(restaurant)}
                  className={`badge cursor-pointer ${restaurant.is_active ? 'badge-success' : 'badge-error'}`}
                >
                  {restaurant.is_active ? 'Активен' : 'Неактивен'}
                </button>
              </div>

              {restaurant.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                  <span>{restaurant.address}</span>
                </div>
              )}

              {restaurant.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{restaurant.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(restaurant)}
                  className="btn-outline flex-1 py-2 text-sm flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                  Редактирай
                </button>
                <button
                  onClick={() => handleDelete(restaurant)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Изтрий"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-aladin-green" />
                <h3 className="font-semibold text-lg">
                  {editingRestaurant ? 'Редактирай ресторант' : 'Добави нов ресторант'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2 sm:col-span-1">
                  <label className="form-label">Име *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Aladin Foods - Център"
                  />
                </div>
                <div className="form-group col-span-2 sm:col-span-1">
                  <label className="form-label">Код *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input"
                    placeholder="AF001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Адрес</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  placeholder="бул. Витоша 100, София"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Телефон</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input"
                    placeholder="02 123 4567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Имейл</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="restaurant@aladin.bg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm">Активен ресторант</label>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline flex-1"
              >
                Отказ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {editingRestaurant ? 'Запази' : 'Добави'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantsPage
