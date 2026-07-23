import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  createTrainerAgendaItem,
  deleteTrainerAgendaItem,
  getTrainerAgenda,
  type AgendaMode,
  type AgendaStatus,
  type TrainerAgendaItemDTO,
} from "../../services/trainer/agendaService";
import styles from "./TrainerPortalPage.module.css";

const defaultForm = {
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  mode: "presencial" as AgendaMode,
  location: "",
  status: "scheduled" as AgendaStatus,
};

const statusLabels: Record<AgendaStatus, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

const modeLabels: Record<AgendaMode, string> = {
  presencial: "Presencial",
  online: "Online",
  seguimiento: "Seguimiento",
  evaluacion: "Evaluacion",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isToday = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.toDateString() === new Date().toDateString();
};

export default function TrainerAgendaPage() {
  const [items, setItems] = useState<TrainerAgendaItemDTO[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAgenda = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await getTrainerAgenda();
      setItems(result);
    } catch (error) {
      console.error("getTrainerAgenda error:", error);
      setErrorMessage("No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createTrainerAgendaItem(form);
      setForm(defaultForm);
      setSuccessMessage("Actividad agregada correctamente.");
      await loadAgenda();
    } catch (error) {
      console.error("createTrainerAgendaItem error:", error);
      setErrorMessage("No se pudo guardar la actividad.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Seguro que deseas eliminar esta actividad?");
    if (!confirmed) return;

    try {
      await deleteTrainerAgendaItem(id);
      setSuccessMessage("Actividad eliminada correctamente.");
      await loadAgenda();
    } catch (error) {
      console.error("deleteTrainerAgendaItem error:", error);
      setErrorMessage("No se pudo eliminar la actividad.");
    }
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      scheduled: items.filter((item) => item.status === "scheduled").length,
      completed: items.filter((item) => item.status === "completed").length,
      today: items.filter((item) => isToday(item.startAt)).length,
    }),
    [items],
  );

  return (
    <section className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>Agenda del entrenador</div>
          <h1 className={styles.title}>Agenda semanal</h1>
          <p className={styles.subtitle}>
            Organiza sesiones, evaluaciones y seguimientos con una vista clara
            de tus proximas actividades.
          </p>
        </div>

        <div className={styles.heroPanel}>
          <span>Estado de la semana</span>
          <strong>{stats.scheduled} pendientes</strong>
          <p>
            Registra cada actividad con horario, modalidad, ubicacion y estado.
          </p>
        </div>
      </section>

      <section className={styles.quickStats}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <CalendarClock size={18} />
          </span>
          <span className={styles.statLabel}>Total</span>
          <strong>{stats.total}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <Clock3 size={18} />
          </span>
          <span className={styles.statLabel}>Programadas</span>
          <strong>{stats.scheduled}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <CheckCircle2 size={18} />
          </span>
          <span className={styles.statLabel}>Completadas</span>
          <strong>{stats.completed}</strong>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <MapPin size={18} />
          </span>
          <span className={styles.statLabel}>Hoy</span>
          <strong>{stats.today}</strong>
        </article>
      </section>

      <section className={styles.agendaLayout}>
        <article className={styles.agendaFormPanel}>
          <div className={styles.agendaSectionHeader}>
            <div>
              <span>Nueva actividad</span>
              <h2>Crear recordatorio</h2>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => void loadAgenda()}
              disabled={loading}
              aria-label="Actualizar agenda"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
          {successMessage ? (
            <div className={styles.successBox}>{successMessage}</div>
          ) : null}

          <form className={styles.agendaForm} onSubmit={handleSubmit}>
            <div className={styles.agendaFormGrid}>
              <label className={styles.field}>
                <span>Titulo</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Ej. Evaluacion fisica"
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Tipo</span>
                <select
                  value={form.mode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      mode: event.target.value as AgendaMode,
                    }))
                  }
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="evaluacion">Evaluacion</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Inicio</span>
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startAt: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className={styles.field}>
                <span>Fin</span>
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endAt: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Ubicacion / enlace</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Gimnasio, sala o enlace online"
                />
              </label>

              <label className={styles.field}>
                <span>Estado</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as AgendaStatus,
                    }))
                  }
                >
                  <option value="scheduled">Programada</option>
                  <option value="completed">Completada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>
            </div>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span>Descripcion</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Notas o detalles de la actividad"
                rows={3}
              />
            </label>

            <button className={styles.primaryAction} disabled={saving}>
              <Plus size={18} />
              {saving ? "Guardando..." : "Agregar actividad"}
            </button>
          </form>
        </article>

        <article className={styles.agendaListPanel}>
          <div className={styles.agendaSectionHeader}>
            <div>
              <span>Programacion</span>
              <h2>Proximas actividades</h2>
            </div>
            <p>{items.length} registro(s)</p>
          </div>

          <div className={styles.agendaList}>
            {loading ? (
              <div className={styles.emptySchedule}>
                <span className={styles.emptyStateIcon}>
                  <RefreshCw size={24} />
                </span>
                <h3>Cargando agenda</h3>
                <p>Estamos consultando tus actividades registradas.</p>
              </div>
            ) : items.length ? (
              items.map((item) => (
                <article key={item.id} className={styles.agendaCard}>
                  <div className={styles.agendaCardDate}>
                    <CalendarClock size={18} />
                    <span>{formatDateTime(item.startAt)}</span>
                  </div>

                  <div className={styles.agendaCardBody}>
                    <div className={styles.agendaCardHeader}>
                      <strong>{item.title}</strong>
                      <span
                        className={`${styles.statusPill} ${
                          item.status === "scheduled"
                            ? styles.statusPillActive
                            : ""
                        }`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </div>
                    <p>{item.description || "Sin descripcion registrada."}</p>
                    <div className={styles.agendaMeta}>
                      <span>{modeLabels[item.mode]}</span>
                      <span>{item.location || "Sin ubicacion"}</span>
                      {item.endAt ? (
                        <span>Fin: {formatDateTime(item.endAt)}</span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => void handleDelete(item.id)}
                    aria-label={`Eliminar ${item.title}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              ))
            ) : (
              <div className={styles.emptySchedule}>
                <span className={styles.emptyStateIcon}>
                  <CalendarClock size={24} />
                </span>
                <h2>No hay sesiones programadas</h2>
                <p>Cuando agregues actividades, apareceran en este espacio.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
