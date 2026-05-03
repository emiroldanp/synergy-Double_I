# Arquitectura de Componentes — Irving TCG Ecommerce

> Diagrama C4 nivel 2 (Contenedores). Muestra los sistemas, sus responsabilidades y las integraciones externas.

```mermaid
graph TB
    subgraph Cliente
        FE[Frontend - React + Vite + TypeScript + Tailwind]
    end

    subgraph Servidor
        BE[Backend - Express.js + Node.js + Prisma 7]
    end

    subgraph Autenticacion
        CL[Clerk - Auth usuarios y admin]
    end

    subgraph BaseDatos
        DB[Neon Postgres - Product, Order, Customer, Invoice, BlogPost]
    end

    subgraph Almacenamiento
        R2[Cloudflare R2 - Imagenes y PDFs CFDI]
    end

    subgraph Pagos
        MP[Mercado Pago - OXXO Pay y SPEI]
    end

    subgraph Envios
        SK[Skydropx API - Cotizacion Estafeta DHL FedEx]
    end

    subgraph Facturacion
        FA[Facturapi - Emision CFDI 4.0]
    end

    subgraph EmailMarketing
        BR[Brevo - Listas y emails transaccionales]
    end

    Irving[Irving Admin] -- Panel /admin --> FE

    FE -- HTTPS /api/ JSON REST --> BE
    FE -- Clerk JS SDK login --> CL

    BE -- Prisma Client TCP SSL --> DB
    BE -- AWS SDK S3 compatible --> R2
    BE -- SDK Node.js createPreference --> MP
    BE -- REST API cotizarEnvio --> SK
    BE -- SDK Node.js createCFDI --> FA
    BE -- REST API agregarContacto y enviarEmail --> BR
    BE -- Clerk Backend SDK verifyToken --> CL

    MP -- POST /api/payments/webhook --> BE

    classDef frontend fill:#3b82f6,color:#fff,stroke:#1d4ed8
    classDef backend fill:#10b981,color:#fff,stroke:#047857
    classDef external fill:#6366f1,color:#fff,stroke:#4338ca
    classDef db fill:#f59e0b,color:#fff,stroke:#b45309
    classDef person fill:#64748b,color:#fff,stroke:#334155

    class FE frontend
    class BE backend
    class CL,MP,SK,FA,BR,R2 external
    class DB db
    class Irving person
```

## Responsabilidades por capa

### Frontend (React + Vite)
| Responsabilidad | Tecnología |
|----------------|------------|
| Catálogo con filtros combinados | React state / URL params |
| Carrito persistente | localStorage |
| Autenticación de clientes | Clerk JS SDK |
| Formularios con validación | React Hook Form + Zod |
| SEO y metatags | react-helmet-async |
| Animaciones | Framer Motion (si se activa) |

### Backend (Express.js)
| Responsabilidad | Detalle |
|----------------|---------|
| API REST segura | Helmet, CORS restringido a `FRONTEND_URL` |
| Autenticación admin | Clerk JWT verification en middleware `authAdmin` |
| ORM y acceso a DB | Prisma 7 con adaptador `@prisma/adapter-pg` |
| Integración pagos | Mercado Pago SDK — preferencias + webhook HMAC |
| Cotización envíos | Skydropx REST API con timeout 5s |
| Emisión CFDI | Facturapi SDK Node.js |
| Email transaccional | Brevo REST API |
| Upload de archivos | AWS SDK S3 → Cloudflare R2 |

## Variables de entorno por sistema

| Sistema | Variables en Backend |
|---------|---------------------|
| Neon Postgres | `DATABASE_URL` |
| Clerk | `CLERK_SECRET_KEY` |
| Mercado Pago | `PAYMENT_ACCESS_TOKEN`, `PAYMENT_WEBHOOK_SECRET` |
| Skydropx | `SKYDROPX_API_KEY` |
| Facturapi | `FACTURAPI_API_KEY` |
| Brevo | `BREVO_API_KEY`, `BREVO_MAIN_LIST_ID` |
| Cloudflare R2 | `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL` |
| URLs internas | `FRONTEND_URL`, `BACKEND_URL` |
