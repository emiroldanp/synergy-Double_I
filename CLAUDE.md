# CLAUDE.md — synergy-irving-tcg

> Instrucciones específicas de proyecto para Claude Code. Se aplican en adición al CLAUDE.md global de WebDev_Projects.

---

## Proyecto

**Cliente:** Irving Gallart  
**Proyecto:** Ecommerce de tarjetas coleccionables TCG — Pokémon, Yu-Gi-Oh!, Lorcana  
**Paquete:** PRO — $35,000 MXN + IVA  
**Nombre del repositorio:** `synergy-irving-tcg`

---

## Stack

Stack estándar Synergy **más** Express.js backend obligatorio en este proyecto (las API keys de Skydropx, Facturapi y la pasarela de pagos nunca pueden estar expuestas en el frontend).

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Routing | React Router v6 |
| Formularios | React Hook Form + Zod |
| SEO | react-helmet-async |
| Backend | Express.js + Node.js |
| Base de datos | Supabase (PostgreSQL) con RLS |
| Autenticación | Supabase Auth |
| Cotización de envíos | Skydropx API |
| Facturación CFDI | Facturapi SDK Node.js |
| Email marketing | Brevo API |
| Pasarela de pagos | `[PLACEHOLDER — Mercado Pago o Stripe — confirmar en kickoff]` |
| Hosting | Hostinger |
| CI/CD | GitHub Actions |

---

## Reglas específicas de este proyecto

1. **Nunca inventar datos del cliente.** Si un dato no está definido (WhatsApp, dirección de tienda, RFC, paleta de colores, dominio), usar `[PLACEHOLDER — confirmar con Irving en kickoff]`.
2. **MadeBy siempre en el footer** de todas las páginas — obligatorio según estándar Synergy.
3. **API keys solo en backend** — `SKYDROPX_API_KEY`, `FACTURAPI_API_KEY`, `BREVO_API_KEY`, `PAYMENT_ACCESS_TOKEN` nunca en el frontend.
4. **RLS habilitado en todas las tablas** de Supabase — no hay tabla sin políticas.
5. **Commits en español** con formato Synergy: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:`.
6. **El agente `database` debe completarse antes de despachar `backend` y `frontend`.**

---

## Bloqueantes hasta kickoff con Irving

| Bloqueante | Impacta |
|------------|---------|
| Pasarela de pagos (Mercado Pago o Stripe) | Webhook de pagos, paso 5 del checkout |
| Dirección de tienda física | Opción "Recoger en tienda", origen Skydropx |
| RFC y CSD del SAT | Configuración Facturapi, emisión CFDI |
| Dominio deseado | DNS, CI/CD, URLs SEO |
| Paleta de colores, logotipo, tipografías | Identidad visual del frontend |
| Número de WhatsApp de Irving | Botón flotante |

---

## Agentes del proyecto

| Agente | Rol |
|--------|-----|
| `orchestrator` | Coordina todos los agentes |
| `database` | Esquema Supabase + RLS + seed |
| `backend` | Express.js + integraciones externas |
| `frontend` | React — todas las páginas y componentes |
| `docs` | README técnico + ENTREGA-CLIENTE.md |
| `qa` | Suite Playwright MCP — screenshots desktop y mobile |

Ver `03-prompt-orquestador.md` para instrucciones completas de cada agente.

---

## Criterio de entrega

`vite build` sin errores + screenshots Playwright sin overflow en mobile + MadeBy en todos los footers + bloqueantes marcados como `[PLACEHOLDER]` + aprobación de Emiliano en staging.
