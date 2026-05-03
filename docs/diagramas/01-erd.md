# Diagrama Entidad-Relación — Irving TCG Ecommerce

> Generado desde `server/prisma/schema.prisma`  
> Visualizar en: [Mermaid Live](https://mermaid.live) o cualquier editor con soporte Mermaid.

```mermaid
erDiagram
    Category {
        String id PK
        String name
        String slug UK
        String description
        String imageUrl
        DateTime createdAt
    }

    Product {
        String id PK
        String categoryId FK
        String name
        String cardNumber
        String setName
        String edition
        String language
        String rarity
        String condition
        String variant
        Decimal price
        Int stock
        Boolean isActive
        String slug UK
        String description
        DateTime createdAt
        DateTime updatedAt
    }

    ProductImage {
        String id PK
        String productId FK
        String url
        Boolean isPrimary
        Int sortOrder
    }

    Customer {
        String id PK
        String email UK
        String fullName
        String phone
        Json defaultAddress
        DateTime createdAt
    }

    Order {
        String id PK
        String customerId FK
        String guestEmail
        String guestName
        String guestPhone
        Json shippingAddress
        String shippingMethod
        Decimal shippingCost
        Decimal subtotal
        Decimal total
        String paymentMethod
        String paymentStatus
        String paymentReference
        String orderStatus
        String trackingNumber
        Boolean requiresInvoice
        DateTime createdAt
        DateTime updatedAt
    }

    OrderItem {
        String id PK
        String orderId FK
        String productId FK
        Int quantity
        Decimal unitPrice
        Decimal subtotal
    }

    Invoice {
        String id PK
        String orderId FK "unique"
        String rfc
        String razonSocial
        String cfdiUse
        String facturapiInvoiceId
        String pdfUrl
        String xmlUrl
        String status
        DateTime createdAt
    }

    ShippingQuote {
        String id PK
        String sessionId
        Json destinationAddress
        Json quotesResponse
        String selectedCarrier
        Decimal selectedCost
        DateTime expiresAt
        DateTime createdAt
    }

    BlogPost {
        String id PK
        String title
        String slug UK
        String body
        String excerpt
        String featuredImageUrl
        String categoryId FK
        String tags
        Boolean isPublished
        DateTime publishedAt
        String metaTitle
        String metaDescription
        DateTime createdAt
        DateTime updatedAt
    }

    EmailSubscriber {
        String id PK
        String email UK
        String fullName
        String source
        Boolean isBuyer
        String brevoContactId
        DateTime subscribedAt
        DateTime unsubscribedAt
    }

    Category ||--o{ Product : "tiene"
    Category ||--o{ BlogPost : "agrupa"
    Product ||--o{ ProductImage : "tiene"
    Product ||--o{ OrderItem : "aparece en"
    Customer ||--o{ Order : "realiza"
    Order ||--o{ OrderItem : "contiene"
    Order ||--o| Invoice : "genera"
```

## Enums del sistema

| Enum | Valores |
|------|---------|
| `Edition` | `first_edition`, `shadowless`, `unlimited` |
| `Language` | `es`, `en`, `jp` |
| `Condition` | `mint`, `near_mint`, `lightly_played` |
| `Variant` | `standard`, `holo`, `reverse_holo` |
| `PaymentStatus` | `pending`, `confirmed`, `failed` |
| `OrderStatus` | `pending_payment`, `confirmed`, `preparing`, `shipped`, `delivered`, `cancelled` |
| `InvoiceStatus` | `draft`, `valid`, `cancelled` |
| `SubscriberSource` | `homepage_form`, `checkout`, `manual` |

## Notas de diseño

- **`Customer.id`** no usa `cuid()` — se establece externamente (Clerk user ID).
- **`Order.customerId`** es opcional para soportar compras como invitado (`guestEmail`/`guestName`/`guestPhone`).
- **`Order → Invoice`** es relación 1-a-1 única (`@unique` en `Invoice.orderId`).
- **`ShippingQuote`** es efímera — persiste la cotización de Skydropx con `expiresAt` para no recotizar si el usuario navega hacia atrás.
- **`EmailSubscriber`** es independiente de `Customer` — un suscriptor puede nunca haber comprado.
