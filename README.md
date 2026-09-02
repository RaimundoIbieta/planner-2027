# Planner 2027 · One Piece

Bitácora personal 2027.

**Sitio:** https://raimundoibieta.github.io/planner-2027/

Entra con tu correo y tu clave.

## Cómo usarlo

- **Hoy:** ánimo, lo importante y notas del día.
- **Mes:** calendario, objetivo y **cierre de mes** (logros, aprendizajes, mejoras, pendientes).
- **Año:** los 12 meses y el **cierre de cada trimestre**.
- **Perfil:** tus datos y exportar/importar.

En el iPhone: Safari → Compartir → Añadir a pantalla de inicio.

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
