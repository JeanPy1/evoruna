// Limitador de tasa por clave (IP del cliente).
// Es best-effort: el estado vive en la memoria de cada isolate del Worker,
// por lo que los contadores no se comparten entre regiones. Para frenar
// fuerza bruta contra las rutas de autenticación es suficiente y añade
// cero dependencias.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Devuelve true si la petición está permitida o false si superó el límite
// dentro de la ventana indicada.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Limpieza periódica para que el mapa no crezca de forma ilimitada.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  bucket.count += 1
  return bucket.count <= limit
}
