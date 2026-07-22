import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaEnvelopeOpenText,
  FaMoneyBillWave,
  FaShieldAlt,
  FaSyncAlt,
  FaUserCheck,
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
      return "Pendiente";
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
      return "Pendiente de aprobacion";
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
        text: "Revisa que tu sesion siga activa y que el backend este funcionando.",
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
      "Quieres aceptar esta invitacion al paquete?"
    );

    if (!confirmed) return;

    setAcceptingId(memberId);

    try {
      await acceptGroupInvitation(memberId);

      showSuccessToast(
        "Invitacion aceptada",
        "Ahora el paquete queda pendiente de aprobacion del administrador."
      );

      await loadInvitations();
    } catch (error) {
      console.error("ACCEPT INVITATION ERROR:", error);

      void showAlert({
        title: "No se pudo aceptar la invitacion",
        text: "Puede que ya tengas una membresia activa o que la invitacion ya haya sido respondida.",
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
    <section className={`${styles.clientPage} ${styles.invitationsPage}`}>
      <header className={styles.invitationHero}>
        <div className={styles.invitationHeroCopy}>
          <span className={styles.routineEyebrow}>Paquetes grupales</span>
          <h1>Invitaciones</h1>
          <p>
            Revisa las invitaciones que otros clientes te enviaron para unirte a
            un paquete grupal. Acepta solo si reconoces al titular del paquete.
          </p>
        </div>

        <div className={styles.invitationHeroPanel}>
          <div>
            <span>Pendientes</span>
            <strong>{loading ? "--" : pendingInvitations.length}</strong>
          </div>
          <div>
            <span>Aceptadas</span>
            <strong>{loading ? "--" : acceptedInvitations.length}</strong>
          </div>
          <button
            type="button"
            className={styles.routineRefreshBtn}
            onClick={() => void loadInvitations()}
            disabled={loading}
          >
            <FaSyncAlt />
            {loading ? "Cargando" : "Actualizar"}
          </button>
        </div>
      </header>

      <div className={styles.invitationSummaryGrid}>
        <article>
          <span>
            <FaEnvelopeOpenText />
          </span>
          <div>
            <p>Invitaciones pendientes</p>
            <strong>{pendingInvitations.length}</strong>
            <small>Esperan tu respuesta.</small>
          </div>
        </article>

        <article>
          <span>
            <FaCheckCircle />
          </span>
          <div>
            <p>Invitaciones aceptadas</p>
            <strong>{acceptedInvitations.length}</strong>
            <small>Ya respondidas por ti.</small>
          </div>
        </article>

        <article>
          <span>
            <FaUsers />
          </span>
          <div>
            <p>Paquetes recibidos</p>
            <strong>{invitations.length}</strong>
            <small>Total encontrado.</small>
          </div>
        </article>
      </div>

      <section className={styles.invitationSection}>
        <div className={styles.routineResultsHeader}>
          <div>
            <h2>Mis invitaciones a paquetes</h2>
            <p>Confirma los datos antes de aceptar la invitacion.</p>
          </div>
          <span>{loading ? "Cargando" : `${invitations.length} registros`}</span>
        </div>

        {loading ? (
          <div className={styles.routineEmpty}>Cargando invitaciones...</div>
        ) : invitations.length > 0 ? (
          <div className={styles.invitationGrid}>
            {invitations.map((invitation) => {
              const group = invitation.group;
              const plan = group?.plan;
              const isPending = invitation.status === "pending_invitation";

              return (
                <article key={invitation.id} className={styles.invitationCard}>
                  <div className={styles.invitationCardHeader}>
                    <div>
                      <span>{getInvitationStatusLabel(invitation.status)}</span>
                      <h3>{plan?.name ?? "Paquete grupal"}</h3>
                    </div>

                    <div className={styles.invitationStatusIcon}>
                      {isPending ? <FaEnvelopeOpenText /> : <FaCheckCircle />}
                    </div>
                  </div>

                  <div className={styles.invitationOwner}>
                    <span>Titular del paquete</span>
                    <strong>{group?.owner?.email ?? "No disponible"}</strong>
                  </div>

                  <div className={styles.invitationMetaGrid}>
                    <div>
                      <FaShieldAlt />
                      <span>Estado</span>
                      <strong>{getGroupStatusLabel(group?.status)}</strong>
                    </div>

                    <div>
                      <FaUsers />
                      <span>Integrantes</span>
                      <strong>{group?.memberLimit ?? 0} personas</strong>
                    </div>

                    <div>
                      <FaMoneyBillWave />
                      <span>Tu parte</span>
                      <strong>
                        {formatCurrency(
                          invitation.priceShare ?? group?.pricePerPerson
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.invitationDates}>
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
                    <ul className={styles.invitationBenefits}>
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
                      className={styles.invitationAcceptBtn}
                      onClick={() => void handleAcceptInvitation(invitation.id)}
                      disabled={acceptingId === invitation.id}
                    >
                      <FaUserCheck />
                      {acceptingId === invitation.id
                        ? "Aceptando"
                        : "Aceptar invitacion"}
                    </button>
                  ) : (
                    <div className={styles.invitationProcessed}>
                      <strong>{getInvitationStatusLabel(invitation.status)}</strong>
                      <p>
                        {invitation.status === "accepted"
                          ? "Ahora espera la aprobacion del administrador."
                          : "Esta invitacion ya fue procesada."}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.invitationEmpty}>
            <FaEnvelopeOpenText />
            <strong>No tienes invitaciones pendientes a paquetes.</strong>
            <p>Cuando alguien te invite a un paquete grupal aparecera aqui.</p>
          </div>
        )}
      </section>

      <section className={styles.invitationSteps}>
        <div className={styles.routineResultsHeader}>
          <div>
            <h2>Que pasa despues de aceptar</h2>
            <p>El proceso queda sujeto a revision del administrador.</p>
          </div>
        </div>

        <div className={styles.invitationStepGrid}>
          <article>
            <span>01</span>
            <strong>Aceptas la invitacion</strong>
            <p>Tu estado cambia de pendiente a aceptado.</p>
          </article>

          <article>
            <span>02</span>
            <strong>El administrador revisa</strong>
            <p>Cuando el paquete esta listo, el admin aprueba el grupo.</p>
          </article>

          <article>
            <span>03</span>
            <strong>Se activa tu membresia</strong>
            <p>El sistema genera tu suscripcion activa dentro del paquete.</p>
          </article>
        </div>
      </section>
    </section>
  );
}
