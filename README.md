# Planner 2027 · One Piece

Bitácora personal 2027.

**Sitio:** https://raimundoibieta.github.io/planner-2027/

Entra con tu correo y tu clave.

## Cómo usarlo

- **Hoy:** ánimo del nakama del mes, lo importante, **eventos** y notas del día.
- **Mes:** póster oficial del arco, calendario y **cierre de mes** (ánimo del personaje, nota 1–7, logros).
- **Año:** los 12 meses y el **cierre de cada trimestre**, con nota 1–7 por mes.
- **Perfil:** tus datos, Google Calendar, exportar/importar.

En el iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Google Calendar

Para que un evento exista en el planner y en Google:

1. En [Google Cloud](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) activa **Google Calendar API**.
2. [Credenciales](https://console.cloud.google.com/apis/credentials) → Crear credenciales → **ID de cliente de OAuth** → tipo **Aplicación web**.
3. Orígenes de JavaScript autorizados:
   - `http://127.0.0.1:4173`
   - `https://raimundoibieta.github.io`
4. Copia el ID (termina en `.apps.googleusercontent.com`), pégalo en **Perfil** y toca **Conectar Google**.

## Base de datos (cuando sincronices iPhone y Chrome)

GitHub Pages no trae servidor. **No uses Supabase** si ya llegaste al tope de proyectos.

Crea una cuenta **gratis** en Firebase (plan Spark), con el mismo Gmail:

**https://console.firebase.google.com**

1. **Add project** → nombre `planner-2027`
2. **Authentication** → Email/Password → Enable
3. **Firestore Database** → Create (modo de prueba)
4. Ícono de engrane → **Project settings** → tus apps → **Web** (`</>`) → copia el `firebaseConfig`
5. Pásame ese bloque y conecto login + bitácora

Plan Spark es gratis para un planner personal. No hace falta tarjeta.
