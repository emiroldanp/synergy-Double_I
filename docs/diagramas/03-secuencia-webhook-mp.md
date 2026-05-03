# Diagrama de Secuencia — Webhook Mercado Pago

> Detalla los actores y mensajes del flujo asíncrono post-pago,  
> desde la notificación de MP hasta el email de confirmación al comprador.

```mermaid
sequenceDiagram
    actor Cliente
    participant MP as Mercado Pago
    participant BE as Backend Express
    participant DB as Neon Postgres
    participant FA as Facturapi
    participant BR as Brevo

    Note over Cliente,MP: El cliente paga en MP via OXXO o SPEI

    MP->>BE: POST /api/payments/webhook
    BE-->>MP: 200 OK inmediato

    Note over BE: Parsear body raw Buffer a JSON

    BE->>BE: Verificar firma HMAC con PAYMENT_WEBHOOK_SECRET

    alt Firma invalida
        BE->>BE: Log error, ignorar
    else Firma valida
        BE->>MP: GET /v1/payments/:paymentId
        MP-->>BE: status, external_reference, payment_type_id

        alt status approved
            BE->>DB: BEGIN transaction
            BE->>DB: findUnique Order con items e invoice
            DB-->>BE: Order con items e Invoice draft

            BE->>DB: update Order - paymentStatus=confirmed, orderStatus=confirmed

            loop Por cada OrderItem
                BE->>DB: updateMany Product - stock decrement con guard
                DB-->>BE: count 1 ok o count 0 sin stock
            end

            BE->>DB: COMMIT transaction
            DB-->>BE: OK

            BE->>DB: findUnique Order post-transaccion
            DB-->>BE: Order actualizada

            alt requiresInvoice true y invoice draft
                BE->>FA: facturapi.invoices.create con rfc y cfdiUse
                FA-->>BE: id, pdf_url, xml_url, status valid

                BE->>DB: update Invoice - facturapiId, pdfUrl, xmlUrl, status=valid
                DB-->>BE: OK
            end

            BE->>BR: send transactional email order_confirmation
            BR-->>BE: messageId

        else status rejected o cancelled
            BE->>DB: update Order - paymentStatus=failed
            DB-->>BE: OK
        end
    end

    Note over BR,Cliente: Brevo entrega el email al comprador

    BR->>Cliente: Email de confirmacion del pedido con PDF y XML CFDI si aplica
```

## Garantías del flujo

| Garantía | Mecanismo |
|----------|-----------|
| MP no reintenta si el backend falla | Se responde `200 OK` antes de procesar |
| Nunca stock negativo | `updateMany` con guard `stock >= quantity` |
| Factura solo se emite una vez | Guard `invoice.status === 'draft'` antes de llamar Facturapi |
| Firma auténtica de MP | HMAC-SHA256 sobre `id:ts:request-id` con `PAYMENT_WEBHOOK_SECRET` |
| Errores post-transacción no abortan el flujo | Facturapi y Brevo usan `.catch(console.error)` — fallos son silenciosos y reintentables |
