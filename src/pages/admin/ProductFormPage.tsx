import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminApi } from '../../hooks/useAdminApi'
import { slugify } from '../../lib/utils'
import ImageUploader, { type ImageEntry } from '../../components/admin/ImageUploader'
import type { Category, Product } from '../../types'

// Esquema Zod para validar el formulario del producto
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  cardNumber: z.string().nullable().optional(),
  setName: z.string().nullable().optional(),
  edition: z.enum(['first_edition', 'shadowless', 'unlimited', '']).nullable().optional(),
  language: z.enum(['es', 'en', 'jp', '']).nullable().optional(),
  rarity: z.string().nullable().optional(),
  condition: z.enum(['mint', 'near_mint', 'lightly_played', '']).nullable().optional(),
  variant: z.enum(['standard', 'holo', 'reverse_holo', '']).nullable().optional(),
  price: z.coerce.number().positive('El precio debe ser mayor a 0'),
  stock: z.coerce.number().int().min(0, 'El stock debe ser 0 o más'),
  isActive: z.boolean(),
  description: z.string().nullable().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { apiFetch } = useAdminApi()
  const isEdit = Boolean(id)

  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      categoryId: '',
      cardNumber: '',
      setName: '',
      edition: '',
      language: '',
      rarity: '',
      condition: '',
      variant: '',
      price: 0,
      stock: 0,
      isActive: true,
      description: '',
    },
  })

  const nameValue = watch('name')
  const slugValue = watch('slug')

  // Auto-generar slug desde el nombre, solo si el usuario no lo ha editado manualmente
  const [slugTouched, setSlugTouched] = useState(false)
  useEffect(() => {
    if (!slugTouched && nameValue) {
      setValue('slug', slugify(nameValue))
    }
  }, [nameValue, slugTouched, setValue])

  // Cargar categorías
  useEffect(() => {
    apiFetch<{ data: Category[] }>('/api/products/categories')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('Error cargando categorías:', err))
  }, [])

  // Cargar producto si estamos editando
  useEffect(() => {
    if (!id) return
    setLoading(true)
    apiFetch<{ data: Product }>(`/api/admin/products/${id}`)
      .then(({ data: product }) => {
        reset({
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          cardNumber: product.cardNumber ?? '',
          setName: product.setName ?? '',
          edition: product.edition ?? '',
          language: product.language ?? '',
          rarity: product.rarity ?? '',
          condition: product.condition ?? '',
          variant: product.variant ?? '',
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          description: product.description ?? '',
        })
        setSlugTouched(true)
        if (product.images) {
          setImages(
            product.images.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
          )
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitting(true)
    setError(null)
    try {
      // Normalizar campos vacíos a null para enums
      const payload = {
        ...values,
        cardNumber: values.cardNumber || null,
        setName: values.setName || null,
        edition: values.edition || null,
        language: values.language || null,
        rarity: values.rarity || null,
        condition: values.condition || null,
        variant: values.variant || null,
        description: values.description || null,
      }

      let productId: string
      if (isEdit) {
        await apiFetch(`/api/admin/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        productId = id!
      } else {
        const created = await apiFetch<{ data: { id: string } }>('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        productId = created.data.id
      }

      // Subir imágenes nuevas (base64 local) a R2 en secuencia
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx]
        // Las URLs que ya están en R2 o son externas no se re-suben
        if (!img.url.startsWith('data:')) continue

        const [meta, base64Data] = img.url.split(',')
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'

        await apiFetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          body: JSON.stringify({
            base64: base64Data,
            mimeType,
            isPrimary: img.isPrimary,
            sortOrder: idx,
          }),
        })
      }

      navigate('/admin/productos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Cargando producto...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Editar producto' : 'Nuevo producto'}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/admin/productos')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: campos principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sección: básico */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Información básica</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                {...register('name')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                type="text"
                {...register('slug')}
                onChange={(e) => {
                  setSlugTouched(true)
                  setValue('slug', e.target.value)
                }}
                value={slugValue}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.slug && (
                <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.price && (
                  <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                <input
                  type="number"
                  {...register('stock')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.stock && (
                  <p className="text-xs text-red-500 mt-1">{errors.stock.message}</p>
                )}
              </div>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="rounded" />
              <span className="text-sm text-gray-700">Producto activo (visible en tienda)</span>
            </label>
          </section>

          {/* Sección: clasificación */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Clasificación TCG</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría / Franquicia *</label>
              <select
                {...register('categoryId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Seleccionar —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de carta</label>
                <input
                  type="text"
                  {...register('cardNumber')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set</label>
                <input
                  type="text"
                  {...register('setName')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Edición</label>
                <select
                  {...register('edition')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  <option value="first_edition">First Edition</option>
                  <option value="shadowless">Shadowless</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                <select
                  {...register('language')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                  <option value="jp">Japonés</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rareza</label>
                <input
                  type="text"
                  {...register('rarity')}
                  placeholder="Ej. Holo Rare, Common..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
                <select
                  {...register('condition')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  <option value="mint">Mint</option>
                  <option value="near_mint">Near Mint</option>
                  <option value="lightly_played">Lightly Played</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variante</label>
              <select
                {...register('variant')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                <option value="standard">Standard</option>
                <option value="holo">Holo</option>
                <option value="reverse_holo">Reverse Holo</option>
              </select>
            </div>
          </section>

          {/* Sección: descripción */}
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Descripción</h2>
            <textarea
              {...register('description')}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción del producto..."
            />
          </section>
        </div>

        {/* Columna derecha: imágenes */}
        <div className="lg:col-span-1">
          <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-800">Imágenes</h2>
            <ImageUploader images={images} onChange={setImages} />
          </section>
        </div>

        {/* Botones de acción */}
        <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/productos')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : isEdit ? 'Actualizar producto' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
