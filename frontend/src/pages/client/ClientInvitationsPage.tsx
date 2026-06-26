import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEnvelopeOpenText,
  FaSyncAlt,
  FaUsers,
} from "react-icons/fa";
import {
  acceptGroupInvitation,
  getMyGroupInvitations,
} from "../../services/membershipService";
import { showAlert, showSuccessToast } from "../../utils/feedback";
import styles from "./ClientPages.module.css";

type GroupInvitation = {
  id: string;
  groupId: string;
  userId?: string | null;
  invitedEmail: string;
  role: "owner" | "member";
  status: string;
  priceShare?: string | number | null;
  acceptedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  group?: {
    id: string;
    ownerUserId: string;
    memberLimit: number;
    totalAmount: string | number;
    pricePerPerson?: string | number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    status: string;
    plan?: {
      id: string;
      name: string;
      description?: string;
      type: string;
      durationDays: number;
      price: string | number;
      pricePerPerson?: string | number | null;
      maxPeople: number;
      minPeople: number;
      benefits?: string[];
    };
    owner?: {
      id: string;
      email: string;
      role: string;
    };
  };
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatCurrency(value: string | number | null | undefined) {
  const numericValue = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function getInvitationStatusLabel(status: string) {
  switch (status) {
    case "pending_invitation":
      return "Pendiente de aceptación";
    case "accepted":
      return "Aceptada";
    case "approved":
      return "Aprobada";
    case "active":
      return "Activa";
    case "rejected":
      return "Rechazada";
    case "removed":
      return "Eliminada";
    default:
      return status;
  }
}

function getGroupStatusLabel(status?: string) {
  switch (status) {
    case "pending_members":
      return "Esperando integrantes";
    case "pending_admin_approval":
      return "Pendiente de aprobación";
    case "active":
      return "Activo";
    case "cancelled":
      return "Cancelado";
    default:
      return status ?? "Sin estado";
  }
}

export default function ClientInvitationsPage() {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function loadInvitations() {
    setLoading(true);

    try {
      const response = await getMyGroupInvitations();
      setInvitations(response.invitations ?? []);
    } catch (error) {
      console.error("CLIENT INVITATIONS ERROR:", error);

      void showAlert({
        title: "No se pudieron cargar las invitaciones",
        text: "Revisa que tu sesión siga activa y que el backend esté funcionando.",
        icon: "error",
      });

      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvitations();
  }, []);

  async function handleAcceptInvitation(memberId: string) {
    const confirmed = window.confirm(
      "¿Quieres aceptar esta invitación al paquete?"
    );

    if (!confirmed) return;

    setAcceptingId(memberId);

    try {
      await acceptGroupInvitation(memberId);

      showSuccessToast(
        "Invitación aceptada",
        "Ahora el paquete queda pendiente de aprobación del administrador."
      );

      await loadInvitations();
    } catch (error) {
      console.error("ACCEPT INVITATION ERROR:", error);

      void showAlert({
        title: "No se pudo aceptar la invitación",
        text: "Puede que ya tengas una membresía activa o que la invitación ya haya sido respondida.",
        icon: "error",
      });
    } finally {
      setAcceptingId(null);
    }
  }

  const pendingInvitations = useMemo(
    () =>
      invitations.filter(
        (invitation) => invitation.status === "pending_invitation"
      ),
    [invitations]
  );

  const acceptedInvitations = useMemo(
    () =>
      invitations.filter((invitation) =>
        ["accepted", "approved", "active"].includes(invitation.status)
      ),
    [invitations]
  );

  return (
    <section className={styles.clientPage}>
      <header className={styles.clientHero}>
        <div>
          <span className={styles.clientEyebrow}>Paquetes grupales</span>
          <h1>Invitaciones</h1>
          <p>
            Aquí puedes ver las invitaciones que otros clientes te enviaron para
            unirte a un paquete grupal. Al aceptar, el paquete quedará listo para
            que el administrador lo apruebe.
          </p>
        </div>

        <button
          type="button"
          className={styles.heroActionBtn}
          onClick={() => void loadInvitations()}
          disabled={loading}
        >
          <FaSyncAlt />
          {loading ? "Cargando..." : "Actualizar"}
        </button>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaEnvelopeOpenText />
          </span>
          <div>
            <p>Invitaciones pendientes</p>
            <strong>{pendingInvitations.length}</strong>
            <span>Esperan tu aceptación.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <p>Invitaciones aceptadas</p>
            <strong>{acceptedInvitations.length}</strong>
            <span>Ya respondidas por ti.</span>
          </div>
        </article>

        <article className={styles.summaryCard}>
          <span className={styles.summaryIcon}>
            <FaUsers />
          </span>
          <div>
            <p>Paquetes</p>
            <strong>{invitations.length}</strong>
            <span>Total de invitaciones encontradas.</span>
          </div>
        </article>
      </div>

      <section className={styles.panelCard}>
        <h2>Mis invitaciones a paquetes</h2>
        <p>
          Acepta una invitación únicamente si reconoces al titular del paquete.
        </p>

        {loading ? (
          <div className={styles.emptyStateCard}>Cargando invitaciones...</div>
        ) : invitations.length > 0 ? (
          <div className={styles.cardGrid}>
            {invitations.map((invitation) => {
              const group = invitation.group;
              const plan = group?.plan;
              const isPending = invitation.status === "pending_invitation";

              return (
                <article key={invitation.id} className={styles.featureCard}>
                  <span>{getInvitationStatusLabel(invitation.status)}</span>

                  <h3>{plan?.name ?? "Paquete grupal"}</h3>

                  <p>
                    Titular:{" "}
                    <strong>{group?.owner?.email ?? "No disponible"}</strong>
                  </p>

                  <div className={styles.detailList}>
                    <div>
                      <span>Estado del paquete</span>
                      <strong>{getGroupStatusLabel(group?.status)}</strong>
                    </div>

                    <div>
                      <span>Integrantes</span>
                      <strong>{group?.memberLimit ?? 0} personas</strong>
                    </div>

                    <div>
                      <span>Precio total</span>
                      <strong>{formatCurrency(group?.totalAmount)}</strong>
                    </div>

                    <div>
                      <span>Precio por persona</span>
                      <strong>
                        {formatCurrency(
                          invitation.priceShare ?? group?.pricePerPerson
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Inicio</span>
                      <strong>{formatDate(group?.startsAt)}</strong>
                    </div>

                    <div>
                      <span>Vence</span>
                      <strong>{formatDate(group?.endsAt)}</strong>
                    </div>
                  </div>

                  {Array.isArray(plan?.benefits) && plan.benefits.length > 0 ? (
                    <ul className={styles.featureList}>
                      {plan.benefits.slice(0, 3).map((benefit) => (
                        <li key={benefit}>
                          <FaCheckCircle />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {isPending ? (
                    <button
                      type="button"
                      className={styles.heroActionBtn}
                      onClick={() => void handleAcceptInvitation(invitation.id)}
                      disabled={acceptingId === invitation.id}
                    >
                      <FaCheckCircle />
                      {acceptingId === invitation.id
                        ? "Aceptando..."
                        : "Aceptar invitación"}
                    </button>
                  ) : (
                    <div className={styles.statusBanner}>
                      <div>
                        <span>Estado</span>
                        <strong>{getInvitationStatusLabel(invitation.status)}</strong>
                        <p>
                          {invitation.status === "accepted"
                            ? "Ahora espera la aprobación del administrador."
                            : "Esta invitación ya fue procesada."}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            No tienes invitaciones pendientes a paquetes.
          </div>
        )}
      </section>

      <section className={styles.panelCard}>
        <h2>¿Qué pasa después de aceptar?</h2>

        <ul className={styles.timelineList}>
          <li>
            <div>
              <strong>Aceptas la invitación</strong>
              <p>Tu estado cambia de pendiente a aceptado.</p>
            </div>
            <span>Paso 1</span>
          </li>

          <li>
            <div>
              <strong>El administrador revisa el paquete</strong>
              <p>Cuando todos estén listos, el admin aprueba el grupo.</p>
            </div>
            <span>Paso 2</span>
          </li>

          <li>
            <div>
              <strong>Se activa tu membresía</strong>
              <p>El sistema genera tu suscripción activa dentro del paquete.</p>
            </div>
            <span>Paso 3</span>
          </li>
        </ul>
      </section>
    </section>
  );
}