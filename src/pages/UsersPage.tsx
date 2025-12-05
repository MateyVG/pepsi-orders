import React, { useEffect, useState } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Users,
  Save,
  X,
  Loader2,
  Mail,
  Building2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { User, Restaurant } from '../types'
import toast from 'react-hot-toast'

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'restaurant' as 'restaurant' | 'admin' | 'supplier',
    restaurant_id: '',
    is_active: true
  })

  useEffect(() => {
    fetchUsers()
    fetchRestaurants()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          restaurants (name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const usersWithRestaurant = data?.map(u => ({
        ...u,
        restaurant_name: u.restaurants?.name
      })) || []
      
      setUsers(usersWithRestaurant)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Грешка при зареждане на потребителите')
    } finally {
      setLoading(false)
    }
  }

  const fetchRestaurants = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setRestaurants(data || [])
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      restaurant_id: user.restaurant_id || '',
      is_active: user.is_active
    })
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'restaurant',
      restaurant_id: '',
      is_active: true
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      toast.error('Моля, попълнете задължителните полета')
      return
    }

    if (!editingUser && !formData.password) {
      toast.error('Моля, въведете парола за новия потребител')
      return
    }

    if (formData.role === 'restaurant' && !formData.restaurant_id) {
      toast.error('Моля, изберете ресторант')
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        // Update existing user
        const updateData: Record<string, unknown> = {
          name: formData.name,
          role: formData.role,
          restaurant_id: formData.role === 'restaurant' ? formData.restaurant_id : null,
          is_active: formData.is_active
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id)

        if (error) throw error
        toast.success('Потребителят е обновен')
      } else {
        // Create new user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (authError) throw authError

        // Create user record
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_id: authData.user?.id,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            restaurant_id: formData.role === 'restaurant' ? formData.restaurant_id : null,
            is_active: formData.is_active
          })

        if (userError) throw userError
        toast.success('Потребителят е създаден')
      }

      setShowModal(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      toast.error(error.message || 'Грешка при запазване')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${user.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error
      toast.success('Потребителят е изтрит')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Грешка при изтриване')
    }
  }

  const toggleActive = async (user: User) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.is_active })
        .eq('id', user.id)

      if (error) throw error
      toast.success(user.is_active ? 'Потребителят е деактивиран' : 'Потребителят е активиран')
      fetchUsers()
    } catch (error) {
      console.error('Error toggling user:', error)
      toast.error('Грешка при обновяване')
    }
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      restaurant: 'bg-blue-100 text-green-800',
      supplier: 'bg-green-100 text-green-800'
    }
    const labels: Record<string, string> = {
      admin: 'Администратор',
      restaurant: 'Ресторант',
      supplier: 'Доставчик'
    }
    return <span className={`badge ${styles[role]}`}>{labels[role]}</span>
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Управление на потребители
          </h1>
          <p className="text-gray-500 mt-1">
            Създаване и управление на потребителски акаунти
          </p>
        </div>

        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Добави потребител
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
            placeholder="Търси по име или имейл..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Име</th>
                <th>Имейл</th>
                <th>Роля</th>
                <th>Ресторант</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="loading-spinner mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Няма намерени потребители
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                    <td className="font-medium">{user.name}</td>
                    <td className="text-gray-600">{user.email}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{user.restaurant_name || '-'}</td>
                    <td>
                      <button
                        onClick={() => toggleActive(user)}
                        className={`badge cursor-pointer ${user.is_active ? 'badge-success' : 'badge-error'}`}
                      >
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-aladin-green hover:bg-blue-50 rounded-lg"
                          title="Редактирай"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Изтрий"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-aladin-green" />
                <h3 className="font-semibold text-lg">
                  {editingUser ? 'Редактирай потребител' : 'Добави нов потребител'}
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
              <div className="form-group">
                <label className="form-label">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Имейл *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="user@aladin.bg"
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Парола *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Име *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Иван Иванов"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Роля *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="input"
                >
                  <option value="restaurant">Ресторант (може да прави заявки)</option>
                  <option value="admin">Администратор (пълен достъп)</option>
                  <option value="supplier">Доставчик (Pepsi - вижда заявките)</option>
                </select>
              </div>

              {formData.role === 'restaurant' && (
                <div className="form-group">
                  <label className="form-label">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Ресторант *
                  </label>
                  <select
                    value={formData.restaurant_id}
                    onChange={(e) => setFormData({ ...formData, restaurant_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Избери ресторант...</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm">Активен потребител</label>
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
                {editingUser ? 'Запази' : 'Създай'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
