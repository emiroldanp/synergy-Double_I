import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { BlogPost } from '../../types'

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface BlogPostFormData {
  title: string
  slug: string
  excerpt: string
  body: string
  categorySlug: string
  tags: string            // string separado por comas
  isPublished: boolean
  metaTitle: string
  metaDescription: string
  featuredImageBase64?: string
  featuredImageExt?: string
}

interface BlogPostFormProps {
  post?: BlogPost | null
  onSave: (data: BlogPostFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

// ── Utilidad de slug ──────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina diacríticos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ── Clases reutilizables ──────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition'

const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

// ── Componente ────────────────────────────────────────────────────────────────

export default function BlogPostForm({
  post,
  onSave,
  onCancel,
  loading = false,
}: BlogPostFormProps) {
  const isEditing = Boolean(post)

  // Estado para imagen seleccionada por el usuario
  const [imageBase64, setImageBase64] = useState<string | undefined>()
  const [imageExt, setImageExt] = useState<string | undefined>()

  // Ref para controlar si el usuario tocó el campo slug
  const slugTouched = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    defaultValues: {
      title: post?.title ?? '',
      slug: post?.slug ?? '',
      excerpt: post?.excerpt ?? '',
      body: post?.body ?? '',
      categorySlug: post?.categorySlug ?? '',
      tags: post?.tags?.join(', ') ?? '',
      isPublished: post?.isPublished ?? false,
      metaTitle: post?.metaTitle ?? '',
      metaDescription: post?.metaDescription ?? '',
    },
  })

  const titleValue = watch('title')
  const slugValue = watch('slug')

  // Auto-generar slug desde el título mientras no haya sido editado manualmente
  useEffect(() => {
    if (!slugTouched.current) {
      setValue('slug', slugify(titleValue ?? ''))
    }
  }, [titleValue, setValue])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  // Leer imagen como base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    setImageExt(ext)

    const reader = new FileReader()
    reader.onload = () => {
      setImageBase64(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Submit
  const onSubmit = async (data: BlogPostFormData) => {
    await onSave({
      ...data,
      featuredImageBase64: imageBase64,
      featuredImageExt: imageExt,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="blog-form-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onCancel}
        style={{ animation: 'fadeIn 120ms ease' }}
      />

      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-y-auto max-h-[90vh] flex flex-col"
        style={{ animation: 'slideUp 160ms cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Franja superior */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 flex-shrink-0" />

        {/* Encabezado */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <h2
            id="blog-form-title"
            className="text-base font-semibold text-gray-900"
          >
            {isEditing ? 'Editar artículo' : 'Nuevo artículo'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isEditing ? `Editando: ${post?.slug}` : 'Completa los campos del post'}
          </p>
        </div>

        {/* Formulario */}
        <form
          id="blog-post-form"
          onSubmit={handleSubmit(onSubmit)}
          className="px-6 py-5 space-y-4 overflow-y-auto flex-1"
          noValidate
        >
          {/* Título */}
          <div>
            <label className={labelCls}>
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ej. Las mejores cartas de Pokémon 2025"
              {...register('title', { required: 'El título es obligatorio' })}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className={labelCls}>
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="las-mejores-cartas-pokemon-2025"
              {...register('slug', { required: 'El slug es obligatorio' })}
              onChange={(e) => {
                slugTouched.current = e.target.value !== ''
                setValue('slug', e.target.value)
              }}
              value={slugValue}
            />
            {errors.slug && (
              <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>
            )}
          </div>

          {/* Extracto */}
          <div>
            <label className={labelCls}>Extracto</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Breve descripción que aparece en la lista del blog..."
              {...register('excerpt')}
            />
          </div>

          {/* Cuerpo */}
          <div>
            <label className={labelCls}>
              Contenido <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={8}
              className={inputCls}
              placeholder="Escribe el contenido completo del artículo..."
              {...register('body', { required: 'El contenido es obligatorio' })}
            />
            {errors.body && (
              <p className="text-xs text-red-500 mt-1">{errors.body.message}</p>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className={labelCls}>Categoría</label>
            <input
              type="text"
              className={inputCls}
              placeholder="general, pokemon, yugioh..."
              {...register('categorySlug')}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags</label>
            <input
              type="text"
              className={inputCls}
              placeholder="tag1, tag2, tag3"
              {...register('tags')}
            />
            <p className="text-xs text-gray-400 mt-1">Separados por comas</p>
          </div>

          {/* Imagen destacada */}
          <div>
            <label className={labelCls}>Imagen destacada</label>
            {/* Vista previa si ya existe y no se ha seleccionado una nueva */}
            {post?.featuredImageUrl && !imageBase64 && (
              <img
                src={post.featuredImageUrl}
                alt="Imagen actual"
                className="w-24 h-16 object-cover rounded-lg mb-2 border border-gray-200"
              />
            )}
            {imageBase64 && (
              <img
                src={imageBase64}
                alt="Nueva imagen"
                className="w-24 h-16 object-cover rounded-lg mb-2 border border-indigo-300"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              onChange={handleImageChange}
            />
          </div>

          {/* Separador SEO */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              SEO
            </p>

            {/* Meta título */}
            <div className="mb-4">
              <label className={labelCls}>Meta título</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Título para motores de búsqueda (60 chars recomendado)"
                {...register('metaTitle')}
              />
            </div>

            {/* Meta descripción */}
            <div>
              <label className={labelCls}>Meta descripción</label>
              <textarea
                rows={2}
                className={inputCls}
                placeholder="Descripción para motores de búsqueda (155 chars recomendado)"
                {...register('metaDescription')}
              />
            </div>
          </div>

          {/* Publicado */}
          <div className="flex items-center gap-3 pt-1">
            <input
              id="isPublished"
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
              {...register('isPublished')}
            />
            <label
              htmlFor="isPublished"
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              Publicado
            </label>
          </div>
        </form>

        {/* Footer con botones */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="blog-post-form"
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}
