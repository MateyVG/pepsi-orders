import React, { useEffect, useState } from 'react'
import { 
  Mail, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  Info,
  AtSign
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const EmailSettingsPage: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [primaryRecipients, setPrimaryRecipients] = useState<string[]>([])
  const [ccRecipients, setCcRecipients] = useState<string[]>([])
  const [newPrimaryEmail, setNewPrimaryEmail] = useState('')
  const [newCcEmail, setNewCcEmail] = useState('')

  useEffect(() => {
    fetchEmailSettings()
  }, [])

  const fetchEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore "no rows returned"

      if (data) {
        setPrimaryRecipients(data.primary_recipients || [])
        setCcRecipients(data.cc_recipients || [])
      } else {
        // Default values
        setPrimaryRecipients(['foods_op@aladin.bg'])
        setCcRecipients(['matey.georgiev@aladin.bg'])
      }
    } catch (error) {
      console.error('Error fetching email settings:', error)
      toast.error('Грешка при зареждане на настройките')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('email_settings')
        .select('id')
        .single()

      if (existing) {
        // Update
        const { error } = await supabase
          .from('email_settings')
          .update({
            primary_recipients: primaryRecipients,
            cc_recipients: ccRecipients,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('email_settings')
          .insert({
            primary_recipients: primaryRecipients,
            cc_recipients: ccRecipients,
            updated_by: user?.id
          })

        if (error) throw error
      }

      toast.success('Настройките са запазени')
    } catch (error) {
      console.error('Error saving email settings:', error)
      toast.error('Грешка при запазване')
    } finally {
      setSaving(false)
    }
  }

  const addPrimaryRecipient = () => {
    if (!newPrimaryEmail) return
    if (!newPrimaryEmail.includes('@')) {
      toast.error('Невалиден имейл адрес')
      return
    }
    if (primaryRecipients.includes(newPrimaryEmail)) {
      toast.error('Този имейл вече е добавен')
      return
    }
    setPrimaryRecipients([...primaryRecipients, newPrimaryEmail])
    setNewPrimaryEmail('')
  }

  const removePrimaryRecipient = (email: string) => {
    setPrimaryRecipients(primaryRecipients.filter(e => e !== email))
  }

  const addCcRecipient = () => {
    if (!newCcEmail) return
    if (!newCcEmail.includes('@')) {
      toast.error('Невалиден имейл адрес')
      return
    }
    if (ccRecipients.includes(newCcEmail)) {
      toast.error('Този имейл вече е добавен')
      return
    }
    setCcRecipients([...ccRecipients, newCcEmail])
    setNewCcEmail('')
  }

  const removeCcRecipient = (email: string) => {
    setCcRecipients(ccRecipients.filter(e => e !== email))
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            Имейл настройки
          </h1>
          <p className="text-gray-500 mt-1">
            Конфигуриране на получатели за имейл известия при нова заявка
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Запази настройките
        </button>
      </div>

      {/* Info Box */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-aladin-green mt-0.5" />
          <div>
            <p className="font-medium text-aladin-green">Как работят имейл известията?</p>
            <p className="text-sm text-gray-600 mt-1">
              Когато ресторант изпрати заявка, автоматично се изпраща имейл до всички 
              основни получатели, а получателите в копие (CC) получават копие от съобщението.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Recipients */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-aladin-green" />
              <h2 className="font-semibold text-gray-800">Основни получатели (To)</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Тези имейли ще получават заявките директно
            </p>
          </div>

          <div className="p-4 space-y-3">
            {primaryRecipients.map((email) => (
              <div 
                key={email}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{email}</span>
                </div>
                <button
                  onClick={() => removePrimaryRecipient(email)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="email"
                value={newPrimaryEmail}
                onChange={(e) => setNewPrimaryEmail(e.target.value)}
                placeholder="Добави нов имейл..."
                className="input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addPrimaryRecipient()}
              />
              <button
                onClick={addPrimaryRecipient}
                className="btn-primary px-4"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* CC Recipients */}
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-pepsi-blue" />
              <h2 className="font-semibold text-gray-800">Копие до (CC)</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Тези имейли ще получават копие от заявките
            </p>
          </div>

          <div className="p-4 space-y-3">
            {ccRecipients.map((email) => (
              <div 
                key={email}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AtSign className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{email}</span>
                </div>
                <button
                  onClick={() => removeCcRecipient(email)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="email"
                value={newCcEmail}
                onChange={(e) => setNewCcEmail(e.target.value)}
                placeholder="Добави нов имейл..."
                className="input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addCcRecipient()}
              />
              <button
                onClick={addCcRecipient}
                className="btn-secondary px-4"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Code Location Info */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-2">📁 Местоположение в кода</h3>
        <p className="text-sm text-gray-600">
          Имейл настройките могат да се променят и директно във файла:
        </p>
        <code className="block mt-2 p-3 bg-gray-100 rounded-lg text-sm font-mono">
          src/lib/email.ts
        </code>
        <p className="text-sm text-gray-500 mt-2">
          Там ще намерите константите <code className="bg-gray-100 px-1 rounded">PRIMARY_RECIPIENTS</code> и{' '}
          <code className="bg-gray-100 px-1 rounded">CC_RECIPIENTS</code>
        </p>
      </div>
    </div>
  )
}

export default EmailSettingsPage
