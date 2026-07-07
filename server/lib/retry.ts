import axios from 'axios'

/**
 * RNF-005 — Reintentos en llamadas a APIs externas.
 *
 * Helper reutilizable que ejecuta una operación con reintentos y backoff
 * exponencial + jitter. Pensado para envolver llamadas salientes a APIs de
 * terceros (Skydropx, Brevo, Facturapi y lecturas idempotentes de Mercado
 * Pago) y así absorber fallos transitorios y picos de tráfico.
 *
 * REGLAS DE REINTENTO (importante):
 *  - Solo se reintenta en errores de RED, TIMEOUTS y respuestas 5xx / 429.
 *  - NUNCA se reintenta en errores 4xx (errores del cliente: 400, 401, 403,
 *    404, 409, 422, etc.) porque reintentar no cambiaría el resultado.
 *  - NUNCA debe envolverse una operación de ESCRITURA no idempotente que pueda
 *    duplicar efectos (ej. crear un pago / preferencia, emitir un CFDI). Para
 *    esas operaciones se llama directo sin retry. La responsabilidad de no
 *    envolver operaciones peligrosas es de quien usa el helper.
 */

export interface RetryOptions {
  /** Número máximo de INTENTOS (no de reintentos). Default: 3 → 1 original + 2 reintentos. */
  retries?: number
  /** Delay base en ms para el primer reintento. Default: 200 (luego 400, 800...). */
  baseDelayMs?: number
  /** Tope máximo del delay en ms para no crecer indefinidamente. Default: 5000. */
  maxDelayMs?: number
  /**
   * Predicado que decide si un error amerita reintento.
   * Por defecto usa `isRetryableError` (red / timeout / 5xx / 429).
   */
  shouldRetry?: (error: unknown) => boolean
  /** Etiqueta opcional para los logs de cada reintento (ej. 'Skydropx token'). */
  label?: string
}

/**
 * Determina si un error es transitorio y por tanto seguro de reintentar.
 * Cubre errores de axios (red, timeout, 5xx, 429) y errores de red genéricos
 * de Node (ECONNRESET, ETIMEDOUT, etc.).
 */
export function isRetryableError(error: unknown): boolean {
  // Errores de axios traen metadata útil (response, code)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status

    // Si hubo respuesta del servidor: solo 5xx y 429 se reintentan.
    // Cualquier otro 4xx es un error del cliente → NO reintentar.
    if (typeof status === 'number') {
      return status >= 500 || status === 429
    }

    // Sin respuesta = error de red o timeout → reintentar.
    // (ECONNABORTED es el código de axios para timeouts.)
    return true
  }

  // Errores de red genéricos de Node sin pasar por axios
  const code = (error as { code?: string } | null)?.code
  if (code) {
    const networkCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EPIPE',
      'ECONNABORTED',
    ]
    return networkCodes.includes(code)
  }

  // Por defecto NO reintentar errores desconocidos para evitar
  // reintentar bugs de lógica o validaciones.
  return false
}

/** Espera `ms` milisegundos. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ejecuta `fn` con reintentos y backoff exponencial con jitter.
 *
 * Ejemplo de delays con baseDelayMs=200: ~200ms, ~400ms, ~800ms (cada uno con
 * jitter aleatorio del 0–100% sumado para evitar el efecto "thundering herd").
 *
 * @param fn Función asíncrona a ejecutar (ej. una llamada axios).
 * @param options Configuración de reintentos.
 * @returns El resultado de `fn` si tiene éxito.
 * @throws El último error si se agotan los intentos o si el error no es reintentable.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 200,
    maxDelayMs = 5000,
    shouldRetry = isRetryableError,
    label,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt >= retries
      // Si el error no es reintentable o ya fue el último intento, propagar.
      if (isLastAttempt || !shouldRetry(error)) {
        throw error
      }

      // Backoff exponencial: base * 2^(intento-1). Con base=200 → 200, 400, 800...
      const exponential = baseDelayMs * 2 ** (attempt - 1)
      const capped = Math.min(exponential, maxDelayMs)
      // Jitter: suma aleatoria de 0 a `capped` para dispersar los reintentos.
      const delay = capped + Math.floor(Math.random() * capped)

      const prefix = label ? `[retry:${label}]` : '[retry]'
      console.warn(
        `${prefix} intento ${attempt}/${retries} falló, reintentando en ${delay}ms`
      )

      await sleep(delay)
    }
  }

  // Inalcanzable en la práctica, pero TypeScript necesita el throw final.
  throw lastError
}
