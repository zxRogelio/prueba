export type SubscriptionKind = "membresia" | "paquete" | "pase";
export type SubscriptionStatus = "Activo" | "Inactivo";
export type SubscriptionBilling =
  | "visita"
  | "semana"
  | "quincena"
  | "mes"
  | "semestre"
  | "ano";
export type SubscriptionColor = "white" | "red" | "black";
export type DiscountType = "percentage" | "fixed" | "free_registration";
export type DiscountTarget = "plan_price" | "registration_fee";

export type SubscriptionFeatureDTO = {
  id: string;
  label: string;
};

export type SubscriptionDiscountDTO = {
  id: string;
  name: string;
  type: DiscountType;
  target: DiscountTarget;
  value: number;
  startDate: string;
  endDate: string;
  active: boolean;
  note: string;
};

export type SubscriptionDTO = {
  id: string;
  name: string;
  kind: SubscriptionKind;
  segment: string;
  price: number;
  billing: SubscriptionBilling;
  status: SubscriptionStatus;
  color: SubscriptionColor;
  summary: string;
  registrationFee: number;
  packageSize: number | null;
  highlight: boolean;
  features: SubscriptionFeatureDTO[];
  discounts: SubscriptionDiscountDTO[];
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionBaseFormData = Omit<
  SubscriptionDTO,
  | "id"
  | "features"
  | "discounts"
  | "createdAt"
  | "updatedAt"
>;

export type SubscriptionDiscountFormData = Omit<
  SubscriptionDiscountDTO,
  "id"
>;

const STORAGE_KEY = "titanium.admin.subscriptions";

const billingValues: SubscriptionBilling[] = [
  "visita",
  "semana",
  "quincena",
  "mes",
  "semestre",
  "ano",
];

const kindValues: SubscriptionKind[] = ["membresia", "paquete", "pase"];
const statusValues: SubscriptionStatus[] = ["Activo", "Inactivo"];
const colorValues: SubscriptionColor[] = ["white", "red", "black"];
const discountTypes: DiscountType[] = [
  "percentage",
  "fixed",
  "free_registration",
];
const discountTargets: DiscountTarget[] = ["plan_price", "registration_fee"];

const defaultCreatedAt = "2026-05-20T10:00:00.000Z";
const promoStartDate = "2026-06-01";
const promoEndDate = "2026-06-30";

const seedSubscriptions: SubscriptionDTO[] = [
  {
    id: "SUB-001",
    name: "Membresia Regular",
    kind: "membresia",
    segment: "General",
    price: 440,
    billing: "mes",
    status: "Activo",
    color: "red",
    summary: "Plan mensual individual para operacion general.",
    registrationFee: 150,
    packageSize: null,
    highlight: true,
    features: [
      { id: "F-001", label: "Acceso todos los dias del ano" },
      { id: "F-002", label: "Amplio estacionamiento" },
      {
        id: "F-003",
        label: "Pagos en efectivo, transferencia y tarjeta",
      },
    ],
    discounts: [
      {
        id: "D-001",
        name: "Inscripcion gratis junio 2026",
        type: "free_registration",
        target: "registration_fee",
        value: 0,
        startDate: promoStartDate,
        endDate: promoEndDate,
        active: true,
        note: "Promocion vigente del 1 al 30 de junio de 2026.",
      },
    ],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "SUB-002",
    name: "Membresia Estudiante",
    kind: "membresia",
    segment: "Estudiante",
    price: 380,
    billing: "mes",
    status: "Activo",
    color: "white",
    summary: "Version mensual para estudiantes con tarifa preferencial.",
    registrationFee: 150,
    packageSize: null,
    highlight: false,
    features: [
      { id: "F-004", label: "Acceso todos los dias del ano" },
      { id: "F-005", label: "Tarifa especial con validacion estudiantil" },
    ],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-29T09:00:00.000Z",
  },
  {
    id: "SUB-003",
    name: "Visita",
    kind: "pase",
    segment: "Temporal",
    price: 70,
    billing: "visita",
    status: "Activo",
    color: "black",
    summary: "Acceso unico para clientes ocasionales.",
    registrationFee: 0,
    packageSize: null,
    highlight: false,
    features: [{ id: "F-006", label: "Entrada de un solo dia" }],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-25T09:00:00.000Z",
  },
  {
    id: "SUB-004",
    name: "Semana",
    kind: "pase",
    segment: "Temporal",
    price: 225,
    billing: "semana",
    status: "Activo",
    color: "white",
    summary: "Acceso por 7 dias continuos.",
    registrationFee: 0,
    packageSize: null,
    highlight: false,
    features: [{ id: "F-007", label: "Plan de corta estancia por semana" }],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-25T09:00:00.000Z",
  },
  {
    id: "SUB-005",
    name: "Quincena",
    kind: "pase",
    segment: "Temporal",
    price: 300,
    billing: "quincena",
    status: "Activo",
    color: "white",
    summary: "Acceso por 15 dias para conversion rapida.",
    registrationFee: 0,
    packageSize: null,
    highlight: false,
    features: [{ id: "F-008", label: "Plan ideal para prueba prolongada" }],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-25T09:00:00.000Z",
  },
  {
    id: "SUB-006",
    name: "Semestre",
    kind: "membresia",
    segment: "General",
    price: 2120,
    billing: "semestre",
    status: "Activo",
    color: "black",
    summary: "Plan semestral para mejorar retencion y flujo.",
    registrationFee: 150,
    packageSize: null,
    highlight: false,
    features: [
      { id: "F-009", label: "Mejor costo por permanencia prolongada" },
    ],
    discounts: [
      {
        id: "D-002",
        name: "Descuento semestral junio 2026",
        type: "percentage",
        target: "plan_price",
        value: 10,
        startDate: promoStartDate,
        endDate: promoEndDate,
        active: true,
        note: "Aplica 10% al precio del semestre durante junio de 2026.",
      },
    ],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "SUB-007",
    name: "Anualidad",
    kind: "membresia",
    segment: "General",
    price: 4230,
    billing: "ano",
    status: "Activo",
    color: "red",
    summary: "Plan anual con enfoque de fidelizacion.",
    registrationFee: 150,
    packageSize: null,
    highlight: true,
    features: [
      { id: "F-010", label: "Precio preferencial por compromiso anual" },
    ],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-30T09:00:00.000Z",
  },
  {
    id: "SUB-008",
    name: "Paquete 2 personas",
    kind: "paquete",
    segment: "Grupal",
    price: 780,
    billing: "mes",
    status: "Activo",
    color: "red",
    summary: "Paquete mensual compartido para dos personas.",
    registrationFee: 150,
    packageSize: 2,
    highlight: true,
    features: [
      { id: "F-011", label: "Costo por persona estimado: 390 MXN" },
      { id: "F-012", label: "Alta simultanea de dos miembros" },
    ],
    discounts: [
      {
        id: "D-003",
        name: "Inscripcion gratis paquete junio 2026",
        type: "free_registration",
        target: "registration_fee",
        value: 0,
        startDate: promoStartDate,
        endDate: promoEndDate,
        active: true,
        note: "Promocion para captar grupos del 1 al 30 de junio de 2026.",
      },
    ],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "SUB-009",
    name: "Paquete 3 personas",
    kind: "paquete",
    segment: "Grupal",
    price: 1110,
    billing: "mes",
    status: "Activo",
    color: "black",
    summary: "Paquete mensual para tres personas.",
    registrationFee: 150,
    packageSize: 3,
    highlight: false,
    features: [
      { id: "F-013", label: "Costo por persona estimado: 370 MXN" },
    ],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-31T09:00:00.000Z",
  },
  {
    id: "SUB-010",
    name: "Paquete 4 personas",
    kind: "paquete",
    segment: "Grupal",
    price: 1400,
    billing: "mes",
    status: "Activo",
    color: "black",
    summary: "Paquete mensual para cuatro personas.",
    registrationFee: 150,
    packageSize: 4,
    highlight: false,
    features: [
      { id: "F-014", label: "Costo por persona estimado: 350 MXN" },
    ],
    discounts: [],
    createdAt: defaultCreatedAt,
    updatedAt: "2026-05-31T09:00:00.000Z",
  },
];

let memorySubscriptions = seedSubscriptions.map(cloneSubscription);

function cloneFeature(feature: SubscriptionFeatureDTO): SubscriptionFeatureDTO {
  return { ...feature };
}

function cloneDiscount(
  discount: SubscriptionDiscountDTO,
): SubscriptionDiscountDTO {
  return { ...discount };
}

function cloneSubscription(subscription: SubscriptionDTO): SubscriptionDTO {
  return {
    ...subscription,
    features: subscription.features.map(cloneFeature),
    discounts: subscription.discounts.map(cloneDiscount),
  };
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeKind(value: unknown): SubscriptionKind {
  return kindValues.includes(value as SubscriptionKind)
    ? (value as SubscriptionKind)
    : "membresia";
}

function normalizeBilling(value: unknown): SubscriptionBilling {
  return billingValues.includes(value as SubscriptionBilling)
    ? (value as SubscriptionBilling)
    : "mes";
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  return statusValues.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "Activo";
}

function normalizeColor(value: unknown): SubscriptionColor {
  return colorValues.includes(value as SubscriptionColor)
    ? (value as SubscriptionColor)
    : "red";
}

function normalizeDiscountType(value: unknown): DiscountType {
  return discountTypes.includes(value as DiscountType)
    ? (value as DiscountType)
    : "percentage";
}

function normalizeDiscountTarget(value: unknown): DiscountTarget {
  return discountTargets.includes(value as DiscountTarget)
    ? (value as DiscountTarget)
    : "plan_price";
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeFeature(
  value: Partial<SubscriptionFeatureDTO>,
  index: number,
): SubscriptionFeatureDTO {
  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : `F-${String(index + 1).padStart(3, "0")}`,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : "Caracteristica",
  };
}

function normalizeDiscount(
  value: Partial<SubscriptionDiscountDTO>,
  index: number,
): SubscriptionDiscountDTO {
  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : `D-${String(index + 1).padStart(3, "0")}`,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : "Descuento",
    type: normalizeDiscountType(value.type),
    target: normalizeDiscountTarget(value.target),
    value: toFiniteNumber(value.value, 0),
    startDate:
      typeof value.startDate === "string" && value.startDate
        ? value.startDate
        : promoStartDate,
    endDate:
      typeof value.endDate === "string" && value.endDate
        ? value.endDate
        : promoEndDate,
    active: Boolean(value.active),
    note: typeof value.note === "string" ? value.note : "",
  };
}

function normalizeSubscription(
  value: Partial<SubscriptionDTO>,
  index: number,
): SubscriptionDTO {
  const now = new Date().toISOString();

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id
        : `SUB-${String(index + 1).padStart(3, "0")}`,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : "Nueva suscripcion",
    kind: normalizeKind(value.kind),
    segment:
      typeof value.segment === "string" && value.segment.trim()
        ? value.segment.trim()
        : "General",
    price: toFiniteNumber(value.price, 0),
    billing: normalizeBilling(value.billing),
    status: normalizeStatus(value.status),
    color: normalizeColor(value.color),
    summary: typeof value.summary === "string" ? value.summary.trim() : "",
    registrationFee: toFiniteNumber(value.registrationFee, 0),
    packageSize:
      value.packageSize === null || value.packageSize === undefined
        ? null
        : toFiniteNumber(value.packageSize, 0),
    highlight: Boolean(value.highlight),
    features: Array.isArray(value.features)
      ? value.features.map((item, featureIndex) =>
          normalizeFeature(item, featureIndex),
        )
      : [],
    discounts: Array.isArray(value.discounts)
      ? value.discounts.map((item, discountIndex) =>
          normalizeDiscount(item, discountIndex),
        )
      : [],
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : now,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt
        ? value.updatedAt
        : now,
  };
}

function saveSubscriptions(subscriptions: SubscriptionDTO[]) {
  memorySubscriptions = subscriptions.map(cloneSubscription);

  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(memorySubscriptions));
}

function loadSubscriptions() {
  const storage = getStorage();

  if (!storage) {
    return memorySubscriptions.map(cloneSubscription);
  }

  const rawValue = storage.getItem(STORAGE_KEY);

  if (!rawValue) {
    saveSubscriptions(seedSubscriptions);
    return seedSubscriptions.map(cloneSubscription);
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
      saveSubscriptions(seedSubscriptions);
      return seedSubscriptions.map(cloneSubscription);
    }

    const normalized = parsedValue.map((item, index) =>
      normalizeSubscription(item, index),
    );

    saveSubscriptions(normalized);
    return normalized.map(cloneSubscription);
  } catch {
    saveSubscriptions(seedSubscriptions);
    return seedSubscriptions.map(cloneSubscription);
  }
}

function getNextId(subscriptions: SubscriptionDTO[]) {
  const nextNumber =
    subscriptions.reduce((currentMax, subscription) => {
      const numericPart = Number(subscription.id.match(/(\d+)$/)?.[1] ?? 0);
      return Math.max(currentMax, numericPart);
    }, 0) + 1;

  return `SUB-${String(nextNumber).padStart(3, "0")}`;
}

function getNextFeatureId(subscriptions: SubscriptionDTO[]) {
  const nextNumber =
    subscriptions.reduce((currentMax, subscription) => {
      const localMax = subscription.features.reduce((featureMax, feature) => {
        const numericPart = Number(feature.id.match(/(\d+)$/)?.[1] ?? 0);
        return Math.max(featureMax, numericPart);
      }, 0);

      return Math.max(currentMax, localMax);
    }, 0) + 1;

  return `F-${String(nextNumber).padStart(3, "0")}`;
}

function getNextDiscountId(subscriptions: SubscriptionDTO[]) {
  const nextNumber =
    subscriptions.reduce((currentMax, subscription) => {
      const localMax = subscription.discounts.reduce((discountMax, discount) => {
        const numericPart = Number(discount.id.match(/(\d+)$/)?.[1] ?? 0);
        return Math.max(discountMax, numericPart);
      }, 0);

      return Math.max(currentMax, localMax);
    }, 0) + 1;

  return `D-${String(nextNumber).padStart(3, "0")}`;
}

function updateSubscriptionCollection(
  subscriptions: SubscriptionDTO[],
  subscriptionId: string,
  updater: (subscription: SubscriptionDTO) => SubscriptionDTO,
) {
  return subscriptions.map((subscription) =>
    subscription.id === subscriptionId ? updater(subscription) : subscription,
  );
}

function getSubscriptionOrThrow(
  subscriptions: SubscriptionDTO[],
  subscriptionId: string,
) {
  const subscription = subscriptions.find((item) => item.id === subscriptionId);

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  return subscription;
}

export async function getSubscriptions() {
  return loadSubscriptions();
}

export async function createSubscription(payload: SubscriptionBaseFormData) {
  const subscriptions = loadSubscriptions();
  const timestamp = new Date().toISOString();

  const created: SubscriptionDTO = {
    id: getNextId(subscriptions),
    ...payload,
    features: [],
    discounts: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  saveSubscriptions([created, ...subscriptions]);
  return cloneSubscription(created);
}

export async function updateSubscription(
  subscriptionId: string,
  payload: SubscriptionBaseFormData,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const updated: SubscriptionDTO = {
    ...current,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function deleteSubscription(subscriptionId: string) {
  const subscriptions = loadSubscriptions();
  saveSubscriptions(
    subscriptions.filter((subscription) => subscription.id !== subscriptionId),
  );
}

export async function toggleSubscriptionStatus(subscriptionId: string) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const updated: SubscriptionDTO = {
    ...current,
    status: current.status === "Activo" ? "Inactivo" : "Activo",
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function addSubscriptionFeature(
  subscriptionId: string,
  label: string,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const nextFeature: SubscriptionFeatureDTO = {
    id: getNextFeatureId(subscriptions),
    label: label.trim(),
  };

  const updated: SubscriptionDTO = {
    ...current,
    features: [...current.features, nextFeature],
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function removeSubscriptionFeature(
  subscriptionId: string,
  featureId: string,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const updated: SubscriptionDTO = {
    ...current,
    features: current.features.filter((feature) => feature.id !== featureId),
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function addSubscriptionDiscount(
  subscriptionId: string,
  payload: SubscriptionDiscountFormData,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const nextDiscount: SubscriptionDiscountDTO = {
    id: getNextDiscountId(subscriptions),
    ...payload,
  };

  const updated: SubscriptionDTO = {
    ...current,
    discounts: [...current.discounts, nextDiscount],
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function removeSubscriptionDiscount(
  subscriptionId: string,
  discountId: string,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const updated: SubscriptionDTO = {
    ...current,
    discounts: current.discounts.filter((discount) => discount.id !== discountId),
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function toggleSubscriptionDiscount(
  subscriptionId: string,
  discountId: string,
) {
  const subscriptions = loadSubscriptions();
  const current = getSubscriptionOrThrow(subscriptions, subscriptionId);

  const updated: SubscriptionDTO = {
    ...current,
    discounts: current.discounts.map((discount) =>
      discount.id === discountId
        ? { ...discount, active: !discount.active }
        : discount,
    ),
    updatedAt: new Date().toISOString(),
  };

  saveSubscriptions(
    updateSubscriptionCollection(subscriptions, subscriptionId, () => updated),
  );

  return cloneSubscription(updated);
}

export async function resetSubscriptions() {
  saveSubscriptions(seedSubscriptions);
  return seedSubscriptions.map(cloneSubscription);
}
