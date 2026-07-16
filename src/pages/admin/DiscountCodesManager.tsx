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
    } catch {
      setError('Error al eliminar código')
    }
  }

  const formatValue = (code: DiscountCode) =>
    code.type === 'percentage' ? `${code.value}%` : `$${Number(code.value).toFixed(2)}`

  return (
    <>
      <Helmet>
        <title>Códigos de Descuento — Double-I Admin</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="section-subtitle mb-1">Panel de administración</p>
              <h1 className="section-title">Códigos de Descuento</h1>
            </div>
            <button onClick={openNew} className="btn-primary text-xs px-4 py-2">
              + Nuevo código
            </button>
          </div>

          {/* Formulario inline */}
          {showForm && (
            <div className="bg-deep border border-navy/40 p-6 mb-8">
              <h2 className="font-agency text-white uppercase tracking-wider text-base mb-5">
                {editing ? 'Editar código' : 'Nuevo código'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">Código</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="PROMO10"
                    className="input-dark uppercase"
                  />
                </div>
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as DiscountType })}
                    className="input-dark cursor-pointer"
                  >
                    <option value="percentage" className="bg-abyss">Porcentaje (%)</option>
                    <option value="fixed" className="bg-abyss">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                    Valor {form.type === 'percentage' ? '(%)' : '(MXN)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percentage' ? '10' : '50.00'}
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                    Monto mínimo de compra (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minAmount}
                    onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                    placeholder="200.00"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                    Límite de usos (opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="50"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                    Fecha de expiración (opcional)
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="input-dark"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${form.isActive ? 'bg-dragon' : 'bg-navy/60'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="font-agency text-xs text-ash uppercase tracking-wider">
                    {form.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              {formError && <p className="text-xs text-crimson mt-3">{formError}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="btn-ghost text-sm px-4 py-2">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2 disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-dragon" />
            </div>
          ) : error ? (
            <p className="text-crimson font-exo text-sm">{error}</p>
          ) : codes.length === 0 ? (
            <div className="bg-deep border border-navy/40 p-12 text-center">
              <p className="font-agency text-ash uppercase tracking-wider text-sm">Sin códigos de descuento aún</p>
              <p className="font-exo text-ash/60 text-xs mt-2">Crea el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="bg-deep border border-navy/40 overflow-x-auto">
              <table className="w-full text-xs font-exo">
                <thead>
                  <tr className="border-b border-navy/40">
                    {['Código', 'Tipo', 'Valor', 'Usos', 'Expiración', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="text-left font-agency text-ash uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-b border-navy/20 hover:bg-abyss/50 transition-colors">
                      <td className="px-4 py-3 font-agency text-dragon">{code.code}</td>
                      <td className="px-4 py-3 text-ash">
                        {code.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                      </td>
                      <td className="px-4 py-3 text-white font-agency">{formatValue(code)}</td>
                      <td className="px-4 py-3 text-ash">
                        {code.usageCount}{code.usageLimit != null ? ` / ${code.usageLimit}` : ''}
                      </td>
                      <td className="px-4 py-3 text-ash">
                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('es-MX') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(code)}
                          className={`font-agency text-xs uppercase tracking-wider px-2 py-1 border ${
                            code.isActive
                              ? 'border-dragon/40 text-dragon bg-dragon/10'
                              : 'border-navy/40 text-ash bg-navy/10'
                          }`}
                        >
                          {code.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(code)}
                            className="font-agency text-xs text-frost hover:text-white uppercase tracking-wider"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="font-agency text-xs text-crimson/70 hover:text-crimson uppercase tracking-wider"
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
