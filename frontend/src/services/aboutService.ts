/* eslint-disable @typescript-eslint/no-explicit-any */
import { publicClient } from "../pwa/publicClient";

export type AboutValueDTO = {
  id: string;
  title: string;
  description: string;
  iconKey?: string | null;
  order: number;
  isActive: boolean;
};

export type AboutTeamMemberDTO = {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  imageUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  order: number;
  isActive: boolean;
};

export type AboutPageDTO = {
  id: string;
  slug: string;

  heroLabel?: string | null;
  heroTitle?: string | null;
  heroHighlight?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;

  introTitle?: string | null;
  introHighlight?: string | null;
  introText?: string | null;
  introImageUrl?: string | null;

  stat1Value?: string | null;
  stat1Label?: string | null;
  stat2Value?: string | null;
  stat2Label?: string | null;
  stat3Value?: string | null;
  stat3Label?: string | null;

  missionTitle?: string | null;
  missionText?: string | null;
  missionImageUrl?: string | null;

  visionTitle?: string | null;
  visionText?: string | null;
  visionImageUrl?: string | null;

  valuesTitle?: string | null;
  valuesText?: string | null;
  valuesImageUrl?: string | null;

  ctaTitle?: string | null;
  ctaText?: string | null;
  ctaAddress?: string | null;
  ctaPhone?: string | null;
  ctaPrimaryButtonText?: string | null;
  ctaPrimaryButtonLink?: string | null;
  ctaSecondaryButtonText?: string | null;
  ctaSecondaryButtonLink?: string | null;

  values?: AboutValueDTO[];
  teamMembers?: AboutTeamMemberDTO[];

  createdAt?: string;
  updatedAt?: string;
};

type AboutApi = any;

const mapAboutValue = (item: any): AboutValueDTO => ({
  id: String(item.id ?? ""),
  title: item.title ?? "",
  description: item.description ?? "",
  iconKey: item.iconKey ?? null,
  order: Number(item.order ?? 0),
  isActive: Boolean(item.isActive ?? true),
});

const mapAboutTeamMember = (item: any): AboutTeamMemberDTO => ({
  id: String(item.id ?? ""),
  name: item.name ?? "",
  role: item.role ?? "",
  description: item.description ?? null,
  imageUrl: item.imageUrl ?? null,
  facebookUrl: item.facebookUrl ?? null,
  twitterUrl: item.twitterUrl ?? null,
  linkedinUrl: item.linkedinUrl ?? null,
  order: Number(item.order ?? 0),
  isActive: Boolean(item.isActive ?? true),
});

const mapAboutPage = (data: AboutApi): AboutPageDTO => ({
  id: String(data.id ?? ""),
  slug: data.slug ?? "main",

  heroLabel: data.heroLabel ?? null,
  heroTitle: data.heroTitle ?? null,
  heroHighlight: data.heroHighlight ?? null,
  heroSubtitle: data.heroSubtitle ?? null,
  heroImageUrl: data.heroImageUrl ?? null,

  introTitle: data.introTitle ?? null,
  introHighlight: data.introHighlight ?? null,
  introText: data.introText ?? null,
  introImageUrl: data.introImageUrl ?? null,

  stat1Value: data.stat1Value ?? null,
  stat1Label: data.stat1Label ?? null,
  stat2Value: data.stat2Value ?? null,
  stat2Label: data.stat2Label ?? null,
  stat3Value: data.stat3Value ?? null,
  stat3Label: data.stat3Label ?? null,

  missionTitle: data.missionTitle ?? null,
  missionText: data.missionText ?? null,
  missionImageUrl: data.missionImageUrl ?? null,

  visionTitle: data.visionTitle ?? null,
  visionText: data.visionText ?? null,
  visionImageUrl: data.visionImageUrl ?? null,

  valuesTitle: data.valuesTitle ?? null,
  valuesText: data.valuesText ?? null,
  valuesImageUrl: data.valuesImageUrl ?? null,

  ctaTitle: data.ctaTitle ?? null,
  ctaText: data.ctaText ?? null,
  ctaAddress: data.ctaAddress ?? null,
  ctaPhone: data.ctaPhone ?? null,
  ctaPrimaryButtonText: data.ctaPrimaryButtonText ?? null,
  ctaPrimaryButtonLink: data.ctaPrimaryButtonLink ?? null,
  ctaSecondaryButtonText: data.ctaSecondaryButtonText ?? null,
  ctaSecondaryButtonLink: data.ctaSecondaryButtonLink ?? null,

  values: Array.isArray(data.values) ? data.values.map(mapAboutValue) : [],
  teamMembers: Array.isArray(data.teamMembers)
    ? data.teamMembers.map(mapAboutTeamMember)
    : [],

  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export async function getAboutPage(signal?: AbortSignal) {
  const { data } = await publicClient.get<AboutApi>("/about", { signal });
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Información no disponible");
  return mapAboutPage(data);
}
