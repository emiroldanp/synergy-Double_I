import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import type { BannerSlide } from '@/types'
import { loadSlides, saveSlides } from '@/components/sections/HeroBanner'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const EMPTY_SLIDE: Omit<BannerSlide, 'id'> = {
  imageUrl: '',
  title: '',
  subtitle: '',
  ctaLabel: 'Ver ahora',
  ctaHref: '/catalogo',
  isActive: true,
}

export default function BannerManager() {
  const [slides, setSlides] = useState<BannerSlide[]>(loadSlides)
  const [editing, setEditing] = useState<BannerSlide | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saved, setSaved] = useState(false)

  const persist = (updated: BannerSlide[]) => {
    setSlides(updated)
    saveSlides(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const openNew = () => {
    setEditing({ id: generateId(), ...EMPTY_SLIDE })
    setIsNew(true)
  }

  const openEdit = (slide: BannerSlide) => {
    setEditing({ ...slide })
    setIsNew(false)
  }

  const saveEdit = () => {
    if (!editing) return
    if (isNew) {
      persist([...slides, editing])
    } else {
      persist(slides.map((s) => (s.id === editing.id ? editing : s)))
    }
    setEditing(null)
  }

  const deleteSlide = (id: string) => {
    if (!confirm('¿Eliminar este slide?')) return
    persist(slides.filter((s) => s.id !== id))
  }

  const toggleActive = (id: string) => {
    persist(slides.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)))
  }

  const move = (id: string, dir: -1 | 1) => {
    const i = slides.findIndex((s) => s.id === id)
    if (i + dir < 0 || i + dir >= slides.length) return
    const next = [...slides]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    persist(next)
  }

  return (
    <>
      <Helmet>
        <title>Gestión de Banners — Admin</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20 pb-16">
        <div className="page-container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="section-title mb-1">Banners del Hero</h1>
              <p className="font-exo text-ash text-sm">
                Administra los slides del banner principal de la homepage.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="font-agency text-xs text-green-400 uppercase tracking-wider">
                  ✓ Guardado
                </span>
              )}
              <button onClick={openNew} className="btn-primary text-sm px-5 py-2.5">
                + Nuevo slide
              </button>
            </div>
          </div>

          {slides.length === 0 && (
            <div className="text-center py-20 border border-navy/40">
              <p className="font-agency text-ash uppercase tracking-wider mb-4">Sin slides</p>
              <button onClick={openNew} className="btn-secondary text-sm px-5 py-2">
                Crear primer slide
              </button>
            </div>
          )}

          <div className="space-y-3">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`flex items-center gap-4 p-4 border transition-colors ${
                  slide.isActive ? 'border-navy/50 bg-deep' : 'border-navy/30 bg-abyss opacity-60'
                }`}
              >
                <div className="w-24 h-14 bg-void border border-navy/40 overflow-hidden flex-shrink-0">
                  {slide.imageUrl ? (
                    <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-agency text-[10px] text-ash/40 uppercase">Sin imagen</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-agency text-white text-sm truncate">{slide.title || '(Sin título)'}</p>
                  <p className="font-exo text-ash text-xs truncate mt-0.5">{slide.subtitle}</p>
                  <p className="font-exo text-ash/50 text-xs mt-0.5">CTA: {slide.ctaLabel} → {slide.ctaHref}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => move(slide.id, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className="w-7 h-7 border border-navy/50 text-ash hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(slide.id, 1)}
                    disabled={i === slides.length - 1}
                    aria-label="Bajar"
                    className="w-7 h-7 border border-navy/50 text-ash hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(slide.id)}
                    className={`font-agency text-xs px-3 py-1 border transition-colors ${
                      slide.isActive
                        ? 'border-green-700/50 text-green-400 hover:border-green-600'
                        : 'border-navy/50 text-ash hover:border-white/40'
                    }`}
                  >
                    {slide.isActive ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => openEdit(slide)}
                    className="font-agency text-xs px-3 py-1 border border-navy/50 text-ash hover:text-white hover:border-white/40 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteSlide(slide.id)}
                    className="font-agency text-xs px-3 py-1 border border-dragon/40 text-dragon hover:border-dragon transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
              {[
                { label: 'URL de imagen', field: 'imageUrl', placeholder: 'https://...' },
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
              <button onClick={saveEdit} className="btn-primary flex-1 text-sm py-2.5">
                Guardar
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
