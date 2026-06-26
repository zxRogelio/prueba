import { sequelize } from "../config/sequelize.js";
import { MembershipPlan } from "../models/MembershipPlan.js";

const plans = [
  {
    name: "Visita",
    slug: "visita",
    description: "Acceso por una visita al gimnasio.",
    type: "visit",
    durationDays: 1,
    price: 70.0,
    pricePerPerson: 70.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "basic",
    benefits: ["Acceso al gimnasio por 1 día"],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Semana",
    slug: "semana",
    description: "Membresía semanal.",
    type: "individual",
    durationDays: 7,
    price: 225.0,
    pricePerPerson: 225.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "basic",
    benefits: ["Acceso al gimnasio por 7 días", "Acceso a rutinas básicas"],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Quincena",
    slug: "quincena",
    description: "Membresía quincenal.",
    type: "individual",
    durationDays: 15,
    price: 300.0,
    pricePerPerson: 300.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "basic",
    benefits: ["Acceso al gimnasio por 15 días", "Acceso a rutinas básicas"],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Regular mensual",
    slug: "regular-mensual",
    description: "Membresía mensual regular.",
    type: "individual",
    durationDays: 30,
    price: 440.0,
    pricePerPerson: 440.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: [
      "Acceso al gimnasio por 30 días",
      "Acceso a rutinas y entrenamientos",
    ],
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Estudiante mensual",
    slug: "estudiante-mensual",
    description: "Membresía mensual para estudiantes.",
    type: "student",
    durationDays: 30,
    price: 380.0,
    pricePerPerson: 380.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: true,
    accessLevel: "standard",
    benefits: [
      "Acceso al gimnasio por 30 días",
      "Precio especial para estudiantes",
      "Acceso a rutinas y entrenamientos",
    ],
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Semestre",
    slug: "semestre",
    description: "Membresía semestral.",
    type: "individual",
    durationDays: 180,
    price: 2120.0,
    pricePerPerson: 2120.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "premium",
    benefits: [
      "Acceso al gimnasio por 6 meses",
      "Acceso a rutinas y entrenamientos",
      "Mejor precio por periodo largo",
    ],
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Anualidad",
    slug: "anualidad",
    description: "Membresía anual.",
    type: "individual",
    durationDays: 365,
    price: 4230.0,
    pricePerPerson: 4230.0,
    minPeople: 1,
    maxPeople: 1,
    requiresStudentProof: false,
    accessLevel: "premium",
    benefits: [
      "Acceso al gimnasio por 1 año",
      "Acceso a rutinas y entrenamientos",
      "Mejor precio anual",
    ],
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "Paquete 2 personas",
    slug: "paquete-2-personas",
    description: "Paquete mensual para 2 personas.",
    type: "group",
    durationDays: 30,
    price: 780.0,
    pricePerPerson: 390.0,
    minPeople: 2,
    maxPeople: 2,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: [
      "Acceso mensual para 2 personas",
      "Cada integrante tiene acceso a rutinas",
    ],
    isActive: true,
    sortOrder: 8,
  },
  {
    name: "Paquete 3 personas",
    slug: "paquete-3-personas",
    description: "Paquete mensual para 3 personas.",
    type: "group",
    durationDays: 30,
    price: 1110.0,
    pricePerPerson: 370.0,
    minPeople: 3,
    maxPeople: 3,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: [
      "Acceso mensual para 3 personas",
      "Cada integrante tiene acceso a rutinas",
    ],
    isActive: true,
    sortOrder: 9,
  },
  {
    name: "Paquete 4 personas",
    slug: "paquete-4-personas",
    description: "Paquete mensual para 4 personas.",
    type: "group",
    durationDays: 30,
    price: 1400.0,
    pricePerPerson: 350.0,
    minPeople: 4,
    maxPeople: 4,
    requiresStudentProof: false,
    accessLevel: "standard",
    benefits: [
      "Acceso mensual para 4 personas",
      "Cada integrante tiene acceso a rutinas",
    ],
    isActive: true,
    sortOrder: 10,
  },
];

async function seedMembershipPlans() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado a PostgreSQL");

    for (const plan of plans) {
      await MembershipPlan.upsert(plan, {
        conflictFields: ["slug"],
      });

      console.log(`✅ Plan insertado/actualizado: ${plan.name}`);
    }

    console.log("🎉 Seed de planes de membresía completado");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error ejecutando seed de membresías:", error);
    process.exit(1);
  }
}

seedMembershipPlans();