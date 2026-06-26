import { useEffect, useState, type FormEvent } from "react";
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
    const confirmed = window.confirm("¿Seguro que deseas eliminar esta actividad?");
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

  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Agenda</span>
        <h1 className={styles.panelTitle}>Agenda semanal</h1>
        <p className={styles.panelDescription}>
          Crea recordatorios, sesiones, evaluaciones o seguimientos dentro del
          portal del entrenador.
        </p>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        <form className={styles.portalForm} onSubmit={handleSubmit}>
          <div className={styles.formGridTwo}>
            <label>
              <span>Título</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ej. Evaluación física"
                required
              />
            </label>

            <label>
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
                <option value="evaluacion">Evaluación</option>
              </select>
            </label>

            <label>
              <span>Inicio</span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startAt: event.target.value }))
                }
                required
              />
            </label>

            <label>
              <span>Fin</span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endAt: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Ubicación / enlace</span>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Gimnasio, sala o enlace online"
              />
            </label>

            <label>
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

          <label>
            <span>Descripción</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Notas o detalles de la actividad"
              rows={3}
            />
          </label>

          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Guardando..." : "Agregar actividad"}
          </button>
        </form>

        <div className={styles.agendaList}>
          {loading ? (
            <div className={styles.emptySchedule}>
              <h2>Cargando agenda...</h2>
            </div>
          ) : items.length ? (
            items.map((item) => (
              <article key={item.id} className={styles.agendaCard}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description || "Sin descripción"}</p>
                  <small>
                    {new Date(item.startAt).toLocaleString("es-MX")} · {item.mode}
                  </small>
                </div>

                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => void handleDelete(item.id)}
                >
                  Eliminar
                </button>
              </article>
            ))
          ) : (
            <div className={styles.emptySchedule}>
              <div className={styles.emptyIcon}>📅</div>
              <h2>No hay sesiones programadas</h2>
              <p>Cuando agregues actividades, aparecerán en este espacio.</p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}