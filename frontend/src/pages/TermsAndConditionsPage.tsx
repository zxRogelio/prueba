// src/pages/TermsAndConditionsPage.tsx
import { Link } from "react-router-dom";

export default function TermsAndConditionsPage() {
  return (
    <main className="auth-page">
      {/* Sección izquierda con imagen (igual que otras páginas) */}
      <section className="auth-image-section">
        <div className="auth-image-overlay">
          <h1 className="auth-image-title">TÉRMINOS Y CONDICIONES</h1>
          <p className="auth-image-subtitle">
            Conoce las reglas de uso de la plataforma Titanium Sport Gym.
          </p>
        </div>
      </section>

      {/* Sección derecha con el contenido desplazable */}
      <section className="auth-form-section">
        <div
          className="auth-form-container"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <h2 className="auth-title">Términos y Condiciones de Uso</h2>
          <p className="auth-subtitle">
            Al usar la plataforma digital <strong>Titanium Sport Gym</strong>,
            aceptas las condiciones descritas en este documento.
          </p>

          <div
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#333",
              marginTop: "16px",
            }}
          >
            <h3>1. Datos de la empresa</h3>
            <p>
              Titanium Sport Gym es un gimnasio ubicado en Huejutla de Reyes,
              Hidalgo, dedicado a la prestación de servicios deportivos y de
              acondicionamiento físico. Para cualquier duda relacionada con
              estos términos puedes contactarnos al correo{" "}
              <strong>tsghuejutla@gmail.com</strong> o al teléfono{" "}
              <strong>771 221 4594</strong>.
            </p>

            <h3>2. Marco legal aplicable</h3>
            <p>
              El uso de esta plataforma se rige por la Ley Federal de Protección
              al Consumidor, las disposiciones sobre comercio electrónico del
              Código de Comercio y las regulaciones de PROFECO, así como por la
              Ley Federal de Protección de Datos Personales en Posesión de los
              Particulares y demás normatividad vigente en México.
            </p>

            <h3>3. Aceptación de los términos</h3>
            <p>
              Al registrarte, iniciar sesión o marcar la casilla de aceptación,
              declaras que has leído y aceptas estos términos y condiciones, así
              como el Aviso de Privacidad. El uso continuo de la plataforma se
              considera aceptación renovada de cualquier actualización.
            </p>

            <h3>4. Uso de la cuenta de usuario</h3>
            <p>
              Cada usuario es responsable de la confidencialidad de su correo y
              contraseña. Está prohibido compartir credenciales con terceros o
              permitir el acceso no autorizado a la cuenta. Titanium Sport Gym
              puede suspender o cancelar cuentas cuando detecte uso indebido,
              fraude, suplantación de identidad o violaciones a estas
              condiciones.
            </p>

            <h3>5. Procesos de compra, membresías y servicios</h3>
            <p>
              La plataforma permite adquirir membresías, reservar servicios,
              contratar entrenamientos y realizar pagos en línea. El proceso
              incluye: selección de productos o servicios, confirmación del
              pedido, elección de método de pago y generación de comprobante.
              Los precios se muestran en moneda nacional e incluyen los
              impuestos aplicables.
            </p>
            <p>
              La vigencia y características de cada membresía se indicarán al
              momento de la compra (duración, tipo de acceso, horarios, etc.).
              Es responsabilidad del usuario revisar estos detalles antes de
              finalizar el pago.
            </p>

            <h3>6. Pagos, facturación y reembolsos</h3>
            <p>
              Los pagos pueden realizarse mediante tarjetas bancarias, medios
              electrónicos autorizados o en efectivo en las instalaciones del
              gimnasio. El usuario debe proporcionar datos de pago verídicos y
              estar autorizado para utilizarlos.
            </p>
            <p>
              Las solicitudes de reembolso o aclaración se analizarán de acuerdo
              con la política interna de Titanium Sport Gym y la legislación
              aplicable. En general, no se realizan devoluciones por periodos de
              membresía ya utilizados o por falta de asistencia del usuario.
            </p>

            <h3>7. Cancelaciones y modificaciones</h3>
            <p>
              El usuario puede solicitar cancelaciones o cambios de servicio en
              los canales oficiales de atención. Algunas membresías y
              promociones pueden ser no cancelables o no reembolsables; esto se
              indicará en la descripción del producto o servicio.
            </p>

            <h3>8. Conducta del usuario y uso permitido</h3>
            <p>
              El usuario se compromete a utilizar la plataforma de forma
              lícita, respetuosa y sin intentar vulnerar la seguridad del
              sistema. Queda prohibido:
            </p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Intentar acceder a cuentas de otros usuarios.</li>
              <li>
                Introducir código malicioso, realizar ataques de fuerza bruta o
                escaneos no autorizados.
              </li>
              <li>
                Manipular precios, promociones o información mostrada en la
                plataforma.
              </li>
            </ul>

            <h3>9. Seguridad de la información</h3>
            <p>
              La plataforma implementa medidas como contraseñas robustas,
              autenticación en dos pasos (OTP, enlace de confirmación o TOTP),
              expiración de sesiones e inicio de sesión seguro. El usuario se
              compromete a colaborar con estas medidas, mantener sus datos
              actualizados y reportar cualquier actividad sospechosa.
            </p>

            <h3>10. Limitación de responsabilidad</h3>
            <p>
              Titanium Sport Gym realizará esfuerzos razonables para mantener la
              disponibilidad y seguridad del sistema; sin embargo, no garantiza
              la ausencia total de fallos técnicos, interrupciones temporales o
              errores en contenido. La responsabilidad del gimnasio se limita,
              en su caso, al monto pagado por el usuario por el servicio
              afectado, sin incluir daños indirectos o pérdida de oportunidades.
            </p>

            <h3>11. Propiedad intelectual</h3>
            <p>
              Los logotipos, diseños, textos, imágenes y componentes de la
              plataforma son propiedad de Titanium Sport Gym o se utilizan con
              las licencias correspondientes. No se permite su reproducción o
              distribución sin autorización expresa por escrito.
            </p>

            <h3>12. Modificaciones a los términos</h3>
            <p>
              Titanium Sport Gym podrá actualizar estos términos y condiciones
              cuando sea necesario por cambios legales, mejoras del sistema o
              nuevos servicios. La versión vigente siempre estará disponible en
              esta sección. Cuando haya cambios relevantes, se notificará a los
              usuarios mediante avisos en la plataforma o por correo
              electrónico.
            </p>

            <h3>13. Jurisdicción y resolución de controversias</h3>
            <p>
              Para la interpretación y cumplimiento de estos términos, las partes
              se someten a las leyes mexicanas y a la jurisdicción de los
              tribunales competentes en Huejutla de Reyes, Hidalgo, renunciando
              a cualquier otro fuero que pudiera corresponderles.
            </p>

            <h3>14. Aviso de Privacidad</h3>
            <p>
              El tratamiento de los datos personales de los usuarios se detalla
              en el{" "}
              <Link to="/aviso-privacidad" className="auth-link">
                Aviso de Privacidad de Titanium Sport Gym
              </Link>
              . Te recomendamos leerlo antes de completar tu registro.
            </p>

            <p style={{ marginTop: "16px", fontStyle: "italic" }}>
              Al continuar utilizando la plataforma y crear una cuenta, declaras
              que aceptas íntegramente estos términos y condiciones.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
