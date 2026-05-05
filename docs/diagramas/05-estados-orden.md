# Diagrama de Estados — Ciclo de Vida de una Orden

> Muestra las transiciones de `OrderStatus` y `PaymentStatus` y qué evento las dispara.

## Estado de Pago (`PaymentStatus`)

```mermaid
stateDiagram-v2
    [*] --> pending : POST /api/orders - orden creada

    pending --> confirmed : Webhook MP approved
    pending --> failed : Webhook MP rejected o cancelled

    confirmed --> [*] : Estado terminal
    failed --> [*] : Estado terminal
```

## Estado del Pedido (`OrderStatus`)

```mermaid
stateDiagram-v2
    [*] --> pending_payment : POST /api/orders - orden creada

    pending_payment --> confirmed : Webhook MP approved
    pending_payment --> cancelled : Irving cancela desde admin

    confirmed --> preparing : Irving actualiza desde admin
    preparing --> shipped : Irving carga numero de guia
    shipped --> delivered : Irving confirma entrega

    confirmed --> cancelled : Irving cancela antes de preparar
    preparing --> cancelled : Irving cancela antes de enviar

    delivered --> [*] : Pedido completado
    cancelled --> [*] : Pedido cancelado
```

## Relación entre ambos estados

```mermaid
graph LR
    subgraph PaymentStatus
        PP[pending]
        PC[confirmed]
        PF[failed]
    end

    subgraph OrderStatus
        OP[pending_payment]
        OC[confirmed]
        OPR[preparing]
        OS[shipped]
        OD[delivered]
        OCA[cancelled]
    end

    PP -->|Webhook approved| PC
    PP -->|Webhook rejected| PF

    PC -->|Sincronizado| OC
    PP -->|Creación| OP

    OC -->|Admin action| OPR
    OPR -->|Admin + trackingNumber| OS
    OS -->|Admin action| OD
    OC -->|Admin action| OCA
    OPR -->|Admin action| OCA
    OP -->|Admin action| OCA
```

## Resumen de transiciones por actor

| Transición | Actor | Mecanismo |
|-----------|-------|-----------|
| `→ pending_payment` | Sistema | `POST /api/orders` |
| `pending → confirmed` (PaymentStatus) | Mercado Pago | Webhook automático |
| `pending_payment → confirmed` (OrderStatus) | Sistema | Webhook automático (sincronizado) |
| `pending → failed` (PaymentStatus) | Mercado Pago | Webhook automático |
| `confirmed → preparing` | Irving | Panel admin |
| `preparing → shipped` | Irving | Panel admin + trackingNumber |
| `shipped → delivered` | Irving | Panel admin |
| `cualquiera → cancelled` (antes de shipped) | Irving | Panel admin |
