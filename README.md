# BC 64 - Plataforma de Ganancias Profesional

Plataforma completa de earn-to-watch con autenticación JWT, panel de administración, depósitos/retiros, tareas diarias y ruleta.

## Requisitos

- **Node.js** v18 o superior → https://nodejs.org
- **MongoDB** v6 o superior → https://www.mongodb.com/try/download/community
- Git (opcional)

## Instalación rápida (Windows)

1. Doble clic en **`INSTALAR.bat`** — instala dependencias y configura `.env`
2. Edita `server/.env` con tu URI de MongoDB y secretos JWT
3. Doble clic en **`INICIAR.bat`** para arrancar frontend y backend

## Instalación manual

```bash
# 1. Instalar dependencias
cd server && npm install
cd ../client && npm install

# 2. Configurar variables de entorno
cp server/.env.example server/.env
# Edita server/.env

# 3. Seed (crea admin + planes VIP)
cd server && node utils/seeder.js

# 4. Iniciar en desarrollo
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

## Configuración (.env)

| Variable | Descripción | Obligatorio |
|----------|-------------|-------------|
| `MONGO_URI` | URI de conexión MongoDB | ✅ |
| `JWT_SECRET` | Secreto para access tokens | ✅ |
| `REFRESH_TOKEN_SECRET` | Secreto para refresh tokens | ✅ |
| `CLIENT_URL` | URL del frontend | ✅ |
| `ADMIN_EMAIL` | Email del superadmin | ✅ |
| `ADMIN_PASSWORD` | Contraseña del superadmin | ✅ |
| `EMAIL_HOST` | Servidor SMTP | ⚠️ |
| `CLOUDINARY_*` | Credenciales Cloudinary | ⚠️ |

## URLs de acceso

| Servicio | URL |
|----------|-----|
| Frontend (usuario) | http://localhost:5173 |
| Panel Admin | http://localhost:5173/admin |
| API Backend | http://localhost:5000/api |
| Health Check | http://localhost:5000/api/health |

## Credenciales admin por defecto

```
Email:    admin@bc64.com
Password: Admin2024BC!
```

**⚠️ Cambiar en producción editando `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`**

## Estructura del proyecto

```
BC64-Pro/
├── INSTALAR.bat          ← Instalación automática
├── INICIAR.bat           ← Arrancar app
├── server/               ← Backend Node.js + Express
│   ├── server.js         ← Entry point
│   ├── config/db.js      ← Conexión MongoDB
│   ├── models/           ← Schemas Mongoose (8 modelos)
│   ├── controllers/      ← Lógica de negocio (10 controllers)
│   ├── routes/           ← Rutas API (10 archivos)
│   ├── middleware/       ← Auth, errores, uploads
│   ├── utils/            ← Logger, email, seeder
│   └── uploads/          ← Comprobantes de pago locales
└── client/               ← Frontend React + Vite + Tailwind
    └── src/
        ├── App.jsx        ← Rutas principales
        ├── api/axios.js   ← API layer con interceptors
        ├── context/       ← Auth context con refresh automático
        ├── pages/
        │   ├── auth/      ← Login, Registro, Reset password
        │   ├── app/       ← Home, Tareas, VIP, Ruleta, Referidos, Perfil
        │   └── admin/     ← Dashboard, Usuarios, Depósitos, Retiros, Stats
        └── components/    ← UI reutilizable + layouts
```

## API Endpoints principales

### Auth
- `POST /api/auth/register` — Registro
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Usuario actual

### Usuario
- `GET /api/vip/plans` — Planes VIP
- `POST /api/deposits` — Crear depósito + voucher
- `POST /api/withdrawals` — Solicitar retiro
- `GET /api/tasks/status` — Estado de tareas
- `POST /api/tasks/complete` — Completar tarea
- `POST /api/roulette/start` — Iniciar giro
- `POST /api/roulette/spin/:id` — Completar giro
- `GET /api/referrals/my` — Mis referidos

### Admin (requiere rol admin/superadmin)
- `GET /api/admin/dashboard` — Estadísticas generales
- `GET /api/admin/users` — Listar usuarios
- `PUT /api/admin/users/:id/ban` — Banear usuario
- `POST /api/admin/users/:id/balance` — Ajustar balance
- `PUT /api/deposits/:id/approve` — Aprobar depósito
- `PUT /api/deposits/:id/reject` — Rechazar depósito
- `PUT /api/withdrawals/:id/complete` — Completar retiro

## Seguridad

- JWT con access tokens (15min) + refresh tokens (30d) en HttpOnly cookies
- Contraseñas hasheadas con bcrypt (12 rounds)
- Rate limiting en todas las rutas de auth
- Sanitización contra NoSQL injection y XSS
- CORS configurado solo para el origen autorizado
- Helmet para cabeceras HTTP seguras

## Producción

```bash
# Build del frontend
cd client && npm run build
# El build se copia automáticamente a server/public/

# Iniciar servidor (sirve frontend + API)
cd server && NODE_ENV=production npm start
```

## Soporte para imágenes (Cloudinary)

Sin Cloudinary configurado, los vouchers se guardan en `server/uploads/vouchers/`. Para producción, configura las variables `CLOUDINARY_*` en `.env`.
"# NOVA-T" 
"# NOVA-T" 
