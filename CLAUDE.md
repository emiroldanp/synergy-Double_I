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

## Infraestructura de despliegue (IMPORTANTE — no volver a preguntar esto)

- **Backend (Express):** Node app en Hostinger, dominio `api.doubleicards.com`. **Se autodespliega solo con cada push a `main`** (no requiere acción manual, no hay que verificar ni reiniciar nada en el panel de Hostinger tras un push). Entry file: `server/dist/index.js`. Env vars del backend viven en Hostinger (Environment variables), no en GitHub.
- **Frontend (Vite estático):** se compila y sube por FTP vía `.github/workflows/deploy.yml`. `push dev` → `staging.doubleicards.com`; `push main` → `doubleicards.com`.
- **Variables `VITE_*` del frontend:** se inyectan en el paso "Build" del workflow desde **GitHub Secrets** (`gh secret set NOMBRE -b "valor"`), no desde el `.env` local (que es solo para dev y está en `.gitignore`). Si se agrega una `VITE_*` nueva hay que: 1) agregarla al bloque `env:` del step Build en `deploy.yml`, y 2) crear el secret en GitHub con el valor real — si falta el secret, el build cae al fallback hardcodeado en el código (placeholder) sin avisar.
- **CORS:** `FRONTEND_URL` en Hostinger acepta varios orígenes separados por coma (`https://doubleicards.com,https://staging.doubleicards.com`).

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
3. **API keys solo en backend** — `SKYDROPX_API_KEY`, `FACTURAPI_API_KEY_LIVE`, `FACTURAPI_API_KEY_TEST`, `BREVO_API_KEY`, `PAYMENT_ACCESS_TOKEN`, `CLERK_SECRET_KEY`, `CLOUDFLARE_R2_*` nunca en el frontend.
4. **Prisma es el único punto de acceso a la base de datos** — no escribir SQL crudo salvo en migraciones. El schema vive en `server/prisma/schema.prisma`.
5. **Commits en español** con formato Synergy: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:`.
6. **El agente `database` debe completarse antes de despachar `backend` y `frontend`.**

---

## Bloqueantes (estado 2026-07-10)

| Bloqueante | Estado | Impacta |
|------------|--------|---------|
| Pasarela de pagos | ✅ Mercado Pago seleccionado | — |
| Pickup en tienda | ✅ Eliminado — todo en línea | — |
| Mercado Pago credentials prod | ✅ Configuradas 2026-07-10 | — |
| Webhook MP producción | ✅ URL + secret configurados 2026-07-10 | — |
| Dirección de origen (envíos) | ✅ Configurada | — |
| RFC y CSD del SAT | ✅ CSD configurado en Facturapi | — |
| Dominio | ✅ doubleicards.com | — |
| Logo e identidad visual | ✅ Recibido | — |
| Redes sociales del footer | ✅ Decisión: no habrá redes por ahora | — |
| Número de WhatsApp de Irving | ✅ Confirmado | — |
| Clerk Dev → Production instance | ✅ Migrado 2026-07-10 | — |
| Limpieza DB (pedidos/facturas test) | ✅ Realizada 2026-07-10 | — |
| Rotación credenciales (Neon + Facturapi) | ⏳ Pendiente — Neon DB + Facturapi sk_live_ | Seguridad |
| Migración SDK mercadopago v2→v3 | ⏳ Pendiente — mantenimiento de seguridad | No bloqueante para go-live |

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
