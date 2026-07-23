import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  Award,
  BriefcaseBusiness,
  Dumbbell,
  NotebookText,
  Phone,
  Save,
  Target,
  Upload,
  UserRound,
} from "lucide-react";
import {
  getTrainerProfile,
  updateTrainerProfile,
  type TrainerProfileDTO,
} from "../../services/trainer/profileService";
import styles from "./TrainerPortalPage.module.css";

const defaultForm = {
  fullName: "",
  phone: "",
  specialty: "",
  certifications: "",
  experienceYears: 0,
  bio: "",
  focus: "",
};

export default function TrainerProfilePage() {
  const [profile, setProfile] = useState<TrainerProfileDTO | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await getTrainerProfile();
      setProfile(result);

      setForm({
        fullName: result.fullName || "",
        phone: result.phone || "",
        specialty: result.specialty || "",
        certifications: result.certifications || "",
        experienceYears: result.experienceYears || 0,
        bio: result.bio || "",
        focus: result.focus || "",
      });
    } catch (error) {
      console.error("getTrainerProfile error:", error);
      setErrorMessage("No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "experienceYears" ? Number(value) : value,
    }));
  };

  const changeExperienceYears = (amount: number) => {
    setForm((current) => ({
      ...current,
      experienceYears: Math.max(0, current.experienceYears + amount),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await updateTrainerProfile({
        ...form,
        photoFile,
      });

      setProfile(result);
      setPhotoFile(null);
      setSuccessMessage("Perfil actualizado correctamente.");
    } catch (error) {
      console.error("updateTrainerProfile error:", error);
      setErrorMessage("No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const imageFile = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFile) {
      setPhotoFile(imageFile);
    }
  };

  if (loading) {
    return (
      <section className={styles.page}>
        <section className={styles.dataPanel}>
          <div className={styles.emptyState}>
            <span>
              <UserRound size={24} />
            </span>
            <h3>Cargando perfil</h3>
            <p>Estamos preparando tu información profesional.</p>
          </div>
        </section>
      </section>
    );
  }

  const displayName = form.fullName || "Entrenador Titanium";
  return (
    <section className={styles.page}>
      <section className={styles.profileIntroBar}>
        <div>
          <h1>Configura tu perfil de entrenador</h1>
          <p>
            Mantén actualizados tus datos de contacto, experiencia y presentación
            profesional.
          </p>
        </div>
      </section>

      <section className={styles.trainerProfileGrid}>
        <aside className={styles.profileSummaryCard}>
          <div className={styles.profileAvatarLarge}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Foto del entrenador" />
            ) : (
              profile?.email?.charAt(0).toUpperCase() || "E"
            )}
          </div>

          <div className={styles.profileIdentity}>
            <span>Entrenador</span>
            <h2>{displayName}</h2>
            <p>{profile?.email || "No disponible"}</p>
          </div>

          <div className={styles.profileFacts}>
            <div>
              <Phone size={17} />
              <span>{form.phone || "Teléfono pendiente"}</span>
            </div>
            <div>
              <Award size={17} />
              <span>{form.certifications || "Certificaciones pendientes"}</span>
            </div>
            <div>
              <Dumbbell size={17} />
              <span>{form.focus || "Enfoque pendiente"}</span>
            </div>
          </div>
        </aside>

        <article className={styles.profileFormPanel}>
          <div className={styles.agendaSectionHeader}>
            <div>
              <span>Información personal</span>
              <h2>Datos profesionales</h2>
            </div>
          </div>

          {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
          {successMessage ? (
            <div className={styles.successBox}>{successMessage}</div>
          ) : null}

          <form className={styles.agendaForm} onSubmit={handleSubmit}>
            <div className={styles.agendaFormGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <UserRound size={16} />
                  Nombre completo
                </span>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nombre del entrenador"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <Phone size={16} />
                  Teléfono
                </span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Número de contacto"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <Dumbbell size={16} />
                  Especialidad
                </span>
                <input
                  name="specialty"
                  value={form.specialty}
                  onChange={handleChange}
                  placeholder="Ej. Hipertrofia, fuerza, pérdida de peso"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <BriefcaseBusiness size={16} />
                  Años de experiencia
                </span>
                <div className={styles.stepperField}>
                  <input
                    type="number"
                    name="experienceYears"
                    value={form.experienceYears}
                    onChange={handleChange}
                    min={0}
                  />
                  <div className={styles.stepperActions}>
                    <button
                      type="button"
                      onClick={() => changeExperienceYears(-1)}
                      aria-label="Restar un año de experiencia"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => changeExperienceYears(1)}
                      aria-label="Agregar un año de experiencia"
                    >
                      +
                    </button>
                  </div>
                </div>
              </label>
            </div>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.fieldLabel}>
                <Award size={16} />
                Certificaciones
              </span>
              <textarea
                name="certifications"
                value={form.certifications}
                onChange={handleChange}
                rows={3}
                placeholder="Certificaciones, cursos o preparación profesional"
              />
            </label>

            <div className={styles.agendaFormGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <NotebookText size={16} />
                  Biografía
                </span>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Breve descripción profesional"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  <Target size={16} />
                  Enfoque de entrenamiento
                </span>
                <textarea
                  name="focus"
                  value={form.focus}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Explica tu estilo de entrenamiento"
                />
              </label>
            </div>

            <label className={styles.fileField}>
              <span className={styles.fieldLabel}>
                <Upload size={16} />
                Foto de perfil
              </span>
              <p>
                Sube una imagen clara del entrenador. Se mostrará dentro del
                portal cuando el perfil esté disponible.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setPhotoFile(event.target.files?.[0] || null)
                }
              />
              <div
                className={styles.fileInputBox}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handlePhotoDrop}
              >
                <span className={styles.fileInputIcon}>
                  <Upload size={22} />
                </span>
                <strong>
                  {photoFile?.name || "Arrastra tu imagen aquí"}
                </strong>
                <small>
                  {photoFile
                    ? "Imagen lista para guardar."
                    : "o haz clic para seleccionar un archivo PNG, JPG o WEBP."}
                </small>
              </div>
            </label>

            <button className={styles.primaryAction} disabled={saving}>
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </article>
      </section>
    </section>
  );
}
