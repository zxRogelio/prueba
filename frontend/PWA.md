# PWA de Titanium Sport Gym

Implementación en `feature/pwa-titanium`. Sin cambios en el backend, las rutas protegidas, los proveedores de autenticación ni los servicios de pago. Sin commit, merge ni push.

El modo offline requiere una primera carga **online y un precaché completado**. Un dispositivo que nunca descargó los archivos no puede abrir esta aplicación por primera vez sin conexión. El navegador puede borrar el almacenamiento; en ese caso hay que descargarlo nuevamente.

## Ejecutar

Desde `frontend/`, con Node compatible con Vite 7:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run preview -- --host localhost --port 4173
```

Abrir `http://localhost:4173`. Usar el build de producción: `npm run dev` no registra este Service Worker. En producción se necesita HTTPS. En Vercel, configurar `frontend` como Root Directory, `npm run build` como Build Command, `dist` como Output Directory y la variable pública `VITE_API_URL` del backend correspondiente. Si no se define, se conserva `http://localhost:5000/api`.

Las pruebas de navegador usan respuestas controladas para los endpoints públicos; no requieren iniciar el backend:

```powershell
npx.cmd playwright install chromium
npm.cmd run lint
npm.cmd run build
npm.cmd run test:pwa
```

En shells distintos de PowerShell puede usarse `npm`/`npx` sin `.cmd`. Si Node no confía en el certificado de la red y el certificado raíz está instalado en Windows, usar `$env:NODE_USE_SYSTEM_CA='1'` en esa terminal, sin desactivar TLS.

## Archivos

| Grupo | Archivos creados o modificados |
| --- | --- |
| PWA/build | `vite.config.ts`, `src/sw.ts`, `src/pwa/publicPageRoutes.ts`, `index.html`, `vercel.json`, `package.json`, `package-lock.json`, `src/pwa-env.d.ts`, `.gitignore` |
| Iconos del logo existente | `public/icons/pwa-192.png`, `public/icons/pwa-512.png` |
| Persistencia/peticiones públicas | `src/pwa/publicClient.ts`, `publicStore.ts`, `publicImages.ts`; `src/hooks/useOnline.ts`, `usePublicResource.ts` |
| Componentes reutilizables | `src/components/pwa/Skeleton.tsx`, `PublicImage.tsx`, `ResourceNotice.tsx`, `PwaStatus.tsx`, `PwaWelcome.tsx`, `pwa.css` |
| Voz | `src/hooks/useVoiceSearch.ts`, integración en `src/pages/visitor/CatalogePage.tsx` y su CSS |
| Pantallas públicas | `HomePage.tsx`, `CatalogePage.tsx`, `CatalogProductPage.tsx`, `SuscripcionesPage.tsx`, `AboutePage.tsx`; `catalogData.ts`, `membershipPlanView.ts` |
| Integración | `src/components/layout/PublicLayout/PublicLayout.tsx`, `src/components/catalog/CatalogProductDetail.tsx`, `src/components/cart/CartDrawer.tsx` |
| Footer y navegación pública | `src/components/layout/Footer.tsx`, `Footer.css`, `Header/Header.tsx`, `Navbar/Navbar.tsx`, `MobileMenu.tsx`; enlaces de `src/pages/400.tsx`, `Page500.tsx`, `NotFoundPage.tsx`; textos y enlaces de inicio y acerca de |
| Servicios públicos | `src/services/aboutService.ts`, nueva función `getPublicMembershipPlans` en `membershipService.ts`; la función existente de planes para pagos/paneles conserva su comportamiento |
| Recursos locales | `src/main.tsx`, `src/styles/fonts.css`, `layout.css`; retiro de imports de Google Fonts de los CSS de inicio, catálogo, suscripciones y detalle |
| Validación | `playwright.config.ts`, `tests/pwa/offline.spec.ts`, `tests/pwa/welcome.spec.ts`, `tests/pwa/public-pages.spec.ts`, este documento |

`dist/manifest.webmanifest` y `dist/sw.js` son artefactos generados; `dist` permanece ignorado por Git. Con `injectManifest`, Workbox se incluye en el propio SW y ya no se genera el archivo auxiliar `workbox-*.js` de la configuración anterior. Las capturas y trazas quedan en `test-results/`, también ignorado.

## Service Worker y datos

- `vite-plugin-pwa` compila `src/sw.ts` con **`injectManifest`** y Workbox. Precarga HTML, todos los chunks JS/CSS, fuentes, iconos y las imágenes locales emitidas por Vite. Esto incluye el código de las pantallas aún no visitadas. El build verificado conserva **70 entradas de precaché, aproximadamente 5.63 MiB**. Los módulos Workbox utilizados se declaran explícitamente como dependencias de desarrollo, en la misma versión 7.4.1 ya presente en el lockfile.
- El fallback del App Shell permite abrir y recargar directamente `/`, `/catalogue`, `/suscripciones`, `/about`, `/terms` y `/aviso-privacidad`, también con parámetros de consulta. Mantiene los alias anteriores `/AboutPage` y `/AboutePage`, y los detalles `/catalogue/:productId`. El contenido de los productos sigue dependiendo de IndexedDB o del backend; una copia del HTML no equivale a guardar los datos del producto. La lista de navegación es pública y explícita: no hay fallback de documentos para API, autenticación, pagos ni paneles privados.
- El precaché se completa sin mostrar un aviso inicial de caché. El registro del SW y el funcionamiento offline se conservan. Las nuevas versiones muestran un botón **Actualizar**; la recarga requiere pulsarlo para evitar interrumpir formularios. Al volver la conexión se comprueban actualizaciones. Workbox elimina precachés obsoletos.
- Las imágenes públicas de Cloudinary en `titanium/products/` y `titanium/about/` usan `CacheFirst`, con hasta 120 entradas y 30 días de vigencia. Se admiten respuestas opacas de imágenes entre orígenes. Las imágenes descargadas antes de que el primer SW tome control se solicitan nuevamente después del control para entrar en esa caché. Los demás orígenes no se guardan automáticamente; una imagen fallida muestra el logo local con una descripción de imagen no disponible.
- IndexedDB `titanium-public-v1`, almacén `resources`, conserva exclusivamente snapshots públicos: productos normalizados, detalles, recomendaciones públicas de productos, planes públicos e información del gimnasio, con fecha de guardado. Un detalle puede recuperarse del catálogo guardado aunque no se haya abierto individualmente. No se precargan datos del catálogo como parte del App Shell.
- Las peticiones públicas usan un cliente separado, sin el interceptor de tokens y con `credentials: omit`. No hay caché de respuestas API en el SW, ni almacenamiento público de tokens, contraseñas, pagos o respuestas autenticadas. Las recomendaciones POST del carrito no se persisten ni se encolan.
- Se lee el snapshot local primero; si hay conexión se actualiza desde el servidor. Una respuesta guardada muestra fecha y aviso de posible desactualización. Los eventos `online`/`offline` y **Reintentar** reevalúan la sección. `navigator.onLine` se complementa con errores y timeout del servidor.
- Las peticiones públicas tienen límite de 8 segundos. El acceso a IndexedDB tiene límite de 1.5 segundos por operación y tolera almacenamiento bloqueado o denegado. **Sin conexión y sin snapshot local, los skeletons permanecen visibles indefinidamente**, con el aviso «Sin conexión. Esperando conexión para cargar el contenido». No se convierten en placeholders estáticos tras 250 ms. Al recuperar conexión se consulta automáticamente el backend y los skeletons se mantienen hasta recibir los datos. Si hay conexión pero falla o expira la petición, termina la carga y aparece el error con **Reintentar**.
- `usePublicResource` expone `waitingForConnection` por sección. Con un snapshot guardado, incluso una lista vacía, se muestra el contenido local en cuanto termina la lectura, sin la espera artificial de 250 ms. Los cambios de conexión y los reintentos conservan los datos ya renderizados durante la lectura y revalidación para evitar skeletons innecesarios. Este flujo se aplica al catálogo, detalles y recomendaciones públicas, planes de membresía y las secciones de tienda y planes del inicio. La estructura del sitio, buscador, textos e imágenes locales permanecen visibles.
- Los skeletons de productos, precios, descripciones, planes y detalle conservan una estructura aproximada a las tarjetas. Las imágenes tienen su propio skeleton y fallback tras error/timeout. Todos respetan `prefers-reduced-motion`.
- Fuentes, Font Awesome y Animate.css se empaquetan localmente. Los iconos de React se incluyen en JS. El mapa de Google muestra la dirección textual offline. El script de analítica existente queda asíncrono y no participa en el render ni en la caché offline; las redes sociales y el mapa online siguen siendo servicios externos.
- Las acciones de compra desde datos guardados, sin conexión o sin contenido real quedan deshabilitadas. El carrito permite revisar su contenido y bloquea el enlace a checkout offline. No se difieren ni reproducen operaciones de pago al recuperar internet.
- La voz usa `SpeechRecognition`/`webkitSpeechRecognition`, `es-MX`, resultado final único, actualización del buscador existente, cancelación y limpieza al desmontar. Se informan permisos denegados y navegadores incompatibles. El botón queda deshabilitado offline porque el motor puede necesitar red; el texto sigue filtrando los productos locales.

## Qué guarda cada caché

| Almacén | Contenido exacto y actualización |
| --- | --- |
| `workbox-precache-v2-<scope>` en Cache Storage | Archivos estáticos del build, incluido `index.html`, chunks JS, CSS, fuentes, iconos, fotos y logo locales. Workbox asigna revisiones a los archivos y elimina entradas de compilaciones anteriores al activar el nuevo SW. `cleanupOutdatedCaches()` retira precachés incompatibles del mismo scope. El nombre completo depende del origen y del scope. |
| `titanium-public-pages-v1` en Cache Storage | Seis copias pequeñas del **mismo HTML público de `index.html`**, identificadas por las URL `/`, `/catalogue`, `/suscripciones`, `/about`, `/terms` y `/aviso-privacidad`. Se preparan durante la activación, después de completar el precaché, aunque las rutas nunca se hayan abierto. Las navegaciones a detalles y alias públicos también pueden crear entradas con sus pathname. No contienen productos, precios, DOM personalizado, respuestas de API ni datos del usuario. |
| `titanium-public-images-v1` en Cache Storage | Imágenes públicas de Cloudinary exclusivamente bajo `titanium/products/` y `titanium/about/`, con `CacheFirst`, hasta 120 entradas y 30 días. Se conservan al actualizar la caché de páginas. Los metadatos de caducidad los administra Workbox en su IndexedDB `workbox-expiration`. |
| `titanium-public-v1` / `resources` en IndexedDB | Snapshots públicos de productos, detalles, recomendaciones públicas GET, membresías e información del gimnasio, con fecha. Se leen y revalidan con `usePublicResource`, que conserva los skeletons persistentes y la reconexión automática. No es una caché de documentos HTML y no se borra al actualizar el SW. |

La caché de páginas es un índice visible de las rutas de la SPA, **no una descarga de seis páginas diferentes**: `matchPrecache('/index.html')` obtiene el HTML de la revisión actual y se clona localmente. Los JS, CSS, fuentes e imágenes se mantienen en un único precaché; no se descargan otra vez para cada ruta. El pequeño HTML sí tiene una copia por URL, porque Cache Storage no proporciona alias de claves sin una respuesta asociada.

Las claves de navegación contienen sólo el origen y pathname, sin query strings ni fragmentos. El SW guarda exclusivamente su App Shell empaquetado; nunca copia una respuesta de navegación de red que pudiera contener información autenticada. No guarda peticiones con cabecera Authorization en la caché de navegación, ni rutas de API, login, pagos o paneles. Los permisos y decisiones de bienvenida ya existentes continúan en su preferencia local, fuera de estas cachés.

El nombre de la caché de páginas incluye la versión de su esquema (`v1`). Al activar **cada compilación**, se reescriben las rutas preparadas y las rutas públicas visitadas conservadas con el HTML de la nueva revisión, se retiran entradas ajenas a la lista pública y se eliminan las otras cachés cuyo nombre comienza por `titanium-public-pages-`. Si cambia el esquema se incrementa esa versión; el mismo mecanismo elimina la anterior. No se borran la caché de imágenes, los snapshots públicos ni las preferencias. Una versión en espera conserva el comportamiento del botón Actualizar y no sustituye la activa hasta la aceptación del usuario.

## Footer, enlaces y datos de contacto

El Footer conserva sus colores negro, blanco y rojo, sus enlaces originales a Instagram y Facebook y los iconos existentes. Los enlaces internos usan React Router `Link`:

| Columna | Destinos |
| --- | --- |
| Explorar | Inicio → `/`; Catálogo → `/catalogue`; Membresías → `/suscripciones` |
| Titanium | Acerca de nosotros → `/about`; Contacto → `mailto:tsghuejutla@gmail.com` |
| Información legal | Términos y condiciones → `/terms`; Aviso de privacidad → `/aviso-privacidad` |

El texto inferior enlaza también a `/terms`; no quedan enlaces `href="#"` ni el dominio de ejemplo de condiciones. La navegación principal apunta a `/about`, manteniendo compatibles los alias antiguos. Las referencias públicas a servicios inexistentes se sustituyen por información del gimnasio; las de contacto, por el correo indicado. Se corrigen también enlaces rotos en páginas 400, 500 y 404, sin añadir un blog, FAQ, página de estado ni servicios ficticios. Se sustituyen textos de desarrollo de inicio y acerca de por descripciones dirigidas a visitantes.

**Contacto pendiente de confirmación:** inicio y el contenido local de Acerca de muestran **771 197 6803**; términos y condiciones muestra **771 221 4594**. La discrepancia se comunicó antes de modificar contactos; no se eligió un teléfono y ambos permanecen intactos mientras no haya confirmación. El correo coincide: **tsghuejutla@gmail.com**. El CMS puede publicar otros valores dinámicos; no se han editado datos del backend. Los únicos textos `/contacto` y `/servicios` restantes en el código son placeholders del editor administrativo, no enlaces públicos renderizados; no se modificó ese panel.

## Primera apertura instalada y notificación local

`PwaWelcome.tsx`, montado desde `main.tsx`, muestra una tarjeta discreta y no modal al abrir la aplicación instalada por primera vez. Detecta `matchMedia('(display-mode: standalone)')` y `navigator.standalone === true` para iOS. Una visita normal desde el navegador no muestra la bienvenida ni solicita permisos.

La tarjeta pregunta **«¿Deseas activar las notificaciones de Titanium Sport Gym?»**, con **Activar notificaciones** y **Ahora no**. No hay bloqueo de navegación, capa sobre toda la pantalla ni petición automática de permisos. La tarjeta utiliza el icono y los colores de Titanium; se mantiene accesible y dentro de la pantalla en móvil.

- Sólo el clic en **Activar notificaciones** puede ejecutar `Notification.requestPermission()`, y lo hace antes de esperar al SW para conservar la interacción de usuario requerida por el navegador. Si el permiso ya está concedido se reutiliza; si está bloqueado, el botón se deshabilita y se explican los ajustes del navegador.
- Tras la concesión, espera hasta 10 segundos al **Service Worker existente** mediante `navigator.serviceWorker.ready` y llama a `registration.showNotification()`, sin registrar otro SW.
- Título: **Titanium Sport Gym**. Cuerpo: **¡Bienvenido a Titanium! Las notificaciones están activadas correctamente.** Icono: `/icons/pwa-192.png`; etiqueta: `titanium-welcome`.
- La clave estable `localStorage['titanium:pwa-welcome']` guarda el resultado y su fecha. Se registra la acción antes de esperar el permiso, de modo que recargar, descartar la solicitud, posponer, denegar o actualizar el SW no repita la invitación ni envíe avisos automáticamente. La decisión se conserva por origen y perfil, sin incluir la versión del build ni del SW.
- **Ahora no** cierra la tarjeta sin solicitar permisos. También permite cancelar una activación pendiente antes de enviar el aviso. La falta de soporte, el permiso bloqueado o un fallo al mostrar la notificación se explican sin impedir usar la app. Si el almacenamiento de esta preferencia está restringido, se recuerda durante la sesión; tras borrar o impedir almacenamiento permanente no se puede garantizar su conservación entre aperturas.
- Es una **notificación local de bienvenida**, no un servicio de mensajes remotos. No hay Firebase, Web Push, suscripciones push, cambios en el backend ni envío de notificaciones en cada visita. La interfaz no promete entrega de avisos futuros.

El soporte depende del navegador y del sistema. En iOS debe comprobarse desde la app añadida a la pantalla de inicio, con una versión compatible y un gesto explícito; no se asume que cualquier navegador permita mostrar notificaciones. Referencias: [Notifications API y `showNotification`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) y [condiciones de WebKit para apps en pantalla de inicio](https://webkit.org/blog/13878/).

## Resultados realmente ejecutados

Verificación local en Windows, Chromium de Playwright, contra el build de producción servido con Vite Preview. **Los datos de catálogo, planes, acerca de e imágenes remotas son fixtures explícitos de las pruebas**. El navegador, Service Worker generado, Cache Storage, IndexedDB y los cambios de conexión son reales. La suite no verifica la disponibilidad ni los datos de un backend real; esa integración continúa pendiente.

| Validación | Resultado observado |
| --- | --- |
| `npm run build` | Correcto; genera manifiesto, SW y módulo Workbox; 70 entradas de precaché |
| `npm run lint` | Correcto |
| `npm run test:pwa` | 35 pruebas de Chromium aprobadas en 1.6 minutos: 18 de offline, 6 de rutas/cachés/Footer y 11 de bienvenida/notificaciones |
| A: primera carga online, precaché y recarga de inicio offline | Aprobado en Chromium, sin datos previos del backend |
| B: primera entrada a catálogo offline tras precaché | Aprobado; conserva shell, título, buscador, navegación y footer |
| C: productos guardados y consulta offline | Aprobado con fixtures; IndexedDB, búsqueda textual, detalle previamente visitado, detalle recuperado del catálogo e imagen en caché Workbox |
| D: pantalla sin datos | Sin conexión: skeletons persistentes y aviso de espera; al recibir datos desaparecen. Con conexión y fallo del backend: error y reintento, sin carga infinita |
| E: recuperar conexión | Aprobado con fixtures; carga automática y reintento manual actualizan precios |
| F: header, footer, navegación y recursos | Aprobado en escritorio; logos, fondos locales y fuentes cargan offline. Vista móvil sin desbordamiento y con captura |
| Instalabilidad técnica | Manifiesto e iconos PNG decodificados a 192 y 512; `Page.getInstallabilityErrors` de Chromium devuelve lista vacía; SW registrado y controlador activo |
| Robustez | API online sin respuesta termina por timeout; IndexedDB denegado no rompe las pantallas y permite la espera offline; reduced motion conserva los skeletons sin animación |
| Espera offline persistente | Animaciones CSS observadas durante más de 1.1 s, superando el antiguo límite de 250 ms, con iteración infinita y sin placeholders estáticos. Catálogo, detalle, membresías e inicio recuperan el contenido al reconectar; una respuesta retrasada mantiene los skeletons hasta recibir datos |
| Datos locales y error online | Catálogo, detalles y planes guardados aparecen sin skeletons de datos; una lista vacía guardada también se considera válida. Sin snapshot y con backend fallido al reconectar, termina la carga y Reintentar recupera el contenido |
| Privacidad de persistencia | Las peticiones públicas de planes no envían token/cookies, y no aparecen tokens ni URLs de API/pagos/paneles en las cachés comprobadas |
| Voz | Integración probada con **reconocedor controlado**: idioma, transcript al input/filtro, cancelación, permiso denegado, limpieza y navegador incompatible. No equivale a reconocer audio real |
| Visita normal y aviso de caché | No aparece la bienvenida, no se solicita permiso y no se muestra el texto inicial de precaché; el SW sigue activo |
| Bienvenida instalada | Probada con `display-mode: standalone` y con `navigator.standalone` de iOS **emulados**. No equivale a una instalación real en esos dispositivos |
| Decisiones y fallos | Con permisos y entrega controlados: aceptación sólo tras clic, Ahora no, denegación, solicitud descartada, permiso bloqueado, navegador incompatible y fallo de entrega. La decisión se conserva al recargar |
| Reemplazo del SW y móvil | Se desregistra y registra nuevamente el SW real; la decisión previa conserva su valor y no reaparece la bienvenida. Tarjeta móvil comprobada a 390 × 844, también offline |
| Notificación local real | Chromium completo en modo headless, permiso concedido por automatización. Sin sustituir `Notification` ni `showNotification`: el SW existente crea el aviso y `getNotifications()` devuelve título, cuerpo e icono correctos; tras recargar sigue habiendo un solo aviso |
| Rutas públicas preparadas y DevTools | El protocolo real `CacheStorage` de Chrome DevTools enumera las seis URL antes de visitarlas. Sus respuestas son el mismo App Shell, sin solicitudes individuales de preparación; todas se abren y recargan offline, incluidas las páginas legales |
| Footer y enlaces públicos | Navegación offline sin recargar el documento en navegador y standalone **emulado**; destinos, correo, redes originales y enlace legal inferior verificados. Auditoría de enlaces y textos en páginas públicas, 400, 500 y 404 aprobada |
| Actualización y conservación | Servidor HTTP local sirve dos versiones reales del SW y dos revisiones del HTML, derivadas del build. El SW espera hasta pulsar Actualizar, renueva las entradas del caché de páginas, elimina una versión antigua y entradas no públicas, limpia la revisión anterior de `index.html` y conserva la imagen y el snapshot de productos. El detalle guardado se consulta y recarga offline después de actualizar |

La prueba nativa de notificaciones usa `channel: 'chromium'` en `welcome.spec.ts`. En este Windows, el headless shell predeterminado devolvió `Notification.permission === 'denied'` aunque el servicio de permisos informaba `granted`; el binario completo de Chromium sí permitió la prueba. La decisión en el diálogo nativo y la visualización del aviso del sistema se comprueban manualmente. La emulación de standalone sólo valida la condición de interfaz: no se reporta instalación física en iOS/Android como realizada.

El build advierte que el chunk principal supera 500 kB: se conserva la arquitectura actual y se incluye completo en el precaché. La instalación de dependencias reportó 27 vulnerabilidades en el árbol completo; no se ejecutó una actualización masiva con `npm audit fix` ajena al alcance de la PWA.

## Comprobaciones manuales pendientes

1. **Instalación real**: servir el build por HTTPS o localhost en Chrome/Edge, esperar a que Application → Service Workers muestre el SW activo y a que Cache Storage contenga el precaché, pulsar Instalar (o usar el menú del navegador), cerrar y abrir desde el icono. Ya no se muestra el aviso inicial de listo offline. Verificar ventana standalone y bienvenida sólo en la primera apertura. Repetir en Android; en iOS usar Compartir → Añadir a pantalla de inicio. Estas instalaciones no se ejecutaron.
2. **Backend e imágenes reales**: configurar `VITE_API_URL`, recompilar y repetir A–F con el backend accesible. Confirmar nombres, precios e imágenes reales y el aviso de guardado. No hay backend real validado en esta entrega.
3. **B sin datos previos**: usar un perfil limpio, abrir inicio online y esperar el precaché; el inicio también consulta productos. Para garantizar que NO guarde catálogo, bloquear temporalmente `/api/products` en DevTools → Network → Request blocking durante esa primera carga, o borrar únicamente el registro `products` del almacén `resources` sin borrar Cache Storage ni el SW. Poner Network en Offline y abrir `/catalogue`; los skeletons deben seguir animados más allá de 250 ms y continuar sin límite con el mensaje de espera. Desbloquear `/api/products` y restaurar la conexión: comprobar carga automática y desaparición de skeletons cuando llegan productos. Repetir en detalle, membresías e inicio sin sus snapshots. Con el navegador online pero el backend inaccesible, comprobar que aparece un error con reintento. Activar `prefers-reduced-motion: reduce` en Rendering para comprobar la espera sin animaciones. No usar Clear site data entre el precaché y esta prueba.
4. **C con datos reales**: online abrir catálogo y un detalle, esperar que terminen imágenes/datos, activar Offline y recargar; buscar por texto y consultar el detalle. Comprobar que se identifica contenido guardado y que comprar está deshabilitado. Restablecer conexión y comprobar actualización.
5. **Micrófono real**: en Chrome/Edge con HTTPS/localhost, abrir catálogo, permitir micrófono y decir un nombre de producto. Verificar texto y filtro, cancelar escucha, denegar permiso y probar otra vez. Confirmar comportamiento del motor y de permisos del dispositivo. No se capturó audio real.
6. **Actualización del SW en despliegue y con varias pestañas**: la actualización local de dos versiones, el botón Actualizar, la limpieza de cachés y la persistencia de datos sí se ejecutaron automáticamente. Queda repetir con dos compilaciones desplegadas en Vercel y varias pestañas abiertas, comprobando las entradas en Application → Cache Storage. No se publicó una segunda versión en un servicio externo.
7. **Vercel y flujos privados**: desplegar la rama revisada y comprobar MIME de `sw.js`/manifest, HTTPS, recargas profundas y encabezados configurados. Verificar autenticación, roles y pagos en su entorno habitual. Se revisó su aislamiento en código; no se ejecutaron autenticación ni transacciones reales.
8. **Notificación visible del sistema**: con una instalación real nueva, pulsar Activar notificaciones y aceptar el permiso nativo. Confirmar el título, texto e icono en el aviso o centro de notificaciones del sistema. Cerrar y reabrir, y luego actualizar la PWA: no debe repetir ni bienvenida ni notificación. Probar también Ahora no y permiso denegado. Para repetir desde cero, borrar únicamente `titanium:pwa-welcome` en Local Storage y reiniciar la app; restaurar el permiso en los ajustes del navegador si fue bloqueado. El sistema puede silenciar avisos por preferencias o modo No molestar, independientemente de que el navegador los acepte.
9. **Inspección gráfica de DevTools**: el protocolo de DevTools se verificó automáticamente; no se afirma haber inspeccionado manualmente su interfaz gráfica. Abrir Application → Service Workers y esperar el estado activated; después, en Cache Storage → `titanium-public-pages-v1`, confirmar las seis claves y que Response contiene sólo el HTML de la SPA. En Network activar Offline y abrir/recargar cada URL. Después de actualizar, comprobar que no existe otra versión de `titanium-public-pages-*` y que los archivos referidos por el nuevo HTML siguen presentes en el precaché.
10. **Contacto**: confirmar cuál de los dos teléfonos reportados es correcto antes de unificarlo. Los teléfonos no se modificaron.

Referencias de implementación: [registro de Vite PWA](https://vite-pwa-org.netlify.app/guide/register-service-worker), [`injectManifest`](https://vite-pwa-org.netlify.app/workbox/inject-manifest), [precaché de Workbox y `matchPrecache`](https://developer.chrome.com/docs/workbox/modules/workbox-precaching), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Mensaje de commit propuesto:

```text
feat(pwa): prepare public route cache and repair public navigation and footer
```
