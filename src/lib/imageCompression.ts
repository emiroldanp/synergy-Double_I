// 2560px — el banner del héroe ocupa el ancho completo de la pantalla, así que
// necesita más resolución que un thumbnail para no verse borroso al escalar
// en monitores grandes o pantallas retina.
const MAX_DIMENSION = 2560
const JPEG_QUALITY = 0.82
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024

/**
 * Redimensiona y recomprime una imagen en el navegador (canvas) antes de subirla.
 * Evita banners pesados sin optimizar que afecten el tiempo de carga del sitio.
 * GIF y SVG se dejan intactos (la recompresión rompería animación/vectores).
 * Si algo falla (formato no soportado, navegador viejo) devuelve el archivo original.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob || blob.size >= file.size) return file

    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    return file
  }
}
