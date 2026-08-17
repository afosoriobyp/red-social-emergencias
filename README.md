# JuntosxRoldanillo 🚨

**Red social de respuesta ante emergencias** — una PWA construida con Next.js (App Router) + MongoDB Atlas para reportar y coordinar ayuda en tiempo real durante terremotos, accidentes, derrumbes, conflictos y otras emergencias.

> Aplicación PWA tipo red social para la atención de emergencias con canales de **Reportes, Donaciones, Puntos de Acopio, Voluntarios, Atención Médica, Albergues y Noti/Novedades**, mapa interactivo, notificaciones por WhatsApp, autenticación por roles y un **dashboard de control de mando** para administradores y coordinadores.

---

## ✨ Características

### Canales / Categorías
Cada canal tiene sus propias **subcategorías** (campo `type`), que se eligen al reportar y se pueden filtrar dentro del canal:

- 🚨 **Reportes** — incidentes: terremoto, incendio, inundación, derrumbe, accidente, conflicto.
- 🎁 **Donaciones** — medicina, ropa, alimentos, agua, higiene.
- 📦 **Puntos de Acopio** — alimentos, medicina, ropa, agua, herramientas.
- 🤝 **Voluntarios** — logística, primeros auxilios, transporte, rescate.
- 🏥 **Atención Médica** — urgencia, consulta, vacunación, apoyo psicológico.
- 🏠 **Albergues** — refugio temporal, refugio permanente, capacidad.
- 📢 **Noti/Novedades** — avisos e información comunitaria.
- 🗺️ **Mapa** — vista geográfica de todos los incidentes.

Para agregar más subcategorías: edita `EMERGENCY_TYPES`, `TYPE_LABELS` y `CATEGORY_TYPES` en `src/lib/types.ts`.

### Vistas dedicadas por canal
- Rutas `/canal/reporte`, `/canal/donaciones`, `/canal/acopio`, `/canal/voluntarios`, `/canal/medico`, `/canal/albergues`, `/canal/noti` con feed filtrado por categoría, paginación "Cargar más" y filtros propios (estado, subtipo, gravedad, búsqueda, "cerca de mí").
- Acceso a canales desde el **BottomBar** y el **botón flotante de reporte**.

### Reporte de emergencias (fácil y rápido)
- Formulario **paso a paso** (3 pasos): qué pasó → dónde → detalle.
- **Geolocalización automática** del navegador + coordenadas manuales + referencia/zona.
- Nivel de **gravedad** (crítica, alta, media, baja) con indicación visual por color.
- Teléfono/WhatsApp de contacto (**obligatorio**): se precarga del usuario logueado y se usa para los enlaces de WhatsApp y coordinar ayuda.
- **Modo offline**: si no hay conexión, el reporte se guarda en IndexedDB y se sincroniza al recuperar red.

### Tiempo real (SSE) — arquitectura multi-instancia
- Los reportes **creados, actualizados o eliminados** se reflejan al instante en todas las pestañas abiertas vía **Server-Sent Events**.
- **Bus de eventos** con adaptador **memoria** (monoproyecto) y **Redis Pub/Sub** (producción multi-instancia, configurando `REDIS_URL`).
- Replay con `Last-Event-ID` y historial de 200 eventos para reconexión sin pérdida.
- Límite de 1 000 clientes por instancia; heartbeat 25 s.

### WhatsApp
- Enlace dinámico `https://wa.me/...` por reporte con mensaje prearmado (gravedad, tipo, descripción y ubicación en Google Maps) para **difundir la alerta** y coordinar.
- Botón en feed y tarjetas con icono SVG oficial.

### Autenticación y roles
- Registro e inicio de sesión con teléfono/identificador + contraseña (JWT firmado en cookie `httpOnly`).
- Roles: **usuario, voluntario, coordinador, admin**.
- Los teléfonos en `ADMIN_PHONES` se registran como **admin** automáticamente.
- Middleware (proxy) protege `/dashboard` y `/perfil` exigiendo sesión activa y rol admin/coordinador.

### Núcleo social (comentarios y reacciones)
- **Comentarios** por reporte (hilo desplegable, contador SSR + actualización SSE).
- **Reacciones emoji** (👍 💧 🍞 🏥 🚛) toggle optimista + persistencia localStorage.
- **Perfil** (`/perfil`): "Mis reportes" con edición/eliminación del autor, **cambio de contraseña**.
- **Admin/coordinador**: reset de contraseña de cualquier usuario desde el panel de usuarios.

### Dashboard de control de mando (`/dashboard`)
- Acceso solo para **admin/coordinador** (protección por rol en middleware y API).
- **KPIs**: incidentes críticos, activos, en proceso y resueltos.
- **Mapa de mando** con encuadre suave a los incidentes según filtro de estado.
- **Gestión de incidentes** en panel expandible ("Sesión de gestión"):
  - Select de estado: **Activo / Tomar-en proceso / Resolver** (asigna gestor al pasar a "en proceso").
  - Select de **gravedad** (Crítica/Alta/Media/Baja) — validación experta.
  - Select de **responsable** con nombres y roles del personal activo (admin/coordinador/voluntario).
  - **Verificado** (toggle anti-bulos), **Eliminar** (solo no verificados), **Escalar a crítica** (cubierto por select de gravedad).
  - Campo "Solución/detalle" + **Guardar gestión** (persiste assignedTo + solution).
- **Auditoría** (`/api/audit`): log de acciones (creación, actualización, cambio de rol/estado, eliminación) con filtro y paginación.
- **Exportación CSV** de reportes filtrados (18 columnas, `Content-Disposition` correcto).

### PWA robusta (offline-first)
- `manifest.ts` dinámico (nombre desde `NEXT_PUBLIC_APP_NAME`), iconos PNG (192/512/maskable/apple-touch) y **Service Worker v2**:
  - Navigation preload + stale-while-revalidate para navegación.
  - Caché dedicado `/api/reports` (GET) con fallback offline.
  - Push notifications con `requireInteraction` para alertas críticas.
- **IndexedDB** (`red-emergencias-offline`): caché de reportes + cola de acciones pendientes (crear reporte offline → sincroniza al volver online).
- Indicador visual "Modo offline" en el feed.

### Seguridad endurecida
- **Headers globales** (`next.config.ts`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono, geolocalización, push).
- **Middleware proxy**: protección de rutas, redirección login si ya autenticado, inyección `X-Client-IP`.
- **Rate limiting** por ruta (`login`, `register`, `reports`, `comments`, `react`, `change-password`) con hash SHA-256 de IP; bucket "unknown" limitado a 5 req/ventana.
- Contraseñas con **bcrypt** (salt 10), JWT `jose` HS256, cookie `httpOnly + sameSite=lax + secure` en producción.
- Validación de entrada en todas las rutas API; autorización por rol (403 si no corresponde).

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16 (App Router)** + React 19 |
| Lenguaje | **TypeScript** |
| Estilos | **Tailwind CSS v4** + Lucide icons |
| Base de datos | **MongoDB Atlas** (Mongoose 9, índice `2dsphere`) |
| Mapas | **Leaflet + react-leaflet** (OpenStreetMap, sin API key) |
| Tiempo real | **Server-Sent Events (SSE)** con bus pub/sub (memoria / Redis opcional) |
| Autenticación | JWT con **jose** + **bcryptjs** |
| PWA | Service Worker + Web App Manifest + IndexedDB (offline queue) |
| Rate limit | En memoria por IP hash + scope por ruta |

---

## 📁 Estructura del proyecto

```
red-social-emergencia/
├─ public/
│  ├─ icon_emergencia.png       # Icono de la app (fuente 512×512)
│  ├─ icon-192.png              # Icono Android/Chrome (192×192)
│  ├─ icon-512.png              # Icono Android/Chrome (512×512)
│  ├─ icon-maskable-512.png     # Icono maskable (área segura 80%)
│  ├─ apple-touch-icon.png      # Icono iOS (180×180)
│  ├─ icon-32.png / icon-16.png # Favicon
│  └─ sw.js                     # Service worker v2 (navigation, API cache, fallback)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx            # Layout raíz + metadata PWA + registro SW
│  │  ├─ manifest.ts           # Web App Manifest dinámico (NEXT_PUBLIC_APP_NAME)
│  │  ├─ page.tsx              # Feed/mapa principal (SSR + paginación)
│  │  ├─ globals.css           # Estilos globales (Tailwind)
│  │  ├─ login/page.tsx        # Autenticación
│  │  ├─ perfil/page.tsx       # Perfil + mis reportes + cambio contraseña
│  │  ├─ dashboard/page.tsx    # Control de mando (server, protegido)
│  │  ├─ canal/[canal]/page.tsx# Vistas dedicadas por categoría
│  │  └─ api/
│  │     ├─ auth/{register,login,logout,me,change-password}/route.ts
│  │     ├─ reports/route.ts           # GET (paginado+filtros) + POST (crear)
│  │     ├─ reports/[id]/route.ts      # PATCH (estado/gravedad/verificado) + DELETE
│  │     ├─ reports/[id]/comments/route.ts # GET/POST comentarios + SSE
│  │     ├─ reports/[id]/react/route.ts    # POST reacciones + SSE
│  │     ├─ reports/export/route.ts    # GET CSV (admin/coordinador)
│  │     ├─ users/route.ts             # GET/POST usuarios (admin)
│  │     ├─ users/staff/route.ts       # GET personal activo (admin/coordinador)
│  │     ├─ users/[id]/route.ts        # PATCH rol/estado/password + DELETE cascada
│  │     ├─ audit/route.ts             # GET auditoría (admin, paginada)
│  │     ├─ events/route.ts            # SSE stream (replay + Last-Event-ID)
│  │     └─ push/{subscribe,unsubscribe}/route.ts
│  ├─ components/
│  │  ├─ AppShell.tsx           # Feed principal + paginación + offline banner
│  │  ├─ ChannelShell.tsx       # Vista de canal (feed filtrado + paginación)
│  │  ├─ DashboardShell.tsx     # Dashboard + panel gestión + select gravedad/responsable
│  │  ├─ ProfileShell.tsx       # Perfil + mis reportes + password + modal reset (admin)
│  │  ├─ ReportCard.tsx         # Tarjeta reporte (acciones icon-only, colores, hilo comentarios)
│  │  ├─ ReportForm.tsx         # Formulario 3 pasos + encolado offline
│  │  ├─ Header.tsx             # Header (server, branding desde NEXT_PUBLIC_APP_NAME)
│  │  ├─ ChannelsDropdown.tsx   # Dropdown canales (click/tap, click-outside close)
│  │  ├─ UsersPanel.tsx         # Gestión usuarios + reset password modal
│  │  ├─ AuditPanel.tsx         # Auditoría paginada
│  │  ├─ CategoryFilter.tsx     # Filtros categoría (chips)
│  │  ├─ MapView.tsx            # Mapa Leaflet centrado en la ciudad (env)
│  │  └─ ... (BottomBar, PushManager, AccountMenu, etc.)
│  ├─ hooks/
│  │  ├─ useRealtimeReports.ts  # SSE hook (created/updated/deleted/comment)
│  │  └─ useCriticalAlert.ts    # Alerta sonora crítica
│  ├─ lib/
│  │  ├─ types.ts               # Tipos: Report, User, Comment, categorías, gravedad, roles
│  │  ├─ store.ts               # Abstracción datos (Mongo + memoria) + paginación
│  │  ├─ db.ts                  # Conexión Mongo (cacheada)
│  │  ├─ auth.ts                # JWT, sesión, cookies, roles, authorize
│  │  ├─ eventBus.ts            # Bus pub/sub (MemoryEventBus / RedisEventBus)
│  │  ├─ events.ts              # Entrega SSE local + propagación bus + replay
│  │  ├─ idb.ts                 # IndexedDB: caché reportes + cola offline
│  │  ├─ rateLimit.ts           # Rate limit por ruta + hash IP + límite unknown
│  │  ├─ whatsapp.ts            # Constructores wa.me
│  │  ├─ geo.ts                 # Geocodificación inversa (Nominatim)
│  │  └─ push.ts                # Web Push (VAPID)
│  ├─ middleware.ts             # Proxy middleware (auth + IP header)
│  └─ models/                   # Mongoose: Report, User, Comment, AuditLog
```

---

## 🚀 Inicio rápido

### 1) Requisitos
- Node.js 18+ (probado con Node 20+)
- Cuenta de **MongoDB Atlas** (o usar el modo demo en memoria, sin DB)

### 2) Instalar dependencias
> En Windows PowerShell, si `npm` falla por la política de ejecución, usa `npm.cmd`.

```bash
npm install        # o: npm.cmd install
```

### 3) Configurar variables de entorno
Copia y ajusta tu archivo `.env.local`:

```env
# MongoDB Atlas (opcional: si lo omites, la app usa un almacén en memoria = modo demo)
MONGODB_URI="mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/emergencia?retryWrites=true&w=majority"

# Secreto para firmar sesiones JWT (¡cámbialo en producción!)
AUTH_SECRET="una-cadena-larga-y-aleatoria"

# Teléfonos (código de país, sin +) que se registran como ADMIN. Separados por coma.
# IMPORTANTE: no subas valores reales a repos públicos; usa variables de entorno en el despliegue.
ADMIN_PHONES="<CODIGO_PAIS><NUMERO_ADMIN_1>,<CODIGO_PAIS><NUMERO_ADMIN_2>"

# Contacto WhatsApp por defecto para reenvío de alertas (opcional)
DEFAULT_WHATSAPP="<CODIGO_PAIS><NUMERO>"
NEXT_PUBLIC_DEFAULT_WHATSAPP="<CODIGO_PAIS><NUMERO>"

# Web Push (VAPID) - genera con: npx web-push generate-vapid-keys
WEB_PUSH_PUBLIC_KEY=""
WEB_PUSH_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@tudominio.com"

# Opcional: Redis Pub/Sub para SSE multi-instancia (producción)
# REDIS_URL="redis://user:pass@host:6379"

# --- Configuración por ciudad/municipio (una instancia por ciudad) ---
# Nombre de la aplicación para el branding (header, PWA, notificaciones)
NEXT_PUBLIC_APP_NAME="JuntosxRoldanillo"
# Ciudad/municipio que atiende esta instancia
NEXT_PUBLIC_CITY="Roldanillo"
# Coordenadas del centro del municipio (centro inicial del mapa)
NEXT_PUBLIC_CITY_LAT="4.409907659333038"
NEXT_PUBLIC_CITY_LNG="-76.14893382693923"
# Radio por defecto de "Cerca de mí" en km (opcional, default 25)
NEXT_PUBLIC_NEARBY_KM="25"
```

> 💡 Copia `.env.example` a `.env.local` y reemplaza con tus credenciales reales. **Nunca cometas `.env.local`.**

### 4) Ejecutar en desarrollo

```bash
npm run dev          # o: npm.cmd run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## 🧪 Comandos útiles

```bash
npm run dev      # servidor de desarrollo (recarga en caliente)
npm run build    # compilación de producción + chequeo de tipos
npm run start    # sirve el build de producción
npm run lint     # análisis estático (ESLint)
```

---

## 👤 Primeros pasos como administrador

1. Coloca **tu teléfono** (código de país, sin `+`) en `ADMIN_PHONES` de `.env.local`.
2. Reinicia el servidor.
3. Entra a **Acceder** → pestaña **Registrar** y crea una cuenta con ese teléfono.
4. Automáticamente se crea con rol **Admin**.
5. Desde el menú de cuenta (esquina superior derecha) abre **Control de mando** (`/dashboard`).

---

## 💻 API

| Método | Ruta | Descripción | Protección |
|--------|------|-------------|------------|
| GET | `/api/reports` | Lista reportes paginada (`page`, `limit`, filtros) | Pública |
| POST | `/api/reports` | Crea un reporte | Pública |
| PATCH | `/api/reports/[id]` | Cambiar estado, gravedad, verificado, asignar, solución | admin/coordinador/autor |
| DELETE | `/api/reports/[id]` | Eliminar reporte | admin/coordinador/autor |
| GET | `/api/reports/[id]/comments` | Comentarios del reporte | Sesión activa |
| POST | `/api/reports/[id]/comments` | Añadir comentario | Sesión activa |
| POST | `/api/reports/[id]/react` | Toggle reacción emoji | Sesión activa |
| GET | `/api/reports/export` | CSV export (18 cols) | admin/coordinador |
| POST | `/api/auth/register` | Crear cuenta (rol según `ADMIN_PHONES`) | Pública |
| POST | `/api/auth/login` | Iniciar sesión (JWT en cookie) | Pública |
| POST | `/api/auth/logout` | Cerrar sesión | Pública |
| POST | `/api/auth/change-password` | Cambiar contraseña (verifica actual) | Sesión activa |
| GET | `/api/auth/me` | Datos del usuario en sesión | Pública |
| GET | `/api/events` | **Stream SSE** (`report.*`, `comment.created`, replay) | Pública |
| GET | `/api/users` | Lista usuarios | admin |
| POST | `/api/users` | Crear usuario | admin |
| GET | `/api/users/staff` | Personal activo (admin/coordinador/voluntario) | admin/coordinador |
| PATCH | `/api/users/[id]` | Cambiar rol, estado, password | admin |
| DELETE | `/api/users/[id]` | Eliminar usuario + reportes (cascada + SSE) | admin |
| GET | `/api/audit` | Log auditoría (paginado, filtros) | admin |
| POST | `/api/push/subscribe` | Guardar suscripción push | Sesión activa |
| POST | `/api/push/unsubscribe` | Borrar suscripción | Sesión activa |

---

## 🌍 Despliegue (producción)

Se recomienda **Vercel** (integración nativa con Next.js).

1. Sube el proyecto a tu repositorio (GitHub).
2. Importa en Vercel.
3. Configura las variables de entorno: `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_PHONES`, `DEFAULT_WHATSAPP`, `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `VAPID_SUBJECT`, y **`REDIS_URL`** (opcional, para SSE multi-instancia).
4. Despliega. La PWA quedará instalable y con service worker.

> **Tiempo real en producción:** el bus SSE usa **memoria** por defecto (mono-instancia). Si usas Vercel (serverless multi-instancia) **configura `REDIS_URL`** para activar el adaptador Redis Pub/Sub y lograr sincronización global entre instancias. Sin Redis, cada instancia mantiene sus propias conexiones SSE y los eventos no cruzarán entre ellas.

### 🏙️ Despliegue multi-ciudad (una instancia por ciudad/municipio)

Cada ciudad/municipio es un **despliegue independiente** con su propia base de datos y sus propios administradores. Los datos quedan aislados por base de datos; la app se parametriza con variables de entorno:

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `JuntosxRoldanillo` | Branding (header, PWA, notificaciones) |
| `NEXT_PUBLIC_CITY` | `Roldanillo` | Ciudad que atiende la instancia (valor inicial del formulario) |
| `NEXT_PUBLIC_CITY_LAT` / `NEXT_PUBLIC_CITY_LNG` | `4.409907659333038` / `-76.14893382693923` | Centro inicial del mapa |
| `NEXT_PUBLIC_NEARBY_KM` | `25` | Radio por defecto de "Cerca de mí" (opcional) |
| `MONGODB_URI` | …`/emergencia-roldanillo` | Base de datos **propia** de la ciudad |
| `ADMIN_PHONES` | `57300…` | Administradores **locales** de la ciudad |

**Pasos por cada ciudad:**
1. Importa el repositorio en Vercel (o crea un *Preview Environment*).
2. En las variables de entorno, cambia `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_CITY` y las coordenadas al municipio correspondiente.
3. Apunta `MONGODB_URI` a una base de datos distinta (p.ej. `emergencia-roldanillo`, `emergencia-dosquebradas`).
4. Define `ADMIN_PHONES` con los teléfonos locales que serán administradores.
5. Despliega. Repite para cada municipio.

> ⚠️ Al ser **una instancia por ciudad**: el formulario asigna la ciudad automáticamente desde `NEXT_PUBLIC_CITY` (no hay selector de ciudad/municipio), el **mapa abre centrado** en `NEXT_PUBLIC_CITY_LAT/LNG`, y el **feed filtra** los reportes de la instancia por esa misma ciudad (`ReportFilter.city` en `src/lib/store.ts`), también en SSE y export CSV.

---

## 🔒 Seguridad y buenas prácticas

- Contraseñas con **bcrypt** (hash + salt 10).
- Sesiones **JWT** firmadas HS256, cookie **httpOnly + sameSite=lax** (secure en producción, 7 días).
- Middleware proxy protege `/dashboard` y `/perfil` (sesión activa + rol admin/coordinador); redirige `/login` si ya autenticado.
- Endpoints de gestión protegidos por **rol** (403 si no autorizado).
- Validación de entrada estricta en rutas API (Zod-like manual).
- Rate limiting por **ruta + IP hasheada (SHA-256)**; bucket "unknown" limitado a 5 req/15 min.
- Headers de seguridad globales: `nosniff`, `DENY`, `strict-origin-when-cross-origin`, `Permissions-Policy`.
- Índice geoespacial `2dsphere` en `Report` para consultas por cercanía (escalable).
- No se registran secretos: `.env.local` está en `.gitignore`.
- Auditoría completa de acciones sensibles (crear/editar/borrar reportes, usuarios, roles, estados).

---

## ⚠️ Consideraciones / pendientes sugeridos

- **Fotos en reportes**: migración a S3 con URLs prefirmadas (ver `PLAN-S3-FOTOS.md`).
- **Notificaciones push** Web Push completas (suscripción + envío servidor).
- **Índice de búsqueda** full-text (Mongo Atlas Search o Meilisearch).
- **Tests automatizados** (Jest + React Testing Library + Playwright E2E).
- **Internacionalización** (i18n) para textos de UI.
- **Monitoreo** (Sentry, logs estructurados, métricas SSE/clients).

---

## 📄 Licencia

Proyecto privado de uso interno. Ajusta la licencia según tu contexto.