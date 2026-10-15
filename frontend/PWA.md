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
| PWA/build | `vite.config.ts`, `index.html`, `vercel.json`, `package.json`, `package-lock.json`, `src/pwa-env.d.ts`, `.gitignore` |
| Iconos del logo existente | `public/icons/pwa-192.png`, `public/icons/pwa-512.png` |
| Persistencia/peticiones públicas | `src/pwa/publicClient.ts`, `publicStore.ts`, `publicImages.ts`; `src/hooks/useOnline.ts`, `usePublicResource.ts` |
| Componentes reutilizables | `src/components/pwa/Skeleton.tsx`, `PublicImage.tsx`, `ResourceNotice.tsx`, `PwaStatus.tsx`, `PwaWelcome.tsx`, `pwa.css` |
| Voz | `src/hooks/useVoiceSearch.ts`, integración en `src/pages/visitor/CatalogePage.tsx` y su CSS |
| Pantallas públicas | `HomePage.tsx`, `CatalogePage.tsx`, `CatalogProductPage.tsx`, `SuscripcionesPage.tsx`, `AboutePage.tsx`; `catalogData.ts`, `membershipPlanView.ts` |
| Integración | `src/components/layout/PublicLayout/PublicLayout.tsx`, `src/components/catalog/CatalogProductDetail.tsx`, `src/components/cart/CartDrawer.tsx` |
| Servicios públicos | `src/services/aboutService.ts`, nueva función `getPublicMembershipPlans` en `membershipService.ts`; la función existente de planes para pagos/paneles conserva su comportamiento |
| Recursos locales | `src/main.tsx`, `src/styles/fonts.css`, `layout.css`; retiro de imports de Google Fonts de los CSS de inicio, catálogo, suscripciones y detalle |
| Validación | `playwright.config.ts`, `tests/pwa/offline.spec.ts`, `tests/pwa/welcome.spec.ts`, este documento |

`dist/manifest.webmanifest`, `dist/sw.js` y `dist/workbox-*.js` son artefactos generados; `dist` permanece ignorado por Git. Las capturas y trazas quedan en `test-results/`, también ignorado.

## Service Worker y datos

- `vite-plugin-pwa` genera el SW con Workbox. Precarga HTML, todos los chunks JS/CSS, fuentes, iconos y las imágenes locales emitidas por Vite. Esto incluye el código de las pantallas aún no visitadas. El build verificado contiene **70 entradas de precaché, aproximadamente 5.63 MiB**.
- El fallback `/index.html` permite abrir directamente inicio, catálogo, detalles, suscripciones y las tres rutas existentes de acerca de, también con parámetros de consulta. Está limitado a esas rutas públicas y no sustituye respuestas de API.
- El precaché se completa sin mostrar un aviso inicial de caché. El registro del SW y el funcionamiento offline se conservan. Las nuevas versiones muestran un botón **Actualizar**; la recarga requiere pulsarlo para evitar interrumpir formularios. Al volver la conexión se comprueban actualizaciones. Workbox elimina precachés obsoletos.
- Las imágenes públicas de Cloudinary en `titanium/products/` y `titanium/about/` usan `CacheFirst`, con hasta 120 entradas y 30 días de vigencia. Se admiten respuestas opacas de imágenes entre orígenes. Las imágenes descargadas antes de que el primer SW tome control se solicitan nuevamente después del control para entrar en esa caché. Los demás orígenes no se guardan automáticamente; una imagen fallida muestra el logo local con una descripción de imagen no disponible.
- IndexedDB `titanium-public-v1`, almacén `resources`, conserva exclusivamente snapshots públicos: productos normalizados, detalles, recomendaciones públicas de productos, planes públicos e información del gimnasio, con fecha de guardado. Un detalle puede recuperarse del catálogo guardado aunque no se haya abierto individualmente. No se precargan datos del catálogo como parte del App Shell.
- Las peticiones públicas usan un cliente separado, sin el interceptor de tokens y con `credentials: omit`. No hay caché de respuestas API en el SW, ni almacenamiento público de tokens, contraseñas, pagos o respuestas autenticadas. Las recomendaciones POST del carrito no se persisten ni se encolan.
- Se lee el snapshot local primero; si hay conexión se actualiza desde el servidor. Una respuesta guardada muestra fecha y aviso de posible desactualización. Los eventos `online`/`offline` y **Reintentar** reevalúan la sección. `navigator.onLine` se complementa con errores y timeout del servidor.
- Las peticiones públicas tienen límite de 8 segundos. El acceso a IndexedDB tiene límite de 1.5 segundos por operación y tolera almacenamiento bloqueado o denegado. No hay skeletons indefinidos: sin datos se muestra un estado explícito, placeholders estáticos y reintento.
- Los skeletons de productos, precios, descripciones, planes y detalle conservan una estructura aproximada a las tarjetas. Las imágenes tienen su propio skeleton y fallback tras error/timeout. Todos respetan `prefers-reduced-motion`.
- Fuentes, Font Awesome y Animate.css se empaquetan localmente. Los iconos de React se incluyen en JS. El mapa de Google muestra la dirección textual offline. El script de analítica existente queda asíncrono y no participa en el render ni en la caché offline; las redes sociales y el mapa online siguen siendo servicios externos.
- Las acciones de compra desde datos guardados, sin conexión o sin contenido real quedan deshabilitadas. El carrito permite revisar su contenido y bloquea el enlace a checkout offline. No se difieren ni reproducen operaciones de pago al recuperar internet.
- La voz usa `SpeechRecognition`/`webkitSpeechRecognition`, `es-MX`, resultado final único, actualización del buscador existente, cancelación y limpieza al desmontar. Se informan permisos denegados y navegadores incompatibles. El botón queda deshabilitado offline porque el motor puede necesitar red; el texto sigue filtrando los productos locales.

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

Verificación local en Windows, Chromium de Playwright, contra el build de producción servido con Vite Preview. **Los datos de catálogo, planes, acerca de e imágenes remotas son fixtures explícitos de las pruebas**. El navegador, Service Worker generado, Cache Storage, IndexedDB y los cambios de conexión son reales. La API local `http://localhost:5000/api/products` no respondió durante la comprobación; no se reporta integración con backend real como aprobada.

| Validación | Resultado observado |
| --- | --- |
| `npm run build` | Correcto; genera manifiesto, SW y módulo Workbox; 70 entradas de precaché |
| `npm run lint` | Correcto |
| `npm run test:pwa` | 23 pruebas de Chromium aprobadas en 46.8 s: 12 de offline y 11 de bienvenida/notificaciones |
| A: primera carga online, precaché y recarga de inicio offline | Aprobado en Chromium, sin datos previos del backend |
| B: primera entrada a catálogo offline tras precaché | Aprobado; conserva shell, título, buscador, navegación y footer |
| C: productos guardados y consulta offline | Aprobado con fixtures; IndexedDB, búsqueda textual, detalle previamente visitado, detalle recuperado del catálogo e imagen en caché Workbox |
| D: pantalla sin datos | Aprobado; se observa skeleton y luego aviso offline, placeholders identificados y reintento, sin acciones de compra |
| E: recuperar conexión | Aprobado con fixtures; carga automática y reintento manual actualizan precios |
| F: header, footer, navegación y recursos | Aprobado en escritorio; logos, fondos locales y fuentes cargan offline. Vista móvil sin desbordamiento y con captura |
| Instalabilidad técnica | Manifiesto e iconos PNG decodificados a 192 y 512; `Page.getInstallabilityErrors` de Chromium devuelve lista vacía; SW registrado y controlador activo |
| Robustez | API sin respuesta termina por timeout; IndexedDB denegado no rompe las pantallas; reduced motion elimina la animación del skeleton |
| Privacidad de persistencia | Las peticiones públicas de planes no envían token/cookies, y no aparecen tokens ni URLs de API/pagos/paneles en las cachés comprobadas |
| Voz | Integración probada con **reconocedor controlado**: idioma, transcript al input/filtro, cancelación, permiso denegado, limpieza y navegador incompatible. No equivale a reconocer audio real |
| Visita normal y aviso de caché | No aparece la bienvenida, no se solicita permiso y no se muestra el texto inicial de precaché; el SW sigue activo |
| Bienvenida instalada | Probada con `display-mode: standalone` y con `navigator.standalone` de iOS **emulados**. No equivale a una instalación real en esos dispositivos |
| Decisiones y fallos | Con permisos y entrega controlados: aceptación sólo tras clic, Ahora no, denegación, solicitud descartada, permiso bloqueado, navegador incompatible y fallo de entrega. La decisión se conserva al recargar |
| Reemplazo del SW y móvil | Se desregistra y registra nuevamente el SW real; la decisión previa conserva su valor y no reaparece la bienvenida. Tarjeta móvil comprobada a 390 × 844, también offline |
| Notificación local real | Chromium completo en modo headless, permiso concedido por automatización. Sin sustituir `Notification` ni `showNotification`: el SW existente crea el aviso y `getNotifications()` devuelve título, cuerpo e icono correctos; tras recargar sigue habiendo un solo aviso |

La prueba nativa de notificaciones usa `channel: 'chromium'` en `welcome.spec.ts`. En este Windows, el headless shell predeterminado devolvió `Notification.permission === 'denied'` aunque el servicio de permisos informaba `granted`; el binario completo de Chromium sí permitió la prueba. La decisión en el diálogo nativo y la visualización del aviso del sistema se comprueban manualmente. La emulación de standalone sólo valida la condición de interfaz: no se reporta instalación física en iOS/Android como realizada.

El build advierte que el chunk principal supera 500 kB: se conserva la arquitectura actual y se incluye completo en el precaché. La instalación de dependencias reportó 27 vulnerabilidades en el árbol completo; no se ejecutó una actualización masiva con `npm audit fix` ajena al alcance de la PWA.

## Comprobaciones manuales pendientes

1. **Instalación real**: servir el build por HTTPS o localhost en Chrome/Edge, esperar a que Application → Service Workers muestre el SW activo y a que Cache Storage contenga el precaché, pulsar Instalar (o usar el menú del navegador), cerrar y abrir desde el icono. Ya no se muestra el aviso inicial de listo offline. Verificar ventana standalone y bienvenida sólo en la primera apertura. Repetir en Android; en iOS usar Compartir → Añadir a pantalla de inicio. Estas instalaciones no se ejecutaron.
2. **Backend e imágenes reales**: configurar `VITE_API_URL`, recompilar y repetir A–F con el backend accesible. Confirmar nombres, precios e imágenes reales y el aviso de guardado. No hay backend real validado en esta entrega.
3. **B sin datos previos**: usar un perfil limpio, abrir inicio online y esperar el precaché; el inicio también consulta productos. Para garantizar que NO guarde catálogo, bloquear temporalmente `/api/products` en DevTools → Network → Request blocking durante esa primera carga, o borrar únicamente el registro `products` del almacén `resources` sin borrar Cache Storage ni el SW. Poner Network en Offline y abrir `/catalogue`; observar skeleton breve y estado sin datos con reintento. No usar Clear site data entre el precaché y esta prueba.
4. **C con datos reales**: online abrir catálogo y un detalle, esperar que terminen imágenes/datos, activar Offline y recargar; buscar por texto y consultar el detalle. Comprobar que se identifica contenido guardado y que comprar está deshabilitado. Restablecer conexión y comprobar actualización.
5. **Micrófono real**: en Chrome/Edge con HTTPS/localhost, abrir catálogo, permitir micrófono y decir un nombre de producto. Verificar texto y filtro, cancelar escucha, denegar permiso y probar otra vez. Confirmar comportamiento del motor y de permisos del dispositivo. No se capturó audio real.
6. **Actualización real del SW**: abrir la versión actual, generar/servir una segunda compilación con un cambio visible, volver a la pestaña y comprobar actualización (o Application → Service Workers → Update). Debe mostrarse Actualizar y recargar sólo al pulsarlo. Repetir con varias pestañas y comprobar limpieza de precachés antiguos. No se probó una segunda versión desplegada.
7. **Vercel y flujos privados**: desplegar la rama revisada y comprobar MIME de `sw.js`/manifest, HTTPS, recargas profundas y encabezados configurados. Verificar autenticación, roles y pagos en su entorno habitual. Se revisó su aislamiento en código; no se ejecutaron autenticación ni transacciones reales.
8. **Notificación visible del sistema**: con una instalación real nueva, pulsar Activar notificaciones y aceptar el permiso nativo. Confirmar el título, texto e icono en el aviso o centro de notificaciones del sistema. Cerrar y reabrir, y luego actualizar la PWA: no debe repetir ni bienvenida ni notificación. Probar también Ahora no y permiso denegado. Para repetir desde cero, borrar únicamente `titanium:pwa-welcome` en Local Storage y reiniciar la app; restaurar el permiso en los ajustes del navegador si fue bloqueado. El sistema puede silenciar avisos por preferencias o modo No molestar, independientemente de que el navegador los acepte.

Referencias de implementación: [registro de Vite PWA](https://vite-pwa-org.netlify.app/guide/register-service-worker), [recursos estáticos](https://vite-pwa-org.netlify.app/guide/static-assets), [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

Mensaje de commit propuesto:

```text
feat(pwa): add Titanium offline app shell, public cache, skeletons and voice search
```
