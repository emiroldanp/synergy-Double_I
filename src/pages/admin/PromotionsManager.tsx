import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import type { Promotion, Category } from '@/types'
import { useAdminApi } from '@/hooks/useAdminApi'

const EMPTY_PROMOTION: Omit<Promotion, 'id'> = {
  badgeLabel: 'Oferta especial',
  title: '',
  description: '',
  ctaHref: '/catalogo',
  isActive: true,
  type: null,
  categoryId: null,
  value: null,
  minAmount: null,
  startsAt: null,
  endsAt: null,
}

const TYPE_LABELS: Record<string, string> = {
  free_shipping: 'Envío gratis',
  percentage_off: '% de descuento',
  fixed_off: 'Monto fijo de descuento',
}

export default function PromotionsManager() {
  const { apiFetch } = useAdminApi()

  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    apiFetch<{ data: Category[] }>('/api/products/categories')
      .then((res) => setCategories(res.data))
      .catch(() => { /* si falla, el selector de categoría queda vacío — no bloquea el resto del form */ })
  }, [apiFetch])

  const fetchPromotions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: Promotion[] }>('/api/admin/promotions')
      setPromotions(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar promociones')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  const openNew = () => {
    setEditing({ id: '', ...EMPTY_PROMOTION })
    setIsNew(true)
  }

  const openEdit = (promo: Promotion) => {
    setEditing({ ...promo })
    setIsNew(false)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      if (isNew) {
        const { id: _, ...payload } = editing
        await apiFetch('/api/admin/promotions', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await apiFetch(`/api/admin/promotions/${editing.id}`, { method: 'PATCH', body: JSON.stringify(editing) })
      }
      setEditing(null)
      fetchPromotions()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const deletePromotion = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return
    try {
      await apiFetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
      fetchPromotions()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const toggleActive = async (promo: Promotion) => {
    try {
      await apiFetch(`/api/admin/promotions/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !promo.isActive }),
      })
      fetchPromotions()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  const move = async (id: string, dir: -1 | 1) => {
    const i = promotions.findIndex((p) => p.id === id)
    if (i + dir < 0 || i + dir >= promotions.length) return
    const swapped = [...promotions]
    ;[swapped[i], swapped[i + dir]] = [swapped[i + dir], swapped[i]]
    try {
      await Promise.all([
        apiFetch(`/api/admin/promotions/${swapped[i].id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i }) }),
        apiFetch(`/api/admin/promotions/${swapped[i + dir].id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i + dir }) }),
      ])
      fetchPromotions()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reordenar')
    }
  }

  return (
    <>
      <Helmet>
        <title>Gestión de Promociones — Admin</title>
      </Helmet>

      <div className="pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Promociones de la homepage</h1>
            <p className="text-gray-500 text-sm">
              Administra las tarjetas de promoción debajo del hero. Las que tengan un
              tipo de regla (envío gratis o descuento) se aplican solas en el
              checkout — nunca se combinan entre sí ni con un código de descuento.
            </p>
          </div>
          <button onClick={openNew} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
            + Nueva promoción
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20 border border-gray-200 rounded-lg bg-white">
            <p className="text-gray-500 uppercase text-sm tracking-wider mb-4">Sin promociones</p>
            <button onClick={openNew} className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Crear primera promoción
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo, i) => (
              <div
                key={promo.id}
                className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                  promo.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 rounded px-2 py-0.5 mb-1">
                    {promo.badgeLabel}
                  </span>
                  {promo.type && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 mb-1 ml-1">
                      {TYPE_LABELS[promo.type]}
                      {promo.minAmount ? ` desde $${promo.minAmount}` : ''}
                    </span>
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate">{promo.title || '(Sin título)'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{promo.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Enlace: {promo.ctaHref}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => move(promo.id, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className="w-7 h-7 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-colors flex items-center justify-center rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(promo.id, 1)}
                    disabled={i === promotions.length - 1}
                    aria-label="Bajar"
                    className="w-7 h-7 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-colors flex items-center justify-center rounded"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(promo)}
                    className={`text-xs px-3 py-1 border rounded transition-colors ${
                      promo.isActive
                        ? 'border-green-500 text-green-600 hover:bg-green-50'
                        : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {promo.isActive ? 'Activa' : 'Inactiva'}
                  </button>
                  <button
                    onClick={() => openEdit(promo)}
                    className="text-xs px-3 py-1 border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deletePromotion(promo.id)}
                    className="text-xs px-3 py-1 border border-red-300 text-red-500 hover:border-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setEditing(null)} />
          <div className="relative bg-abyss border border-navy/60 w-full max-w-lg p-6 z-10">
            <h2 className="font-agency text-white text-lg uppercase tracking-wider mb-5">
              {isNew ? 'Nueva promoción' : 'Editar promoción'}
            </h2>

            <div className="space-y-4">
              {[
                { label: 'Etiqueta (badge)', field: 'badgeLabel', placeholder: '−15% u OFERTA ESPECIAL' },
                { label: 'Título', field: 'title', placeholder: '¡Semana Pokémon!' },
                { label: 'Descripción', field: 'description', placeholder: 'Descripción breve de la promo' },
                { label: 'Enlace del botón "Ver"', field: 'ctaHref', placeholder: '/catalogo' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={(editing as unknown as Record<string, string>)[field]}
                    onChange={(e) =>
                      setEditing((prev) => prev && ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="input-dark w-full text-sm"
                  />
                </div>
              ))}

              <div className="border-t border-navy/40 pt-4">
                <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                  Tipo de promoción
                </label>
                <select
                  value={editing.type ?? ''}
                  onChange={(e) => {
                    const type = (e.target.value || null) as Promotion['type']
                    setEditing((prev) => prev && ({
                      ...prev,
                      type,
                      // Envío gratis nunca es por categoría — se limpia si cambian el tipo
                      categoryId: type === 'free_shipping' ? null : prev.categoryId,
                      value: type === 'free_shipping' ? null : prev.value,
                    }))
                  }}
                  className="input-dark w-full text-sm cursor-pointer"
                >
                  <option value="">Solo banner (visual)</option>
                  <option value="free_shipping">Envío gratis</option>
                  <option value="percentage_off">% de descuento</option>
                  <option value="fixed_off">Monto fijo de descuento</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {editing.type
                    ? 'Esta promoción se aplicará sola en el checkout — no se puede combinar con un código de descuento.'
                    : 'Solo se muestra como anuncio — no aplica ningún descuento.'}
                </p>
              </div>

              {editing.type && editing.type !== 'free_shipping' && (
                <>
                  <div>
                    <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                      Aplica a
                    </label>
                    <select
                      value={editing.categoryId ?? ''}
                      onChange={(e) =>
                        setEditing((prev) => prev && ({ ...prev, categoryId: e.target.value || null }))
                      }
                      className="input-dark w-full text-sm cursor-pointer"
                    >
                      <option value="">Todo el carrito</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                      Valor ({editing.type === 'percentage_off' ? '%' : '$ MXN'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={editing.type === 'percentage_off' ? 100 : undefined}
                      value={editing.value ?? ''}
                      onChange={(e) =>
                        setEditing((prev) => prev && ({ ...prev, value: e.target.value ? Number(e.target.value) : null }))
                      }
                      className="input-dark w-full text-sm"
                    />
                  </div>
                </>
              )}

              {editing.type && (
                <>
                  <div>
                    <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                      Monto mínimo de compra (opcional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editing.minAmount ?? ''}
                      placeholder="3500"
                      onChange={(e) =>
                        setEditing((prev) => prev && ({ ...prev, minAmount: e.target.value ? Number(e.target.value) : null }))
                      }
                      className="input-dark w-full text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                        Vigencia desde (opcional)
                      </label>
                      <input
                        type="date"
                        value={editing.startsAt ? editing.startsAt.slice(0, 10) : ''}
                        onChange={(e) =>
                          setEditing((prev) => prev && ({ ...prev, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))
                        }
                        className="input-dark w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                        Vigencia hasta (opcional)
                      </label>
                      <input
                        type="date"
                        value={editing.endsAt ? editing.endsAt.slice(0, 10) : ''}
                        onChange={(e) =>
                          setEditing((prev) => prev && ({ ...prev, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))
                        }
                        className="input-dark w-full text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing((prev) => prev && ({ ...prev, isActive: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="font-agency text-xs text-ash uppercase tracking-wider">Activa</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="btn-secondary flex-1 text-sm py-2.5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
