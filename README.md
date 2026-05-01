# synergy-irving-tcg

Ecommerce especializado en tarjetas coleccionables TCG (Pokémon, Yu-Gi-Oh!, Lorcana) desarrollado por **Synergy Tech MX** para Irving Gallart.

**Paquete:** PRO — $35,000 MXN + IVA  
**Estado:** Fase de planeación — pendiente kickoff con cliente

---

## Documentación del proyecto

| Archivo | Contenido |
|---------|-----------|
| [`01-requerimientos.md`](01-requerimientos.md) | Requerimientos funcionales y no funcionales completos |
| [`02-brief.md`](02-brief.md) | Brief técnico: stack, arquitectura, modelo de datos, flujos críticos, plan de trabajo |
| [`03-prompt-orquestador.md`](03-prompt-orquestador.md) | Instrucciones para el agente orquestador y los 5 agentes especializados |
| [`CLAUDE.md`](CLAUDE.md) | Instrucciones específicas del proyecto para Claude Code |

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Express.js + Node.js |
| Base de datos | Supabase (PostgreSQL) con RLS |
| Autenticación | Supabase Auth |
| Cotización de envíos | Skydropx API |
| Facturación CFDI | Facturapi SDK Node.js |
| Email marketing | Brevo API |
| Pasarela de pagos | [PLACEHOLDER — Mercado Pago o Stripe] |
| Hosting | Hostinger |
| CI/CD | GitHub Actions |

---

## Bloqueantes pendientes (kickoff con Irving)

- [ ] Pasarela de pagos: Mercado Pago o Stripe
- [ ] Dirección de tienda física
- [ ] RFC y CSD del SAT para Facturapi
- [ ] Dominio deseado
- [ ] Paleta de colores, logotipo, tipografías
- [ ] Número de WhatsApp

---

## Contacto

**Synergy Tech MX** — [synergy-mx.tech](https://synergy-mx.tech)  
contacto@synergy-mx.tech
