import { useState, useEffect, useCallback, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import type { BannerSlide } from '@/types'
import { useAdminApi } from '@/hooks/useAdminApi'
import { compressImageForUpload } from '@/lib/imageCompression'

const EMPTY_SLIDE: Omit<BannerSlide, 'id'> = {
  imageUrl: '',
  imageUrlMobile: '',
  title: '',
  subtitle: '',
  ctaLabel: 'Ver ahora',
  ctaHref: '/catalogo',
  isActive: true,
}

export default function BannerManager() {
  const { apiFetch } = useAdminApi()

  const [slides, setSlides] = useState<BannerSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<BannerSlide | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'imageUrl' | 'imageUrlMobile' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputMobileRef = useRef<HTMLInputElement>(null)

  const fetchSlides = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: BannerSlide[] }>('/api/admin/banners')
      setSlides(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar banners')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { fetchSlides() }, [fetchSlides])

  const openNew = () => {
    setEditing({ id: '', ...EMPTY_SLIDE })
    setIsNew(true)
  }

  const openEdit = (slide: BannerSlide) => {
    setEditing({ ...slide })
    setIsNew(false)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      if (isNew) {
        const { id: _, ...payload } = editing
        await apiFetch('/api/admin/banners', { method: 'POST', body: JSON.stringify(payload) })
      } else {
        await apiFetch(`/api/admin/banners/${editing.id}`, { method: 'PATCH', body: JSON.stringify(editing) })
      }
      setEditing(null)
      fetchSlides()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const deleteSlide = async (id: string) => {
    if (!confirm('¿Eliminar este slide?')) return
    try {
      await apiFetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
      fetchSlides()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const toggleActive = async (slide: BannerSlide) => {
    try {
      await apiFetch(`/api/admin/banners/${slide.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !slide.isActive }),
      })
      fetchSlides()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  // El backend acepta hasta 10mb de JSON; en base64 eso equivale a ~7mb de archivo original.
  const MAX_UPLOAD_BYTES = 7 * 1024 * 1024

  const handleFileUpload = async (file: File, field: 'imageUrl' | 'imageUrlMobile') => {
    setUploading(field)
    try {
      // Redimensiona/recomprime en el navegador antes de subir — evita banners
      // pesados sin optimizar y reduce el riesgo de topar el límite del backend.
      const optimized = await compressImageForUpload(file)

      if (optimized.size > MAX_UPLOAD_BYTES) {
        alert(
          `La imagen pesa ${(optimized.size / (1024 * 1024)).toFixed(1)}MB incluso después de optimizarla y el máximo permitido es 7MB. Prueba con una imagen de menor resolución.`
        )
        return
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(optimized)
      })
      const res = await apiFetch<{ url: string }>('/api/admin/banners/upload-image', {
        method: 'POST',
        body: JSON.stringify({ base64, mimeType: optimized.type }),
      })
      setEditing((prev) => prev && ({ ...prev, [field]: res.url }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(null)
    }
  }

  const move = async (id: string, dir: -1 | 1) => {
    const i = slides.findIndex((s) => s.id === id)
    if (i + dir < 0 || i + dir >= slides.length) return
    const swapped = [...slides]
    ;[swapped[i], swapped[i + dir]] = [swapped[i + dir], swapped[i]]
    // Actualizar sortOrder de los dos slides intercambiados
    try {
      await Promise.all([
        apiFetch(`/api/admin/banners/${swapped[i].id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i }) }),
        apiFetch(`/api/admin/banners/${swapped[i + dir].id}`, { method: 'PATCH', body: JSON.stringify({ sortOrder: i + dir }) }),
      ])
      fetchSlides()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reordenar')
    }
  }

  return (
    <>
      <Helmet>
        <title>Gestión de Banners — Admin</title>
      </Helmet>

      <div className="pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Banners del Hero</h1>
            <p className="text-gray-500 text-sm">
              Administra los slides del banner principal de la homepage.
            </p>
          </div>
          <button onClick={openNew} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            + Nuevo slide
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
        ) : slides.length === 0 ? (
          <div className="text-center py-20 border border-gray-200 rounded-lg bg-white">
            <p className="text-gray-500 uppercase text-sm tracking-wider mb-4">Sin slides</p>
            <button onClick={openNew} className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Crear primer slide
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                  slide.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
                }`}
              >
                <div className="w-24 h-14 bg-gray-100 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 uppercase">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{slide.title || '(Sin título)'}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{slide.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-0.5">CTA: {slide.ctaLabel} → {slide.ctaHref}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => move(slide.id, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className="w-7 h-7 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-colors flex items-center justify-center rounded"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(slide.id, 1)}
                    disabled={i === slides.length - 1}
                    aria-label="Bajar"
                    className="w-7 h-7 border border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 disabled:opacity-30 transition-colors flex items-center justify-center rounded"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(slide)}
                    className={`text-xs px-3 py-1 border rounded transition-colors ${
                      slide.isActive
                        ? 'border-green-500 text-green-600 hover:bg-green-50'
                        : 'border-gray-300 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {slide.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => openEdit(slide)}
                    className="text-xs px-3 py-1 border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteSlide(slide.id)}
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
              {isNew ? 'Nuevo slide' : 'Editar slide'}
            </h2>

            <div className="space-y-4">
              {/* Imagen desktop — upload desde computadora o URL manual */}
              <div>
                <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                  Imagen del banner (desktop)
                </label>
                {editing.imageUrl && (
                  <div className="mb-2 relative w-full h-28 border border-navy/40 overflow-hidden">
                    <img
                      src={editing.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading !== null}
                    className="font-agency text-xs px-4 py-2 border border-navy/50 text-ash hover:text-white hover:border-white/40 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {uploading === 'imageUrl' ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                  <input
                    type="text"
                    value={editing.imageUrl}
                    onChange={(e) =>
                      setEditing((prev) => prev && ({ ...prev, imageUrl: e.target.value }))
                    }
                    placeholder="O pega una URL: https://..."
                    className="input-dark flex-1 text-sm"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'imageUrl')
                    e.target.value = ''
                  }}
                />
              </div>

              {/* Imagen mobile — opcional, evita que object-cover recorte mal en pantallas chicas */}
              <div>
                <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">
                  Imagen del banner (mobile — opcional)
                </label>
                <p className="text-[11px] text-ash/70 mb-1.5">
                  Si no se sube, en mobile se usa la imagen de desktop (puede recortarse mal).
                </p>
                {editing.imageUrlMobile && (
                  <div className="mb-2 relative w-full max-w-[160px] h-40 border border-navy/40 overflow-hidden">
                    <img
                      src={editing.imageUrlMobile}
                      alt="Preview mobile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => fileInputMobileRef.current?.click()}
                    disabled={uploading !== null}
                    className="font-agency text-xs px-4 py-2 border border-navy/50 text-ash hover:text-white hover:border-white/40 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {uploading === 'imageUrlMobile' ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                  <input
                    type="text"
                    value={editing.imageUrlMobile ?? ''}
                    onChange={(e) =>
                      setEditing((prev) => prev && ({ ...prev, imageUrlMobile: e.target.value }))
                    }
                    placeholder="O pega una URL: https://..."
                    className="input-dark flex-1 text-sm"
                  />
                </div>
                <input
                  ref={fileInputMobileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'imageUrlMobile')
                    e.target.value = ''
                  }}
                />
              </div>

              {[
                { label: 'Título', field: 'title', placeholder: 'Tu tienda especialista' },
                { label: 'Subtítulo', field: 'subtitle', placeholder: 'Descripción breve del slide' },
                { label: 'Texto del botón', field: 'ctaLabel', placeholder: 'Explorar Catálogo' },
                { label: 'Enlace del botón', field: 'ctaHref', placeholder: '/catalogo' },
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing((prev) => prev && ({ ...prev, isActive: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <span className="font-agency text-xs text-ash uppercase tracking-wider">Activo</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={saveEdit} disabled={saving || uploading !== null} className="btn-primary flex-1 text-sm py-2.5 disabled:opacity-50">
                {uploading !== null ? 'Subiendo imagen...' : saving ? 'Guardando...' : 'Guardar'}
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
