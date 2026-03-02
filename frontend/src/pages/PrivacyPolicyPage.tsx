// src/pages/PrivacyPolicyPage.tsx
export default function PrivacyPolicyPage() {
  return (
    <main className="auth-page">
      {/* Imagen lateral igual que las demás páginas */}
      <section className="auth-image-section">
        <div className="auth-image-overlay">
          <h1 className="auth-image-title">AVISO DE PRIVACIDAD</h1>
          <p className="auth-image-subtitle">
            Conoce cómo protegemos y usamos tus datos personales.
          </p>
        </div>
      </section>

      {/* Contenido del aviso */}
      <section className="auth-form-section">
        <div
          className="auth-form-container"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <h2 className="auth-title">Aviso de Privacidad de Titanium Sport Gym</h2>
          <p className="auth-subtitle">
            Este aviso explica de manera general cómo recabamos, usamos y
            protegemos tus datos personales cuando utilizas la plataforma
            digital y los servicios de <strong>Titanium Sport Gym</strong>.
          </p>

          <div
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#333",
              marginTop: "16px",
            }}
          >
            <h3>1. Responsable del tratamiento de datos</h3>
            <p>
              Titanium Sport Gym, ubicado en Huejutla de Reyes, Hidalgo, es el
              responsable del uso y protección de tus datos personales.
              Cualquier duda sobre este aviso puede enviarse al correo{" "}
              <strong>tsghuejutla@gmail.com</strong> o consultarse en la
              recepción del gimnasio.
            </p>

            <h3>2. Datos personales que se recaban</h3>
            <p>
              Dependiendo del servicio que utilices, podemos recabar datos como:
            </p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Nombre y apellidos.</li>
              <li>Correo electrónico y número telefónico.</li>
              <li>
                Datos de facturación (RFC, domicilio fiscal) cuando se solicitan
                comprobantes.
              </li>
              <li>
                Información relacionada con tus membresías, asistencias,
                reservas y servicios contratados.
              </li>
            </ul>
            <p>
              En general no se solicitan datos sensibles. En caso de requerirse
              información relacionada con tu salud para fines de entrenamiento,
              se te explicará de forma específica y se recabará tu
              consentimiento expreso.
            </p>

            <h3>3. Finalidades del tratamiento</h3>
            <p>
              Tus datos personales se utilizan principalmente para:
            </p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Crear y administrar tu cuenta de usuario en la plataforma.</li>
              <li>
                Gestionar membresías, pagos, reservas, historial de asistencia y
                servicios contratados.
              </li>
              <li>
                Enviarte confirmaciones, recordatorios y avisos relacionados con
                tu cuenta o membresía.
              </li>
              <li>
                Atender dudas, aclaraciones, solicitudes de soporte y
                reclamaciones.
              </li>
            </ul>
            <p>
              De manera secundaria, y solo cuando lo autorices, podemos usar tus
              datos para enviarte promociones, noticias del gimnasio, encuestas
              de satisfacción o información de nuevos servicios. Puedes pedir en
              cualquier momento dejar de recibir comunicaciones promocionales.
            </p>

            <h3>4. Fundamento legal y consentimiento</h3>
            <p>
              El tratamiento de tus datos se realiza con base en la Ley Federal
              de Protección de Datos Personales en Posesión de los Particulares
              y su reglamento. Al registrarte en la plataforma, proporcionar tus
              datos y aceptar este aviso, otorgas tu consentimiento para el
              tratamiento descrito.
            </p>

            <h3>5. Transferencias de datos</h3>
            <p>
              Titanium Sport Gym no vende tus datos personales. Solo podrán
              compartirse con terceros cuando:
            </p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>
                Sea necesario para procesar pagos con instituciones bancarias o
                proveedores de servicios de cobro.
              </li>
              <li>
                Lo exija una autoridad competente mediante resolución legal.
              </li>
              <li>
                Sea requerido por proveedores que apoyan en la operación del
                sistema (por ejemplo, servicios de correo electrónico), siempre
                bajo acuerdos de confidencialidad.
              </li>
            </ul>

            <h3>6. Medidas de seguridad</h3>
            <p>
              Implementamos medidas técnicas y administrativas para proteger tu
              información, como contraseñas cifradas, autenticación de dos
              factores, conexiones seguras (HTTPS), control de accesos por rol
              y políticas internas de seguridad. Aunque ninguna tecnología es
              infalible, trabajamos para reducir riesgos de acceso, uso o
              divulgación no autorizados.
            </p>

            <h3>7. Derechos ARCO y medios para ejercerlos</h3>
            <p>
              Como titular de los datos, tienes derecho a Acceder, Rectificar,
              Cancelar u Oponerte (derechos ARCO) al tratamiento de tu
              información. También puedes revocar tu consentimiento cuando sea
              procedente.
            </p>
            <p>
              Para ejercer estos derechos, envía una solicitud al correo{" "}
              <strong>tsghuejutla@gmail.com</strong> indicando:
            </p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Nombre completo y datos de contacto.</li>
              <li>Descripción clara de la solicitud o derecho que deseas ejercer.</li>
              <li>
                Copia de tu identificación oficial o medio que acredite tu
                identidad.
              </li>
            </ul>
            <p>
              Te responderemos dentro de los plazos establecidos por la ley,
              indicando el resultado de tu solicitud y, en su caso, las medidas
              aplicadas.
            </p>

            <h3>8. Uso de cookies y tecnologías similares</h3>
            <p>
              La plataforma puede utilizar cookies o tecnologías de seguimiento
              para mejorar tu experiencia, mantener tu sesión iniciada y obtener
              estadísticas de uso. Puedes configurar tu navegador para
              rechazarlas; sin embargo, algunas funciones del sitio podrían no
              funcionar correctamente.
            </p>

            <h3>9. Cambios al Aviso de Privacidad</h3>
            <p>
              Este aviso puede actualizarse para reflejar cambios legales o
              mejoras en nuestros procesos. La versión vigente estará disponible
              en la sección de Aviso de Privacidad del sitio web y se podrán
              colocar avisos en recepción o enviar correos informando cambios
              relevantes.
            </p>

            <h3>10. Consentimiento</h3>
            <p>
              Al registrar una cuenta, usar la plataforma y proporcionar tus
              datos, declaras que has leído y comprendido este Aviso de
              Privacidad y aceptas el tratamiento de tus datos personales en los
              términos aquí descritos.
            </p>

            <p style={{ marginTop: "16px", fontStyle: "italic" }}>
              Última actualización: septiembre 2025.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
