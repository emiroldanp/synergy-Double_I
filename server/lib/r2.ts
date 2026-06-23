import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Cliente Cloudflare R2 compatible con S3
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Sube un archivo a Cloudflare R2 y devuelve la URL pública.
 * @param key  Ruta dentro del bucket, ej. "products/abc123/foto.jpg"
 * @param body Buffer con el contenido del archivo
 * @param contentType MIME type, ej. "image/jpeg"
 */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

/**
 * Elimina un archivo de R2 dado su key (ruta dentro del bucket).
 * Extrae el key desde la URL pública quitando el prefijo del dominio R2.
 */
export async function deleteFromR2ByUrl(publicUrl: string): Promise<void> {
  const prefix = process.env.CLOUDFLARE_R2_PUBLIC_URL!
  if (!publicUrl.startsWith(prefix)) return // URL externa, no es nuestro R2
  const key = publicUrl.slice(prefix.length + 1) // +1 para el slash
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
    })
  )
}
