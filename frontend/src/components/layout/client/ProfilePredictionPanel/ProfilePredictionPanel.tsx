/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Dumbbell,
  LineChart as LineChartIcon,
  Minus,
  Scale,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Weight,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./ProfilePredictionPanel.module.css";

import {
  buildDisplayProgressRecords,
  buildPredictionSummary,
  type FitnessGoalOption,
  type LifestyleData,
  type PersonalData,
  type ProfilePredictionState,
} from "../../../../services/client/profilePredictionService";

import {
  createWeeklyCalories,
  createWeeklyWeight,
  deleteLatestWeight,
  getMyProfileDashboard,
  updateMyProfile,
  type ActivityLevelOption,
  type CalorieRecordDTO,
  type UserProfileDTO,
  type WeightRecordDTO,
} from "../../../../services/client/profileService";

interface ProfilePredictionPanelProps {
  displayName?: string;
}

function formatWeight(value: number | null) {
  return value === null ? "--" : `${value.toFixed(1)} kg`;
}

function formatBmi(value: number | null, label: string) {
  return value === null ? "--" : `${value.toFixed(1)} - ${label}`;
}

function formatRate(value: number | null) {
  if (value === null) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} kg/sem`;
}

function formatDistance(value: number | null) {
  if (value === null) return "--";
  return `${value.toFixed(1)} kg`;
}

function formatGoalDate(value: string | null) {
  if (!value) return "--";

  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatReadableDate(value: string | null) {
  if (!value) return "--";

  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getStatusClassName(
  statusTone: "success" | "warning" | "danger" | "neutral"
) {
  if (statusTone === "success") return styles.statusSuccess;
  if (statusTone === "warning") return styles.statusWarning;
  if (statusTone === "danger") return styles.statusDanger;
  return styles.statusNeutral;
}

function getChangeClassName(change: number | null) {
  if (change === null || change === 0) return styles.changeNeutral;
  if (change < 0) return styles.changeNegative;
  return styles.changePositive;
}

function getChangeLabel(change: number | null) {
  if (change === null) return "-";
  if (change === 0) return "0.0 kg";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)} kg`;
}

function formatRecordDate(recordDate: string) {
  return new Date(recordDate).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toPersonalData(profile: UserProfileDTO | null): PersonalData {
  return {
    age: profile?.age ? String(profile.age) : "",
    gender: (profile?.gender || "") as PersonalData["gender"],
    height: profile?.height ? String(profile.height) : "",
    initialWeight: profile?.initialWeight ? String(profile.initialWeight) : "",
    targetWeight: profile?.targetWeight ? String(profile.targetWeight) : "",
    startDate: profile?.startDate || "",
  };
}

function toLifestyleData(
  profile: UserProfileDTO | null,
  latestCalories: CalorieRecordDTO | null
): LifestyleData {
  return {
    weeklyAttendance: profile?.weeklyGymDays ? String(profile.weeklyGymDays) : "",
    dailyCalories: latestCalories?.dailyCalories
      ? String(latestCalories.dailyCalories)
      : "",
    fitnessGoal: (profile?.fitnessGoal || "") as FitnessGoalOption,
  };
}

function buildProfileStateFromApi(
  profile: UserProfileDTO | null,
  latestCalories: CalorieRecordDTO | null,
  weightHistory: WeightRecordDTO[]
): ProfilePredictionState {
  return {
    personalData: toPersonalData(profile),
    lifestyleData: toLifestyleData(profile, latestCalories),
    progressRecords: weightHistory.map((record) => ({
      id: record.id,
      date: record.recordDate,
      weight: Number(record.weight),
    })),
  };
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.data?.message === "string"
  ) {
    return (error as any).response.data.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.data?.error === "string"
  ) {
    return (error as any).response.data.error;
  }

  return "Ocurrió un error inesperado.";
}

export default function ProfilePredictionPanel({
  displayName,
}: ProfilePredictionPanelProps) {
  const [profileState, setProfileState] = useState<ProfilePredictionState>({
    personalData: {
      age: "",
      gender: "",
      height: "",
      initialWeight: "",
      targetWeight: "",
      startDate: "",
    },
    lifestyleData: {
      weeklyAttendance: "",
      dailyCalories: "",
      fitnessGoal: "",
    },
    progressRecords: [],
  });

  const [recordWeight, setRecordWeight] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [isSavingCalories, setIsSavingCalories] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [canRegisterWeight, setCanRegisterWeight] = useState(true);
  const [nextWeightAllowedDate, setNextWeightAllowedDate] = useState<string | null>(null);
  const [canRegisterCalories, setCanRegisterCalories] = useState(true);
  const [nextCaloriesAllowedDate, setNextCaloriesAllowedDate] = useState<string | null>(null);

  const summary = useMemo(
    () => buildPredictionSummary(profileState),
    [profileState]
  );

  const displayRecords = useMemo(
    () => buildDisplayProgressRecords(profileState.progressRecords),
    [profileState.progressRecords]
  );

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const data = await getMyProfileDashboard();

      const nextState = buildProfileStateFromApi(
        data.profile,
        data.latestCalories,
        data.weightHistory
      );

      setProfileState(nextState);
      setCanRegisterWeight(data.canRegisterWeight);
      setNextWeightAllowedDate(data.nextWeightAllowedDate);
      setCanRegisterCalories(data.canRegisterCalories);
      setNextCaloriesAllowedDate(data.nextCaloriesAllowedDate);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const updatePersonalData = <K extends keyof PersonalData>(
    field: K,
    value: PersonalData[K]
  ) => {
    setProfileState((previousState) => ({
      ...previousState,
      personalData: {
        ...previousState.personalData,
        [field]: value,
      },
    }));
  };

  const updateLifestyleData = <K extends keyof LifestyleData>(
    field: K,
    value: LifestyleData[K]
  ) => {
    setProfileState((previousState) => ({
      ...previousState,
      lifestyleData: {
        ...previousState.lifestyleData,
        [field]: value,
      },
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      setMessage(null);
      setErrorMessage(null);

      await updateMyProfile({
        age: profileState.personalData.age
          ? Number(profileState.personalData.age)
          : null,
        gender: (profileState.personalData.gender || "") as
          | ""
          | "male"
          | "female"
          | "other",
        height: profileState.personalData.height
          ? Number(profileState.personalData.height)
          : null,
        initialWeight: profileState.personalData.initialWeight
          ? Number(profileState.personalData.initialWeight)
          : null,
        targetWeight: profileState.personalData.targetWeight
          ? Number(profileState.personalData.targetWeight)
          : null,
        startDate: profileState.personalData.startDate || null,
        weeklyGymDays: profileState.lifestyleData.weeklyAttendance
          ? Number(profileState.lifestyleData.weeklyAttendance)
          : null,
        activityLevel: "moderate" as ActivityLevelOption,
        fitnessGoal: (profileState.lifestyleData.fitnessGoal || "") as
          | ""
          | "lose"
          | "maintain"
          | "gain",
      });

      setMessage("Perfil actualizado correctamente.");
      await loadDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateWeight = async () => {
    try {
      const numericWeight = Number(recordWeight);

      if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
        setErrorMessage("Ingresa un peso válido.");
        return;
      }

      setIsSavingWeight(true);
      setMessage(null);
      setErrorMessage(null);

      await createWeeklyWeight({
        weight: numericWeight,
      });

      setRecordWeight("");
      setMessage("Peso semanal registrado correctamente.");
      await loadDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleDeleteWeight = async (recordId: string) => {
    try {
      setMessage(null);
      setErrorMessage(null);

      await deleteLatestWeight(recordId);

      setMessage("Último registro de peso eliminado correctamente.");
      await loadDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSaveWeeklyCalories = async () => {
    try {
      const numericCalories = Number(profileState.lifestyleData.dailyCalories);

      if (!Number.isFinite(numericCalories) || numericCalories <= 0) {
        setErrorMessage("Ingresa una cantidad válida de calorías.");
        return;
      }

      setIsSavingCalories(true);
      setMessage(null);
      setErrorMessage(null);

      await createWeeklyCalories({
        dailyCalories: numericCalories,
      });

      setMessage("Calorías semanales registradas correctamente.");
      await loadDashboard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingCalories(false);
    }
  };

  const latestRecordId = displayRecords.length > 0 ? displayRecords[0].id : null;

  if (isLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.emptyState}>
          <Sparkles size={28} />
          <strong>Cargando perfil...</strong>
          <span>Estamos obteniendo tu información guardada.</span>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {displayName ? `${displayName} - Mi Perfil` : "Mi Perfil"}
        </h1>
        <p className={styles.pageSubtitle}>
          Desde aquí podrás actualizar tus datos personales, registrar tu
          progreso y seguir una predicción de avance.
        </p>
      </header>

      {message ? <div className={styles.successMessage}>{message}</div> : null}
      {errorMessage ? <div className={styles.errorMessage}>{errorMessage}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBar} />
          <h2>Datos del Usuario</h2>
        </div>

        <div className={styles.sectionRail}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleRow}>
                <span className={styles.panelIcon}>
                  <UserRound size={18} />
                </span>
                <div>
                  <h3>Datos Personales y Físicos</h3>
                  <p>
                    Ingresa tu información básica para personalizar tu experiencia.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Edad</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={14}
                    max={100}
                    value={profileState.personalData.age}
                    onChange={(event) =>
                      updatePersonalData("age", event.target.value)
                    }
                    placeholder="25"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Género</span>
                  <select
                    className={styles.select}
                    value={profileState.personalData.gender}
                    onChange={(event) =>
                      updatePersonalData(
                        "gender",
                        event.target.value as PersonalData["gender"]
                      )
                    }
                  >
                    <option value="">Seleccionar</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Altura (metros)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={2.5}
                    step="0.01"
                    value={profileState.personalData.height}
                    onChange={(event) =>
                      updatePersonalData("height", event.target.value)
                    }
                    placeholder="1.75"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Peso Inicial (kg)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={profileState.personalData.initialWeight}
                    onChange={(event) =>
                      updatePersonalData("initialWeight", event.target.value)
                    }
                    placeholder="80"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Peso Objetivo (kg)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={profileState.personalData.targetWeight}
                    onChange={(event) =>
                      updatePersonalData("targetWeight", event.target.value)
                    }
                    placeholder="70"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Fecha de Inicio</span>
                  <input
                    className={styles.input}
                    type="date"
                    value={profileState.personalData.startDate}
                    onChange={(event) =>
                      updatePersonalData("startDate", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className={styles.recordActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  <UserRound size={16} />
                  {isSavingProfile ? "Guardando..." : "Guardar perfil"}
                </button>
              </div>
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleRow}>
                <span className={styles.panelIcon}>
                  <Dumbbell size={18} />
                </span>
                <div>
                  <h3>Estilo de Vida y Entrenamiento</h3>
                  <p>
                    Información sobre tus hábitos de ejercicio y nutrición.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.formGridTriple}>
                <label className={styles.field}>
                  <span className={styles.label}>Asistencia Semanal al Gimnasio</span>
                  <select
                    className={styles.select}
                    value={profileState.lifestyleData.weeklyAttendance}
                    onChange={(event) =>
                      updateLifestyleData("weeklyAttendance", event.target.value)
                    }
                  >
                    <option value="">Días por semana</option>
                    {Array.from({ length: 7 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={String(day)}>
                        {day} {day === 1 ? "día" : "días"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Ingesta Calórica Diaria</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1000}
                    max={5000}
                    step="10"
                    value={profileState.lifestyleData.dailyCalories}
                    onChange={(event) =>
                      updateLifestyleData("dailyCalories", event.target.value)
                    }
                    placeholder="2000"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Objetivo Fitness</span>
                  <select
                    className={styles.select}
                    value={profileState.lifestyleData.fitnessGoal}
                    onChange={(event) =>
                      updateLifestyleData(
                        "fitnessGoal",
                        event.target.value as FitnessGoalOption
                      )
                    }
                  >
                    <option value="">Seleccionar objetivo</option>
                    <option value="lose">Perder peso</option>
                    <option value="maintain">Mantener peso</option>
                    <option value="gain">Ganar masa muscular</option>
                  </select>
                </label>
              </div>

              <div className={styles.recordHelper}>
                {canRegisterCalories ? (
                  <span>Ya puedes registrar tus calorías semanales.</span>
                ) : (
                  <span>
                    Podrás registrar calorías nuevamente a partir del{" "}
                    <strong>{formatReadableDate(nextCaloriesAllowedDate)}</strong>.
                  </span>
                )}
              </div>

              <div className={styles.recordActions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSaveWeeklyCalories}
                  disabled={isSavingCalories || !canRegisterCalories}
                >
                  <CalendarClock size={16} />
                  {isSavingCalories ? "Guardando..." : "Guardar calorías semanales"}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionBar} />
          <h2>Seguimiento y Predicciones</h2>
        </div>

        <div className={styles.sectionRail}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleRow}>
                <span className={styles.panelIcon}>
                  <Weight size={18} />
                </span>
                <div>
                  <h3>Seguimiento de Progreso</h3>
                  <p>
                    Registra tu peso semanal para construir tu historial.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.formGridTracker}>
                <label className={styles.field}>
                  <span className={styles.label}>Peso Actual (kg)</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={recordWeight}
                    onChange={(event) => setRecordWeight(event.target.value)}
                    placeholder="75.5"
                  />
                </label>

                <div className={styles.recordHelper}>
                  {canRegisterWeight ? (
                    <span>Ya puedes registrar tu peso semanal.</span>
                  ) : (
                    <span>
                      Podrás registrar tu peso nuevamente a partir del{" "}
                      <strong>{formatReadableDate(nextWeightAllowedDate)}</strong>.
                    </span>
                  )}
                </div>

                <div className={styles.recordActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleCreateWeight}
                    disabled={!recordWeight || isSavingWeight || !canRegisterWeight}
                  >
                    <CalendarClock size={16} />
                    {isSavingWeight ? "Guardando..." : "Guardar registro semanal"}
                  </button>
                </div>
              </div>

              {displayRecords.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Peso (kg)</th>
                        <th>Cambio</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {displayRecords.map((record) => {
                        const isLatest = record.id === latestRecordId;

                        return (
                          <tr key={record.id}>
                            <td>{formatRecordDate(record.date)}</td>
                            <td>{record.weight.toFixed(1)}</td>
                            <td>
                              <span
                                className={`${styles.changeCell} ${getChangeClassName(record.change)}`}
                              >
                                {record.change === null ? (
                                  <Minus size={14} />
                                ) : (
                                  <LineChartIcon size={14} />
                                )}
                                {getChangeLabel(record.change)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.iconButton}
                                onClick={() => handleDeleteWeight(record.id)}
                                disabled={!isLatest}
                                aria-label={`Eliminar registro del ${record.date}`}
                                title={
                                  isLatest
                                    ? "Eliminar último registro"
                                    : "Solo puedes eliminar el último registro"
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Weight size={28} />
                  <strong>No hay registros aún</strong>
                  <span>
                    Agrega tu primer registro de peso para comenzar el seguimiento.
                  </span>
                </div>
              )}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleRow}>
                <span className={styles.panelIcon}>
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3>Panel de Predicción</h3>
                  <p>
                    Visualiza tu progreso y obtén estimaciones basadas en tus datos.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.statusRow}>
                <span
                  className={`${styles.statusBadge} ${getStatusClassName(
                    summary.statusTone
                  )}`}
                >
                  <Sparkles size={14} />
                  {summary.statusLabel}
                </span>
                <span className={styles.statusMeta}>{summary.goalLabel}</span>
              </div>

              <div className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <Target size={16} />
                  </div>
                  <div className={styles.statTitle}>Distancia al objetivo</div>
                  <div className={styles.statValue}>
                    {formatDistance(summary.distanceToGoal)}
                  </div>
                  <div className={styles.statHint}>
                    Diferencia entre el peso actual y tu meta.
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <LineChartIcon size={16} />
                  </div>
                  <div className={styles.statTitle}>Ritmo proyectado</div>
                  <div className={styles.statValue}>
                    {formatRate(summary.projectedRate)}
                  </div>
                  <div className={styles.statHint}>
                    Estimado semanal usando registros y hábitos.
                  </div>
                </article>

                <article className={styles.statCard}>
                  <div className={styles.statIcon}>
                    <Scale size={16} />
                  </div>
                  <div className={styles.statTitle}>IMC estimado</div>
                  <div className={styles.statValue}>
                    {formatBmi(summary.bmi, summary.bmiLabel)}
                  </div>
                  <div className={styles.statHint}>
                    Fecha sugerida: {formatGoalDate(summary.estimatedGoalDate)}
                  </div>
                </article>
              </div>

              {summary.chartPoints.length > 0 ? (
                <div className={styles.chartPanel}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={summary.chartPoints}
                      margin={{ top: 18, right: 12, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ece7ea" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "#7d7380" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        tick={{ fontSize: 12, fill: "#7d7380" }}
                      />
                      <Tooltip
                        formatter={(value) => {
                          const numericValue = Number(value ?? 0);
                          return [`${numericValue.toFixed(1)} kg`, "Peso"];
                        }}
                        labelFormatter={(label) => `Fecha: ${label}`}
                        contentStyle={{
                          borderRadius: "14px",
                          border: "1px solid #ece7ea",
                          boxShadow: "0 18px 34px rgba(31, 23, 32, 0.08)",
                        }}
                      />
                      {summary.targetWeight !== null && (
                        <ReferenceLine
                          y={summary.targetWeight}
                          stroke="#ff1f2d"
                          strokeDasharray="6 6"
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#ff1f2d"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#ff1f2d", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#ff1f2d" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <LineChartIcon size={28} />
                  <strong>Sin datos para visualizar</strong>
                  <span>
                    Agrega registros de peso para ver la gráfica y generar una
                    tendencia.
                  </span>
                </div>
              )}

              <div className={styles.predictionFooter}>
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Recomendación actual
                </strong>
                <div>{summary.recommendation}</div>
                <div className={styles.predictionMeta}>
                  Ritmo observado: {formatRate(summary.observedRate)} | Peso
                  actual: {formatWeight(summary.currentWeight)} | Meta estimada:{" "}
                  {summary.weeksToGoal === null
                    ? "--"
                    : `${summary.weeksToGoal} semanas`}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}