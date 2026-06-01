# Carga masiva de productos — seed-catalog

Script reutilizable para cargar productos desde un Excel + carpeta de imágenes a la base de datos (Neon) y al almacenamiento de imágenes (Cloudflare R2).

---

## Cuándo usar este script

- **Carga inicial** del catálogo (ya ejecutada el 2026-06-01)
- **Lotes nuevos** de muchos productos a la vez (más eficiente que cargar uno por uno desde el admin)
- Si Irving entrega un Excel con productos + carpeta de imágenes y pide carga masiva

Para agregar productos individuales, usar el panel admin del sitio — es más rápido.

---

## Formato requerido del Excel

El archivo `.xlsx` debe tener una hoja con estas columnas exactas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `Category` | Categoría del producto | `Pokemon` |
| `Set` | Serie o colección | `Surging Sparks` |
| `Nombre del Producto` | Nombre completo (con espacios iniciales está bien) | `Surging Sparks Elite Trainer Box` |
| `Cantidad` | Stock disponible | `5` |
| `Precio` | Precio en MXN (sin símbolo) | `2000` |

Las columnas adicionales son ignoradas.

---

## Formato requerido de la carpeta de imágenes

```
📁 Mi Lote/
├── Nombre del Producto A/
│   ├── imagen1.jpg
│   └── imagen2.jpg
├── Nombre del Producto B/
│   ├── foto-frente.png
│   └── foto-atras.png
└── catalogo.xlsx
```

- **El nombre de cada subcarpeta debe coincidir** (parcialmente) con el `Nombre del Producto` del Excel
- Formatos soportados: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Las imágenes se ordenan alfabéticamente; la primera será la imagen principal del producto
- Una carpeta puede tener 1 o más imágenes — no hay límite

> **Tip:** Si el nombre de la carpeta y el del Excel difieren mucho, el script no encontrará las imágenes y el producto quedará sin fotos. En ese caso, renombrar la carpeta para que coincida con el Excel o viceversa.

---

## Cómo ejecutar

### 1. Asegurarse de estar en la carpeta `server/`

```bash
cd server
```

### 2. Verificar que el `.env` del servidor tiene las variables necesarias

```
DATABASE_URL=...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_PUBLIC_URL=...
```

### 3. Ejecutar el script

```bash
npm run seed:catalog -- "<ruta-al-excel>" "<carpeta-de-imagenes>"
```

**Ejemplo con el catálogo inicial:**

```bash
npm run seed:catalog -- "../public/Imagenes tienda/Catalogo producto cerrado.xlsx" "../public/Imagenes tienda"
```

**Ejemplo con un lote nuevo:**

```bash
npm run seed:catalog -- "/Users/emiliano/Downloads/lote-julio/catalogo.xlsx" "/Users/emiliano/Downloads/lote-julio"
```

> Las rutas pueden ser absolutas o relativas al directorio `server/`.

---

## Qué hace el script paso a paso

1. Lee todas las filas del Excel
2. Para cada producto:
   - Busca la subcarpeta de imágenes con nombre más parecido al del producto
   - Crea la categoría en la BD si no existe (ej. `pokemon`)
   - Sube cada imagen a R2 bajo `products/{slug}/imagen-N.ext`
   - Inserta el producto en Neon con nombre, precio, stock, set y categoría
   - Registra las URLs de R2 en `ProductImage` (la primera como `isPrimary: true`)
3. Si un producto con el mismo slug ya existe en la BD, **lo omite** — es seguro correr el script varias veces

---

## Salida esperada

```
📋 19 productos encontrados en el Excel

  📤 Subiendo imagen 1/2 de "Black Bolt Elite Trainer Box"... ✓
  📤 Subiendo imagen 2/2 de "Black Bolt Elite Trainer Box"... ✓
  ✅ Black Bolt Elite Trainer Box — 2 imagenes — $2000 MXN — stock: 1
  ...

─────────────────────────────────────
✅ Cargados:    19
⏭  Omitidos:   0 (ya existían)
⚠️  Sin imágenes: 0
❌ Errores:     0
─────────────────────────────────────
```

- `✅ Cargados` — productos nuevos insertados con éxito
- `⏭ Omitidos` — ya existían en la BD, no se duplicaron
- `⚠️ Sin imágenes` — producto insertado pero sin fotos (revisar nombre de la carpeta)
- `❌ Errores` — fallo al subir o insertar; revisar el mensaje de error en consola

---

## Solución de problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `⚠️ Sin imágenes` en un producto | El nombre de la carpeta no coincide con el Excel | Renombrar la carpeta o el campo en el Excel |
| `❌ Error: connect ECONNREFUSED` | La BD no está accesible | Verificar `DATABASE_URL` en `.env` |
| `❌ Error: InvalidSignatureException` | Credenciales R2 incorrectas o expiradas | Verificar las vars `CLOUDFLARE_R2_*` en `.env` |
| Producto omitido que debería actualizarse | Ya existe con el mismo slug | Eliminarlo desde el admin y volver a correr |

---

## Historial de cargas

| Fecha | Productos | Notas |
|-------|-----------|-------|
| 2026-06-01 | 19 (carga inicial) | Todos Pokémon. Shrouded Fable con imágenes `.avif` — cargado manualmente tras corregir filtro de extensiones |
