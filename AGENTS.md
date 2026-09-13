# AGENTS.md

## Idioma

* El idioma principal del proyecto y de las respuestas es **español**.
* El agente debe responder siempre en español.
* Los comentarios del código deben escribirse en español cuando sea apropiado.
* Los nombres de variables, funciones, componentes, rutas y archivos deben seguir las convenciones existentes del proyecto y no deben traducirse arbitrariamente.
* Los términos técnicos propios de programación pueden mantenerse en inglés cuando sean convencionales.

---

## Tecnología

### Frontend

* Astro
* Tailwind CSS
* JavaScript
* TypeScript

JavaScript y TypeScript pueden utilizarse según las necesidades del proyecto y las convenciones existentes.

No introducir React, Vue, Svelte u otro framework frontend salvo que sea solicitado explícitamente.

### Backend

* Hono
* Cloudflare Workers
* TypeScript

El backend vive en la carpeta `../Backend` y se despliega en el mismo Worker que el frontend.

### Infraestructura

* Cloudflare Workers (Worker único unificado)
* Workers Assets: el build estático de Astro (`Frontend/dist`) se sirve mediante el binding `ASSETS`
* Las rutas de API las maneja Hono y el resto se delega a los assets
* Frontend y backend comparten el mismo origen, por lo que `PUBLIC_API_URL` puede estar vacío (misma origen)

No introducir nuevas tecnologías, frameworks o dependencias sin una razón clara.

---

## Reglas de respuesta del agente

El agente debe:

1. Responder siempre en español.
2. Explicar brevemente qué se hizo después de completar una tarea.
3. Indicar qué archivos fueron modificados.
4. Informar de cualquier problema encontrado.
5. Indicar las pruebas o comandos de validación ejecutados.
6. No afirmar que algo fue probado si realmente no se ejecutó.
7. Preguntar antes de realizar cambios arquitectónicos importantes.
8. No asumir requisitos que no hayan sido establecidos.

Las respuestas deben ser claras y concisas, evitando explicaciones innecesariamente largas.

---

## Regla principal

**El código existente es la fuente de verdad del proyecto.**

Antes de crear una solución nueva:

1. Revisar la implementación existente.
2. Buscar componentes, funciones o utilidades reutilizables.
3. Seguir los patrones ya utilizados.
4. Realizar el cambio mínimo necesario.
5. Validar que no se haya roto funcionalidad existente.

No realizar refactors, migraciones o mejoras no relacionadas con la tarea solicitada.
