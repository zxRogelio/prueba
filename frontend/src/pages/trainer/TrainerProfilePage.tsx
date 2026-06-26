import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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

  if (loading) {
    return (
      <section className={styles.page}>
        <article className={styles.panel}>
          <h1 className={styles.panelTitle}>Cargando perfil...</h1>
        </article>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <article className={styles.panel}>
        <span className={styles.panelEyebrow}>Cuenta</span>
        <h1 className={styles.panelTitle}>Perfil del entrenador</h1>
        <p className={styles.panelDescription}>
          Administra tu información profesional visible dentro del portal.
        </p>

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}

        <div className={styles.profileCard}>
          <div className={styles.avatarCircle}>
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Foto del entrenador" />
            ) : (
              profile?.email?.charAt(0).toUpperCase() || "E"
            )}
          </div>

          <div className={styles.profileInfo}>
            <span>Correo registrado</span>
            <strong>{profile?.email || "No disponible"}</strong>
            <p>Rol: Entrenador</p>
          </div>
        </div>

        <form className={styles.portalForm} onSubmit={handleSubmit}>
          <div className={styles.formGridTwo}>
            <label>
              <span>Nombre completo</span>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Nombre del entrenador"
              />
            </label>

            <label>
              <span>Teléfono</span>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Número de contacto"
              />
            </label>

            <label>
              <span>Especialidad</span>
              <input
                name="specialty"
                value={form.specialty}
                onChange={handleChange}
                placeholder="Ej. Hipertrofia, fuerza, pérdida de peso"
              />
            </label>

            <label>
              <span>Años de experiencia</span>
              <input
                type="number"
                name="experienceYears"
                value={form.experienceYears}
                onChange={handleChange}
                min={0}
              />
            </label>
          </div>

          <label>
            <span>Certificaciones</span>
            <textarea
              name="certifications"
              value={form.certifications}
              onChange={handleChange}
              rows={3}
              placeholder="Certificaciones, cursos o preparación profesional"
            />
          </label>

          <label>
            <span>Biografía</span>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Breve descripción profesional"
            />
          </label>

          <label>
            <span>Enfoque de entrenamiento</span>
            <textarea
              name="focus"
              value={form.focus}
              onChange={handleChange}
              rows={4}
              placeholder="Explica tu estilo de entrenamiento"
            />
          </label>

          <label>
            <span>Foto de perfil</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
            />
          </label>

          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </article>
    </section>
  );
}