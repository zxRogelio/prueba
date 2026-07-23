import type { CartItem, CartProduct } from "../context/CartContext";

export type CartRecommendation = CartProduct & {
  confidence: number;
  lift: number;
  reason: string;
  rule: string;
};

type RecommendationRule = {
  keywords: string[];
  requiredKeywordGroups?: string[][];
  recommendId: string;
  reason: string;
  rule: string;
  confidence: number;
  lift: number;
};

const recommendationProducts: Record<string, CartProduct> = {
  "rec-creatina": {
    id: "rec-creatina",
    name: "Creatina Monohidratada",
    price: 399,
    image:
      "https://www.pngkey.com/png/detail/303-3038000_met-rx-creatine-monohydrate-powder-unflavored-80-met.png",
    category: "SUPLEMENTOS",
  },
  "rec-shaker": {
    id: "rec-shaker",
    name: "Shaker Titanium 700 ml",
    price: 179,
    image:
      "https://www.pngkey.com/png/detail/420-4207168_600ml-shaker-with-stainless-steel-ball-bw0073-shaker.png",
    category: "ACCESORIOS",
  },
  "rec-pre-entreno": {
    id: "rec-pre-entreno",
    name: "Pre-entreno Explosive",
    price: 459,
    image:
      "https://www.pngkey.com/png/detail/367-3678776_c4-explosive-energy-gen-4-cellucor-c4-60.png",
    category: "SUPLEMENTOS",
  },
  "rec-aminoacidos": {
    id: "rec-aminoacidos",
    name: "Aminoacidos BCAA",
    price: 349,
    image:
      "https://www.pikpng.com/pngl/m/591-5914894_scivation-xtend-bcaa-powder-lemon-lime-90-servings.png",
    category: "SUPLEMENTOS",
  },
  "rec-botella": {
    id: "rec-botella",
    name: "Botella Deportiva 1 L",
    price: 149,
    image:
      "https://gallery.yopriceville.com/var/resizes/Free-Clipart-Pictures/Sport-PNG/Sports_Water_Bottle_PNG_Clipart.png?m=1629833243",
    category: "ACCESORIOS",
  },
  "rec-straps": {
    id: "rec-straps",
    name: "Straps de Levantamiento",
    price: 229,
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Lifting_Straps.png/960px-Lifting_Straps.png",
    category: "ACCESORIOS",
  },
  "rec-multivitaminico": {
    id: "rec-multivitaminico",
    name: "Multivitaminico Fitness",
    price: 289,
    image:
      "https://www.pngkey.com/png/detail/351-3516420_only-one-multivitamin-bottle-and-packaging-new-chapter.png",
    category: "SUPLEMENTOS",
  },
};

const associationRules: RecommendationRule[] = [
  {
    keywords: ["proteina", "protein", "whey"],
    recommendId: "rec-creatina",
    reason:
      "Los clientes que compran proteina suelen completar su stack con creatina.",
    rule: "Proteina whey -> Creatina",
    confidence: 78,
    lift: 1.9,
  },
  {
    keywords: [],
    requiredKeywordGroups: [["proteina", "protein", "whey"], ["creatina"]],
    recommendId: "rec-shaker",
    reason:
      "Este accesorio aparece frecuentemente cuando se combinan suplementos en polvo.",
    rule: "Proteina + creatina -> Shaker",
    confidence: 84,
    lift: 2.1,
  },
  {
    keywords: ["creatina"],
    recommendId: "rec-pre-entreno",
    reason:
      "Se recomienda como complemento para rutinas de fuerza e intensidad.",
    rule: "Creatina -> Pre-entreno",
    confidence: 61,
    lift: 1.5,
  },
  {
    keywords: ["pre entreno", "pre-entreno", "preworkout", "pre workout"],
    recommendId: "rec-aminoacidos",
    reason:
      "Los usuarios que compran pre-entreno tambien compran aminoacidos para recuperacion.",
    rule: "Pre-entreno -> Aminoacidos",
    confidence: 69,
    lift: 1.7,
  },
  {
    keywords: ["aminoacidos", "bcaa"],
    recommendId: "rec-botella",
    reason: "Producto practico para mezclar y consumir durante el entrenamiento.",
    rule: "BCAA -> Botella deportiva",
    confidence: 65,
    lift: 1.6,
  },
  {
    keywords: ["quemador", "fat burner", "definicion", "bajar grasa"],
    recommendId: "rec-multivitaminico",
    reason:
      "Complemento comun en objetivos de control de peso y bienestar general.",
    rule: "Quemador -> Multivitaminico",
    confidence: 58,
    lift: 1.4,
  },
  {
    keywords: ["guantes", "cinturon", "levantamiento"],
    recommendId: "rec-straps",
    reason:
      "Se compra junto a accesorios de fuerza para mejorar agarre y seguridad.",
    rule: "Accesorios de fuerza -> Straps",
    confidence: 72,
    lift: 1.8,
  },
  {
    keywords: ["ropa", "playera", "short", "leggings"],
    recommendId: "rec-botella",
    reason: "Compra frecuente junto con ropa de entrenamiento.",
    rule: "Ropa fitness -> Botella deportiva",
    confidence: 55,
    lift: 1.3,
  },
];

function normalize(value: string | number | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function itemText(item: CartItem) {
  return normalize(`${item.id} ${item.name} ${item.category ?? ""}`);
}

function isAlreadyInCart(items: CartItem[], product: CartProduct) {
  const productName = normalize(product.name);

  return items.some(
    (item) =>
      String(item.id) === String(product.id) ||
      normalize(item.name) === productName ||
      normalize(item.name).includes(productName) ||
      productName.includes(normalize(item.name)),
  );
}

function hasAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalize(keyword)));
}

function hasRuleTrigger(items: CartItem[], rule: RecommendationRule) {
  if (rule.requiredKeywordGroups?.length) {
    return rule.requiredKeywordGroups.every((group) =>
      items.some((item) => hasAnyKeyword(itemText(item), group)),
    );
  }

  return items.some((item) => hasAnyKeyword(itemText(item), rule.keywords));
}

export function getCartRecommendations(
  items: CartItem[],
  limit = 1,
): CartRecommendation[] {
  const matches = new Map<string, CartRecommendation>();

  for (const rule of associationRules) {
    if (!hasRuleTrigger(items, rule)) continue;

    const product = recommendationProducts[rule.recommendId];
    if (!product || isAlreadyInCart(items, product)) continue;

    const current = matches.get(rule.recommendId);
    if (current && current.confidence * current.lift >= rule.confidence * rule.lift) {
      continue;
    }

    matches.set(rule.recommendId, {
      ...product,
      confidence: rule.confidence,
      lift: rule.lift,
      reason: rule.reason,
      rule: rule.rule,
    });
  }

  return Array.from(matches.values())
    .sort((left, right) => right.confidence * right.lift - left.confidence * left.lift)
    .slice(0, limit);
}
