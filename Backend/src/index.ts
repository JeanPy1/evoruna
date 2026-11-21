import { Hono } from 'hono'
import { auth } from './routes/auth'
import { dashboard } from './routes/dashboard'

const app = new Hono<{
  Bindings: CloudflareBindings
}>()

// Backend
app.get('/api', (c) => {
  return c.json({
    message: 'Hello from Hono!'
  })
})

// Rutas de autenticación
app.route('/api/auth', auth)

// Rutas del dashboard (área de cliente)
app.route('/api/dashboard', dashboard)

// Rutas de API inexistentes responden JSON (no HTML de assets)
app.all('/api/*', (c) => {
  return c.json({ error: 'Ruta de API no encontrada' }, 404)
})

// Frontend Astro (build estático servido como assets de Workers)
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
