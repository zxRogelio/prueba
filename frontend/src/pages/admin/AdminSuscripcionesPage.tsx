import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaPen,
  FaPercent,
  FaPlus,
  FaPowerOff,
  FaSearch,
  FaStar,
  FaSyncAlt,
  FaTag,
  FaTrash,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import ModalSuscripciones from "../../components/layout/admin/ModalSuscripciones/ModalSuscripciones";
import AdminPagination from "../../components/layout/admin/AdminPagination/AdminPagination";
import { usePagination } from "../../hooks/usePagination";
import {
  addSubscriptionDiscount,
  addSubscriptionFeature,
  createSubscription,
  deleteSubscription,
  getSubscriptions,
  removeSubscriptionDiscount,
  removeSubscriptionFeature,
  resetSubscriptions,
  toggleSubscriptionDiscount,
  toggleSubscriptionStatus,
  updateSubscription,
  type SubscriptionBaseFormData,
  type SubscriptionBilling,
  type SubscriptionDTO,
  type SubscriptionDiscountDTO,
  type SubscriptionDiscountFormData,
  type SubscriptionKind,
} from "../../services/admin/subscriptionService";
import { showAlert, showSuccessToast } from "../../utils/feedback";
import styles from "./AdminSuscripcionesPage.module.css";

type SortMode = "updated" | "name" | "priceAsc" | "priceDesc";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
});

const kindLabels: Record<SubscriptionKind, string> = {
  membresia: "Membresia",
  paquete: "Paquete",
  pase: "Pase temporal",
};

const billingLabels: Record<SubscriptionBilling, string> = {
  visita: "Visita",
  semana: "Semana",
  quincena: "Quincena",
  mes: "Mensual",
  semestre: "Semestral",
  ano: "Anual",
};

const heroGuideItems = [
  {
    step: "Paso 1",
    title: "Crea el plan base",
    description:
      "Registra nombre, tipo, segmento, periodicidad, precio y estado del plan.",
  },
  {
    step: "Paso 2",
    title: "Completa el detalle",
    description:
      "Agrega beneficios, condiciones de inscripcion y notas operativas dentro de cada plan.",
  },
  {
    step: "Paso 3",
    title: "Activa promociones por fecha",
    description:
      "Configura descuentos temporales para precio base o inscripcion sin alterar el plan original.",
  },
  {
    step: "Paso 4",
    title: "Organiza por formato",
    description:
      "Administra por separado membresias individuales, paquetes grupales y pases temporales.",
  },
] as const;

function createDefaultDiscountForm(): SubscriptionDiscountFormData {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  return {
    name: "",
    type: "percentage",
    target: "plan_price",
    value: 10,
    startDate: today.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    active: true,
    note: "",
  };
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function getPreviewCardClass(color: SubscriptionDTO["color"]) {
  switch (color) {
    case "white":
      return styles.previewCardWhite;
    case "black":
      return styles.previewCardBlack;
    default:
      return styles.previewCardRed;
  }
}

function isDiscountCurrentlyActive(discount: SubscriptionDiscountDTO) {
  if (!discount.active) {
    return false;
  }

  const now = new Date();
  const startDate = new Date(`${discount.startDate}T00:00:00`);
  const endDate = new Date(`${discount.endDate}T23:59:59`);

  return now >= startDate && now <= endDate;
}

function getDiscountSummary(subscription: SubscriptionDTO) {
  let currentPrice = subscription.price;
  let currentRegistrationFee = subscription.registrationFee;

  const activeDiscounts = subscription.discounts.filter(isDiscountCurrentlyActive);

  activeDiscounts.forEach((discount) => {
    if (discount.type === "free_registration") {
      currentRegistrationFee = 0;
      return;
    }

    if (discount.target === "plan_price") {
      if (discount.type === "percentage") {
        currentPrice = Math.max(0, currentPrice - currentPrice * (discount.value / 100));
        return;
      }

      currentPrice = Math.max(0, currentPrice - discount.value);
      return;
    }

    if (discount.type === "percentage") {
      currentRegistrationFee = Math.max(
        0,
        currentRegistrationFee - currentRegistrationFee * (discount.value / 100),
      );
      return;
    }

    currentRegistrationFee = Math.max(0, currentRegistrationFee - discount.value);
  });

  return {
    activeDiscounts,
    effectivePrice: currentPrice,
    effectiveRegistrationFee: currentRegistrationFee,
  };
}

function getUnitPrice(subscription: SubscriptionDTO) {
  if (subscription.kind !== "paquete" || !subscription.packageSize) {
    return null;
  }

  return subscription.price / subscription.packageSize;
}

export default function AdminSuscripcionesPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sort, setSort] = useState<SortMode>("updated");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<SubscriptionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [featureDraft, setFeatureDraft] = useState("");
  const [discountDraft, setDiscountDraft] = useState<SubscriptionDiscountFormData>(
    createDefaultDiscountForm(),
  );

  useEffect(() => {
    const initializeSubscriptions = async () => {
      setLoading(true);

      try {
        const result = await getSubscriptions();
        setSubscriptions(result);
      } catch (error) {
        console.error("LOAD SUBSCRIPTIONS ERROR:", error);
        void showAlert({
          title: "No se pudieron cargar las suscripciones",
          text: "Revisa la consola para ver el detalle tecnico.",
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    void initializeSubscriptions();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...subscriptions]
      .filter((subscription) => {
        const matchesQuery =
          !normalizedQuery ||
          subscription.id.toLowerCase().includes(normalizedQuery) ||
          subscription.name.toLowerCase().includes(normalizedQuery) ||
          subscription.segment.toLowerCase().includes(normalizedQuery) ||
          kindLabels[subscription.kind].toLowerCase().includes(normalizedQuery);

        const matchesKind =
          kindFilter === "Todos" || subscription.kind === kindFilter;

        const matchesStatus =
          statusFilter === "Todos" || subscription.status === statusFilter;

        return matchesQuery && matchesKind && matchesStatus;
      })
      .sort((left, right) => {
        if (sort === "name") {
          return left.name.localeCompare(right.name);
        }

        if (sort === "priceAsc") {
          return left.price - right.price;
        }

        if (sort === "priceDesc") {
          return right.price - left.price;
        }

        return (
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        );
      });
  }, [kindFilter, query, sort, statusFilter, subscriptions]);

  const {
    currentItems,
    page,
    rangeEnd,
    rangeStart,
    setPage,
    totalItems,
    totalPages,
  } = usePagination(filtered, 7);

  useEffect(() => {
    setPage(1);
  }, [kindFilter, query, setPage, sort, statusFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }

    const selectedStillExists = filtered.some(
      (subscription) => subscription.id === selectedId,
    );

    if (!selectedStillExists) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedSubscription = useMemo(
    () =>
      subscriptions.find((subscription) => subscription.id === selectedId) ?? null,
    [selectedId, subscriptions],
  );

  useEffect(() => {
    setFeatureDraft("");
    setDiscountDraft(createDefaultDiscountForm());
  }, [selectedId]);

  const totalActive = useMemo(
    () =>
      subscriptions.filter((subscription) => subscription.status === "Activo")
        .length,
    [subscriptions],
  );

  const packageCount = useMemo(
    () =>
      subscriptions.filter((subscription) => subscription.kind === "paquete")
        .length,
    [subscriptions],
  );

  const activePromotionsCount = useMemo(
    () =>
      subscriptions.reduce(
        (count, subscription) =>
          count + subscription.discounts.filter(isDiscountCurrentlyActive).length,
        0,
      ),
    [subscriptions],
  );

  const averagePrice = useMemo(() => {
    if (subscriptions.length === 0) {
      return 0;
    }

    const total = subscriptions.reduce(
      (sum, subscription) => sum + subscription.price,
      0,
    );

    return total / subscriptions.length;
  }, [subscriptions]);

  const selectedSummary = useMemo(
    () => (selectedSubscription ? getDiscountSummary(selectedSubscription) : null),
    [selectedSubscription],
  );

  const canCreateDiscount = useMemo(() => {
    if (discountDraft.name.trim().length < 3) {
      return false;
    }

    if (discountDraft.endDate < discountDraft.startDate) {
      return false;
    }

    if (discountDraft.type === "free_registration") {
      return true;
    }

    return Number.isFinite(discountDraft.value) && discountDraft.value > 0;
  }, [discountDraft]);

  const openCreate = () => {
    setEditing(null);
    setOpenModal(true);
  };

  const openEdit = (subscription: SubscriptionDTO) => {
    setEditing(subscription);
    setSelectedId(subscription.id);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
  };

  const handleSaveBasePlan = async (payload: SubscriptionBaseFormData) => {
    try {
      if (editing) {
        const updated = await updateSubscription(editing.id, payload);

        setSubscriptions((previous) =>
          previous.map((subscription) =>
            subscription.id === editing.id ? updated : subscription,
          ),
        );

        setSelectedId(updated.id);
        showSuccessToast(
          "Plan actualizado",
          "El bloque base del plan quedo guardado correctamente.",
        );
      } else {
        const created = await createSubscription(payload);

        setSubscriptions((previous) => [created, ...previous]);
        setSelectedId(created.id);
        setQuery("");
        setKindFilter("Todos");
        setStatusFilter("Todos");

        showSuccessToast(
          "Plan creado",
          "Ahora ya puedes cargar sus caracteristicas y descuentos por fechas.",
        );
      }

      closeModal();
    } catch (error) {
      console.error("SAVE SUBSCRIPTION ERROR:", error);
      void showAlert({
        title: "No se pudo guardar el plan",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleDelete = async (subscription: SubscriptionDTO) => {
    const confirmed = window.confirm(`Eliminar el plan ${subscription.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteSubscription(subscription.id);

      setSubscriptions((previous) =>
        previous.filter((item) => item.id !== subscription.id),
      );

      showSuccessToast(
        "Plan eliminado",
        "La oferta se retiro del catalogo local del admin.",
      );
    } catch (error) {
      console.error("DELETE SUBSCRIPTION ERROR:", error);
      void showAlert({
        title: "No se pudo eliminar el plan",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleToggleStatus = async (subscription: SubscriptionDTO) => {
    try {
      const updated = await toggleSubscriptionStatus(subscription.id);

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      showSuccessToast(
        updated.status === "Activo" ? "Plan activado" : "Plan desactivado",
        "El cambio quedo guardado en el modulo local.",
      );
    } catch (error) {
      console.error("TOGGLE SUBSCRIPTION ERROR:", error);
      void showAlert({
        title: "No se pudo cambiar el estado",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Restaurar el demo del modulo de suscripciones?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await resetSubscriptions();

      setSubscriptions(result);
      setSelectedId(result[0]?.id ?? null);
      setQuery("");
      setKindFilter("Todos");
      setStatusFilter("Todos");
      setSort("updated");

      showSuccessToast(
        "Demo restaurado",
        "Se recargaron membresias, paquetes y promociones de referencia.",
      );
    } catch (error) {
      console.error("RESET SUBSCRIPTIONS ERROR:", error);
      void showAlert({
        title: "No se pudo restaurar el demo",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleAddFeature = async () => {
    if (!selectedSubscription || featureDraft.trim().length < 3) {
      return;
    }

    try {
      const updated = await addSubscriptionFeature(
        selectedSubscription.id,
        featureDraft,
      );

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      setFeatureDraft("");
      showSuccessToast(
        "Caracteristica agregada",
        "El plan ya quedo enriquecido con su detalle operativo.",
      );
    } catch (error) {
      console.error("ADD FEATURE ERROR:", error);
      void showAlert({
        title: "No se pudo agregar la caracteristica",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleRemoveFeature = async (featureId: string) => {
    if (!selectedSubscription) {
      return;
    }

    try {
      const updated = await removeSubscriptionFeature(
        selectedSubscription.id,
        featureId,
      );

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      showSuccessToast(
        "Caracteristica eliminada",
        "La descripcion operativa del plan fue actualizada.",
      );
    } catch (error) {
      console.error("REMOVE FEATURE ERROR:", error);
      void showAlert({
        title: "No se pudo eliminar la caracteristica",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleDiscountTypeChange = (
    type: SubscriptionDiscountFormData["type"],
  ) => {
    setDiscountDraft((previous) => ({
      ...previous,
      type,
      target: type === "free_registration" ? "registration_fee" : previous.target,
      value: type === "free_registration" ? 0 : previous.value,
    }));
  };

  const handleAddDiscount = async () => {
    if (!selectedSubscription || !canCreateDiscount) {
      return;
    }

    try {
      const updated = await addSubscriptionDiscount(selectedSubscription.id, {
        ...discountDraft,
        name: discountDraft.name.trim(),
        note: discountDraft.note.trim(),
        target:
          discountDraft.type === "free_registration"
            ? "registration_fee"
            : discountDraft.target,
        value: discountDraft.type === "free_registration" ? 0 : discountDraft.value,
      });

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      setDiscountDraft(createDefaultDiscountForm());
      showSuccessToast(
        "Descuento registrado",
        "La promocion ya quedo ligada a este plan.",
      );
    } catch (error) {
      console.error("ADD DISCOUNT ERROR:", error);
      void showAlert({
        title: "No se pudo registrar el descuento",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleRemoveDiscount = async (discountId: string) => {
    if (!selectedSubscription) {
      return;
    }

    try {
      const updated = await removeSubscriptionDiscount(
        selectedSubscription.id,
        discountId,
      );

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      showSuccessToast(
        "Descuento eliminado",
        "La promocion ya no forma parte de este plan.",
      );
    } catch (error) {
      console.error("REMOVE DISCOUNT ERROR:", error);
      void showAlert({
        title: "No se pudo eliminar el descuento",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  const handleToggleDiscount = async (discountId: string) => {
    if (!selectedSubscription) {
      return;
    }

    try {
      const updated = await toggleSubscriptionDiscount(
        selectedSubscription.id,
        discountId,
      );

      setSubscriptions((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      );

      showSuccessToast(
        "Promocion actualizada",
        "El estado del descuento se modifico correctamente.",
      );
    } catch (error) {
      console.error("TOGGLE DISCOUNT ERROR:", error);
      void showAlert({
        title: "No se pudo cambiar el descuento",
        text: "Revisa la consola para ver el detalle tecnico.",
        icon: "error",
      });
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Modulo clave del negocio</span>
          <h1 className={styles.heroTitle}>Suscripciones y paquetes</h1>
          <p className={styles.heroText}>
            Desde aqui defines la base comercial de cada oferta. Primero crea el
            plan con su informacion principal y despues entra al detalle para
            cargar beneficios, promociones por fecha y reglas de inscripcion.
          </p>

          <div className={styles.heroGuideGrid}>
            {heroGuideItems.map((item) => (
              <article key={item.title} className={styles.heroGuideCard}>
                <span className={styles.heroGuideStep}>{item.step}</span>
                <strong className={styles.heroGuideTitle}>{item.title}</strong>
                <p className={styles.heroGuideText}>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleReset}
          >
            <FaSyncAlt />
            Restaurar demo
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={openCreate}
          >
            <FaPlus />
            Crear plan base
          </button>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaCheckCircle />
          </span>
          <div>
            <span className={styles.statLabel}>Planes activos</span>
            <strong className={styles.statValue}>{totalActive}</strong>
          </div>
          <p className={styles.statHint}>
            Membresias, paquetes y pases disponibles dentro del catalogo admin.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaUsers />
          </span>
          <div>
            <span className={styles.statLabel}>Paquetes grupales</span>
            <strong className={styles.statValue}>{packageCount}</strong>
          </div>
          <p className={styles.statHint}>
            Configuraciones grupales listas para manejar precio por persona.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaPercent />
          </span>
          <div>
            <span className={styles.statLabel}>Promociones vigentes</span>
            <strong className={styles.statValue}>{activePromotionsCount}</strong>
          </div>
          <p className={styles.statHint}>
            Descuentos activos segun las fechas configuradas en cada plan.
          </p>
        </article>

        <article className={styles.statCard}>
          <span className={styles.statIcon}>
            <FaWallet />
          </span>
          <div>
            <span className={styles.statLabel}>Precio promedio</span>
            <strong className={styles.statValue}>
              {formatCurrency(averagePrice)}
            </strong>
          </div>
          <p className={styles.statHint}>
            Referencia rapida del ticket base actual del modulo.
          </p>
        </article>
      </div>

      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <span className={styles.panelEyebrow}>Catalogo operativo</span>
              <h2 className={styles.panelTitle}>Planes configurados</h2>
              <p className={styles.panelSubtitle}>
                Encuentra el plan correcto, revisa su base comercial y despues
                entra al detalle para trabajar beneficios o promociones.
              </p>
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchGroup}>
              <span className={styles.filterLabel}>Busqueda</span>
              <label className={styles.searchField}>
                <FaSearch className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="Buscar por ID, nombre, segmento o tipo"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.filters}>
              <label className={styles.filterGroup}>
                <span className={styles.filterLabel}>Tipo</span>
                <select
                  className={styles.filterSelect}
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="membresia">Membresias</option>
                  <option value="paquete">Paquetes</option>
                  <option value="pase">Pases</option>
                </select>
              </label>

              <label className={styles.filterGroup}>
                <span className={styles.filterLabel}>Estado</span>
                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>

              <label className={styles.filterGroup}>
                <span className={styles.filterLabel}>Orden</span>
                <select
                  className={styles.filterSelect}
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                >
                  <option value="updated">Ultima edicion</option>
                  <option value="name">Nombre</option>
                  <option value="priceAsc">Precio ascendente</option>
                  <option value="priceDesc">Precio descendente</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th className={styles.alignRight}>Precio base</th>
                  <th className={styles.alignRight}>Inscripcion</th>
                  <th>Promos activas</th>
                  <th>Estado</th>
                  <th className={styles.alignRight}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      Cargando suscripciones...
                    </td>
                  </tr>
                ) : currentItems.length > 0 ? (
                  currentItems.map((subscription) => {
                    const isSelected = selectedId === subscription.id;
                    const discountSummary = getDiscountSummary(subscription);
                    const unitPrice = getUnitPrice(subscription);

                    return (
                      <tr
                        key={subscription.id}
                        className={isSelected ? styles.activeRow : undefined}
                        onClick={() => setSelectedId(subscription.id)}
                      >
                        <td>
                          <div className={styles.planCell}>
                            <div className={styles.planTopRow}>
                              <span className={styles.planName}>
                                {subscription.name}
                              </span>
                            </div>

                            <div className={styles.planBadgeRow}>
                              <span className={styles.kindPill}>
                                {kindLabels[subscription.kind]}
                              </span>
                              <span className={styles.neutralPill}>
                                {billingLabels[subscription.billing]}
                              </span>
                              {subscription.highlight ? (
                                <span className={styles.highlightPill}>
                                  <FaStar />
                                  Destacado
                                </span>
                              ) : null}
                            </div>

                            <div className={styles.planMeta}>
                              <span>{subscription.id}</span>
                              <span>{subscription.segment}</span>
                              {subscription.packageSize ? (
                                <span>{subscription.packageSize} personas</span>
                              ) : null}
                              {unitPrice ? (
                                <span>{formatCurrency(unitPrice)} c/u</span>
                              ) : null}
                            </div>

                            <span className={styles.planSummary}>
                              {subscription.summary}
                            </span>
                          </div>
                        </td>

                        <td className={styles.alignRight}>
                          <span className={styles.priceValue}>
                            {formatCurrency(subscription.price)}
                          </span>
                        </td>

                        <td className={styles.alignRight}>
                          <span className={styles.priceValue}>
                            {formatCurrency(subscription.registrationFee)}
                          </span>
                        </td>

                        <td>
                          {discountSummary.activeDiscounts.length > 0 ? (
                            <div className={styles.promoList}>
                              {discountSummary.activeDiscounts.map((discount) => (
                                <span
                                  key={discount.id}
                                  className={styles.promoPill}
                                >
                                  {discount.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className={styles.emptyPromoText}>
                              Sin promo vigente
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`${styles.statusPill} ${
                              subscription.status === "Activo"
                                ? styles.statusOn
                                : styles.statusOff
                            }`}
                          >
                            {subscription.status}
                          </span>
                        </td>

                        <td className={styles.alignRight}>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.ghostBtn}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(subscription);
                              }}
                            >
                              <FaPen />
                              Editar base
                            </button>

                            <button
                              type="button"
                              className={styles.ghostBtn}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleToggleStatus(subscription);
                              }}
                            >
                              <FaPowerOff />
                              {subscription.status === "Activo"
                                ? "Desactivar"
                                : "Activar"}
                            </button>

                            <button
                              type="button"
                              className={styles.dangerBtn}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDelete(subscription);
                              }}
                            >
                              <FaTrash />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      No hay planes que coincidan con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.panelFooter}>
            <AdminPagination
              itemLabel="planes"
              onPageChange={setPage}
              page={page}
              rangeEnd={rangeEnd}
              rangeStart={rangeStart}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </div>
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.previewEyebrow}>Paso 2 del flujo</span>
            <h2 className={styles.previewTitle}>
              {selectedSubscription ? "Detalle y promociones" : "Selecciona un plan"}
            </h2>
            <p className={styles.previewSubtitle}>
              {selectedSubscription
                ? `Estas trabajando sobre ${selectedSubscription.name}. Aqui ajustas caracteristicas, promociones e inscripcion sin perder de vista el precio final.`
                : "Selecciona un plan de la tabla para administrar sus caracteristicas y descuentos."}
            </p>
          </div>

          {selectedSubscription && selectedSummary ? (
            <>
              <article
                className={`${styles.previewCard} ${getPreviewCardClass(
                  selectedSubscription.color,
                )}`}
              >
                <div className={styles.previewCardTop}>
                  <div>
                    <span className={styles.previewCardLevel}>
                      {kindLabels[selectedSubscription.kind]}
                    </span>
                    <h3 className={styles.previewCardName}>
                      {selectedSubscription.name}
                    </h3>
                  </div>

                  {selectedSubscription.highlight ? (
                    <span className={styles.previewHighlight}>
                      <FaStar />
                      Plan foco
                    </span>
                  ) : null}
                </div>

                <p className={styles.previewCardDescription}>
                  {selectedSubscription.summary}
                </p>

                <div className={styles.previewPriceGrid}>
                  <div className={styles.previewPriceItem}>
                    <span>Precio base</span>
                    <strong>{formatCurrency(selectedSubscription.price)}</strong>
                  </div>

                  <div className={styles.previewPriceItem}>
                    <span>Precio final</span>
                    <strong>{formatCurrency(selectedSummary.effectivePrice)}</strong>
                  </div>

                  <div className={styles.previewPriceItem}>
                    <span>Inscripcion base</span>
                    <strong>
                      {formatCurrency(selectedSubscription.registrationFee)}
                    </strong>
                  </div>

                  <div className={styles.previewPriceItem}>
                    <span>Inscripcion final</span>
                    <strong>
                      {formatCurrency(selectedSummary.effectiveRegistrationFee)}
                    </strong>
                  </div>
                </div>

                {selectedSubscription.packageSize ? (
                  <div className={styles.previewPackageNote}>
                    {selectedSubscription.packageSize} personas |{" "}
                    {formatCurrency(
                      selectedSubscription.price / selectedSubscription.packageSize,
                    )}{" "}
                    por persona
                  </div>
                ) : null}
              </article>

              <div className={styles.detailGrid}>
                <section className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <div>
                      <span className={styles.detailEyebrow}>
                        Paso 1 completado
                      </span>
                      <h3 className={styles.detailTitle}>Bloque base</h3>
                    </div>
                    <button
                      type="button"
                      className={styles.inlineGhostBtn}
                      onClick={() => openEdit(selectedSubscription)}
                    >
                      <FaPen />
                      Editar
                    </button>
                  </div>

                  <div className={styles.baseInfoGrid}>
                    <article className={styles.metaCard}>
                      <span className={styles.metaLabel}>Segmento</span>
                      <strong className={styles.metaValue}>
                        {selectedSubscription.segment}
                      </strong>
                    </article>

                    <article className={styles.metaCard}>
                      <span className={styles.metaLabel}>Periodicidad</span>
                      <strong className={styles.metaValue}>
                        {billingLabels[selectedSubscription.billing]}
                      </strong>
                    </article>

                    <article className={styles.metaCard}>
                      <span className={styles.metaLabel}>Estado</span>
                      <strong className={styles.metaValue}>
                        {selectedSubscription.status}
                      </strong>
                    </article>

                    <article className={styles.metaCard}>
                      <span className={styles.metaLabel}>Ultima edicion</span>
                      <strong className={styles.metaValue}>
                        {dateFormatter.format(
                          new Date(selectedSubscription.updatedAt),
                        )}
                      </strong>
                    </article>
                  </div>
                </section>

                <section className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <div>
                      <span className={styles.detailEyebrow}>Paso 2</span>
                      <h3 className={styles.detailTitle}>Caracteristicas</h3>
                    </div>
                    <span className={styles.detailCount}>
                      {selectedSubscription.features.length} registradas
                    </span>
                  </div>

                  <div className={styles.inlineForm}>
                    <input
                      className={styles.inlineInput}
                      value={featureDraft}
                      onChange={(event) => setFeatureDraft(event.target.value)}
                      placeholder="Agregar caracteristica o beneficio del plan"
                    />
                    <button
                      type="button"
                      className={styles.inlinePrimaryBtn}
                      onClick={() => {
                        void handleAddFeature();
                      }}
                      disabled={featureDraft.trim().length < 3}
                    >
                      <FaPlus />
                      Agregar
                    </button>
                  </div>

                  {selectedSubscription.features.length > 0 ? (
                    <div className={styles.featureStack}>
                      {selectedSubscription.features.map((feature) => (
                        <article key={feature.id} className={styles.featureCard}>
                          <div className={styles.featureContent}>
                            <span className={styles.featureIcon}>
                              <FaTag />
                            </span>
                            <p className={styles.featureText}>{feature.label}</p>
                          </div>
                          <button
                            type="button"
                            className={styles.featureDeleteBtn}
                            onClick={() => {
                              void handleRemoveFeature(feature.id);
                            }}
                          >
                            <FaTrash />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyStateCard}>
                      Este plan todavia no tiene caracteristicas. Primero ya
                      existe el plan base; ahora puedes enriquecerlo aqui.
                    </div>
                  )}
                </section>

                <section className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <div>
                      <span className={styles.detailEyebrow}>Promociones</span>
                      <h3 className={styles.detailTitle}>
                        Descuentos por fechas
                      </h3>
                    </div>
                    <span className={styles.detailCount}>
                      {selectedSubscription.discounts.length} configurados
                    </span>
                  </div>

                  <div className={styles.discountFormGrid}>
                    <label className={styles.formField}>
                      <span>Nombre de la promo</span>
                      <input
                        className={styles.inlineInput}
                        value={discountDraft.name}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Ej. Inscripcion gratis junio"
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Tipo de descuento</span>
                      <select
                        className={styles.inlineSelect}
                        value={discountDraft.type}
                        onChange={(event) =>
                          handleDiscountTypeChange(
                            event.target.value as SubscriptionDiscountFormData["type"],
                          )
                        }
                      >
                        <option value="percentage">Porcentaje</option>
                        <option value="fixed">Monto fijo</option>
                        <option value="free_registration">
                          Inscripcion gratis
                        </option>
                      </select>
                    </label>

                    <label className={styles.formField}>
                      <span>Aplicar sobre</span>
                      <select
                        className={styles.inlineSelect}
                        value={discountDraft.target}
                        disabled={discountDraft.type === "free_registration"}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            target:
                              event.target.value as SubscriptionDiscountFormData["target"],
                          }))
                        }
                      >
                        <option value="plan_price">Precio del plan</option>
                        <option value="registration_fee">
                          Inscripcion
                        </option>
                      </select>
                    </label>

                    <label className={styles.formField}>
                      <span>Valor</span>
                      <input
                        className={styles.inlineInput}
                        type="number"
                        min={0}
                        step="0.01"
                        value={discountDraft.type === "free_registration" ? 0 : discountDraft.value}
                        disabled={discountDraft.type === "free_registration"}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            value: Number(event.target.value),
                          }))
                        }
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Inicio</span>
                      <input
                        className={styles.inlineInput}
                        type="date"
                        value={discountDraft.startDate}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className={styles.formField}>
                      <span>Fin</span>
                      <input
                        className={styles.inlineInput}
                        type="date"
                        value={discountDraft.endDate}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className={`${styles.formField} ${styles.formFieldFull}`}>
                      <span>Nota</span>
                      <textarea
                        className={styles.inlineTextarea}
                        rows={3}
                        value={discountDraft.note}
                        onChange={(event) =>
                          setDiscountDraft((previous) => ({
                            ...previous,
                            note: event.target.value,
                          }))
                        }
                        placeholder="Describe el contexto de la promocion o temporada."
                      />
                    </label>
                  </div>

                  <div className={styles.discountActionRow}>
                    <button
                      type="button"
                      className={styles.inlinePrimaryBtn}
                      onClick={() => {
                        void handleAddDiscount();
                      }}
                      disabled={!canCreateDiscount}
                    >
                      <FaPlus />
                      Registrar descuento
                    </button>
                  </div>

                  {selectedSubscription.discounts.length > 0 ? (
                    <div className={styles.discountStack}>
                      {selectedSubscription.discounts.map((discount) => {
                        const activeNow = isDiscountCurrentlyActive(discount);

                        return (
                          <article key={discount.id} className={styles.discountCard}>
                            <div className={styles.discountCardTop}>
                              <div>
                                <div className={styles.discountNameRow}>
                                  <strong className={styles.discountName}>
                                    {discount.name}
                                  </strong>
                                  <span
                                    className={`${styles.discountState} ${
                                      activeNow
                                        ? styles.discountStateOn
                                        : styles.discountStateOff
                                    }`}
                                  >
                                    {activeNow ? "Vigente" : "No vigente"}
                                  </span>
                                </div>
                                <p className={styles.discountMeta}>
                                  {discount.type === "free_registration"
                                    ? "Inscripcion gratis"
                                    : discount.type === "percentage"
                                      ? `${discount.value}%`
                                      : formatCurrency(discount.value)}{" "}
                                  |{" "}
                                  {discount.target === "plan_price"
                                    ? "sobre precio del plan"
                                    : "sobre inscripcion"}{" "}
                                  | {discount.startDate} al {discount.endDate}
                                </p>
                              </div>

                              <div className={styles.discountActions}>
                                <button
                                  type="button"
                                  className={styles.inlineGhostBtn}
                                  onClick={() => {
                                    void handleToggleDiscount(discount.id);
                                  }}
                                >
                                  <FaPowerOff />
                                  {discount.active ? "Desactivar" : "Activar"}
                                </button>

                                <button
                                  type="button"
                                  className={styles.inlineDangerBtn}
                                  onClick={() => {
                                    void handleRemoveDiscount(discount.id);
                                  }}
                                >
                                  <FaTrash />
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {discount.note ? (
                              <p className={styles.discountNote}>{discount.note}</p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyStateCard}>
                      Este plan aun no tiene promociones configuradas. Puedes
                      registrar descuentos por monto, porcentaje o inscripcion
                      gratis con rango de fechas especifico.
                    </div>
                  )}
                </section>

                <section className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <div>
                      <span className={styles.detailEyebrow}>Resumen final</span>
                      <h3 className={styles.detailTitle}>Logica aplicada</h3>
                    </div>
                  </div>

                  <div className={styles.readinessCard}>
                    <div className={styles.readinessHeader}>
                      <span className={styles.readinessIcon}>
                        <FaClock />
                      </span>
                      <div>
                        <h4 className={styles.readinessTitle}>
                          Flujo ya preparado para backend
                        </h4>
                        <p className={styles.readinessText}>
                          El frontend ya distingue alta base, caracteristicas
                          posteriores, paquetes por numero de personas y
                          descuentos programados por fecha. Esto deja el modulo
                          listo para conectar reglas reales de negocio.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className={styles.emptyPreview}>
              No hay un plan seleccionado con los filtros actuales.
            </div>
          )}
        </aside>
      </div>

      <ModalSuscripciones
        open={openModal}
        title={editing ? "Editar plan base" : "Crear plan base"}
        initial={editing ?? undefined}
        onClose={closeModal}
        onSave={(payload) => {
          void handleSaveBasePlan(payload);
        }}
      />
    </section>
  );
}
