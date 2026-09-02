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

No uses tu correo en ese recuadro. Google pide una **llave de permiso** (un texto largo que termina en `.apps.googleusercontent.com`) para que esta página pueda crear eventos en tu calendario.

1. [Activa Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
2. [Credenciales](https://console.cloud.google.com/apis/credentials) → Crear credenciales → ID de cliente de OAuth → **Aplicación web**.
3. Orígenes de JavaScript autorizados:
   - `http://127.0.0.1:4173`
   - `https://raimundoibieta.github.io`
4. Copia esa llave, pégala en **Perfil** → Guardar llave → **Conectar Google** (ahí sí entra con tu Gmail).

## Nube (Firebase)

El planner ya está conectado al proyecto `planner-2027`. Faltan 3 clics en tu consola, si no los hiciste:

1. [Authentication](https://console.firebase.google.com/project/planner-2027/authentication/providers) → **Correo/contraseña** → Activar.
2. [Firestore](https://console.firebase.google.com/project/planner-2027/firestore) → Crear base de datos (modo de prueba está bien al inicio).
3. Firestore → **Reglas** → pega el contenido de `firestore.rules` → Publicar.
4. Authentication → **Settings** → **Authorized domains** → agrega `raimundoibieta.github.io` (y `127.0.0.1` si pruebas en local).

Después: **Salir** en el planner y entra otra vez. En Perfil debe decir **Nube conectada**. Lo que escribas en el iPhone aparece en Chrome al recargar, y al revés.
