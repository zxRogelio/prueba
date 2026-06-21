/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminAboutPage.module.css";
import {
  createAboutTeamMember,
  createAboutValue,
  deleteAboutTeamMember,
  deleteAboutValue,
  getAdminAboutPage,
  reorderAboutTeamMembers,
  reorderAboutValues,
  updateAboutTeamMember,
  updateAboutValue,
  updateAdminAboutPage,
} from "../../services/admin/aboutAdminService";
import type {
  AboutPageDTO,
  AboutTeamMemberDTO,
  AboutValueDTO,
} from "../../services/aboutService";

type AboutFormState = {
  heroLabel: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;

  introTitle: string;
  introHighlight: string;
  introText: string;

  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;

  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  valuesTitle: string;
  valuesText: string;

  ctaTitle: string;
  ctaText: string;
  ctaAddress: string;
  ctaPhone: string;
  ctaPrimaryButtonText: string;
  ctaPrimaryButtonLink: string;
  ctaSecondaryButtonText: string;
  ctaSecondaryButtonLink: string;
};

type AboutEditorSection =
  | "hero"
  | "intro"
  | "story"
  | "cta"
  | "values"
  | "team";

type SummaryCardId = "blocks" | "images" | "dynamic" | "updated";

type SocialNetwork = "facebook" | "twitter" | "linkedin";

const VALUE_ICON_OPTIONS = [
  { value: "shield", label: "Seguridad" },
  { value: "check", label: "Calidad" },
  { value: "users", label: "Comunidad" },
  { value: "bolt", label: "Energia" },
  { value: "heart", label: "Cuidado" },
  { value: "eye", label: "Vision" },
] as const;

const cx = (...names: Array<string | false | null | undefined>) =>
  names.filter(Boolean).join(" ");

const emptyForm: AboutFormState = {
  heroLabel: "",
  heroTitle: "",
  heroHighlight: "",
  heroSubtitle: "",

  introTitle: "",
  introHighlight: "",
  introText: "",

  stat1Value: "",
  stat1Label: "",
  stat2Value: "",
  stat2Label: "",
  stat3Value: "",
  stat3Label: "",

  missionTitle: "",
  missionText: "",
  visionTitle: "",
  visionText: "",
  valuesTitle: "",
  valuesText: "",

  ctaTitle: "",
  ctaText: "",
  ctaAddress: "",
  ctaPhone: "",
  ctaPrimaryButtonText: "",
  ctaPrimaryButtonLink: "",
  ctaSecondaryButtonText: "",
  ctaSecondaryButtonLink: "",
};

const toFormState = (data: AboutPageDTO): AboutFormState => ({
  heroLabel: data.heroLabel ?? "",
  heroTitle: data.heroTitle ?? "",
  heroHighlight: data.heroHighlight ?? "",
  heroSubtitle: data.heroSubtitle ?? "",

  introTitle: data.introTitle ?? "",
  introHighlight: data.introHighlight ?? "",
  introText: data.introText ?? "",

  stat1Value: data.stat1Value ?? "",
  stat1Label: data.stat1Label ?? "",
  stat2Value: data.stat2Value ?? "",
  stat2Label: data.stat2Label ?? "",
  stat3Value: data.stat3Value ?? "",
  stat3Label: data.stat3Label ?? "",

  missionTitle: data.missionTitle ?? "",
  missionText: data.missionText ?? "",
  visionTitle: data.visionTitle ?? "",
  visionText: data.visionText ?? "",
  valuesTitle: data.valuesTitle ?? "",
  valuesText: data.valuesText ?? "",

  ctaTitle: data.ctaTitle ?? "",
  ctaText: data.ctaText ?? "",
  ctaAddress: data.ctaAddress ?? "",
  ctaPhone: data.ctaPhone ?? "",
  ctaPrimaryButtonText: data.ctaPrimaryButtonText ?? "",
  ctaPrimaryButtonLink: data.ctaPrimaryButtonLink ?? "",
  ctaSecondaryButtonText: data.ctaSecondaryButtonText ?? "",
  ctaSecondaryButtonLink: data.ctaSecondaryButtonLink ?? "",
});

function useImagePreview(file: File | null, fallback?: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(fallback ?? null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(fallback ?? null);
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [fallback, file]);

  return previewUrl;
}

function splitPreviewTitle(title: string, highlight: string) {
  const safeTitle = title.trim();
  const safeHighlight = highlight.trim();

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

function renderSectionIcon(section: AboutEditorSection) {
  if (section === "hero") {
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
          d="M3 12l9-8 9 8M5 10v10h14V10"
        />
      </svg>
    );
  }

  if (section === "intro") {
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
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        />
      </svg>
    );
  }

  if (section === "story") {
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
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5 4.462 5 2 6.567 2 8.5S4.462 12 7.5 12c1.746 0 3.332-.477 4.5-1.253m0-4.494C13.168 5.477 14.754 5 16.5 5 19.538 5 22 6.567 22 8.5S19.538 12 16.5 12c-1.746 0-3.332-.477-4.5-1.253"
        />
      </svg>
    );
  }

  if (section === "cta") {
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
          d="M8 10h8M8 14h5m-9 6h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (section === "values") {
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
          d="M12 6l1.76 3.57L17.7 10l-2.85 2.78.67 3.94L12 14.77l-3.52 1.95.67-3.94L6.3 10l3.94-.43L12 6z"
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
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function renderDashboardIcon(
  icon: SummaryCardId | "preview" | "publish" | "dynamic-save" | "sections",
) {
  if (icon === "images") {
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
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }

  if (icon === "dynamic" || icon === "dynamic-save") {
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
          d="M4 7h16M4 12h10m-10 5h16M7 4v16m10-9v9"
        />
      </svg>
    );
  }

  if (icon === "updated") {
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
          d="M12 8v4l3 3m6-3a9 9 0 11-3.05-6.75L21 8"
        />
      </svg>
    );
  }

  if (icon === "preview") {
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

  if (icon === "publish") {
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
          d="M7 16V4m0 0L3 8m4-4l4 4m6 8v4m0 0l-4-4m4 4l4-4M5 20h14"
        />
      </svg>
    );
  }

  if (icon === "sections") {
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
          d="M4 6h16M4 12h16M4 18h10"
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
        d="M4 5h7v7H4V5zm9 0h7v7h-7V5zM4 14h7v5H4v-5zm9 0h7v5h-7v-5z"
      />
    </svg>
  );
}

function renderSocialIcon(network: SocialNetwork) {
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
      <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95v5.68H9.32V9h3.42v1.56h.05c.48-.9 1.64-1.86 3.37-1.86 3.61 0 4.29 2.37 4.29 5.46v6.29zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22 1H2C1.45 1 1 1.45 1 2v20c0 .55.45 1 1 1h20c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" />
    </svg>
  );
}

function getInitials(name?: string | null) {
  const safeName = name?.trim() || "";

  if (!safeName) return "TS";

  return safeName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatUpdatedLabel(value?: string) {
  if (!value) return "Sin actualizaciones";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin actualizaciones";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminAboutPage() {
  const [loading, setLoading] = useState(true);
  const [savingMain, setSavingMain] = useState(false);

  const [about, setAbout] = useState<AboutPageDTO | null>(null);
  const [form, setForm] = useState<AboutFormState>(emptyForm);

  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [introImage, setIntroImage] = useState<File | null>(null);
  const [missionImage, setMissionImage] = useState<File | null>(null);
  const [visionImage, setVisionImage] = useState<File | null>(null);
  const [valuesImage, setValuesImage] = useState<File | null>(null);

  const [valueTitle, setValueTitle] = useState("");
  const [valueDescription, setValueDescription] = useState("");
  const [valueIconKey, setValueIconKey] = useState("shield");

  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueTitle, setEditingValueTitle] = useState("");
  const [editingValueDescription, setEditingValueDescription] = useState("");
  const [editingValueIconKey, setEditingValueIconKey] = useState("shield");

  const [teamName, setTeamName] = useState("");
  const [teamRole, setTeamRole] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamFacebook, setTeamFacebook] = useState("");
  const [teamTwitter, setTeamTwitter] = useState("");
  const [teamLinkedin, setTeamLinkedin] = useState("");
  const [teamImage, setTeamImage] = useState<File | null>(null);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");
  const [editingMemberRole, setEditingMemberRole] = useState("");
  const [editingMemberDescription, setEditingMemberDescription] = useState("");
  const [editingMemberFacebook, setEditingMemberFacebook] = useState("");
  const [editingMemberTwitter, setEditingMemberTwitter] = useState("");
  const [editingMemberLinkedin, setEditingMemberLinkedin] = useState("");
  const [editingMemberImage, setEditingMemberImage] = useState<File | null>(
    null,
  );
  const [activeSection, setActiveSection] =
    useState<AboutEditorSection>("hero");

  const refreshAbout = async () => {
    setLoading(true);
    try {
      const data = await getAdminAboutPage();
      setAbout(data);
      setForm(toFormState(data));
    } catch (err) {
      console.error("getAdminAboutPage error:", err);
      alert("No se pudo cargar la sección About.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAbout();
  }, []);

  const values = useMemo(() => about?.values ?? [], [about]);
  const teamMembers = useMemo(() => about?.teamMembers ?? [], [about]);
  const heroPreviewUrl = useImagePreview(heroImage, about?.heroImageUrl);
  const introPreviewUrl = useImagePreview(introImage, about?.introImageUrl);
  const missionPreviewUrl = useImagePreview(
    missionImage,
    about?.missionImageUrl,
  );
  const visionPreviewUrl = useImagePreview(visionImage, about?.visionImageUrl);
  const valuesPreviewUrl = useImagePreview(valuesImage, about?.valuesImageUrl);
  const teamDraftPreviewUrl = useImagePreview(teamImage, null);
  const editingMemberCurrentImage = useMemo(
    () =>
      teamMembers.find((member) => member.id === editingMemberId)?.imageUrl ??
      null,
    [editingMemberId, teamMembers],
  );
  const editingMemberPreviewUrl = useImagePreview(
    editingMemberImage,
    editingMemberCurrentImage,
  );

  const heroTitleParts = useMemo(
    () =>
      splitPreviewTitle(
        form.heroTitle || "Acerca de Nosotros",
        form.heroHighlight,
      ),
    [form.heroHighlight, form.heroTitle],
  );

  const introTitleParts = useMemo(
    () =>
      splitPreviewTitle(
        form.introTitle || "Nuestra Pasion por el Fitness",
        form.introHighlight,
      ),
    [form.introHighlight, form.introTitle],
  );

  const previewValues = useMemo(() => {
    let nextValues = [...values];

    if (editingValueId) {
      nextValues = nextValues.map((item) =>
        item.id === editingValueId
          ? {
              ...item,
              title: editingValueTitle.trim() || item.title,
              description: editingValueDescription.trim() || item.description,
              iconKey: editingValueIconKey.trim() || item.iconKey || "shield",
            }
          : item,
      );
    }

    if (
      activeSection === "values" &&
      !editingValueId &&
      (valueTitle.trim() || valueDescription.trim())
    ) {
      nextValues.unshift({
        id: "draft-value",
        title: valueTitle.trim() || "Nuevo valor",
        description:
          valueDescription.trim() ||
          "Describe este valor para verlo reflejado aqui.",
        iconKey: valueIconKey.trim() || "shield",
        order: -1,
        isActive: true,
      });
    }

    return nextValues;
  }, [
    activeSection,
    editingValueDescription,
    editingValueIconKey,
    editingValueId,
    editingValueTitle,
    valueDescription,
    valueIconKey,
    valueTitle,
    values,
  ]);

  const previewTeamMembers = useMemo(() => {
    let nextMembers = [...teamMembers];

    if (editingMemberId) {
      nextMembers = nextMembers.map((member) =>
        member.id === editingMemberId
          ? {
              ...member,
              name: editingMemberName.trim() || member.name,
              role: editingMemberRole.trim() || member.role,
              description:
                editingMemberDescription.trim() || member.description || "",
              imageUrl: editingMemberPreviewUrl || member.imageUrl,
              facebookUrl:
                editingMemberFacebook.trim() || member.facebookUrl || null,
              twitterUrl:
                editingMemberTwitter.trim() || member.twitterUrl || null,
              linkedinUrl:
                editingMemberLinkedin.trim() || member.linkedinUrl || null,
            }
          : member,
      );
    }

    if (
      activeSection === "team" &&
      !editingMemberId &&
      (teamName.trim() || teamRole.trim())
    ) {
      nextMembers.unshift({
        id: "draft-team",
        name: teamName.trim() || "Nuevo integrante",
        role: teamRole.trim() || "Rol del equipo",
        description:
          teamDescription.trim() || "Agrega una descripcion para este perfil.",
        imageUrl: teamDraftPreviewUrl,
        facebookUrl: teamFacebook.trim() || null,
        twitterUrl: teamTwitter.trim() || null,
        linkedinUrl: teamLinkedin.trim() || null,
        order: -1,
        isActive: true,
      });
    }

    return nextMembers;
  }, [
    activeSection,
    editingMemberDescription,
    editingMemberFacebook,
    editingMemberId,
    editingMemberLinkedin,
    editingMemberName,
    editingMemberPreviewUrl,
    editingMemberRole,
    editingMemberTwitter,
    teamDescription,
    teamDraftPreviewUrl,
    teamFacebook,
    teamLinkedin,
    teamMembers,
    teamName,
    teamRole,
    teamTwitter,
  ]);

  const editorSections = useMemo(
    () => [
      {
        id: "hero" as const,
        label: "Hero",
        helper: "Titular principal y primera impresion",
      },
      {
        id: "intro" as const,
        label: "Intro",
        helper: "Presentacion y metricas visibles",
      },
      {
        id: "story" as const,
        label: "Mision / Vision",
        helper: "Narrativa institucional y bloque visual",
      },
      {
        id: "cta" as const,
        label: "CTA final",
        helper: "Cierre con contacto y botones",
      },
      {
        id: "values" as const,
        label: "Valores",
        helper: `${values.length} elementos registrados`,
      },
      {
        id: "team" as const,
        label: "Equipo",
        helper: `${teamMembers.length} perfiles registrados`,
      },
    ],
    [teamMembers.length, values.length],
  );

  const activeSectionMeta = editorSections.find(
    (item) => item.id === activeSection,
  ) ??
    editorSections[0] ?? {
      id: "hero" as const,
      label: "Hero",
      helper: "",
    };

  const updatedLabel = useMemo(
    () => formatUpdatedLabel(about?.updatedAt),
    [about?.updatedAt],
  );

  const imageCoverage = useMemo(
    () =>
      [
        heroPreviewUrl,
        introPreviewUrl,
        missionPreviewUrl,
        visionPreviewUrl,
        valuesPreviewUrl,
      ].filter(Boolean).length,
    [
      heroPreviewUrl,
      introPreviewUrl,
      missionPreviewUrl,
      valuesPreviewUrl,
      visionPreviewUrl,
    ],
  );

  const summaryCards = useMemo(
    () => [
      {
        id: "blocks" as const,
        label: "Bloques",
        value: String(editorSections.length),
        helper: "Secciones claras para editar",
      },
      {
        id: "images" as const,
        label: "Imagenes listas",
        value: `${imageCoverage}/5`,
        helper: "Hero, intro, mision, vision y valores",
      },
      {
        id: "dynamic" as const,
        label: "Contenido dinamico",
        value: `${values.length + teamMembers.length}`,
        helper: "Valores y perfiles activos",
      },
      {
        id: "updated" as const,
        label: "Ultima actualizacion",
        value: updatedLabel,
        helper: "Se refleja tambien en la vista previa",
      },
    ],
    [
      editorSections.length,
      imageCoverage,
      teamMembers.length,
      updatedLabel,
      values.length,
    ],
  );

  const updateField = (key: keyof AboutFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const touchAbout = (patch: Partial<AboutPageDTO>) => {
    setAbout((prev) =>
      prev
        ? {
            ...prev,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : prev,
    );
  };

  const handleSaveMain = async () => {
    try {
      setSavingMain(true);

      const fd = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        fd.append(key, value ?? "");
      });

      if (heroImage) fd.append("heroImage", heroImage);
      if (introImage) fd.append("introImage", introImage);
      if (missionImage) fd.append("missionImage", missionImage);
      if (visionImage) fd.append("visionImage", visionImage);
      if (valuesImage) fd.append("valuesImage", valuesImage);

      const updated = await updateAdminAboutPage(fd);
      setAbout(updated);
      setForm(toFormState(updated));

      setHeroImage(null);
      setIntroImage(null);
      setMissionImage(null);
      setVisionImage(null);
      setValuesImage(null);

      alert("Contenido principal actualizado correctamente.");
    } catch (err: any) {
      console.error("updateAdminAboutPage error:", err);
      alert(err?.response?.data?.error || "Error al guardar About.");
    } finally {
      setSavingMain(false);
    }
  };

  const handleCreateValue = async () => {
    if (!valueTitle.trim() || !valueDescription.trim()) {
      alert("Completa título y descripción del valor.");
      return;
    }

    try {
      const created = await createAboutValue({
        title: valueTitle,
        description: valueDescription,
        iconKey: valueIconKey,
      });

      setValueTitle("");
      setValueDescription("");
      setValueIconKey("shield");
      setAbout((prev) =>
        prev
          ? {
              ...prev,
              values: [...(prev.values ?? []), created].sort(
                (left, right) => left.order - right.order,
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (err: any) {
      console.error("createAboutValue error:", err);
      alert(err?.response?.data?.error || "Error al crear valor.");
    }
  };

  const startEditValue = (item: AboutValueDTO) => {
    setEditingValueId(item.id);
    setEditingValueTitle(item.title);
    setEditingValueDescription(item.description);
    setEditingValueIconKey(item.iconKey || "shield");
  };

  const cancelEditValue = () => {
    setEditingValueId(null);
    setEditingValueTitle("");
    setEditingValueDescription("");
    setEditingValueIconKey("shield");
  };

  const handleSaveValueEdit = async () => {
    if (!editingValueId) return;

    try {
      const updated = await updateAboutValue(editingValueId, {
        title: editingValueTitle,
        description: editingValueDescription,
        iconKey: editingValueIconKey,
      });

      setAbout((prev) =>
        prev
          ? {
              ...prev,
              values: (prev.values ?? []).map((item) =>
                item.id === editingValueId ? updated : item,
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );

      cancelEditValue();
    } catch (err: any) {
      console.error("updateAboutValue error:", err);
      alert(err?.response?.data?.error || "Error al actualizar valor.");
    }
  };

  const handleDeleteValue = async (id: string) => {
    const ok = confirm("¿Eliminar este valor?");
    if (!ok) return;

    try {
      await deleteAboutValue(id);
      setAbout((prev) =>
        prev
          ? {
              ...prev,
              values: (prev.values ?? []).filter((item) => item.id !== id),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (err: any) {
      console.error("deleteAboutValue error:", err);
      alert(err?.response?.data?.error || "Error al eliminar valor.");
    }
  };

  const moveValue = async (id: string, direction: "up" | "down") => {
    const order = values.map((item) => item.id);
    const index = order.indexOf(id);
    if (index === -1) return;

    const target =
      direction === "up"
        ? Math.max(index - 1, 0)
        : Math.min(index + 1, order.length - 1);

    if (target === index) return;

    [order[index], order[target]] = [order[target], order[index]];

    try {
      const reordered = await reorderAboutValues(order);
      touchAbout({ values: reordered });
    } catch (err: any) {
      console.error("reorderAboutValues error:", err);
      alert(err?.response?.data?.error || "Error al reordenar valores.");
    }
  };

  const handleCreateTeamMember = async () => {
    if (!teamName.trim() || !teamRole.trim()) {
      alert("Completa nombre y rol del miembro.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("name", teamName);
      fd.append("role", teamRole);
      fd.append("description", teamDescription);
      fd.append("facebookUrl", teamFacebook);
      fd.append("twitterUrl", teamTwitter);
      fd.append("linkedinUrl", teamLinkedin);
      if (teamImage) fd.append("image", teamImage);

      const created = await createAboutTeamMember(fd);

      setTeamName("");
      setTeamRole("");
      setTeamDescription("");
      setTeamFacebook("");
      setTeamTwitter("");
      setTeamLinkedin("");
      setTeamImage(null);

      setAbout((prev) =>
        prev
          ? {
              ...prev,
              teamMembers: [...(prev.teamMembers ?? []), created].sort(
                (left, right) => left.order - right.order,
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (err: any) {
      console.error("createAboutTeamMember error:", err);
      alert(err?.response?.data?.error || "Error al crear miembro.");
    }
  };

  const startEditMember = (member: AboutTeamMemberDTO) => {
    setEditingMemberId(member.id);
    setEditingMemberName(member.name);
    setEditingMemberRole(member.role);
    setEditingMemberDescription(member.description ?? "");
    setEditingMemberFacebook(member.facebookUrl ?? "");
    setEditingMemberTwitter(member.twitterUrl ?? "");
    setEditingMemberLinkedin(member.linkedinUrl ?? "");
    setEditingMemberImage(null);
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setEditingMemberName("");
    setEditingMemberRole("");
    setEditingMemberDescription("");
    setEditingMemberFacebook("");
    setEditingMemberTwitter("");
    setEditingMemberLinkedin("");
    setEditingMemberImage(null);
  };

  const handleSaveMemberEdit = async () => {
    if (!editingMemberId) return;

    try {
      const fd = new FormData();
      fd.append("name", editingMemberName);
      fd.append("role", editingMemberRole);
      fd.append("description", editingMemberDescription);
      fd.append("facebookUrl", editingMemberFacebook);
      fd.append("twitterUrl", editingMemberTwitter);
      fd.append("linkedinUrl", editingMemberLinkedin);
      if (editingMemberImage) fd.append("image", editingMemberImage);

      const updated = await updateAboutTeamMember(editingMemberId, fd);

      setAbout((prev) =>
        prev
          ? {
              ...prev,
              teamMembers: (prev.teamMembers ?? []).map((member) =>
                member.id === editingMemberId ? updated : member,
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );

      cancelEditMember();
    } catch (err: any) {
      console.error("updateAboutTeamMember error:", err);
      alert(err?.response?.data?.error || "Error al actualizar miembro.");
    }
  };

  const handleDeleteMember = async (id: string) => {
    const ok = confirm("¿Eliminar este miembro?");
    if (!ok) return;

    try {
      await deleteAboutTeamMember(id);
      setAbout((prev) =>
        prev
          ? {
              ...prev,
              teamMembers: (prev.teamMembers ?? []).filter(
                (member) => member.id !== id,
              ),
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
    } catch (err: any) {
      console.error("deleteAboutTeamMember error:", err);
      alert(err?.response?.data?.error || "Error al eliminar miembro.");
    }
  };

  const moveMember = async (id: string, direction: "up" | "down") => {
    const order = teamMembers.map((item) => item.id);
    const index = order.indexOf(id);
    if (index === -1) return;

    const target =
      direction === "up"
        ? Math.max(index - 1, 0)
        : Math.min(index + 1, order.length - 1);

    if (target === index) return;

    [order[index], order[target]] = [order[target], order[index]];

    try {
      const reordered = await reorderAboutTeamMembers(order);
      touchAbout({ teamMembers: reordered });
    } catch (err: any) {
      console.error("reorderAboutTeamMembers error:", err);
      alert(err?.response?.data?.error || "Error al reordenar equipo.");
    }
  };

  const renderHighlightedTitle = (
    parts: { before: string; highlight: string; after: string },
    fallback: string,
  ) => {
    if (!parts.before && !parts.highlight && !parts.after) {
      return fallback;
    }

    return (
      <>
        {parts.before}
        {parts.highlight ? (
          <span className={styles.previewHighlight}>{parts.highlight}</span>
        ) : null}
        {parts.after}
      </>
    );
  };

  const renderAssetBlock = (
    previewUrl: string | null,
    file: File | null,
    alt: string,
  ) => (
    <div className={cx(styles.field, styles.full)}>
      <span>Referencia visual</span>
      <div className={styles.inlineAsset}>
        {previewUrl ? (
          <img className={styles.assetThumb} src={previewUrl} alt={alt} />
        ) : (
          <div className={styles.assetPlaceholder}>Sin imagen cargada</div>
        )}
        <div className={styles.fileMeta}>
          {file
            ? `Archivo listo: ${file.name}`
            : previewUrl
              ? "Se esta usando la imagen actual de esta seccion."
              : "Aun no hay imagen configurada para este bloque."}
        </div>
      </div>
    </div>
  );

  const renderPreviewPlaceholder = (text: string) => (
    <div className={styles.previewMediaPlaceholder}>
      <span>{text}</span>
    </div>
  );

  const renderEditorCardHeader = (
    section: AboutEditorSection,
    badge: string,
    title: string,
    text: string,
  ) => (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeaderTop}>
        <span className={styles.sectionHeaderIcon}>
          {renderSectionIcon(section)}
        </span>
        <div className={styles.sectionHeaderCopy}>
          <span className={styles.sectionBadge}>{badge}</span>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </div>
      </div>
      <p className={styles.sectionText}>{text}</p>
    </div>
  );

  const renderEditorSection = () => {
    if (activeSection === "hero") {
      return (
        <div className={styles.stack}>
          <div className={styles.card}>
            {renderEditorCardHeader(
              "hero",
              "Hero principal",
              "Primera impresion del About",
              "Este bloque controla el encabezado superior de la pagina. Aqui defines el mensaje mas importante y la imagen que acompana la apertura.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Etiqueta corta</span>
                <input
                  className={styles.input}
                  value={form.heroLabel}
                  onChange={(event) =>
                    updateField("heroLabel", event.target.value)
                  }
                  placeholder="Nuestra historia"
                />
              </label>

              <label className={styles.field}>
                <span>Titulo principal</span>
                <input
                  className={styles.input}
                  value={form.heroTitle}
                  onChange={(event) =>
                    updateField("heroTitle", event.target.value)
                  }
                  placeholder="Acerca de Nosotros"
                />
              </label>

              <label className={styles.field}>
                <span>Palabra a resaltar</span>
                <input
                  className={styles.input}
                  value={form.heroHighlight}
                  onChange={(event) =>
                    updateField("heroHighlight", event.target.value)
                  }
                  placeholder="Nosotros"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Subtitulo</span>
                <textarea
                  className={styles.textarea}
                  value={form.heroSubtitle}
                  onChange={(event) =>
                    updateField("heroSubtitle", event.target.value)
                  }
                  placeholder="Explica en una frase amplia que representa la marca."
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Imagen hero</span>
                <input
                  className={styles.file}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setHeroImage(event.target.files?.[0] || null)
                  }
                />
                <p className={styles.helperText}>
                  La vista previa de la derecha usa el archivo elegido aunque
                  todavia no lo guardes.
                </p>
              </label>

              {renderAssetBlock(heroPreviewUrl, heroImage, "Hero preview")}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "intro") {
      return (
        <div className={styles.stack}>
          <div className={styles.card}>
            {renderEditorCardHeader(
              "intro",
              "Intro",
              "Presentacion y lectura rapida",
              "Usa este bloque para contar en un vistazo quienes son y respaldar el mensaje con metricas claras.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo intro</span>
                <input
                  className={styles.input}
                  value={form.introTitle}
                  onChange={(event) =>
                    updateField("introTitle", event.target.value)
                  }
                  placeholder="Nuestra Pasion por el Fitness"
                />
              </label>

              <label className={styles.field}>
                <span>Palabra a resaltar</span>
                <input
                  className={styles.input}
                  value={form.introHighlight}
                  onChange={(event) =>
                    updateField("introHighlight", event.target.value)
                  }
                  placeholder="Pasion"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Texto intro</span>
                <textarea
                  className={styles.textarea}
                  value={form.introText}
                  onChange={(event) =>
                    updateField("introText", event.target.value)
                  }
                  placeholder="Describe el enfoque del gimnasio, la comunidad o la propuesta de valor."
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Imagen intro</span>
                <input
                  className={styles.file}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setIntroImage(event.target.files?.[0] || null)
                  }
                />
              </label>

              {renderAssetBlock(introPreviewUrl, introImage, "Intro preview")}
            </div>
          </div>

          <div className={styles.card}>
            {renderEditorCardHeader(
              "intro",
              "Metricas",
              "Tarjetas numericas del bloque intro",
              "Cada tarjeta ayuda a que el usuario entienda rapido escala, experiencia y cobertura.",
            )}

            <div className={styles.statsEditorGrid}>
              <div className={styles.miniStatEditor}>
                <label className={styles.field}>
                  <span>Valor 1</span>
                  <input
                    className={styles.input}
                    value={form.stat1Value}
                    onChange={(event) =>
                      updateField("stat1Value", event.target.value)
                    }
                    placeholder="500+"
                  />
                </label>
                <label className={styles.field}>
                  <span>Etiqueta 1</span>
                  <input
                    className={styles.input}
                    value={form.stat1Label}
                    onChange={(event) =>
                      updateField("stat1Label", event.target.value)
                    }
                    placeholder="Miembros activos"
                  />
                </label>
              </div>

              <div className={styles.miniStatEditor}>
                <label className={styles.field}>
                  <span>Valor 2</span>
                  <input
                    className={styles.input}
                    value={form.stat2Value}
                    onChange={(event) =>
                      updateField("stat2Value", event.target.value)
                    }
                    placeholder="15+"
                  />
                </label>
                <label className={styles.field}>
                  <span>Etiqueta 2</span>
                  <input
                    className={styles.input}
                    value={form.stat2Label}
                    onChange={(event) =>
                      updateField("stat2Label", event.target.value)
                    }
                    placeholder="Entrenadores certificados"
                  />
                </label>
              </div>

              <div className={styles.miniStatEditor}>
                <label className={styles.field}>
                  <span>Valor 3</span>
                  <input
                    className={styles.input}
                    value={form.stat3Value}
                    onChange={(event) =>
                      updateField("stat3Value", event.target.value)
                    }
                    placeholder="24/7"
                  />
                </label>
                <label className={styles.field}>
                  <span>Etiqueta 3</span>
                  <input
                    className={styles.input}
                    value={form.stat3Label}
                    onChange={(event) =>
                      updateField("stat3Label", event.target.value)
                    }
                    placeholder="Horario de servicio"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "story") {
      return (
        <div className={styles.stack}>
          <div className={styles.card}>
            {renderEditorCardHeader(
              "story",
              "Mision y vision",
              "Narrativa institucional del gimnasio",
              "Separa claramente lo que hoy representan y hacia donde quieren llevar la marca. Cada bloque tiene su propia imagen para hacerla mas reconocible.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo mision</span>
                <input
                  className={styles.input}
                  value={form.missionTitle}
                  onChange={(event) =>
                    updateField("missionTitle", event.target.value)
                  }
                  placeholder="Mision"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Texto mision</span>
                <textarea
                  className={styles.textarea}
                  value={form.missionText}
                  onChange={(event) =>
                    updateField("missionText", event.target.value)
                  }
                  placeholder="Explica el compromiso diario del gimnasio."
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Imagen mision</span>
                <input
                  className={styles.file}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setMissionImage(event.target.files?.[0] || null)
                  }
                />
              </label>

              {renderAssetBlock(
                missionPreviewUrl,
                missionImage,
                "Mision preview",
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo vision</span>
                <input
                  className={styles.input}
                  value={form.visionTitle}
                  onChange={(event) =>
                    updateField("visionTitle", event.target.value)
                  }
                  placeholder="Vision"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Texto vision</span>
                <textarea
                  className={styles.textarea}
                  value={form.visionText}
                  onChange={(event) =>
                    updateField("visionText", event.target.value)
                  }
                  placeholder="Describe a donde apunta el proyecto a mediano y largo plazo."
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Imagen vision</span>
                <input
                  className={styles.file}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setVisionImage(event.target.files?.[0] || null)
                  }
                />
              </label>

              {renderAssetBlock(
                visionPreviewUrl,
                visionImage,
                "Vision preview",
              )}
            </div>
          </div>

          <div className={styles.card}>
            {renderEditorCardHeader(
              "values",
              "Bloque de valores",
              "Encabezado que presenta tus valores",
              "Este texto abre la rejilla de valores. No son los items individuales, sino la introduccion que les da contexto.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo bloque valores</span>
                <input
                  className={styles.input}
                  value={form.valuesTitle}
                  onChange={(event) =>
                    updateField("valuesTitle", event.target.value)
                  }
                  placeholder="Valores"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Texto bloque valores</span>
                <textarea
                  className={styles.textarea}
                  value={form.valuesText}
                  onChange={(event) =>
                    updateField("valuesText", event.target.value)
                  }
                  placeholder="Presenta la filosofia de trabajo de la marca."
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Imagen bloque valores</span>
                <input
                  className={styles.file}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setValuesImage(event.target.files?.[0] || null)
                  }
                />
              </label>

              {renderAssetBlock(
                valuesPreviewUrl,
                valuesImage,
                "Valores preview",
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "cta") {
      return (
        <div className={styles.stack}>
          <div className={styles.card}>
            {renderEditorCardHeader(
              "cta",
              "CTA final",
              "Cierre con contacto y llamados a la accion",
              "Este bloque empuja al usuario a escribir, visitar o revisar los servicios. Conviene que sea directo y que muestre contacto legible.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo CTA</span>
                <input
                  className={styles.input}
                  value={form.ctaTitle}
                  onChange={(event) =>
                    updateField("ctaTitle", event.target.value)
                  }
                  placeholder="Listo para transformar tu vida?"
                />
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Texto CTA</span>
                <textarea
                  className={styles.textarea}
                  value={form.ctaText}
                  onChange={(event) =>
                    updateField("ctaText", event.target.value)
                  }
                  placeholder="Invita a dar el siguiente paso y resume el valor del gimnasio."
                />
              </label>

              <label className={styles.field}>
                <span>Direccion</span>
                <input
                  className={styles.input}
                  value={form.ctaAddress}
                  onChange={(event) =>
                    updateField("ctaAddress", event.target.value)
                  }
                  placeholder="Direccion visible al publico"
                />
              </label>

              <label className={styles.field}>
                <span>Telefono</span>
                <input
                  className={styles.input}
                  value={form.ctaPhone}
                  onChange={(event) =>
                    updateField("ctaPhone", event.target.value)
                  }
                  placeholder="Numero de contacto"
                />
              </label>

              <label className={styles.field}>
                <span>Texto boton principal</span>
                <input
                  className={styles.input}
                  value={form.ctaPrimaryButtonText}
                  onChange={(event) =>
                    updateField("ctaPrimaryButtonText", event.target.value)
                  }
                  placeholder="Contactanos"
                />
              </label>

              <label className={styles.field}>
                <span>Link boton principal</span>
                <input
                  className={styles.input}
                  value={form.ctaPrimaryButtonLink}
                  onChange={(event) =>
                    updateField("ctaPrimaryButtonLink", event.target.value)
                  }
                  placeholder="/contacto"
                />
              </label>

              <label className={styles.field}>
                <span>Texto boton secundario</span>
                <input
                  className={styles.input}
                  value={form.ctaSecondaryButtonText}
                  onChange={(event) =>
                    updateField("ctaSecondaryButtonText", event.target.value)
                  }
                  placeholder="Ver servicios"
                />
              </label>

              <label className={styles.field}>
                <span>Link boton secundario</span>
                <input
                  className={styles.input}
                  value={form.ctaSecondaryButtonLink}
                  onChange={(event) =>
                    updateField("ctaSecondaryButtonLink", event.target.value)
                  }
                  placeholder="/servicios"
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "values") {
      return (
        <div className={styles.stack}>
          <div className={styles.card}>
            {renderEditorCardHeader(
              "values",
              "Nuevo valor",
              "Agrega valores con estructura clara",
              "Cada valor se guarda por separado y aparece al instante en la vista previa. Ya no dependes de una sola tarjeta gigante para entender donde editar.",
            )}

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Titulo del valor</span>
                <input
                  className={styles.input}
                  value={valueTitle}
                  onChange={(event) => setValueTitle(event.target.value)}
                  placeholder="Disciplina"
                />
              </label>

              <label className={styles.field}>
                <span>Icono</span>
                <select
                  className={styles.select}
                  value={valueIconKey}
                  onChange={(event) => setValueIconKey(event.target.value)}
                >
                  {VALUE_ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={cx(styles.field, styles.full)}>
                <span>Descripcion</span>
                <textarea
                  className={styles.textarea}
                  value={valueDescription}
                  onChange={(event) => setValueDescription(event.target.value)}
                  placeholder="Explica que significa este valor dentro de la experiencia del gimnasio."
                />
              </label>
            </div>

            <div className={styles.actionsBar}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={handleCreateValue}
              >
                Agregar valor
              </button>
            </div>
          </div>

          <div className={styles.card}>
            {renderEditorCardHeader(
              "values",
              "Lista activa",
              "Reordena, edita o elimina valores",
              "El orden que dejes aqui es el mismo que veras en la pagina publica.",
            )}

            <div className={styles.list}>
              {values.length === 0 ? (
                <div className={styles.empty}>
                  No hay valores registrados todavia.
                </div>
              ) : (
                values.map((item, index) => (
                  <div key={item.id} className={styles.listCard}>
                    {editingValueId === item.id ? (
                      <>
                        <div className={styles.formGrid}>
                          <label className={styles.field}>
                            <span>Titulo</span>
                            <input
                              className={styles.input}
                              value={editingValueTitle}
                              onChange={(event) =>
                                setEditingValueTitle(event.target.value)
                              }
                            />
                          </label>

                          <label className={styles.field}>
                            <span>Icono</span>
                            <select
                              className={styles.select}
                              value={editingValueIconKey}
                              onChange={(event) =>
                                setEditingValueIconKey(event.target.value)
                              }
                            >
                              {VALUE_ICON_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className={cx(styles.field, styles.full)}>
                            <span>Descripcion</span>
                            <textarea
                              className={styles.textarea}
                              value={editingValueDescription}
                              onChange={(event) =>
                                setEditingValueDescription(event.target.value)
                              }
                            />
                          </label>
                        </div>

                        <div className={styles.actions}>
                          <button
                            className={styles.btnGhost}
                            type="button"
                            onClick={handleSaveValueEdit}
                          >
                            Guardar
                          </button>
                          <button
                            className={styles.btnGhost}
                            type="button"
                            onClick={cancelEditValue}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.itemHeader}>
                          <div className={styles.valueRow}>
                            <div className={styles.valueIconBubble}>
                              {renderValueIcon(item.iconKey)}
                            </div>
                            <div>
                              <div className={styles.itemTitle}>
                                {index + 1}. {item.title}
                              </div>
                              <div className={styles.itemMeta}>
                                Icono actual: {item.iconKey || "shield"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.itemText}>
                          {item.description}
                        </div>

                        <div className={styles.actions}>
                          <button
                            className={styles.btnGhost}
                            type="button"
                            onClick={() => moveValue(item.id, "up")}
                            disabled={index === 0}
                          >
                            Subir
                          </button>
                          <button
                            className={styles.btnGhost}
                            type="button"
                            onClick={() => moveValue(item.id, "down")}
                            disabled={index === values.length - 1}
                          >
                            Bajar
                          </button>
                          <button
                            className={styles.btnGhost}
                            type="button"
                            onClick={() => startEditValue(item)}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.btnDanger}
                            type="button"
                            onClick={() => handleDeleteValue(item.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.stack}>
        <div className={styles.card}>
          {renderEditorCardHeader(
            "team",
            "Nuevo perfil",
            "Agrega integrantes del equipo",
            "El equipo se gestiona aqui con texto, foto y enlaces. Lo que escribas se refleja en la vista previa antes de guardar el nuevo perfil.",
          )}

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                className={styles.input}
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Nombre del integrante"
              />
            </label>

            <label className={styles.field}>
              <span>Rol</span>
              <input
                className={styles.input}
                value={teamRole}
                onChange={(event) => setTeamRole(event.target.value)}
                placeholder="Rol o cargo"
              />
            </label>

            <label className={cx(styles.field, styles.full)}>
              <span>Descripcion</span>
              <textarea
                className={styles.textarea}
                value={teamDescription}
                onChange={(event) => setTeamDescription(event.target.value)}
                placeholder="Resume experiencia, especialidad o enfoque."
              />
            </label>

            <label className={styles.field}>
              <span>Facebook</span>
              <input
                className={styles.input}
                value={teamFacebook}
                onChange={(event) => setTeamFacebook(event.target.value)}
                placeholder="https://facebook.com/..."
              />
            </label>

            <label className={styles.field}>
              <span>Twitter</span>
              <input
                className={styles.input}
                value={teamTwitter}
                onChange={(event) => setTeamTwitter(event.target.value)}
                placeholder="https://x.com/..."
              />
            </label>

            <label className={styles.field}>
              <span>LinkedIn</span>
              <input
                className={styles.input}
                value={teamLinkedin}
                onChange={(event) => setTeamLinkedin(event.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </label>

            <label className={cx(styles.field, styles.full)}>
              <span>Imagen</span>
              <input
                className={styles.file}
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setTeamImage(event.target.files?.[0] || null)
                }
              />
            </label>

            {renderAssetBlock(teamDraftPreviewUrl, teamImage, "Team preview")}
          </div>

          <div className={styles.actionsBar}>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={handleCreateTeamMember}
            >
              Agregar miembro
            </button>
          </div>
        </div>

        <div className={styles.card}>
          {renderEditorCardHeader(
            "team",
            "Equipo actual",
            "Edita el orden y la informacion de cada perfil",
            "El orden define como se muestra el equipo en el sitio publico.",
          )}

          <div className={styles.list}>
            {teamMembers.length === 0 ? (
              <div className={styles.empty}>
                No hay miembros registrados todavia.
              </div>
            ) : (
              teamMembers.map((member, index) => (
                <div key={member.id} className={styles.listCard}>
                  {editingMemberId === member.id ? (
                    <>
                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>Nombre</span>
                          <input
                            className={styles.input}
                            value={editingMemberName}
                            onChange={(event) =>
                              setEditingMemberName(event.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Rol</span>
                          <input
                            className={styles.input}
                            value={editingMemberRole}
                            onChange={(event) =>
                              setEditingMemberRole(event.target.value)
                            }
                          />
                        </label>

                        <label className={cx(styles.field, styles.full)}>
                          <span>Descripcion</span>
                          <textarea
                            className={styles.textarea}
                            value={editingMemberDescription}
                            onChange={(event) =>
                              setEditingMemberDescription(event.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Facebook</span>
                          <input
                            className={styles.input}
                            value={editingMemberFacebook}
                            onChange={(event) =>
                              setEditingMemberFacebook(event.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Twitter</span>
                          <input
                            className={styles.input}
                            value={editingMemberTwitter}
                            onChange={(event) =>
                              setEditingMemberTwitter(event.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>LinkedIn</span>
                          <input
                            className={styles.input}
                            value={editingMemberLinkedin}
                            onChange={(event) =>
                              setEditingMemberLinkedin(event.target.value)
                            }
                          />
                        </label>

                        <label className={cx(styles.field, styles.full)}>
                          <span>Nueva imagen</span>
                          <input
                            className={styles.file}
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              setEditingMemberImage(
                                event.target.files?.[0] || null,
                              )
                            }
                          />
                        </label>

                        {renderAssetBlock(
                          editingMemberPreviewUrl,
                          editingMemberImage,
                          `Foto de ${editingMemberName || member.name}`,
                        )}
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          type="button"
                          onClick={handleSaveMemberEdit}
                        >
                          Guardar
                        </button>
                        <button
                          className={styles.btnGhost}
                          type="button"
                          onClick={cancelEditMember}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.memberRow}>
                        {member.imageUrl ? (
                          <img
                            className={styles.memberImage}
                            src={member.imageUrl}
                            alt={member.name}
                          />
                        ) : (
                          <div
                            className={cx(
                              styles.memberImage,
                              styles.memberPlaceholder,
                            )}
                          >
                            {getInitials(member.name)}
                          </div>
                        )}

                        <div>
                          <div className={styles.itemTitle}>
                            {index + 1}. {member.name}
                          </div>
                          <div className={styles.itemMeta}>{member.role}</div>
                          <div className={styles.itemText}>
                            {member.description || "Sin descripcion."}
                          </div>

                          <div className={styles.socialRow}>
                            {member.facebookUrl ? (
                              <span className={styles.socialChip}>
                                {renderSocialIcon("facebook")}
                                Facebook
                              </span>
                            ) : null}
                            {member.twitterUrl ? (
                              <span className={styles.socialChip}>
                                {renderSocialIcon("twitter")}
                                Twitter
                              </span>
                            ) : null}
                            {member.linkedinUrl ? (
                              <span className={styles.socialChip}>
                                {renderSocialIcon("linkedin")}
                                LinkedIn
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          type="button"
                          onClick={() => moveMember(member.id, "up")}
                          disabled={index === 0}
                        >
                          Subir
                        </button>
                        <button
                          className={styles.btnGhost}
                          type="button"
                          onClick={() => moveMember(member.id, "down")}
                          disabled={index === teamMembers.length - 1}
                        >
                          Bajar
                        </button>
                        <button
                          className={styles.btnGhost}
                          type="button"
                          onClick={() => startEditMember(member)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.btnDanger}
                          type="button"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewSection = () => {
    if (activeSection === "hero") {
      return (
        <div className={styles.previewHero}>
          {heroPreviewUrl ? (
            <img
              className={styles.previewHeroImage}
              src={heroPreviewUrl}
              alt="Hero"
            />
          ) : (
            <div
              className={cx(
                styles.previewMediaPlaceholder,
                styles.previewHeroFallback,
              )}
            >
              <span>
                Sube una imagen hero para ver el impacto del encabezado.
              </span>
            </div>
          )}

          <div className={styles.previewHeroOverlay} />

          <div className={styles.previewHeroBody}>
            <span className={styles.previewKicker}>
              {form.heroLabel || "Nuestra historia"}
            </span>

            <h3 className={styles.previewHeroTitle}>
              {renderHighlightedTitle(heroTitleParts, "Acerca de Nosotros")}
            </h3>

            <p className={styles.previewTextLight}>
              {form.heroSubtitle ||
                "Aqui se mostrara el texto introductorio que describe la historia del gimnasio."}
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === "intro") {
      const stats = [
        {
          value: form.stat1Value || "500+",
          label: form.stat1Label || "Miembros activos",
        },
        {
          value: form.stat2Value || "15+",
          label: form.stat2Label || "Entrenadores certificados",
        },
        {
          value: form.stat3Value || "24/7",
          label: form.stat3Label || "Horario de servicio",
        },
      ];

      return (
        <div className={styles.previewSplit}>
          <div className={styles.previewSplitMedia}>
            {introPreviewUrl ? (
              <img
                className={styles.previewSplitImage}
                src={introPreviewUrl}
                alt="Intro"
              />
            ) : (
              renderPreviewPlaceholder(
                "La imagen intro aparecera aqui junto con el bloque de metricas.",
              )
            )}
          </div>

          <div className={styles.previewSplitCopy}>
            <span className={styles.previewSectionLabel}>Intro visible</span>
            <h3 className={styles.previewSectionTitle}>
              {renderHighlightedTitle(
                introTitleParts,
                "Nuestra Pasion por el Fitness",
              )}
            </h3>
            <p className={styles.previewBodyText}>
              {form.introText ||
                "Este texto cuenta rapidamente que hace especial a la marca y como se vive la experiencia."}
            </p>

            <div className={styles.previewStatsGrid}>
              {stats.map((item) => (
                <div key={item.label} className={styles.previewStatCard}>
                  <p className={styles.previewStatValue}>{item.value}</p>
                  <p className={styles.previewStatLabel}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "story") {
      return (
        <div className={styles.previewStoryGrid}>
          <div className={styles.previewStoryCard}>
            {missionPreviewUrl ? (
              <img
                className={styles.previewStoryImage}
                src={missionPreviewUrl}
                alt="Mision"
              />
            ) : (
              renderPreviewPlaceholder(
                "La imagen de mision aparecera en este bloque.",
              )
            )}

            <div className={styles.previewStoryBody}>
              <span className={styles.previewSectionLabel}>Mision</span>
              <h3 className={styles.previewSectionTitle}>
                {form.missionTitle || "Mision"}
              </h3>
              <p className={styles.previewBodyText}>
                {form.missionText ||
                  "Describe aqui el objetivo diario de la marca y el tipo de experiencia que quiere entregar."}
              </p>
            </div>
          </div>

          <div className={styles.previewStoryCard}>
            {visionPreviewUrl ? (
              <img
                className={styles.previewStoryImage}
                src={visionPreviewUrl}
                alt="Vision"
              />
            ) : (
              renderPreviewPlaceholder(
                "La imagen de vision aparecera en este bloque.",
              )
            )}

            <div className={styles.previewStoryBody}>
              <span className={styles.previewSectionLabel}>Vision</span>
              <h3 className={styles.previewSectionTitle}>
                {form.visionTitle || "Vision"}
              </h3>
              <p className={styles.previewBodyText}>
                {form.visionText ||
                  "Aqui se presenta el horizonte del gimnasio y la escala a la que quiere llegar."}
              </p>
            </div>
          </div>

          <div className={styles.previewStoryCard}>
            {valuesPreviewUrl ? (
              <img
                className={styles.previewStoryImage}
                src={valuesPreviewUrl}
                alt="Valores"
              />
            ) : (
              renderPreviewPlaceholder(
                "La imagen del bloque de valores reforzara esta introduccion.",
              )
            )}

            <div className={styles.previewStoryBody}>
              <span className={styles.previewSectionLabel}>
                Bloque de valores
              </span>
              <h3 className={styles.previewSectionTitle}>
                {form.valuesTitle || "Valores"}
              </h3>
              <p className={styles.previewBodyText}>
                {form.valuesText ||
                  "Este texto presenta la filosofia que sostiene la cultura del gimnasio antes de mostrar los valores concretos."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === "cta") {
      return (
        <div className={styles.previewCta}>
          <div className={styles.previewCtaBody}>
            <span className={styles.previewKicker}>CTA final</span>
            <h3 className={styles.previewHeroTitle}>
              {form.ctaTitle || "Listo para transformar tu vida?"}
            </h3>
            <p className={styles.previewTextLight}>
              {form.ctaText ||
                "El cierre del About invita al usuario a contactar o revisar servicios."}
            </p>
          </div>

          <div className={styles.previewContactList}>
            <div className={styles.previewContactItem}>
              <strong>Direccion</strong>
              <span>{form.ctaAddress || "Sin direccion definida"}</span>
            </div>
            <div className={styles.previewContactItem}>
              <strong>Telefono</strong>
              <span>{form.ctaPhone || "Sin telefono definido"}</span>
            </div>
          </div>

          <div className={styles.previewButtonRow}>
            <span className={styles.previewPrimaryBtn}>
              {form.ctaPrimaryButtonText || "Contactanos"}
            </span>
            <span className={styles.previewSecondaryBtn}>
              {form.ctaSecondaryButtonText || "Ver servicios"}
            </span>
          </div>
        </div>
      );
    }

    if (activeSection === "values") {
      return (
        <div>
          <div className={styles.previewSplit}>
            <div className={styles.previewSplitMedia}>
              {valuesPreviewUrl ? (
                <img
                  className={styles.previewSplitImage}
                  src={valuesPreviewUrl}
                  alt="Valores"
                />
              ) : (
                renderPreviewPlaceholder(
                  "Esta imagen acompana la introduccion de los valores.",
                )
              )}
            </div>

            <div className={styles.previewSplitCopy}>
              <span className={styles.previewSectionLabel}>Valores</span>
              <h3 className={styles.previewSectionTitle}>
                {form.valuesTitle || "Valores"}
              </h3>
              <p className={styles.previewBodyText}>
                {form.valuesText ||
                  "La introduccion a valores explica la forma en que trabaja la marca."}
              </p>
            </div>
          </div>

          <div className={styles.previewValuesGrid}>
            {previewValues.length === 0 ? (
              <div className={styles.previewEmptyState}>
                Empieza creando un valor para ver su tarjeta aqui.
              </div>
            ) : (
              previewValues.slice(0, 6).map((item) => (
                <div key={item.id} className={styles.previewValueCard}>
                  <div className={styles.previewValueIcon}>
                    {renderValueIcon(item.iconKey)}
                  </div>
                  <div>
                    <div className={styles.previewValueTitle}>{item.title}</div>
                    <p className={styles.previewValueText}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className={styles.previewSplitCopy}>
          <span className={styles.previewSectionLabel}>Equipo</span>
          <h3 className={styles.previewSectionTitle}>
            Perfiles visibles en la pagina About
          </h3>
          <p className={styles.previewBodyText}>
            La rejilla toma el orden y la informacion cargada aqui. Si editas un
            perfil o agregas uno nuevo, lo veras reflejado al instante.
          </p>
        </div>

        <div className={styles.previewTeamGrid}>
          {previewTeamMembers.length === 0 ? (
            <div className={styles.previewEmptyState}>
              Agrega el primer integrante para construir la seccion de equipo.
            </div>
          ) : (
            previewTeamMembers.slice(0, 4).map((member) => (
              <div key={member.id} className={styles.previewTeamCard}>
                {member.imageUrl ? (
                  <img
                    className={styles.previewTeamImage}
                    src={member.imageUrl}
                    alt={member.name}
                  />
                ) : (
                  <div className={styles.previewTeamPlaceholder}>
                    {getInitials(member.name)}
                  </div>
                )}

                <div className={styles.previewTeamBody}>
                  <div className={styles.previewValueTitle}>{member.name}</div>
                  <div className={styles.previewRole}>{member.role}</div>
                  <p className={styles.previewValueText}>
                    {member.description || "Sin descripcion."}
                  </p>

                  <div className={styles.previewNetworkRow}>
                    {member.facebookUrl ? (
                      <span className={styles.previewNetworkDot}>
                        {renderSocialIcon("facebook")}
                      </span>
                    ) : null}
                    {member.twitterUrl ? (
                      <span className={styles.previewNetworkDot}>
                        {renderSocialIcon("twitter")}
                      </span>
                    ) : null}
                    {member.linkedinUrl ? (
                      <span className={styles.previewNetworkDot}>
                        {renderSocialIcon("linkedin")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.empty}>Cargando contenido About...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.heroHeader}>
        <div className={styles.headerTop}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>
              Gestion del sistema / About
            </span>
            <h1 className={styles.title}>Editor visual de About</h1>
            <p className={styles.subtitle}>
              Ahora el contenido esta separado por secciones claras para que se
              entienda exactamente donde editar. A la derecha tienes preview en
              vivo de lo que estas escribiendo o subiendo.
            </p>
          </div>

          <div className={styles.heroActions}>
            <div className={styles.helperChip}>
              <span className={styles.helperChipIcon}>
                {renderDashboardIcon("preview")}
              </span>
              <span>Preview en vivo activo</span>
            </div>

            <div className={styles.heroGuideGrid}>
              <div className={styles.heroGuideCard}>
                <span className={styles.heroGuideIcon}>
                  {renderDashboardIcon("publish")}
                </span>
                <div>
                  <strong className={styles.heroGuideTitle}>
                    Guardado principal
                  </strong>
                  <p className={styles.heroGuideText}>
                    Hero, intro, historia y CTA se publican desde este boton.
                  </p>
                </div>
              </div>

              <div className={styles.heroGuideCard}>
                <span className={styles.heroGuideIcon}>
                  {renderDashboardIcon("dynamic-save")}
                </span>
                <div>
                  <strong className={styles.heroGuideTitle}>
                    Bloques dinamicos
                  </strong>
                  <p className={styles.heroGuideText}>
                    Valores y equipo usan sus propios botones dentro de cada
                    seccion.
                  </p>
                </div>
              </div>
            </div>

            <button
              className={styles.primaryBtn}
              type="button"
              onClick={handleSaveMain}
              disabled={savingMain}
            >
              {savingMain ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <div className={styles.heroStats}>
          {summaryCards.map((item) => (
            <div key={item.label} className={styles.heroStat}>
              <div className={styles.heroStatHead}>
                <span className={styles.heroStatIcon}>
                  {renderDashboardIcon(item.id)}
                </span>
                <span className={styles.heroStatLabel}>{item.label}</span>
              </div>
              <strong className={styles.heroStatValue}>{item.value}</strong>
              <p className={styles.heroStatText}>{item.helper}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sectionRail}>
        <div className={styles.navCard}>
          <div className={styles.sectionRailHeader}>
            <div>
              <span className={styles.navEyebrow}>Secciones</span>
              <h2 className={styles.sectionRailTitle}>
                Elige el bloque que vas a editar
              </h2>
            </div>

            <div className={styles.navNote}>
              <span className={styles.navNoteIcon}>
                {renderDashboardIcon("sections")}
              </span>
              <div>
                La navegacion separa contenido principal, valores y equipo para
                que no tengas que adivinar donde editar cada cosa.
              </div>
            </div>
          </div>

          <div className={styles.navList}>
            {editorSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={cx(
                  styles.navButton,
                  activeSection === section.id && styles.navButtonActive,
                )}
                onClick={() => setActiveSection(section.id)}
                aria-pressed={activeSection === section.id}
              >
                <span className={styles.navIcon}>
                  {renderSectionIcon(section.id)}
                </span>
                <span className={styles.navButtonBody}>
                  <span className={styles.navButtonLabel}>{section.label}</span>
                  <span className={styles.navButtonHelper}>
                    {section.helper}
                  </span>
                </span>
                <span className={styles.navArrow} aria-hidden="true">
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <section className={styles.editorPane}>{renderEditorSection()}</section>

        <aside className={styles.previewPane}>
          <div className={styles.previewShell}>
            <div className={styles.previewTop}>
              <div className={styles.previewTitleWrap}>
                <span className={styles.previewIcon}>
                  {renderDashboardIcon("preview")}
                </span>
                <div>
                  <span className={styles.previewEyebrow}>Vista previa</span>
                  <h2 className={styles.previewTitle}>
                    {activeSectionMeta.label}
                  </h2>
                </div>
              </div>

              <span className={styles.previewTag}>
                <span className={styles.previewTagDot} />
                Auto
              </span>
            </div>

            <p className={styles.previewHint}>
              Lo que ves aqui responde al texto, orden e imagen seleccionada en
              esta seccion, incluso antes de guardar.
            </p>

            <div className={styles.previewStage}>{renderPreviewSection()}</div>
          </div>
        </aside>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.empty}>Cargando contenido About...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Acerca de Nosotros</h1>
          <p className={styles.subtitle}>
            Edita el contenido público de la sección About del sitio.
          </p>
        </div>

        <button
          className={styles.primaryBtn}
          type="button"
          onClick={handleSaveMain}
          disabled={savingMain}
        >
          {savingMain ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Hero principal</h2>
          <p className={styles.sectionText}>
            Texto e imagen principal de la ventana.
          </p>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Etiqueta</span>
            <input
              className={styles.input}
              value={form.heroLabel}
              onChange={(e) => updateField("heroLabel", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Título</span>
            <input
              className={styles.input}
              value={form.heroTitle}
              onChange={(e) => updateField("heroTitle", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Palabra resaltada</span>
            <input
              className={styles.input}
              value={form.heroHighlight}
              onChange={(e) => updateField("heroHighlight", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Subtítulo</span>
            <textarea
              className={styles.textarea}
              value={form.heroSubtitle}
              onChange={(e) => updateField("heroSubtitle", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Imagen hero</span>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setHeroImage(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {about?.heroImageUrl && (
          <img
            className={styles.preview}
            src={about?.heroImageUrl ?? undefined}
            alt="Hero actual"
          />
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Introducción y estadísticas</h2>
          <p className={styles.sectionText}>
            Bloque de presentación y números principales.
          </p>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Título intro</span>
            <input
              className={styles.input}
              value={form.introTitle}
              onChange={(e) => updateField("introTitle", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Palabra resaltada intro</span>
            <input
              className={styles.input}
              value={form.introHighlight}
              onChange={(e) => updateField("introHighlight", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Texto intro</span>
            <textarea
              className={styles.textarea}
              value={form.introText}
              onChange={(e) => updateField("introText", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Imagen intro</span>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setIntroImage(e.target.files?.[0] || null)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 1 valor</span>
            <input
              className={styles.input}
              value={form.stat1Value}
              onChange={(e) => updateField("stat1Value", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 1 etiqueta</span>
            <input
              className={styles.input}
              value={form.stat1Label}
              onChange={(e) => updateField("stat1Label", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 2 valor</span>
            <input
              className={styles.input}
              value={form.stat2Value}
              onChange={(e) => updateField("stat2Value", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 2 etiqueta</span>
            <input
              className={styles.input}
              value={form.stat2Label}
              onChange={(e) => updateField("stat2Label", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 3 valor</span>
            <input
              className={styles.input}
              value={form.stat3Value}
              onChange={(e) => updateField("stat3Value", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Stat 3 etiqueta</span>
            <input
              className={styles.input}
              value={form.stat3Label}
              onChange={(e) => updateField("stat3Label", e.target.value)}
            />
          </label>
        </div>

        {about?.introImageUrl && (
          <img
            className={styles.preview}
            src={about?.introImageUrl ?? undefined}
            alt="Intro actual"
          />
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Misión, visión y bloque de valores
          </h2>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Título misión</span>
            <input
              className={styles.input}
              value={form.missionTitle}
              onChange={(e) => updateField("missionTitle", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Texto misión</span>
            <textarea
              className={styles.textarea}
              value={form.missionText}
              onChange={(e) => updateField("missionText", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Imagen misión</span>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setMissionImage(e.target.files?.[0] || null)}
            />
          </label>

          <label className={styles.field}>
            <span>Título visión</span>
            <input
              className={styles.input}
              value={form.visionTitle}
              onChange={(e) => updateField("visionTitle", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Texto visión</span>
            <textarea
              className={styles.textarea}
              value={form.visionText}
              onChange={(e) => updateField("visionText", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Imagen visión</span>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setVisionImage(e.target.files?.[0] || null)}
            />
          </label>

          <label className={styles.field}>
            <span>Título bloque valores</span>
            <input
              className={styles.input}
              value={form.valuesTitle}
              onChange={(e) => updateField("valuesTitle", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Texto bloque valores</span>
            <textarea
              className={styles.textarea}
              value={form.valuesText}
              onChange={(e) => updateField("valuesText", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Imagen bloque valores</span>
            <input
              className={styles.file}
              type="file"
              accept="image/*"
              onChange={(e) => setValuesImage(e.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>CTA final</h2>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Título CTA</span>
            <input
              className={styles.input}
              value={form.ctaTitle}
              onChange={(e) => updateField("ctaTitle", e.target.value)}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Texto CTA</span>
            <textarea
              className={styles.textarea}
              value={form.ctaText}
              onChange={(e) => updateField("ctaText", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Dirección</span>
            <input
              className={styles.input}
              value={form.ctaAddress}
              onChange={(e) => updateField("ctaAddress", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Teléfono</span>
            <input
              className={styles.input}
              value={form.ctaPhone}
              onChange={(e) => updateField("ctaPhone", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Texto botón principal</span>
            <input
              className={styles.input}
              value={form.ctaPrimaryButtonText}
              onChange={(e) =>
                updateField("ctaPrimaryButtonText", e.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            <span>Link botón principal</span>
            <input
              className={styles.input}
              value={form.ctaPrimaryButtonLink}
              onChange={(e) =>
                updateField("ctaPrimaryButtonLink", e.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            <span>Texto botón secundario</span>
            <input
              className={styles.input}
              value={form.ctaSecondaryButtonText}
              onChange={(e) =>
                updateField("ctaSecondaryButtonText", e.target.value)
              }
            />
          </label>

          <label className={styles.field}>
            <span>Link botón secundario</span>
            <input
              className={styles.input}
              value={form.ctaSecondaryButtonLink}
              onChange={(e) =>
                updateField("ctaSecondaryButtonLink", e.target.value)
              }
            />
          </label>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Valores</h2>
            <p className={styles.sectionText}>
              Agrega, edita, elimina y ordena.
            </p>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Título</span>
              <input
                className={styles.input}
                value={valueTitle}
                onChange={(e) => setValueTitle(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Icon key</span>
              <input
                className={styles.input}
                value={valueIconKey}
                onChange={(e) => setValueIconKey(e.target.value)}
                placeholder="shield, heart, users..."
              />
            </label>

            <label className={`${styles.field} ${styles.full}`}>
              <span>Descripción</span>
              <textarea
                className={styles.textarea}
                value={valueDescription}
                onChange={(e) => setValueDescription(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.actionsBar}>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={handleCreateValue}
            >
              Agregar valor
            </button>
          </div>

          <div className={styles.list}>
            {values.length === 0 ? (
              <div className={styles.empty}>No hay valores registrados.</div>
            ) : (
              values.map((item, index) => (
                <div key={item.id} className={styles.listCard}>
                  {editingValueId === item.id ? (
                    <>
                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>Título</span>
                          <input
                            className={styles.input}
                            value={editingValueTitle}
                            onChange={(e) =>
                              setEditingValueTitle(e.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Icon key</span>
                          <input
                            className={styles.input}
                            value={editingValueIconKey}
                            onChange={(e) =>
                              setEditingValueIconKey(e.target.value)
                            }
                          />
                        </label>

                        <label className={`${styles.field} ${styles.full}`}>
                          <span>Descripción</span>
                          <textarea
                            className={styles.textarea}
                            value={editingValueDescription}
                            onChange={(e) =>
                              setEditingValueDescription(e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          onClick={handleSaveValueEdit}
                        >
                          Guardar
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={cancelEditValue}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className={styles.itemTitle}>
                          {index + 1}. {item.title}
                        </div>
                        <div className={styles.itemMeta}>
                          Icono: {item.iconKey || "shield"}
                        </div>
                        <div className={styles.itemText}>
                          {item.description}
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          onClick={() => moveValue(item.id, "up")}
                        >
                          ↑
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => moveValue(item.id, "down")}
                        >
                          ↓
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => startEditValue(item)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDeleteValue(item.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Equipo</h2>
            <p className={styles.sectionText}>
              Gestiona integrantes y sus fotos.
            </p>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Nombre</span>
              <input
                className={styles.input}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Rol</span>
              <input
                className={styles.input}
                value={teamRole}
                onChange={(e) => setTeamRole(e.target.value)}
              />
            </label>

            <label className={`${styles.field} ${styles.full}`}>
              <span>Descripción</span>
              <textarea
                className={styles.textarea}
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Facebook</span>
              <input
                className={styles.input}
                value={teamFacebook}
                onChange={(e) => setTeamFacebook(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Twitter</span>
              <input
                className={styles.input}
                value={teamTwitter}
                onChange={(e) => setTeamTwitter(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>LinkedIn</span>
              <input
                className={styles.input}
                value={teamLinkedin}
                onChange={(e) => setTeamLinkedin(e.target.value)}
              />
            </label>

            <label className={`${styles.field} ${styles.full}`}>
              <span>Imagen</span>
              <input
                className={styles.file}
                type="file"
                accept="image/*"
                onChange={(e) => setTeamImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className={styles.actionsBar}>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={handleCreateTeamMember}
            >
              Agregar miembro
            </button>
          </div>

          <div className={styles.list}>
            {teamMembers.length === 0 ? (
              <div className={styles.empty}>No hay miembros registrados.</div>
            ) : (
              teamMembers.map((member, index) => (
                <div key={member.id} className={styles.listCard}>
                  {editingMemberId === member.id ? (
                    <>
                      <div className={styles.formGrid}>
                        <label className={styles.field}>
                          <span>Nombre</span>
                          <input
                            className={styles.input}
                            value={editingMemberName}
                            onChange={(e) =>
                              setEditingMemberName(e.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Rol</span>
                          <input
                            className={styles.input}
                            value={editingMemberRole}
                            onChange={(e) =>
                              setEditingMemberRole(e.target.value)
                            }
                          />
                        </label>

                        <label className={`${styles.field} ${styles.full}`}>
                          <span>Descripción</span>
                          <textarea
                            className={styles.textarea}
                            value={editingMemberDescription}
                            onChange={(e) =>
                              setEditingMemberDescription(e.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Facebook</span>
                          <input
                            className={styles.input}
                            value={editingMemberFacebook}
                            onChange={(e) =>
                              setEditingMemberFacebook(e.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>Twitter</span>
                          <input
                            className={styles.input}
                            value={editingMemberTwitter}
                            onChange={(e) =>
                              setEditingMemberTwitter(e.target.value)
                            }
                          />
                        </label>

                        <label className={styles.field}>
                          <span>LinkedIn</span>
                          <input
                            className={styles.input}
                            value={editingMemberLinkedin}
                            onChange={(e) =>
                              setEditingMemberLinkedin(e.target.value)
                            }
                          />
                        </label>

                        <label className={`${styles.field} ${styles.full}`}>
                          <span>Nueva imagen</span>
                          <input
                            className={styles.file}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setEditingMemberImage(e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          onClick={handleSaveMemberEdit}
                        >
                          Guardar
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={cancelEditMember}
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.memberRow}>
                        <img
                          className={styles.memberImage}
                          src={
                            member.imageUrl || "https://via.placeholder.com/64"
                          }
                          alt={member.name}
                        />
                        <div>
                          <div className={styles.itemTitle}>
                            {index + 1}. {member.name}
                          </div>
                          <div className={styles.itemMeta}>{member.role}</div>
                          <div className={styles.itemText}>
                            {member.description || "Sin descripción."}
                          </div>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button
                          className={styles.btnGhost}
                          onClick={() => moveMember(member.id, "up")}
                        >
                          ↑
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => moveMember(member.id, "down")}
                        >
                          ↓
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => startEditMember(member)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
