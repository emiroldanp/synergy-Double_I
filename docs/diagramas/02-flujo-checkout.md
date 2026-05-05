# Flujo de Checkout y Pago — Irving TCG Ecommerce

> Cubre desde que el cliente inicia el checkout hasta la confirmación del pedido.

```mermaid
flowchart TD
    A([Cliente inicia checkout]) --> B{Tiene cuenta?}
    B -- Si --> C[Login con Clerk]
    B -- No --> D[Checkout como invitado]

    C --> E[Formulario de checkout]
    D --> E

    E --> F[Ingresa direccion de envio]
    F --> G[POST /api/shipping/quote - Skydropx API]
    G --> H{API responde en menos de 5s?}
    H -- No --> I[Mostrar error y boton reintentar]
    I --> G
    H -- Si --> J[Mostrar opciones de paqueteria con costo y ETA]

    J --> K[Cliente selecciona paqueteria]
    K --> L{Requiere factura?}
    L -- Si --> M[Ingresar RFC, Razon Social y Uso CFDI]
    L -- No --> N[Resumen del pedido]
    M --> N

    N --> O[POST /api/orders - Crea Order en pending_payment]
    O --> P{Stock disponible para todos los items?}
    P -- No --> Q[Error: stock insuficiente - Redirige al carrito]
    P -- Si --> R[Order creada - ID devuelto]

    R --> S[POST /api/payments/create-preference - Mercado Pago]
    S --> T[Frontend redirige a MP initPoint]

    T --> U{Cliente paga en MP}
    U -- OXXO Pay --> V[Cliente paga en tienda - asincrono]
    U -- SPEI --> W[Transferencia bancaria - asincrono]
    U -- Rechazado --> X[Redirige a /checkout con error]

    V --> Y[Webhook MP hacia /api/payments/webhook]
    W --> Y

    Y --> Z{Firma HMAC valida?}
    Z -- No --> AA[Ignorar notificacion]
    Z -- Si --> AB{status = approved?}

    AB -- rejected o cancelled --> AC[Order.paymentStatus = failed]
    AB -- Si --> AD[Transaccion Prisma: paymentStatus=confirmed, orderStatus=confirmed, descontar stock]

    AD --> AE{requiresInvoice = true y Invoice.status = draft?}
    AE -- Si --> AF[Facturapi: Emite CFDI 4.0 - guarda pdfUrl y xmlUrl]
    AE -- No --> AG[Brevo: email de confirmacion al comprador]
    AF --> AG

    AG --> AH([Pedido confirmado])
```

## Puntos clave del flujo

| Paso | Detalle técnico |
|------|----------------|
| **Cotización Skydropx** | Timeout 5s; si falla se muestra error y se permite reintentar sin bloquear el checkout |
| **Validación de stock** | Ocurre dentro de la transacción Prisma en `createOrder` — elimina race condition TOCTOU |
| **Preferencia MP** | Se crea solo para métodos OXXO y SPEI (tarjetas de crédito excluidas por `excluded_payment_types`) |
| **Webhook MP** | El backend responde 200 inmediatamente antes de procesar para evitar reintentos de MP |
| **Firma HMAC** | Verificada en producción con `PAYMENT_WEBHOOK_SECRET`; en dev se omite si no está configurado |
| **Stock decrement** | Usa `updateMany` con guard `stock >= quantity` para nunca llegar a negativos |
| **Factura draft** | Se crea en la misma transacción de `createOrder`; se emite (Facturapi) solo cuando el pago se aprueba |
