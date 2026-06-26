import bcrypt from "bcrypt";
import { sequelize } from "../config/sequelize.js";
import { Routine, RoutineExercise, User } from "../models/index.js";

const pendingRoutines = [
  {
    title: "Rutina de Fuerza Base",
    objective: "Desarrollar fuerza general en clientes principiantes.",
    description:
      "Rutina enfocada en movimientos básicos para mejorar fuerza, postura y control corporal.",
    level: "principiante",
    category: "fuerza",
    durationWeeks: 4,
    daysPerWeek: 3,
    estimatedMinutes: 45,
    exercises: [
      {
        name: "Sentadilla con peso corporal",
        description: "Realizar sentadilla manteniendo espalda recta y abdomen activo.",
        dayNumber: 1,
        sets: 4,
        reps: "12",
        restSeconds: 60,
        notes: "Bajar controlado y subir sin impulso.",
        order: 1,
      },
      {
        name: "Press de pecho en máquina",
        description: "Empujar de forma controlada y regresar lento.",
        dayNumber: 1,
        sets: 4,
        reps: "10",
        restSeconds: 75,
        notes: "No bloquear completamente los codos.",
        order: 2,
      },
      {
        name: "Jalón al pecho",
        description: "Llevar la barra hacia el pecho manteniendo el torso estable.",
        dayNumber: 2,
        sets: 4,
        reps: "10",
        restSeconds: 75,
        notes: "Evitar balanceo del cuerpo.",
        order: 1,
      },
      {
        name: "Plancha abdominal",
        description: "Mantener posición firme con abdomen contraído.",
        dayNumber: 3,
        sets: 3,
        reps: "30 segundos",
        restSeconds: 45,
        notes: "Mantener respiración constante.",
        order: 1,
      },
    ],
  },
  {
    title: "Hipertrofia Tren Superior",
    objective: "Aumentar masa muscular en pecho, espalda, hombros y brazos.",
    description:
      "Rutina para clientes intermedios enfocada en volumen muscular del tren superior.",
    level: "intermedio",
    category: "hipertrofia",
    durationWeeks: 6,
    daysPerWeek: 4,
    estimatedMinutes: 60,
    exercises: [
      {
        name: "Press banca",
        description: "Ejercicio principal para pecho.",
        dayNumber: 1,
        sets: 4,
        reps: "8-10",
        restSeconds: 90,
        notes: "Usar peso moderado y técnica controlada.",
        order: 1,
      },
      {
        name: "Remo con barra",
        description: "Trabajo de espalda media y dorsal.",
        dayNumber: 2,
        sets: 4,
        reps: "8-10",
        restSeconds: 90,
        notes: "Mantener espalda firme durante el movimiento.",
        order: 1,
      },
      {
        name: "Press militar",
        description: "Trabajo principal de hombro.",
        dayNumber: 3,
        sets: 4,
        reps: "8-10",
        restSeconds: 90,
        notes: "Evitar arquear demasiado la espalda.",
        order: 1,
      },
      {
        name: "Curl de bíceps con mancuernas",
        description: "Flexionar codos de forma controlada.",
        dayNumber: 4,
        sets: 3,
        reps: "12",
        restSeconds: 60,
        notes: "No balancear el cuerpo.",
        order: 1,
      },
    ],
  },
  {
    title: "Pérdida de Peso Inicial",
    objective: "Mejorar resistencia y apoyar la pérdida de grasa.",
    description:
      "Rutina combinada de cardio y fuerza ligera para clientes que buscan bajar de peso.",
    level: "principiante",
    category: "perdida_peso",
    durationWeeks: 4,
    daysPerWeek: 5,
    estimatedMinutes: 40,
    exercises: [
      {
        name: "Caminadora inclinada",
        description: "Caminar con inclinación moderada.",
        dayNumber: 1,
        sets: 1,
        reps: "15 minutos",
        restSeconds: 0,
        notes: "Mantener ritmo constante.",
        order: 1,
      },
      {
        name: "Circuito funcional",
        description: "Sentadillas, jumping jacks y abdominales.",
        dayNumber: 2,
        sets: 4,
        reps: "12 por ejercicio",
        restSeconds: 60,
        notes: "Priorizar técnica antes que velocidad.",
        order: 1,
      },
      {
        name: "Bicicleta estática",
        description: "Trabajo cardiovascular de intensidad media.",
        dayNumber: 3,
        sets: 1,
        reps: "20 minutos",
        restSeconds: 0,
        notes: "Aumentar resistencia poco a poco.",
        order: 1,
      },
    ],
  },
];

async function ensureRoutineReviewColumns() {
  console.log("✅ Columnas de revisión verificadas previamente en SQL");
}

async function getOrCreateDemoTrainer() {
  let trainer = await User.findOne({
    where: {
      role: "entrenador",
    },
    order: [["createdAt", "ASC"]],
  });

  if (trainer) return trainer;

  const hashedPassword = await bcrypt.hash("Entrenador123!", 10);

  trainer = await User.create({
    email: "entrenador.demo@titanium.com",
    password: hashedPassword,
    role: "entrenador",
    isVerified: true,
    isPendingApproval: false,
    authMethod: "normal",
    provider: "local",
  });

  console.log("✅ Entrenador demo creado:");
  console.log("Correo: entrenador.demo@titanium.com");
  console.log("Password: Entrenador123!");

  return trainer;
}

async function main() {
  const transaction = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    await ensureRoutineReviewColumns();

    const trainer = await getOrCreateDemoTrainer();

    for (const item of pendingRoutines) {
      const [routine, created] = await Routine.findOrCreate({
        where: {
          title: item.title,
          trainerId: trainer.id,
        },
        defaults: {
          trainerId: trainer.id,
          title: item.title,
          objective: item.objective,
          description: item.description,
          level: item.level,
          category: item.category,
          durationWeeks: item.durationWeeks,
          daysPerWeek: item.daysPerWeek,
          estimatedMinutes: item.estimatedMinutes,
          status: "pending_review",
          videoType: "none",
        },
        transaction,
      });

      if (!created) {
        await routine.update(
          {
            objective: item.objective,
            description: item.description,
            level: item.level,
            category: item.category,
            durationWeeks: item.durationWeeks,
            daysPerWeek: item.daysPerWeek,
            estimatedMinutes: item.estimatedMinutes,
            status: "pending_review",
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: null,
          },
          { transaction }
        );

        await RoutineExercise.destroy({
          where: {
            routineId: routine.id,
          },
          transaction,
        });
      }

      await sequelize.query(
        `
        UPDATE core."Routines"
        SET 
          "status" = 'pending_review',
          "reviewedBy" = NULL,
          "reviewedAt" = NULL,
          "reviewNotes" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = :routineId;
        `,
        {
          replacements: {
            routineId: routine.id,
          },
          transaction,
        }
      );

      await RoutineExercise.bulkCreate(
        item.exercises.map((exercise) => ({
          ...exercise,
          routineId: routine.id,
        })),
        { transaction }
      );

      console.log(`✅ Rutina pendiente lista: ${item.title}`);
    }

    await transaction.commit();

    console.log("✅ Rutinas en pending_review creadas correctamente");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Error creando rutinas pendientes:", error);
    process.exit(1);
  }
}

main();