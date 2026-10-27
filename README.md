# Log Pose Console

Consola en React + TypeScript para la Guild de Cazarrecompensas: carteles de "Se Busca", noticias
del mundo y la gran saga del Grand Line. Hackathon Frontend CS2031 · *Rumbo al Grand Line*.

El enunciado completo está en [ENUNCIADO.md](ENUNCIADO.md).

## Integrantes

| Nombre | Código |
|:--|:--|
| Valentina Puicon | COMPLETAR_CODIGO |
| Jocelyn Uceda | COMPLETAR_CODIGO |
| Nayra Paredes | COMPLETAR_CODIGO |

**Código de equipo (`TEAM_CODE`):** TEAM-XXX

## Cómo ejecutar

Requisitos: Node 24 LTS y npm.

1. Instalar dependencias:

   ```bash
   npm ci
   ```

2. Crear el archivo `.env` a partir del ejemplo (contiene solo la URL pública de la API):

   ```bash
   cp .env.example .env
   ```

   En Windows (PowerShell): `Copy-Item .env.example .env`

3. Levantar el entorno de desarrollo y abrir http://localhost:5173:

   ```bash
   npm run dev
   ```

4. Compilar para producción (verifica tipos con TypeScript estricto):

   ```bash
   npm run build
   ```

Para entrar se usa el email y la contraseña de la tripulación (no se incluyen en el repositorio).

## Stack

React 19 · TypeScript estricto · Vite · React Router · Tailwind CSS · Fetch API.

## Funcionalidades

| Checkpoint | Ruta | Qué incluye |
|:--|:--|:--|
| CP1 · Zarpar | `/login`, `/register`, `/dashboard` | Registro y login, rutas privadas que vuelven a la ruta pedida, restauración de sesión, cierre por sesión vencida, logout, dashboard con el estado del Log Pose y página 404 |
| CP2 · Se Busca | `/wanted`, `/wanted/:id` | Paginación del servidor, filtros, búsqueda con debounce, orden y tamaño en la URL, protección contra respuestas tardías y detalle que conserva el listado al volver |
| CP4 · News Coo | `/news`, `/news/:id` | Infinite scroll por cursor sin duplicados, filtros en la URL, detalle sobre el feed y verificación de rumores |
| CP5 · Poneglyph | `/sagas`, `/sagas/:id` | Resumen de sagas y historia con scrollytelling: mapa persistente, colores y métricas por etapa, etapa activa en la URL, navegación por teclado, scroll-driven animations, View Transitions y soporte de `prefers-reduced-motion` |

## Estructura

```
src/
  api/         cliente HTTP y llamadas a la API
  auth/        sesión, rutas privadas y restauración
  components/  componentes compartidos (layout, formularios, estados)
  pages/       pantallas de cada checkpoint
  types/       tipos de la API
```
