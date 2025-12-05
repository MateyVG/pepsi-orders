import React, { useEffect, useState } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Package,
  Save,
  X,
  Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product } from '../types'
import toast from 'react-hot-toast'

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    price_per_stack: '',
    items_per_stack: '12',
    unit: 'стек',
    is_active: true,
    sort_order: '0'
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      code: product.code,
      name: product.name,
      category: product.category || '',
      price_per_stack: product.price_per_stack.toString(),
      items_per_stack: product.items_per_stack.toString(),
      unit: product.unit,
      is_active: product.is_active,
      sort_order: product.sort_order.toString()
    })
    setShowModal(true)
  }

  const handleAdd = () => {
    setEditingProduct(null)
    setFormData({
      code: '',
      name: '',
      category: '',
      price_per_stack: '',
      items_per_stack: '12',
      unit: 'стек',
      is_active: true,
      sort_order: '0'
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.price_per_stack) {
      toast.error('Моля, попълнете задължителните полета')
      return
    }

    setSaving(true)
    try {
      const productData = {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        price_per_stack: parseFloat(formData.price_per_stack),
        items_per_stack: parseInt(formData.items_per_stack),
        unit: formData.unit,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order)
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Артикулът е обновен')
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData)

        if (error) throw error
        toast.success('Артикулът е добавен')
      }

      setShowModal(false)
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error('Грешка при запазване')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете "${product.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

      if (error) throw error
      toast.success('Артикулът е изтрит')
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Грешка при изтриване')
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      toast.success(product.is_active ? 'Артикулът е деактивиран' : 'Артикулът е активиран')
      fetchProducts()
    } catch (error) {
      console.error('Error toggling product:', error)
      toast.error('Грешка при обновяване')
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Управление на артикули
          </h1>
          <p className="text-gray-500 mt-1">
            Добавяне, редактиране и премахване на Pepsi продукти
          </p>
        </div>

        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Добави артикул
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
            placeholder="Търси по код, име или категория..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Име</th>
                <th>Категория</th>
                <th>Цена/стек</th>
                <th>Бр. в стек</th>
                <th>Статус</th>
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
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Няма намерени артикули
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className={!product.is_active ? 'opacity-50' : ''}>
                    <td className="font-mono text-sm">{product.code}</td>
                    <td className="font-medium">{product.name}</td>
                    <td>
                      <span className="badge badge-info">{product.category}</span>
                    </td>
                    <td className="font-semibold">{product.price_per_stack.toFixed(2)} лв.</td>
                    <td>{product.items_per_stack} бр.</td>
                    <td>
                      <button
                        onClick={() => toggleActive(product)}
                        className={`badge cursor-pointer ${product.is_active ? 'badge-success' : 'badge-error'}`}
                      >
                        {product.is_active ? 'Активен' : 'Неактивен'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-aladin-green hover:bg-blue-50 rounded-lg"
                          title="Редактирай"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
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
                <Package className="w-6 h-6 text-aladin-green" />
                <h3 className="font-semibold text-lg">
                  {editingProduct ? 'Редактирай артикул' : 'Добави нов артикул'}
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
                <div className="form-group">
                  <label className="form-label">Код *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input"
                    placeholder="123456"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Категория</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    placeholder="Пепси 0.5л"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Име на артикула *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="ПЕПСИ КОЛА 0.500 Л (12 броя в стек)"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Цена/стек *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price_per_stack}
                    onChange={(e) => setFormData({ ...formData, price_per_stack: e.target.value })}
                    className="input"
                    placeholder="15.55"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Бр. в стек</label>
                  <input
                    type="number"
                    value={formData.items_per_stack}
                    onChange={(e) => setFormData({ ...formData, items_per_stack: e.target.value })}
                    className="input"
                    placeholder="12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ред</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="input"
                    placeholder="0"
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
                <label htmlFor="is_active" className="text-sm">Активен артикул</label>
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
                {editingProduct ? 'Запази' : 'Добави'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsPage
