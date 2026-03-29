import { useEffect, useMemo, useState } from "react";
import styles from "./AboutePage.module.css";

import type {
  AboutPageDTO,
  AboutTeamMemberDTO,
  AboutValueDTO,
} from "../../services/aboutService";
import { getAboutPage } from "../../services/aboutService";

type GalleryItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  layout?: string;
};

const cx = (...names: string[]) =>
  names
    .map((name) => styles[name])
    .filter(Boolean)
    .join(" ");

const DEFAULT_VALUES: AboutValueDTO[] = [
  {
    id: "default-value-1",
    title: "Pasion por el Fitness",
    description:
      "Vivimos y respiramos fitness. Nuestra energia contagiosa motiva a cada miembro a superar sus limites.",
    iconKey: "shield",
    order: 0,
    isActive: true,
  },
  {
    id: "default-value-2",
    title: "Excelencia",
    description:
      "Buscamos la maxima calidad en cada servicio, desde nuestras instalaciones hasta la atencion personalizada.",
    iconKey: "check",
    order: 1,
    isActive: true,
  },
  {
    id: "default-value-3",
    title: "Comunidad",
    description:
      "Creemos en el poder del apoyo mutuo. Fomentamos un ambiente donde todos se sienten parte de una familia.",
    iconKey: "users",
    order: 2,
    isActive: true,
  },
  {
    id: "default-value-4",
    title: "Innovacion",
    description:
      "Implementamos las ultimas tendencias y tecnologias en fitness para ofrecerte la mejor experiencia.",
    iconKey: "bolt",
    order: 3,
    isActive: true,
  },
  {
    id: "default-value-5",
    title: "Compromiso",
    description:
      "Nos dedicamos al exito de cada miembro. Tu progreso es nuestra mayor satisfaccion.",
    iconKey: "heart",
    order: 4,
    isActive: true,
  },
  {
    id: "default-value-6",
    title: "Transparencia",
    description:
      "Actuamos con honestidad y claridad en cada interaccion. Tu confianza es nuestro activo mas valioso.",
    iconKey: "eye",
    order: 5,
    isActive: true,
  },
];

const DEFAULT_TEAM: AboutTeamMemberDTO[] = [
  {
    id: "default-team-1",
    name: "Carlos Mendoza",
    role: "CEO & Entrenador Principal",
    description:
      "Con mas de 15 anos de experiencia en fitness, lidera la vision estrategica y el entrenamiento personalizado.",
    imageUrl: null,
    facebookUrl: null,
    twitterUrl: null,
    linkedinUrl: null,
    order: 0,
    isActive: true,
  },
  {
    id: "default-team-2",
    name: "Maria Gonzalez",
    role: "Directora de Nutricion",
    description:
      "Especialista en nutricion deportiva con certificacion internacional. Disena planes alimenticios personalizados.",
    imageUrl: null,
    facebookUrl: null,
    twitterUrl: null,
    linkedinUrl: null,
    order: 1,
    isActive: true,
  },
  {
    id: "default-team-3",
    name: "Alex Rodriguez",
    role: "Coordinador de Entrenamiento",
    description:
      "Experto en programacion de entrenamientos y recuperacion deportiva. Certificado en entrenamiento funcional.",
    imageUrl: null,
    facebookUrl: null,
    twitterUrl: null,
    linkedinUrl: null,
    order: 2,
    isActive: true,
  },
];

const DEFAULT_ABOUT_CONTENT: Partial<AboutPageDTO> = {
  slug: "main",
  heroLabel: "Nuestra Historia",
  heroTitle: "Acerca de Nosotros",
  heroHighlight: "Nosotros",
  heroSubtitle:
    "Somos mas que un gimnasio, somos una comunidad comprometida con tu bienestar fisico y emocional. En Titanium Sport Gym, creemos en el poder transformador del fitness.",
  introTitle: "Nuestra Pasion por el Fitness",
  introHighlight: "Pasion",
  introText:
    "En Titanium Sport Gym, hemos creado un espacio donde cada persona puede alcanzar su maximo potencial. Con instalaciones de vanguardia y un equipo de profesionales apasionados, transformamos vidas a traves del deporte y la salud.",
  stat1Value: "500+",
  stat1Label: "Miembros Activos",
  stat2Value: "15+",
  stat2Label: "Entrenadores Certificados",
  stat3Value: "00",
  stat3Label: "Horario de Servicio",
  missionTitle: "Mision",
  missionText:
    "Ofrecer un entorno acogedor, inclusivo y seguro donde nuestros socios se inspiren y motiven a lograr sus metas de bienestar fisico y emocional. Nos comprometemos a tener instalaciones a la vanguardia y a un equipo de profesionales enfocados en apoyar a cada socio en su camino hacia una vida saludable.",
  visionTitle: "Vision",
  visionText:
    "Ser el gimnasio favorito de la comunidad, reconocidos por nuestro compromiso con el bienestar integral y la excelencia en el servicio.",
  valuesTitle: "Valores",
  valuesText:
    "Nuestra forma de trabajar se basa en disciplina, respeto y acompanamiento real para cada persona.",
  ctaTitle: "Listo para transformar tu vida?",
  ctaText:
    "Unete a nuestra comunidad y comienza tu viaje hacia una vida mas saludable y activa. En Titanium Sport Gym, te ayudamos a alcanzar tus metas de fitness.",
  ctaAddress:
    "Av. Corona del Rosal N 15. Col. 5 de mayo. Huejutla, Hidalgo Mexico.",
  ctaPhone: "771 197 6803",
  ctaPrimaryButtonText: "Contactanos",
  ctaPrimaryButtonLink: "/contacto",
  ctaSecondaryButtonText: "Ver Servicios",
  ctaSecondaryButtonLink: "/servicios",
};

function splitTitle(title?: string | null, highlight?: string | null) {
  const safeTitle = title?.trim() || "";
  const safeHighlight = highlight?.trim() || "";

  if (!safeTitle || !safeHighlight) {
    return {
      before: safeTitle,
      highlight: "",
      after: "",
    };
  }

  const index = safeTitle.toLowerCase().indexOf(safeHighlight.toLowerCase());

  if (index === -1) {
    return {
      before: safeTitle,
      highlight: "",
      after: "",
    };
  }

  return {
    before: safeTitle.slice(0, index),
    highlight: safeTitle.slice(index, index + safeHighlight.length),
    after: safeTitle.slice(index + safeHighlight.length),
  };
}

function renderValueIcon(iconKey?: string | null) {
  const key = (iconKey || "shield").toLowerCase();

  if (key === "check") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }

  if (key === "users") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    );
  }

  if (key === "bolt") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    );
  }

  if (key === "heart") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    );
  }

  if (key === "eye") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function renderSocialIcon(network: "facebook" | "twitter" | "linkedin") {
  if (network === "facebook") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M18.72 4.2H5.28A1.08 1.08 0 004.2 5.28v13.44a1.08 1.08 0 001.08 1.08h6.12v-5.88H9.6V11.4h1.8V9.48c0-1.8 1.08-2.76 2.64-2.76.72 0 1.44.12 1.44.12v1.68h-.84c-.84 0-1.08.48-1.08 1.08v1.32h1.92l-.36 1.92h-1.56v5.88h3.24a1.08 1.08 0 001.08-1.08V5.28a1.08 1.08 0 00-1.08-1.08z" />
      </svg>
    );
  }

  if (network === "twitter") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M23.44 4.83c-.8.36-1.66.6-2.56.71.92-.55 1.63-1.42 1.96-2.46-.86.51-1.82.88-2.83 1.08-.81-.86-1.96-1.4-3.24-1.4-2.45 0-4.44 1.99-4.44 4.44 0 .35.04.69.12 1.01-3.69-.19-6.96-1.95-9.15-4.64-.38.66-.6 1.42-.6 2.24 0 1.54.78 2.9 1.96 3.7-.72-.02-1.4-.22-2-.55v.06c0 2.15 1.53 3.95 3.56 4.36-.37.1-.76.16-1.16.16-.28 0-.56-.03-.83-.08.56 1.75 2.18 3.02 4.1 3.06-1.5 1.18-3.4 1.88-5.46 1.88-.36 0-.71-.02-1.06-.06 1.96 1.26 4.29 2 6.79 2 8.14 0 12.59-6.74 12.59-12.59 0-.19 0-.38-.01-.57.86-.62 1.61-1.4 2.21-2.29z" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.82 2H3.18C2.53 2 2 2.53 2 3.18v17.64C2 21.47 2.53 22 3.18 22h17.64c.65 0 1.18-.53 1.18-1.18V3.18C22 2.53 21.47 2 20.82 2zM8 19H5v-9h3v9zM6.5 8.31c-.96 0-1.74-.78-1.74-1.74s.78-1.74 1.74-1.74 1.74.78 1.74 1.74-.78 1.74-1.74 1.74zM19 19h-3v-4.74c0-1.11-.02-2.53-1.54-2.53-1.54 0-1.78 1.2-1.78 2.45V19h-3v-9h2.9v1.3h.04c.4-.76 1.37-1.56 2.82-1.56 3.02 0 3.58 1.99 3.58 4.57V19z" />
    </svg>
  );
}

function getInitials(value?: string | null) {
  const words = (value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) {
    return "TS";
  }

  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

function buildResolvedAbout(about: AboutPageDTO | null) {
  const activeValues = [...(about?.values ?? [])]
    .filter((item) => item.isActive !== false)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
  const activeTeam = [...(about?.teamMembers ?? [])]
    .filter((item) => item.isActive !== false)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));

  return {
    ...DEFAULT_ABOUT_CONTENT,
    ...about,
    values: activeValues.length > 0 ? activeValues : DEFAULT_VALUES,
    teamMembers: activeTeam.length > 0 ? activeTeam : DEFAULT_TEAM,
  };
}

export default function AboutUs() {
  const [about, setAbout] = useState<AboutPageDTO | null>(null);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState("Todos");
  const [activeGalleryItemId, setActiveGalleryItemId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });

    let cancelled = false;

    const loadAbout = async () => {
      try {
        const data = await getAboutPage();
        if (!cancelled) {
          setAbout(data);
        }
      } catch (error) {
        console.error("getAboutPage error:", error);
      }
    };

    loadAbout();

    return () => {
      cancelled = true;
    };
  }, []);

  const content = useMemo(() => buildResolvedAbout(about), [about]);

  const heroTitleParts = useMemo(
    () => splitTitle(content.heroTitle, content.heroHighlight),
    [content.heroHighlight, content.heroTitle],
  );

  const introTitleParts = useMemo(
    () => splitTitle(content.introTitle, content.introHighlight),
    [content.introHighlight, content.introTitle],
  );

  const values = content.values ?? [];
  const teamMembers = content.teamMembers ?? [];
  const leadMember = teamMembers[0] ?? null;
  const extraTeamMembers = leadMember ? teamMembers.slice(1, 5) : [];
  const statItems = [
    {
      id: "stat-1",
      value: content.stat1Value || "--",
      label: content.stat1Label || "Indicador 1",
    },
    {
      id: "stat-2",
      value: content.stat2Value || "--",
      label: content.stat2Label || "Indicador 2",
    },
    {
      id: "stat-3",
      value: content.stat3Value || "--",
      label: content.stat3Label || "Indicador 3",
    },
  ];
  const galleryItems: GalleryItem[] = [
    {
      id: "hero",
      title: content.heroTitle || "Acerca de Nosotros",
      category: "Historia",
      description: content.heroSubtitle || "",
      imageUrl: content.heroImageUrl || "",
      layout: "large",
    },
    {
      id: "intro",
      title: content.introTitle || "Nuestra esencia",
      category: "Comunidad",
      description: content.introText || "",
      imageUrl: content.introImageUrl || "",
      layout: "default",
    },
    {
      id: "mission",
      title: content.missionTitle || "Mision",
      category: "Proposito",
      description: content.missionText || "",
      imageUrl: content.missionImageUrl || "",
      layout: "tall",
    },
    {
      id: "vision",
      title: content.visionTitle || "Vision",
      category: "Direccion",
      description: content.visionText || "",
      imageUrl: content.visionImageUrl || "",
      layout: "default",
    },
    {
      id: "values",
      title: content.valuesTitle || "Valores",
      category: "Cultura",
      description: content.valuesText || "",
      imageUrl: content.valuesImageUrl || "",
      layout: "wide",
    },
    ...teamMembers.slice(0, 3).map((member) => ({
      id: `team-${member.id}`,
      title: member.name,
      category: "Equipo",
      description: member.description || "",
      imageUrl: member.imageUrl || "",
      layout: "default",
    })),
  ].filter(
    (item, index, items) =>
      item.imageUrl &&
      items.findIndex((candidate) => candidate.imageUrl === item.imageUrl) ===
        index,
  );
  const galleryCategories = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(galleryItems.map((item) => item.category))),
    ],
    [galleryItems],
  );
  const filteredGalleryItems = useMemo(
    () =>
      activeGalleryCategory === "Todos"
        ? galleryItems
        : galleryItems.filter(
            (item) => item.category === activeGalleryCategory,
          ),
    [activeGalleryCategory, galleryItems],
  );
  const activeGalleryIndex = activeGalleryItemId
    ? filteredGalleryItems.findIndex((item) => item.id === activeGalleryItemId)
    : -1;
  const activeGalleryItem =
    activeGalleryIndex >= 0 ? filteredGalleryItems[activeGalleryIndex] : null;
  const manifestoCards = [
    {
      id: "mission",
      eyebrow: "Base",
      title: content.missionTitle || "Mision",
      description: content.missionText || "",
      imageUrl: content.missionImageUrl || "",
      iconKey: "shield",
    },
    {
      id: "vision",
      eyebrow: "Direccion",
      title: content.visionTitle || "Vision",
      description: content.visionText || "",
      imageUrl: content.visionImageUrl || "",
      iconKey: "eye",
    },
    {
      id: "values",
      eyebrow: "Cultura",
      title: content.valuesTitle || "Valores",
      description: content.valuesText || "",
      imageUrl: content.valuesImageUrl || "",
      iconKey: "heart",
    },
  ];

  useEffect(() => {
    if (!galleryCategories.includes(activeGalleryCategory)) {
      setActiveGalleryCategory("Todos");
    }
  }, [activeGalleryCategory, galleryCategories]);

  useEffect(() => {
    if (!activeGalleryItemId || activeGalleryIndex >= 0) {
      return;
    }

    setActiveGalleryItemId(filteredGalleryItems[0]?.id ?? null);
  }, [activeGalleryIndex, activeGalleryItemId, filteredGalleryItems]);

  const closeGalleryLightbox = () => {
    setActiveGalleryItemId(null);
  };

  const goToPreviousGalleryItem = () => {
    if (filteredGalleryItems.length <= 1 || activeGalleryIndex < 0) {
      return;
    }

    const previousIndex =
      (activeGalleryIndex - 1 + filteredGalleryItems.length) %
      filteredGalleryItems.length;

    setActiveGalleryItemId(filteredGalleryItems[previousIndex]?.id ?? null);
  };

  const goToNextGalleryItem = () => {
    if (filteredGalleryItems.length <= 1 || activeGalleryIndex < 0) {
      return;
    }

    const nextIndex = (activeGalleryIndex + 1) % filteredGalleryItems.length;

    setActiveGalleryItemId(filteredGalleryItems[nextIndex]?.id ?? null);
  };

  useEffect(() => {
    if (!activeGalleryItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeGalleryLightbox();
      }

      if (event.key === "ArrowLeft") {
        goToPreviousGalleryItem();
      }

      if (event.key === "ArrowRight") {
        goToNextGalleryItem();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGalleryItem, activeGalleryIndex, filteredGalleryItems]);

  return (
    <section className={cx("about-us-section")}>
      <div className={cx("bg-animation")}>
        <div className={cx("bg-grid")} />
        <div className={cx("bg-glow", "bg-glow-1")} />
        <div className={cx("bg-glow", "bg-glow-2")} />
      </div>

      <div className={cx("page-container")}>
        <div className={cx("about-container")}>
          <section className={cx("hero-stage")}>
            <div className={cx("hero-banner")}>
              {content.heroImageUrl ? (
                <img
                  src={content.heroImageUrl}
                  alt={content.heroTitle || "Acerca de nosotros"}
                  className={cx("hero-banner-image")}
                />
              ) : (
                <div className={cx("hero-banner-fallback")}>
                  <span>{getInitials(content.heroTitle)}</span>
                </div>
              )}

              <div className={cx("hero-banner-overlay")} />
              <div className={cx("hero-banner-vignette")} />

              <div className={cx("hero-banner-content")}>
                <span className={cx("hero-badge")}>
                  {content.heroLabel || "Conoce nuestra historia"}
                </span>

                <div className={cx("hero-title-stack")}>
                  {(heroTitleParts.before || !heroTitleParts.highlight) && (
                    <span className={cx("hero-title-line")}>
                      {(heroTitleParts.before || content.heroTitle || "")
                        .replace(/\s+/g, " ")
                        .trim()}
                    </span>
                  )}

                  {heroTitleParts.highlight ? (
                    <span
                      className={cx(
                        "hero-title-line",
                        "hero-title-line-accent",
                      )}
                    >
                      {`${heroTitleParts.highlight}${heroTitleParts.after || ""}`
                        .replace(/\s+/g, " ")
                        .trim()}
                    </span>
                  ) : null}
                </div>

                <p className={cx("hero-banner-text")}>{content.heroSubtitle}</p>

                <div className={cx("hero-metrics-row")}>
                  {statItems.map((stat) => (
                    <div key={stat.id} className={cx("hero-metric")}>
                      <strong className={cx("hero-metric-value")}>
                        {stat.value}
                      </strong>
                      <span className={cx("hero-metric-label")}>
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={cx("hero-scroll-cue")} aria-hidden="true">
                  <span className={cx("hero-scroll-chevron")} />
                </div>
              </div>
            </div>
          </section>

          <section className={cx("story-section-modern")}>
            <div className={cx("story-media-stack")}>
              <div className={cx("story-image-frame")}>
                {content.introImageUrl ? (
                  <img
                    src={content.introImageUrl}
                    alt={content.introTitle || "Nuestra comunidad"}
                    className={cx("story-main-image")}
                  />
                ) : (
                  <div className={cx("story-image-fallback")}>
                    <span>{getInitials(content.introTitle)}</span>
                  </div>
                )}
                <div className={cx("story-image-overlay")} />
              </div>
              <div className={cx("story-quote-card-modern")}>
                <span className={cx("story-mini-label")}>Experiencia</span>
                <strong className={cx("story-mini-title")}>
                  {content.valuesTitle || "Comunidad activa"}
                </strong>
                <p className={cx("story-mini-text")}>
                  {content.valuesText || content.heroSubtitle}
                </p>
              </div>
            </div>

            <div className={cx("story-copy-block")}>
              <span className={cx("section-kicker")}>Quienes Somos</span>
              <h2 className={cx("section-title-modern")}>
                {introTitleParts.before}
                {introTitleParts.highlight ? (
                  <span className={cx("accent-text")}>
                    {introTitleParts.highlight}
                  </span>
                ) : null}
                {introTitleParts.after}
              </h2>
              <p className={cx("section-copy-modern")}>{content.introText}</p>

              <div className={cx("story-card-grid")}>
                <article className={cx("story-card")}>
                  <span className={cx("story-card-label")}>
                    {content.missionTitle || "Mision"}
                  </span>
                  <h3 className={cx("story-card-title")}>
                    Entrenamiento con estructura
                  </h3>
                  <p className={cx("story-card-text")}>{content.missionText}</p>
                </article>
                <article className={cx("story-card", "story-card-dark")}>
                  <span className={cx("story-card-label")}>
                    {content.visionTitle || "Vision"}
                  </span>
                  <h3 className={cx("story-card-title")}>
                    Direccion clara para crecer
                  </h3>
                  <p className={cx("story-card-text")}>{content.visionText}</p>
                </article>
              </div>

              {values.length > 0 ? (
                <div className={cx("story-value-row")}>
                  {values.slice(0, 6).map((value) => (
                    <span key={value.id} className={cx("story-value-chip")}>
                      <span className={cx("story-value-icon")}>
                        {renderValueIcon(value.iconKey)}
                      </span>
                      {value.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className={cx("section-block-modern")}>
            <div className={cx("section-head-modern")}>
              <div
                className={cx(
                  "section-head-copy-modern",
                  "section-head-copy-modern--wide",
                )}
              >
                <span className={cx("section-kicker")}>
                  Lo que sostiene la marca
                </span>
                <h2
                  className={cx(
                    "section-title-modern",
                    "section-title-modern--manifesto",
                  )}
                >
                  Mision, vision y una{" "}
                  <span className={cx("accent-text")}>cultura</span> que si se
                  siente
                </h2>
                <p className={cx("section-copy-modern")}>
                  Todo sigue saliendo de tu admin, pero ahora con una jerarquia
                  mucho mas clara y con lectura visual tipo landing premium.
                </p>
              </div>
            </div>

            <div className={cx("manifesto-grid-modern")}>
              {manifestoCards.map((card, index) => (
                <article
                  key={card.id}
                  className={cx(
                    "manifesto-card-modern",
                    index === 1 ? "manifesto-card-offset" : "",
                  )}
                >
                  <div className={cx("manifesto-media-modern")}>
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className={cx("manifesto-image-modern")}
                      />
                    ) : (
                      <div className={cx("manifesto-fallback")}>
                        <span>{getInitials(card.title)}</span>
                      </div>
                    )}
                    <div className={cx("manifesto-media-overlay")} />
                  </div>
                  <div className={cx("manifesto-body-modern")}>
                    <div className={cx("manifesto-top-row")}>
                      <div className={cx("manifesto-icon-modern")}>
                        {renderValueIcon(card.iconKey)}
                      </div>
                      <span className={cx("manifesto-tag-modern")}>
                        {card.eyebrow}
                      </span>
                    </div>
                    <h3 className={cx("manifesto-title-modern")}>
                      {card.title}
                    </h3>
                    {card.id === "values" && values.length > 0 ? (
                      <div className={cx("manifesto-list")}>
                        {values.slice(0, 4).map((value) => (
                          <div
                            key={value.id}
                            className={cx("manifesto-list-item")}
                          >
                            <span className={cx("manifesto-list-dot")} />
                            <span>{value.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={cx("manifesto-copy-modern")}>
                        {card.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {values.length > 0 ? (
            <section className={cx("values-section-modern")}>
              <div className={cx("section-head-modern", "values-head-modern")}>
                <div>
                  <span className={cx("section-kicker")}>
                    Principios del equipo
                  </span>
                  <h2 className={cx("section-title-modern")}>
                    <span className={cx("accent-text")}>
                      {content.valuesTitle || "Valores"}
                    </span>{" "}
                    que convierten la marca en experiencia
                  </h2>
                  {content.valuesText ? (
                    <p className={cx("section-copy-modern")}>
                      {content.valuesText}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className={cx("values-grid-modern")}>
                {values.map((value) => (
                  <article key={value.id} className={cx("value-card-modern")}>
                    <div className={cx("value-card-icon-modern")}>
                      {renderValueIcon(value.iconKey)}
                    </div>
                    <div>
                      <h3 className={cx("value-card-title-modern")}>
                        {value.title}
                      </h3>
                      <p className={cx("value-card-text-modern")}>
                        {value.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {galleryItems.length > 0 ? (
            <section className={cx("gallery-showcase-modern")}>
              <div className={cx("gallery-head-modern")}>
                <span className={cx("section-kicker", "gallery-kicker-modern")}>
                  Espacios y momentos
                </span>
                <h2 className={cx("gallery-section-title-modern")}>
                  Nuestra <span className={cx("accent-text")}>galeria</span>
                </h2>
                <p className={cx("gallery-section-copy-modern")}>
                  Explora las imagenes que ya administras desde el panel y
                  descubre la energia, espacios y equipo que forman parte de la
                  experiencia Titanium.
                </p>
              </div>

              <div className={cx("gallery-filter-row")}>
                {galleryCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={cx(
                      "gallery-filter-chip",
                      activeGalleryCategory === category
                        ? "gallery-filter-chip-active"
                        : "",
                    )}
                    onClick={() => setActiveGalleryCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className={cx("gallery-grid-modern")}>
                {filteredGalleryItems.map((item, index) => (
                  <button
                    key={`${item.id}-${item.category}`}
                    type="button"
                    className={cx("gallery-card-modern")}
                    onClick={() => setActiveGalleryItemId(item.id)}
                    aria-label={`Abrir imagen ${index + 1}: ${item.title}`}
                  >
                    <span className={cx("gallery-media-modern")}>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className={cx("gallery-image-modern")}
                      />
                      <span className={cx("gallery-overlay-modern")} />
                    </span>
                    <span className={cx("gallery-copy-modern")}>
                      <span className={cx("gallery-tag-modern")}>
                        {item.category}
                      </span>
                      <span className={cx("gallery-card-reveal-modern")}>
                        <strong className={cx("gallery-title-modern")}>
                          {item.title}
                        </strong>
                        <span className={cx("gallery-card-action-modern")}>
                          <span>Abrir</span>
                          <span className={cx("gallery-card-action-icon-modern")}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeGalleryItem ? (
            <div
              className={cx("gallery-lightbox-modern")}
              role="dialog"
              aria-modal="true"
              aria-label={`Vista ampliada de ${activeGalleryItem.title}`}
              onClick={closeGalleryLightbox}
            >
              <div
                className={cx("gallery-lightbox-shell-modern")}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className={cx("gallery-lightbox-close-modern")}
                  onClick={closeGalleryLightbox}
                  aria-label="Cerrar galeria"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 6l12 12M18 6L6 18"
                    />
                  </svg>
                </button>

                <div className={cx("gallery-lightbox-stage-modern")}>
                  <button
                    type="button"
                    className={cx(
                      "gallery-lightbox-nav-modern",
                      "gallery-lightbox-nav-prev-modern",
                    )}
                    onClick={goToPreviousGalleryItem}
                    aria-label="Imagen anterior"
                    disabled={filteredGalleryItems.length <= 1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <div className={cx("gallery-lightbox-media-modern")}>
                    <img
                      src={activeGalleryItem.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className={cx("gallery-lightbox-backdrop-modern")}
                    />
                    <img
                      src={activeGalleryItem.imageUrl}
                      alt={activeGalleryItem.title}
                      className={cx("gallery-lightbox-image-modern")}
                    />
                    <div className={cx("gallery-lightbox-overlay-modern")} />

                    <div className={cx("gallery-lightbox-caption-modern")}>
                      <span className={cx("gallery-lightbox-tag-modern")}>
                        {activeGalleryItem.category}
                      </span>
                      <h3 className={cx("gallery-lightbox-title-modern")}>
                        {activeGalleryItem.title}
                      </h3>
                      {activeGalleryItem.description ? (
                        <p className={cx("gallery-lightbox-text-modern")}>
                          {activeGalleryItem.description}
                        </p>
                      ) : null}
                    </div>

                    <div className={cx("gallery-lightbox-counter-modern")}>
                      {activeGalleryIndex + 1} / {filteredGalleryItems.length}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={cx(
                      "gallery-lightbox-nav-modern",
                      "gallery-lightbox-nav-next-modern",
                    )}
                    onClick={goToNextGalleryItem}
                    aria-label="Imagen siguiente"
                    disabled={filteredGalleryItems.length <= 1}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <section className={cx("section-block-modern")}>
            <div className={cx("section-head-modern")}>
              <div>
                <span className={cx("section-kicker")}>Equipo visible</span>
                <h2 className={cx("section-title-modern")}>
                  <span className={cx("accent-text")}>Personas</span> que
                  sostienen la experiencia diaria
                </h2>
              </div>
            </div>

            <div className={cx("team-layout-modern")}>
              {leadMember ? (
                <article className={cx("team-featured-modern")}>
                  <div className={cx("team-featured-media-modern")}>
                    {leadMember.imageUrl ? (
                      <img
                        src={leadMember.imageUrl}
                        alt={leadMember.name}
                        className={cx("team-featured-image-modern")}
                      />
                    ) : (
                      <div className={cx("team-fallback-large")}>
                        <span>{getInitials(leadMember.name)}</span>
                      </div>
                    )}
                    <div className={cx("team-featured-overlay-modern")} />
                  </div>
                  <div className={cx("team-featured-body-modern")}>
                    <span className={cx("team-role-modern")}>
                      {leadMember.role}
                    </span>
                    <h3 className={cx("team-name-modern")}>
                      {leadMember.name}
                    </h3>
                    {leadMember.description ? (
                      <p className={cx("team-text-modern")}>
                        {leadMember.description}
                      </p>
                    ) : null}
                    <div className={cx("team-social-row")}>
                      {[
                        {
                          key: "facebook",
                          url: leadMember.facebookUrl ?? "",
                          icon: renderSocialIcon("facebook"),
                        },
                        {
                          key: "twitter",
                          url: leadMember.twitterUrl ?? "",
                          icon: renderSocialIcon("twitter"),
                        },
                        {
                          key: "linkedin",
                          url: leadMember.linkedinUrl ?? "",
                          icon: renderSocialIcon("linkedin"),
                        },
                      ]
                        .filter((item) => item.url)
                        .map((item) => (
                          <a
                            key={`${leadMember.id}-${item.key}`}
                            href={item.url}
                            className={cx("social-icon-modern", "social-dark")}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.icon}
                          </a>
                        ))}
                    </div>
                  </div>
                </article>
              ) : null}

              <div className={cx("team-card-grid-modern")}>
                {extraTeamMembers.map((member) => {
                  const socialLinks = [
                    {
                      key: "facebook",
                      url: member.facebookUrl ?? "",
                      icon: renderSocialIcon("facebook"),
                    },
                    {
                      key: "twitter",
                      url: member.twitterUrl ?? "",
                      icon: renderSocialIcon("twitter"),
                    },
                    {
                      key: "linkedin",
                      url: member.linkedinUrl ?? "",
                      icon: renderSocialIcon("linkedin"),
                    },
                  ].filter((item) => item.url);

                  return (
                    <article key={member.id} className={cx("team-card-modern")}>
                      <div className={cx("team-card-media-modern")}>
                        {member.imageUrl ? (
                          <img
                            src={member.imageUrl}
                            alt={member.name}
                            className={cx("team-card-image-modern")}
                          />
                        ) : (
                          <div className={cx("team-fallback-small")}>
                            <span>{getInitials(member.name)}</span>
                          </div>
                        )}
                        <div className={cx("team-card-overlay-modern")} />
                      </div>
                      <div className={cx("team-card-body-modern")}>
                        <span className={cx("team-role-modern")}>
                          {member.role}
                        </span>
                        <h3 className={cx("team-card-name-modern")}>
                          {member.name}
                        </h3>
                        {member.description ? (
                          <p className={cx("team-card-text-modern")}>
                            {member.description}
                          </p>
                        ) : null}
                        {socialLinks.length > 0 ? (
                          <div className={cx("team-social-row")}>
                            {socialLinks.map((item) => (
                              <a
                                key={`${member.id}-${item.key}`}
                                href={item.url}
                                className={cx("social-icon-modern")}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {item.icon}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={cx("about-cta-modern")}>
            <div className={cx("about-cta-card")}>
              <div className={cx("about-cta-copy")}>
                <span className={cx("section-kicker", "hero-kicker")}>
                  Tu siguiente paso
                </span>
                <h2 className={cx("cta-title-modern")}>{content.ctaTitle}</h2>
                <p className={cx("cta-copy-modern")}>{content.ctaText}</p>
                <div className={cx("cta-meta-row")}>
                  {content.ctaAddress ? (
                    <div className={cx("cta-meta-card-modern")}>
                      <span className={cx("cta-meta-label-modern")}>
                        Direccion
                      </span>
                      <strong className={cx("cta-meta-value-modern")}>
                        {content.ctaAddress}
                      </strong>
                    </div>
                  ) : null}
                  {content.ctaPhone ? (
                    <div className={cx("cta-meta-card-modern")}>
                      <span className={cx("cta-meta-label-modern")}>
                        Contacto
                      </span>
                      <strong className={cx("cta-meta-value-modern")}>
                        {content.ctaPhone}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={cx("cta-button-stack")}>
                <a
                  href={content.ctaPrimaryButtonLink || "/contacto"}
                  className={cx("about-primary-button", "cta-button-wide")}
                >
                  {content.ctaPrimaryButtonText || "Contactanos"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className={cx("button-arrow")}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </a>
                <a
                  href={content.ctaSecondaryButtonLink || "/servicios"}
                  className={cx("about-secondary-button", "cta-button-wide")}
                >
                  {content.ctaSecondaryButtonText || "Ver Servicios"}
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
