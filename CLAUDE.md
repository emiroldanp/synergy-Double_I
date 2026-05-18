# CLAUDE.md — synergy-irving-tcg

> Instrucciones específicas de proyecto para Claude Code. Se aplican en adición al CLAUDE.md global de WebDev_Projects.

---

## Proyecto

**Cliente:** Irving Gallart  | Double-I
**Proyecto:** Ecommerce de tarjetas coleccionables TCG — Pokémon, Yu-Gi-Oh!, Lorcana  
**Paquete:** PRO — $35,000 MXN + IVA  
**Nombre del repositorio:** `synergy-irving-tcg`

---

## Stack

Stack estándar Synergy **más** Express.js backend obligatorio en este proyecto (las API keys de Skydropx, Facturapi y la pasarela de pagos nunca pueden estar expuestas en el frontend).

**Decisión de arquitectura (2026-05-02):** Se reemplaza Supabase como BaaS por Neon Postgres + Prisma + Clerk + Cloudflare R2. Motivo: límite de 2 proyectos en plan gratuito de Supabase y costo de Pro ($44/mes) no justificado en esta etapa.

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| Animaciones | **framer-motion** |
| Formularios | React Hook Form + Zod |
| SEO | react-helmet-async |
| Backend | Express.js + Node.js |
| Base de datos | **Neon Postgres** |
| ORM | **Prisma 7** (con `@prisma/adapter-pg`) |
| Autenticación | **Clerk** |
| Almacenamiento de imágenes | **Cloudflare R2** |
| Cotización de envíos | Skydropx API |
| Facturación CFDI | Facturapi SDK Node.js |
| Email marketing | Brevo API |
| Pasarela de pagos | Mercado Pago |
| Hosting | Hostinger |
| CI/CD | GitHub Actions |

---

## Arquitectura frontend relevante (2026-05-18)

Componentes y contextos clave que no son evidentes del árbol de archivos:

| Archivo | Responsabilidad |
|---------|----------------|
| `src/context/CartContext.tsx` | Estado compartido del carrito (React Context). `CartProvider` envuelve toda la app en `main.tsx`. Siempre importar `useCart` desde `@/hooks/useCart` (re-exporta desde aquí). |
| `src/context/DeckAnimationContext.tsx` | Coordina la animación de carta-volando-al-carrito. `DeckAnimationProvider` también está en `main.tsx`. |
| `src/components/ui/CardFlipFlyPortal.tsx` | Portal que renderiza la animación framer-motion de carta volando al ícono del carrito. |
| `src/components/sections/HeroBanner.tsx` | Hero animado con framer-motion en la homepage. |
| `src/components/sections/BenefitsBar.tsx` | Barra de beneficios debajo del hero. |
| `src/components/sections/FeaturedCarousel.tsx` | Carrusel de novedades (usa `useNovedades()`). |
| `src/components/sections/BestsellerGrid.tsx` | Grid de bestsellers (usa `useBestsellers()`). |
| `src/components/admin/BannerManager.tsx` | Gestión de banners desde panel admin. |
| `src/hooks/useProducts.ts` | Expone `useProducts`, `useProductBySlug`, `useNovedades`, `useBestsellers` — todos conectados a la API real. |
| `src/hooks/useInfiniteProducts.ts` | Paginación acumulada para el catálogo (`limit = page * PAGE_SIZE`). |

**Regla de carrito:** nunca crear estado local de carrito. Siempre usar `useCart()` del CartContext.

---

## Notas técnicas importantes (Prisma 7)

Prisma 7 tiene cambios de arquitectura respecto a versiones anteriores:
- Requiere adaptador explícito `@prisma/adapter-pg` — no hay conexión automática por string
- El seed se configura en `prisma.config.ts`, no en `package.json`
- Todo código que use `PrismaClient` debe instanciarlo con el adaptador:
  ```ts
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  ```

---

## Reglas específicas de este proyecto

1. **Nunca inventar datos del cliente.** Si un dato no está definido (WhatsApp, dirección de tienda, RFC, paleta de colores, dominio), usar `[PLACEHOLDER — confirmar con Irving en kickoff]`.
2. **MadeBy siempre en el footer** de todas las páginas — obligatorio según estándar Synergy.
3. **API keys solo en backend** — `SKYDROPX_API_KEY`, `FACTURAPI_API_KEY`, `BREVO_API_KEY`, `PAYMENT_ACCESS_TOKEN`, `CLERK_SECRET_KEY`, `CLOUDFLARE_R2_*` nunca en el frontend.
4. **Prisma es el único punto de acceso a la base de datos** — no escribir SQL crudo salvo en migraciones. El schema vive en `server/prisma/schema.prisma`.
5. **Commits en español** con formato Synergy: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:`.
6. **El agente `database` debe completarse antes de despachar `backend` y `frontend`.**

---

## Bloqueantes (estado 2026-05-18)

| Bloqueante | Estado | Impacta |
|------------|--------|---------|
| Pasarela de pagos | ✅ Mercado Pago seleccionado | Webhook de pagos, checkout |
| Pickup en tienda | ✅ Eliminado — todo en línea | — |
| Mercado Pago credentials prod | ⏳ Pendiente (Irving activa cuenta MP) | RF-025 bloqueado |
| Dirección de origen (envíos) | ⏳ Pendiente | Cotización Skydropx |
| RFC y CSD del SAT | ⏳ Pendiente | Facturapi, emisión CFDI |
| Dominio | ⏳ Pendiente (Synergy envía opciones) | DNS, CI/CD, URLs SEO |
| Logo e identidad visual | ⏳ Pendiente (Irving lo comparte) | Frontend completo |
| Redes sociales del footer | ⏳ Pendiente | Footer |
| Número de WhatsApp de Irving | ⏳ Pendiente | Botón flotante |

---

## Agentes del proyecto

| Agente | Rol |
|--------|-----|
| `orchestrator` | Coordina todos los agentes |
| `database` | Schema Prisma + migraciones Neon + seed ✅ |
| `backend` | Express.js + integraciones externas |
| `frontend` | React — todas las páginas y componentes |
| `docs` | README técnico + ENTREGA-CLIENTE.md |
| `qa` | Suite Playwright MCP — screenshots desktop y mobile |

Ver `docs/03-prompt-orquestador.md` para instrucciones completas de cada agente.

---

## Criterio de entrega

`vite build` sin errores + screenshots Playwright sin overflow en mobile + MadeBy en todos los footers + bloqueantes marcados como `[PLACEHOLDER]` + aprobación de Emiliano en staging.
