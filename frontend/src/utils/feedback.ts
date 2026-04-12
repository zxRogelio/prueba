import Swal, { type SweetAlertIcon } from "sweetalert2";
import { toast } from "sonner";

export function showSuccessToast(message: string, description?: string) {
  toast.success(message, description ? { description } : undefined);
}

const roleLabels: Record<string, string> = {
  administrador: "Panel administrativo",
  entrenador: "Portal de entrenador",
  cliente: "Portal de cliente",
};

function getRoleLabel(role?: string) {
  if (!role) return "Acceso verificado";
  return roleLabels[role] ?? "Sesion activa";
}

export function showLoginSuccessAlert(role?: string) {
  return Swal.fire({
    html: `
      <section class="auth-success-alert">
        <div class="auth-success-badge">ACCESO AUTORIZADO</div>
        <div class="auth-success-iconWrap">
          <div class="auth-success-icon">&#10003;</div>
        </div>
        <h2 class="auth-success-title">Inicio de sesion exitoso</h2>
        <p class="auth-success-text">
          Tu cuenta fue validada correctamente. Todo esta listo para entrar a tu espacio.
        </p>
        <p class="auth-success-note">${getRoleLabel(role)}</p>
      </section>
    `,
    showConfirmButton: true,
    confirmButtonText: "Entrar ahora",
    buttonsStyling: false,
    timer: 2600,
    timerProgressBar: true,
    allowOutsideClick: false,
    allowEscapeKey: false,
    backdrop: "rgba(3, 7, 18, 0.72)",
    customClass: {
      popup: "auth-success-popup",
      confirmButton: "auth-success-confirmButton",
      timerProgressBar: "auth-success-progressBar",
    },
  });
}

export function showLogoutConfirmAlert() {
  return Swal.fire({
    html: `
      <section class="auth-logout-alert">
        <div class="auth-logout-badge">CONFIRMAR SALIDA</div>
        <div class="auth-logout-iconWrap">
          <div class="auth-logout-icon">?</div>
        </div>
        <h2 class="auth-logout-title">Seguro que quieres cerrar sesion?</h2>
        <p class="auth-logout-text">
          Vas a salir de tu cuenta actual y tendras que iniciar sesion de nuevo para volver a entrar.
        </p>
        <p class="auth-logout-note">Puedes volver a iniciar sesion cuando quieras.</p>
      </section>
    `,
    showCancelButton: true,
    confirmButtonText: "Si, cerrar sesion",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    buttonsStyling: false,
    allowOutsideClick: true,
    allowEscapeKey: true,
    backdrop: "rgba(3, 7, 18, 0.72)",
    customClass: {
      popup: "auth-logout-popup",
      confirmButton: "auth-logout-confirmButton",
      cancelButton: "auth-logout-cancelButton",
    },
  });
}

interface AppAlertOptions {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
}

export function showAlert({
  title,
  text,
  icon = "info",
}: AppAlertOptions) {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: "Entendido",
    buttonsStyling: false,
    background: "#10131a",
    color: "#f8fafc",
    iconColor: "#ef4444",
    backdrop: "rgba(3, 7, 18, 0.72)",
    customClass: {
      popup: "auth-basic-popup",
      confirmButton: "auth-basic-confirmButton",
    },
  });
}
