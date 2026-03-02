export type Brand = { id: string; name: string; active: boolean };
export type Category = { id: string; name: string; active: boolean };

const BRANDS_KEY = "admin.brands";
const CATEGORIES_KEY = "admin.categories";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadBrands(): Brand[] {
  return safeParse<Brand[]>(localStorage.getItem(BRANDS_KEY), []);
}
export function saveBrands(list: Brand[]) {
  localStorage.setItem(BRANDS_KEY, JSON.stringify(list));
}

export function loadCategories(): Category[] {
  return safeParse<Category[]>(localStorage.getItem(CATEGORIES_KEY), []);
}
export function saveCategories(list: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
