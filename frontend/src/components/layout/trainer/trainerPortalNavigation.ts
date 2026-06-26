import type { IconType } from "react-icons";
import {
  FaCalendarAlt,
  FaChartLine,
  FaClipboardList,
  FaUserCog,
  FaUsers,
} from "react-icons/fa";

export interface TrainerPortalItem {
  to: string;
  label: string;
  description: string;
  heading?: string;
  icon: IconType;
  end?: boolean;
}

interface TrainerPortalSection {
  title: string;
  items: TrainerPortalItem[];
}

export const trainerPortalSections: TrainerPortalSection[] = [
  {
    title: "Portal",
    items: [
      {
        to: "/entrenador",
        label: "Resumen",
        description:
          "Vista general del portal con accesos directos y estado de tu espacio de trabajo.",
        heading: "Resumen general",
        icon: FaChartLine,
        end: true,
      },
    ],
  },
  {
    title: "Seguimiento",
    items: [
      {
        to: "/entrenador/clientes",
        label: "Clientes",
        description:
          "Consulta a tus alumnos asignados, su avance y las tareas pendientes.",
        heading: "Clientes asignados",
        icon: FaUsers,
      },
      {
        to: "/entrenador/rutinas",
        label: "Rutinas",
        description:
          "Organiza plantillas, sesiones y materiales para tus planes de entrenamiento.",
        heading: "Rutinas y planes",
        icon: FaClipboardList,
      },
    ],
  },
  {
    title: "Operacion",
    items: [
      {
        to: "/entrenador/agenda",
        label: "Agenda",
        description:
          "Revisa tus proximas sesiones, bloques horarios y seguimiento diario.",
        heading: "Agenda semanal",
        icon: FaCalendarAlt,
      },
      {
        to: "/entrenador/perfil",
        label: "Perfil",
        description:
          "Administra tu informacion profesional y los datos visibles dentro del portal.",
        heading: "Perfil del entrenador",
        icon: FaUserCog,
      },
    ],
  },
];

const trainerPortalItems = trainerPortalSections.flatMap(
  (section) => section.items,
);

export function getTrainerPortalMeta(pathname: string) {
  const matchedItem = [...trainerPortalItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to),
    );

  if (!matchedItem) {
    return {
      title: "Portal entrenador",
      description:
        "Gestiona tu operacion diaria, alumnos y rutinas desde un solo lugar.",
      breadcrumb: "INICIO",
    };
  }

  return {
    title: matchedItem.heading ?? matchedItem.label,
    description: matchedItem.description,
    breadcrumb: matchedItem.label.toUpperCase(),
  };
}
