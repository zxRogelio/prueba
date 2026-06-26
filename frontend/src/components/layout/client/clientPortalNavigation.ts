import type { IconType } from "react-icons";
import {
  FaChartPie,
  FaCreditCard,
  FaEnvelopeOpenText,
  FaShieldAlt,
  FaUserCircle,
  FaWallet,
  FaDumbbell,
} from "react-icons/fa";

export interface ClientPortalItem {
  to: string;
  label: string;
  description: string;
  heading?: string;
  icon: IconType;
  end?: boolean;
}

interface ClientPortalSection {
  title: string;
  items: ClientPortalItem[];
}

export const clientPortalSections: ClientPortalSection[] = [
  {
    title: "Cuenta",
    items: [
      {
        to: "/cliente",
        label: "Resumen",
        description: "Vista general de tu cuenta, progreso y accesos rapidos.",
        heading: "Resumen general",
        icon: FaChartPie,
        end: true,
      },
      {
        to: "/cliente/perfil",
        label: "Mi perfil",
        description: "Actualiza tus datos fisicos y tu panel de prediccion.",
        heading: "Mi perfil",
        icon: FaUserCircle,
      },
    ],
  },
  {
    title: "Servicios",
    items: [
      {
        to: "/cliente/suscripcion",
        label: "Mi suscripcion",
        description: "Consulta el estado de tu membresia y beneficios activos.",
        heading: "Mi suscripcion",
        icon: FaCreditCard,
      },
      {
        to: "/cliente/pagos",
        label: "Pagos",
        description: "Revisa tus movimientos, proximos cargos y comprobantes.",
        heading: "Pagos",
        icon: FaWallet,
      },
      {
        to: "/cliente/invitaciones",
        label: "Invitaciones",
        description:
          "Consulta y acepta invitaciones para unirte a paquetes grupales.",
        heading: "Invitaciones a paquetes",
        icon: FaEnvelopeOpenText,
      },
      {
        to: "/cliente/rutinas",
        label: "Rutinas",
        description: "Consulta rutinas disponibles con tu membresía activa.",
        heading: "Rutinas",
        icon: FaDumbbell,
      },
    ],
  },
  {
    title: "Seguridad",
    items: [
      {
        to: "/cliente/configuracion",
        label: "Seguridad",
        description: "Configura tu acceso y la verificacion en dos pasos.",
        heading: "Seguridad",
        icon: FaShieldAlt,
      },
    ],
  },
];

const clientPortalItems = clientPortalSections.flatMap(
  (section) => section.items
);

export function getClientPortalMeta(pathname: string) {
  const matchedItem = [...clientPortalItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to)
    );

  if (!matchedItem) {
    return {
      title: "Portal cliente",
      description: "Gestiona tu perfil, pagos y configuracion de la cuenta.",
      breadcrumb: "INICIO",
    };
  }

  return {
    title: matchedItem.heading ?? matchedItem.label,
    description: matchedItem.description,
    breadcrumb: matchedItem.label.toUpperCase(),
  };
}