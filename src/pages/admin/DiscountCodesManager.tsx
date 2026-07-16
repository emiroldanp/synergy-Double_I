import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAdminApi } from '@/hooks/useAdminApi'

type DiscountType = 'percentage' | 'fixed'

interface DiscountCode {
  id: string
  code: string
  type: DiscountType
  value: number
  minAmount: number | null
  usageLimit: number | null
  usageCount: number
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

const EMPTY_FORM = {
  code: '',
  type: 'percentage' as DiscountType,
  value: '',
  minAmount: '',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
}

export default function DiscountCodesManager() {
  const { apiFetch } = useAdminApi()
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: DiscountCode[] }>('/api/admin/discount-codes')
      setCodes(res.data)
    } catch {
      setError('Error al cargar códigos')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  const openNew = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (c: DiscountCode) => {
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minAmount: c.minAmount != null ? String(c.minAmount) : '',
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    })
    setEditing(c.id)
    setFormError(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    setFormError(null)
    if (!form.code || !form.value || Number(form.value) <= 0) {
      setFormError('Código y valor son obligatorios (el valor debe ser mayor a 0)')
      return
    }
    if (form.type === 'percentage' && Number(form.value) > 100) {
      setFormError('El porcentaje no puede exceder 100%')
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        minAmount: form.minAmount ? Number(form.minAmount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: form.isActive,
      }
      if (editing) {
        await apiFetch(`/api/admin/discount-codes/${editing}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch('/api/admin/discount-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      fetchCodes()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (code: DiscountCode) => {
    try {
      await apiFetch(`/api/admin/discount-codes/${code.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !code.isActive }),
      })
      fetchCodes()
    } catch {
      setError('Error al actualizar código')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este código de descuento?')) return
    try {
      await apiFetch(`/api/admin/discount-codes/${id}`, { method: 'DELETE' })
      fetchCodes()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar código')
    }
  }

  const formatValue = (code: DiscountCode) =>
    code.type === 'percentage' ? `${code.value}%` : `$${Number(code.value).toFixed(2)}`

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

  return (
    <>
      <Helmet>
        <title>Códigos de Descuento — Double-I Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Barra de herramientas */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{codes.length} código{codes.length !== 1 ? 's' : ''}</p>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nuevo código
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {editing ? 'Editar código' : 'Nuevo código'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Código</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="PROMO10"
                  className={`${inputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
                  className={inputClass}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Valor {form.type === 'percentage' ? '(%)' : '(MXN)'}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'percentage' ? '10' : '50.00'}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Monto mínimo de compra (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                  placeholder="200.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Límite de usos (opcional)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="50"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de expiración (opcional)</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <label className="text-sm text-gray-700 font-medium">Activo</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    form.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                      form.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500">{form.isActive ? 'Sí' : 'No'}</span>
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-sm text-red-600">{formError}</p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-blue-600" />
            </div>
          ) : codes.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-400 text-sm">
              Sin códigos de descuento aún. Crea el primero con el botón de arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Código', 'Tipo', 'Valor', 'Usos', 'Expiración', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{code.code}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatValue(code)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.usageCount}{code.usageLimit != null ? ` / ${code.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(code)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            code.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {code.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(code)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
