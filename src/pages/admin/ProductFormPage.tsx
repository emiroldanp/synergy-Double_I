import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAdminApi } from '../../hooks/useAdminApi'
import { slugify } from '../../lib/utils'
import ImageUploader, { type ImageEntry } from '../../components/admin/ImageUploader'
import { TcgCardSearch } from '../../components/ui/TcgCardSearch'
import type { Category, AdminProduct, TcgCardResult } from '../../types'

// Mapeo slug de categoría → franquicia para habilitar el buscador TCG
const SLUG_TO_FRANCHISE: Record<string, 'pokemon' | 'magic' | 'lorcana'> = {
  pokemon: 'pokemon',
  magic: 'magic',
  'magic-the-gathering': 'magic',
  lorcana: 'lorcana',
}

const ACCESSORY_SUBTYPES = ['Sleeve', 'Toploader', 'Binder', 'Playmats', 'Acrílicos'] as const

const PRODUCT_TYPE_OPTIONS = [
  { value: 'carta', label: 'Carta individual' },
  { value: 'display', label: 'Display / Caja' },
  { value: 'dado', label: 'Dado' },
  { value: 'binder', label: 'Binder / Álbum' },
] as const

// Esquema Zod para validar el formulario del producto
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  productType: z.string().nullable().optional(),
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
  // URLs ya persistidas en BD al cargar el form; sirve para detectar imágenes R2 nuevas al guardar
  const savedImageUrlsRef = useRef<Set<string>>(new Set())
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessorySubtypes, setAccessorySubtypes] = useState<string[]>([])
  const [tcgCardData, setTcgCardData] = useState<Pick<TcgCardResult, 'externalId' | 'externalSource' | 'metadata' | 'marketPriceUsd'> | null>(null)

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
      productType: '',
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
  const categoryId = watch('categoryId')
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const isAccessory = selectedCategory?.slug === 'accesorios'
  const tcgFranchise = selectedCategory ? SLUG_TO_FRANCHISE[selectedCategory.slug] ?? null : null

  const toggleSubtype = (subtype: string) => {
    setAccessorySubtypes((prev) =>
      prev.includes(subtype) ? prev.filter((s) => s !== subtype) : [...prev, subtype],
    )
  }

  // Rellena el formulario con los datos de la carta seleccionada en el buscador TCG
  const handleTcgSelect = (card: TcgCardResult) => {
    setValue('name', card.name)
    setValue('cardNumber', card.cardNumber ?? '')
    setValue('setName', card.setName ?? '')
    setValue('rarity', card.rarity ?? '')
    if (card.language === 'es' || card.language === 'en' || card.language === 'jp') {
      setValue('language', card.language)
    }
    setTcgCardData({
      externalId: card.externalId,
      externalSource: card.externalSource,
      metadata: card.metadata,
      marketPriceUsd: card.marketPriceUsd,
    })
    // El slug se regenera desde el nombre si no fue tocado manualmente
    if (!slugTouched) setValue('slug', slugify(card.name))
  }

  // Agrega la imagen descargada a R2 al estado de imágenes del formulario
  const handleTcgImageImported = (url: string) => {
    setImages((prev) => {
      const alreadyHasPrimary = prev.some((i) => i.isPrimary)
      return [...prev, { url, isPrimary: !alreadyHasPrimary }]
    })
  }

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
    apiFetch<{ data: AdminProduct }>(`/api/admin/products/${id}`)
      .then(({ data: product }) => {
        const isAccCat = (product as any).category?.slug === 'accesorios'
        reset({
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId ?? '',
          productType: isAccCat ? 'accessory' : ((product as any).productType ?? ''),
          cardNumber: product.cardNumber ?? '',
          setName: product.setName ?? '',
          edition: (product.edition as '' | 'shadowless' | 'first_edition' | 'unlimited') ?? '',
          language: (product.language as '' | 'es' | 'en' | 'jp') ?? '',
          rarity: isAccCat ? '' : ((product.rarity as '' | 'comun' | 'poco_comun' | 'rara' | 'ultra_rara' | 'secret_rare' | 'full_art' | 'gold_rare' | 'prismatic') ?? ''),
          condition: (product.condition as '' | 'mint' | 'near_mint' | 'lightly_played') ?? '',
          variant: (product.variant as '' | 'holo' | 'reverse_holo' | 'standard') ?? '',
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          description: product.description ?? '',
        })
        if (isAccCat && product.rarity) {
          setAccessorySubtypes(product.rarity.split(',').map((s: string) => s.trim()).filter(Boolean))
        }
        setSlugTouched(true)
        if (product.images) {
          const loaded = product.images.map((img) => ({ url: img.url, isPrimary: img.isPrimary }))
          setImages(loaded)
          savedImageUrlsRef.current = new Set(loaded.map((i) => i.url))
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
      const payload = isAccessory
        ? {
            ...values,
            productType: 'accessory',
            rarity: accessorySubtypes.length > 0 ? accessorySubtypes.join(',') : null,
            cardNumber: null,
            setName: null,
            edition: null,
            language: null,
            condition: null,
            variant: null,
            description: values.description || null,
          }
        : {
            ...values,
            cardNumber: values.cardNumber || null,
            setName: values.setName || null,
            edition: values.edition || null,
            language: values.language || null,
            rarity: values.rarity || null,
            condition: values.condition || null,
            variant: values.variant || null,
            description: values.description || null,
            // Datos TCG: se envían solo si se seleccionó una carta desde el buscador
            externalId: tcgCardData?.externalId ?? null,
            externalSource: tcgCardData?.externalSource ?? null,
            tcgMetadata: tcgCardData?.metadata ?? null,
            marketPriceUsd: tcgCardData?.marketPriceUsd ?? null,
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

      // Sincronizar imágenes existentes: borra las eliminadas y actualiza isPrimary/sortOrder.
      // Solo se envían las URLs de R2 que ya estaban guardadas (no las nuevas en base64).
      const existingImages = images
        .map((img, idx) => ({ img, idx }))
        .filter(({ img }) => !img.url.startsWith('data:'))
        .map(({ img, idx }) => ({ url: img.url, isPrimary: img.isPrimary, sortOrder: idx }))

      await apiFetch(`/api/admin/products/${productId}/images/sync`, {
        method: 'PUT',
        body: JSON.stringify({ images: existingImages }),
      })

      // Subir imágenes: base64 locales y URLs R2 nuevas (ej. importadas desde TCG)
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx]

        if (img.url.startsWith('data:')) {
          // Imagen local en base64 → subir a R2
          const [meta, base64Data] = img.url.split(',')
          const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
          await apiFetch(`/api/admin/products/${productId}/images`, {
            method: 'POST',
            body: JSON.stringify({ base64: base64Data, mimeType, isPrimary: img.isPrimary, sortOrder: idx }),
          })
        } else if (!savedImageUrlsRef.current.has(img.url)) {
          // URL R2 nueva (importada desde TCG API, no estaba en BD al cargar el form)
          await apiFetch(`/api/admin/products/${productId}/images`, {
            method: 'POST',
            body: JSON.stringify({ imageUrl: img.url, isPrimary: img.isPrimary, sortOrder: idx }),
          })
        }
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

            {/* Buscador TCG — solo para franquicias con API (Pokémon, Magic, Lorcana) */}
            {tcgFranchise && !isAccessory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar carta en catálogo oficial
                </label>
                <TcgCardSearch
                  franchise={tcgFranchise}
                  onSelect={handleTcgSelect}
                  onImageImported={handleTcgImageImported}
                />
                {tcgCardData?.marketPriceUsd && (
                  <p className="mt-1.5 text-xs text-green-700 font-medium">
                    Referencia de mercado: ${tcgCardData.marketPriceUsd.toFixed(2)} USD
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Opcional — selecciona una carta para rellenar los campos automáticamente.
                </p>
              </div>
            )}

            {isAccessory ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de accesorio</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCESSORY_SUBTYPES.map((subtype) => (
                    <label
                      key={subtype}
                      className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={accessorySubtypes.includes(subtype)}
                        onChange={() => toggleSubtype(subtype)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">{subtype}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto</label>
                  <select
                    {...register('productType')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Seleccionar —</option>
                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
              </>
            )}
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
