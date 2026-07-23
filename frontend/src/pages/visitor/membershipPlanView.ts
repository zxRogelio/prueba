import type { IconType } from "react-icons";
import {
  FaBolt,
  FaCrown,
  FaDumbbell,
  FaFireAlt,
  FaUsers,
} from "react-icons/fa";
import type { MembershipPlan } from "../../services/membershipService";

export type MembershipPlanFeatureView = {
  label: string;
  included: boolean;
};

export type MembershipPlanCardView = {
  id: string;
  name: string;
  description: string;
  icon: IconType;
  theme: "light" | "dark";
  featured: boolean;
  price: number;
  priceSuffix: string;
  priceMeta: string;
  paymentPath: string;
  features: MembershipPlanFeatureView[];
};

export const fallbackMembershipPlans: MembershipPlanCardView[] = [
  {
    id: "basic",
    name: "Basico",
    description: "Perfecto para comenzar tu rutina fitness con una base solida.",
    icon: FaDumbbell,
    theme: "light",
    featured: false,
    price: 499,
    priceSuffix: "MXN / mes",
    priceMeta: "Sin ataduras y con renovacion flexible.",
    paymentPath: "/payment",
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario limitado", included: true },
      { label: "Equipos de cardio", included: true },
      { label: "Vestuarios y duchas", included: true },
      { label: "App de seguimiento", included: false },
      { label: "Clases grupales", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "El plan favorito para avanzar mas rapido con una experiencia completa.",
    icon: FaCrown,
    theme: "dark",
    featured: true,
    price: 799,
    priceSuffix: "MXN / mes",
    priceMeta: "Sin ataduras y con renovacion flexible.",
    paymentPath: "/payment",
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario completo", included: true },
      { label: "Todos los equipos", included: true },
      { label: "Vestuarios y duchas", included: true },
      { label: "App de seguimiento", included: true },
      { label: "Clases grupales ilimitadas", included: true },
    ],
  },
  {
    id: "elite",
    name: "Elite",
    description: "Pensado para quienes buscan resultados fuertes y mayor libertad.",
    icon: FaFireAlt,
    theme: "light",
    featured: false,
    price: 1199,
    priceSuffix: "MXN / mes",
    priceMeta: "Sin ataduras y con renovacion flexible.",
    paymentPath: "/payment",
    features: [
      { label: "Acceso al gimnasio", included: true },
      { label: "Horario completo", included: true },
      { label: "Todos los equipos", included: true },
      { label: "Vestuarios VIP", included: true },
      { label: "App de seguimiento premium", included: true },
      { label: "Acceso 24/7", included: true },
    ],
  },
];

function cleanDisplayText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\u00c3\u00a1/g, "a")
    .replace(/\u00c3\u00a9/g, "e")
    .replace(/\u00c3\u00ad/g, "i")
    .replace(/\u00c3\u00b3/g, "o")
    .replace(/\u00c3\u00ba/g, "u")
    .replace(/\u00c3\u00b1/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toPriceNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDuration(days: number) {
  if (days >= 360) return "1 ano";
  if (days >= 180) return "6 meses";
  if (days === 30) return "1 mes";
  if (days === 15) return "15 dias";
  if (days === 7) return "7 dias";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function getPriceSuffix(plan: MembershipPlan) {
  if (plan.type === "group") return "MXN / paquete";
  if (plan.durationDays >= 360) return "MXN / anual";
  if (plan.durationDays >= 180) return "MXN / semestre";
  if (plan.durationDays === 30) return "MXN / mes";
  if (plan.durationDays === 1) return "MXN / visita";
  return `MXN / ${formatDuration(plan.durationDays)}`;
}

function getPlanIcon(plan: MembershipPlan) {
  if (plan.type === "group") return FaUsers;
  if (plan.type === "visit") return FaBolt;
  if (plan.accessLevel === "premium" || plan.durationDays >= 180) return FaCrown;
  if (plan.type === "student") return FaFireAlt;
  return FaDumbbell;
}

function getFeaturedIndex(plans: MembershipPlan[]) {
  const regularMonthlyIndex = plans.findIndex(
    (plan) => cleanDisplayText(plan.slug) === "regular-mensual",
  );

  if (regularMonthlyIndex >= 0) return regularMonthlyIndex;

  const monthlyIndex = plans.findIndex(
    (plan) => plan.durationDays === 30 && plan.type !== "group",
  );

  if (monthlyIndex >= 0) return monthlyIndex;

  return Math.min(1, Math.max(plans.length - 1, 0));
}

function buildBenefits(plan: MembershipPlan) {
  const benefits = (Array.isArray(plan.benefits) ? plan.benefits : [])
    .map(cleanDisplayText)
    .filter(Boolean);

  const extraBenefits = [
    `Vigencia: ${formatDuration(plan.durationDays)}`,
    plan.type === "group"
      ? `Paquete para ${plan.minPeople}-${plan.maxPeople} personas`
      : null,
    plan.requiresStudentProof ? "Requiere comprobante de estudiante" : null,
    "Renovacion flexible",
  ].filter(Boolean) as string[];

  return [...benefits, ...extraBenefits].slice(0, 7).map((label) => ({
    label,
    included: true,
  }));
}

export function buildMembershipPlanCards(
  membershipPlans: MembershipPlan[],
): MembershipPlanCardView[] {
  const activePlans = membershipPlans
    .filter((plan) => plan.isActive !== false)
    .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0));

  if (activePlans.length === 0) {
    return fallbackMembershipPlans;
  }

  const featuredIndex = getFeaturedIndex(activePlans);

  return activePlans.map((plan, index) => {
    const name = cleanDisplayText(plan.name) || "Membresia Titanium";
    const durationLabel = formatDuration(Number(plan.durationDays || 0));
    const isFeatured = index === featuredIndex;

    return {
      id: plan.id,
      name,
      description:
        cleanDisplayText(plan.description) ||
        `Acceso Titanium con vigencia de ${durationLabel}.`,
      icon: getPlanIcon(plan),
      theme: isFeatured ? "dark" : "light",
      featured: isFeatured,
      price: toPriceNumber(plan.price),
      priceSuffix: getPriceSuffix(plan),
      priceMeta:
        plan.type === "group"
          ? `Vigencia de ${durationLabel}. Precio total del paquete.`
          : `Vigencia de ${durationLabel}.`,
      paymentPath: `/payment?membershipPlanId=${encodeURIComponent(plan.id)}`,
      features: buildBenefits(plan),
    };
  });
}
