import type { IconType } from "react-icons";
import {
  FaChartPie,
  FaCreditCard,
  FaShieldAlt,
  FaUserCircle,
  FaWallet,
} from "react-icons/fa";

export interface ClientPortalItem {
  to: string;
  label: string;
  description: string;
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
        icon: FaChartPie,
        end: true,
      },
      {
        to: "/cliente/perfil",
        label: "Mi perfil",
        description: "Actualiza tus datos fisicos y tu panel de prediccion.",
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
        icon: FaCreditCard,
      },
      {
        to: "/cliente/pagos",
        label: "Pagos",
        description: "Revisa tus movimientos, proximos cargos y comprobantes.",
        icon: FaWallet,
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
        icon: FaShieldAlt,
      },
    ],
  },
];

const clientPortalItems = clientPortalSections.flatMap((section) => section.items);

export function getClientPortalMeta(pathname: string) {
  const matchedItem = [...clientPortalItems]
    .sort((left, right) => right.to.length - left.to.length)
    .find((item) =>
      item.end ? pathname === item.to : pathname.startsWith(item.to)
    );

  if (!matchedItem) {
    return {
      title: "Portal del cliente",
      description: "Gestiona tu perfil, pagos y configuracion de la cuenta.",
    };
  }

  return {
    title: matchedItem.label,
    description: matchedItem.description,
  };
}
