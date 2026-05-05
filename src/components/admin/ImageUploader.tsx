import { useState } from 'react'

export interface ImageEntry {
  url: string
  isPrimary: boolean
}

interface ImageUploaderProps {
  images: ImageEntry[]
  onChange: (images: ImageEntry[]) => void
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [urlInput, setUrlInput] = useState('')

  const addByUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    onChange([...images, { url, isPrimary: images.length === 0 }])
    setUrlInput('')
  }

  const addByFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      onChange([...images, { url, isPrimary: images.length === 0 }])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const setPrimary = (index: number) => {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })))
  }

  const remove = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
      updated[0].isPrimary = true
    }
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="URL de imagen..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addByUrl()
            }
          }}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={addByUrl}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Agregar URL
        </button>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
          <span>Subir archivo</span>
          <input type="file" accept="image/*" className="hidden" onChange={addByFile} />
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-2">
          {images.map((img, index) => (
            <div
              key={index}
              className={`relative rounded-lg overflow-hidden border-2 ${
                img.isPrimary ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <img src={img.url} alt={`imagen ${index + 1}`} className="w-full h-24 object-cover" />
              <div className="absolute top-1 right-1 flex gap-1">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(index)}
                    className="bg-white text-xs px-1.5 py-0.5 rounded shadow text-blue-600 hover:bg-blue-50"
                    title="Marcar como principal"
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="bg-white text-xs px-1.5 py-0.5 rounded shadow text-red-500 hover:bg-red-50"
                  title="Eliminar"
                >
                  X
                </button>
              </div>
              {img.isPrimary && (
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-xs text-center py-0.5">
                  Principal
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
