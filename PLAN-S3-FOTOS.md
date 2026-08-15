# Plan: Fotos en AWS S3 (subida pre-firmada)

> Proyecto: JuntosxRoldanillo · Estado: **pendiente de implementación**

## Objetivo
Migrar el almacenamiento de fotos de reportes desde **base64 en MongoDB** hacia **AWS S3** mediante **subida directa con URL pre-firmada (PUT)**, y **borrar la foto del bucket al eliminar el reporte** o el usuario.

## Contexto actual (código)
- La foto viaja como `data:image/jpeg;base64,...` en `Report.image` (MongoDB), comprimida en el cliente con canvas (JPEG 0.7, máx. 900 px, ≤ 600 KB).
- Archivos involucrados: `src/lib/types.ts` (campo `image`), `src/models/Report.ts`, `src/lib/store.ts` (`toReport`), `src/components/ReportForm.tsx` (compresión + preview), `src/components/ReportCard.tsx` (render `<img>`), `src/app/api/reports/route.ts` (valida tamaño).
- No hay SDK de AWS instalado.

## 0. Prerrequisitos del bucket (pasos manuales del usuario)
1. Crear bucket `emergiayuda-media` en AWS S3.
2. Configurar **CORS** del bucket: permitir `PUT` desde el origen de la app (headers `Authorization`, `Content-Type`).
3. Acceso público de lectura: CloudFront/CDN o bucket público → se usa como `S3_PUBLIC_URL`.
4. Crear credenciales IAM con permisos `PutObject` y `DeleteObject` limitados a ese bucket.
5. Configurar `.env.local`:
   ```env
   S3_REGION=us-east-1
   S3_BUCKET=emergiayuda-media
   S3_ACCESS_KEY_ID=...
   S3_SECRET_ACCESS_KEY=...
   S3_PUBLIC_URL=https://cdn.tudominio.com
   NEXT_PUBLIC_S3_ENABLED=true
   S3_ENDPOINT=                # opcional (R2/MinIO)
   ```

## 1. Dependencia
```
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 2. `src/lib/s3.ts` (server-only)
- `isS3Configured(): boolean`
- `getPresignedPutUrl(key: string, contentType: string): Promise<string>` (expiración 5 min)
- `buildPublicUrl(key: string): string`
- `deleteObject(key: string): Promise<void>`

## 3. API `POST /api/uploads/presign`
- Entrada: `{ contentType, size }`.
- Validaciones:
  - `contentType` debe ser `image/*`.
  - `size` ≤ 600 000 bytes.
- Genera `key = reports/{yyyy}/{mm}/{uuid}.jpg` (`crypto.randomUUID()`).
- Respuesta: `{ uploadUrl, key, publicUrl }`.
- Rate limit: reutilizar `src/lib/rateLimit.ts` (ej. 30 por 15 min por IP).

## 4. Modelo y tipos
- Agregar `imageKey?: string` a:
  - `Report` y `ReportInput` en `src/lib/types.ts`.
  - Schema `Report` en `src/models/Report.ts`.
  - `toReport` en `src/lib/store.ts` (mongo y memoria).
  - Seeds del store en memoria.
- `ReportPatch` no cambia.

## 5. `POST /api/reports` — modo S3 vs base64
- Acepta `imageKey` (nuevo) o `image` (base64, fallback).
- Si llega `imageKey`:
  - Validar formato `reports/...`.
  - **Construir `image = buildPublicUrl(imageKey)` en el servidor** (no confiar en URLs enviadas por el cliente).
  - Guardar también `imageKey`.
- Si llega `image` base64: validar ≤ 600 KB (comportamiento actual).
- Sin S3 configurado (`NEXT_PUBLIC_S3_ENABLED=false`): el cliente sigue usando base64, no rompe modo local/demo.

## 6. `ReportForm`
- Comprime con canvas (igual que hoy) y convierte a `Blob`.
- Si `NEXT_PUBLIC_S3_ENABLED`:
  1. `POST /api/uploads/presign` → `{ uploadUrl }`.
  2. `fetch(uploadUrl, { method: "PUT", body: blob })`.
  3. Guardar `imageKey` en el formulario (preview con `URL.createObjectURL` temporal).
- Si no: fallback base64 (actual).

## 7. Borrado de la foto al eliminar
- `DELETE /api/reports/[id]`: si el reporte tiene `imageKey` → `s3.deleteObject(key)` antes de borrar.
- `deleteUserReports` (cascada al eliminar usuario): cambiar a devolver `{ id, imageKey }[]`; el `DELETE /api/users/[id]` borra cada objeto del bucket y sigue emitiendo `report.deleted` por cada id.

## 8. `ReportCard`
- Sin cambios (ya renderiza `report.image`).
- Reportes antiguos con base64 siguen visibles (no se migran).

## 9. Verificación
- `npm run lint` y `npm run build` sin errores.
- Pruebas:
  - Subir foto → Mongo guarda URL corta + `imageKey` (no base64).
  - Foto visible en el feed.
  - Reporte sin foto sigue funcionando.
  - Modo local sin credenciales S3 → fallback base64.
  - Eliminar reporte y eliminar usuario → objeto S3 borrado (verificar en consola AWS).

## Riesgos / notas
- El bucket requiere **CORS + IAM** correctos (paso manual del usuario).
- Las fotos anteriores quedan como base64 (funcionan igual; migración opcional futura).
- `@aws-sdk` solo se importa en rutas servidor (no debe entrar al bundle del cliente).
- Posible foto huérfana si el cliente obtiene presign pero nunca sube (limpieza opcional futura).