import type { CartProduct } from "../../context/CartContext";

export type ProductSpecificationValue = string | number | string[];

export type Product = CartProduct & {
  category: string;
  featured: boolean;
  description: string;
  features: string[];
  specifications: Record<string, ProductSpecificationValue>;
};

export type CatalogProductView = Product & {
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  sku: string;
  usage: string;
  badge?: string;
  gallery?: string[];
};

export const catalogProducts: Product[] = [
  {
    id: 1,
    name: "Proteina Whey Gold Standard",
    category: "PROTEINA",
    price: 899,
    image:
      "https://suplementosags.com/wp-content/uploads/2019/08/Comp-Gold-Standard-5Lbs-Marca-de-Agua.png",
    featured: true,
    description:
      "Proteina whey de alta calidad con 24 g de proteina por servicio. Ideal para ganancia muscular y recuperacion despues del entrenamiento.",
    features: [
      "24 g de proteina por servicio",
      "Bajo en lactosa",
      "Mezcla instantanea",
      "Sabor chocolate premium",
    ],
    specifications: {
      peso: "2.27 kg (5 lb)",
      sabores: ["Chocolate", "Vainilla", "Fresa"],
      servings: 74,
    },
  },
  {
    id: 2,
    name: "Creatina Monohidratada",
    category: "CREATINA",
    price: 599,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkUQ1BTH2hPodXcQLiVcE2c_0DpFUKI-Np_w&s",
    featured: true,
    description:
      "Creatina monohidratada 100% pura. Aumenta tu fuerza y resistencia durante los entrenamientos de alta intensidad.",
    features: [
      "100% creatina monohidratada",
      "Aumenta fuerza y resistencia",
      "Mejora recuperacion muscular",
      "Sin sabor, facil de mezclar",
    ],
    specifications: {
      peso: "300 g",
      sabores: ["Natural"],
      servings: 100,
    },
  },
  {
    id: 3,
    name: "Pre-Entreno Explosive",
    category: "PRE-ENTRENO",
    price: 699,
    image:
      "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcT_z3Ucz0CPxiiaCFGcmKl4WfjtHIP2-JIz2mmvfOIzpaFbOCP6LFDsRR8U3yBNJDb2RQGypsENPiqKCeLw8afOa4RvYmzktsF38gokkV0xgisbK3nhriTI",
    featured: false,
    description:
      "Pre-entreno de maxima potencia con beta-alanina y cafeina. Energia sostenida sin crash.",
    features: [
      "Energia inmediata",
      "Enfoque mental mejorado",
      "Bombeo muscular intenso",
      "Sin crash posterior",
    ],
    specifications: {
      peso: "400 g",
      sabores: ["Frutos Rojos", "Tropical Punch", "Limonada"],
      servings: 40,
    },
  },
  {
    id: 4,
    name: "BCAA Amino Acidos",
    category: "INTRA-ENTRENO",
    price: 499,
    image:
      "https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/opn/opn02036/l/48.jpg",
    featured: false,
    description:
      "BCAA 2:1:1 con electrolitos. Previene el catabolismo muscular durante entrenamientos intensos.",
    features: [
      "Ratio 2:1:1 comprobado",
      "Con electrolitos anadidos",
      "Recuperacion acelerada",
      "Hidratacion mejorada",
    ],
    specifications: {
      peso: "200 g",
      sabores: ["Limonada", "Sandia", "Uva"],
      servings: 50,
    },
  },
  {
    id: 5,
    name: "Tank Top Titanium",
    category: "ROPA",
    price: 349,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: true,
    description:
      "Tank top de alta calidad con tecnologia de secado rapido. Ideal para entrenamientos intensos.",
    features: [
      "Tecnologia dry-fit",
      "Secado rapido",
      "Comodidad maxima",
      "Diseno ergonomico",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL", "XXL"],
      colores: ["Negro", "Rojo", "Gris", "Azul"],
      material: "Poliester 92%, Elastano 8%",
    },
  },
  {
    id: 6,
    name: "Shorts Deportivos",
    category: "ROPA",
    price: 299,
    image:
      "https://acide.com.mx/cdn/shop/files/ShortMexicocaballerofrente.png?v=1701984228&width=3840",
    featured: false,
    description:
      "Shorts deportivos con compresion ligera. Maxima libertad de movimiento.",
    features: [
      "Compresion ligera",
      "Bolsillo para llaves",
      "Cintura elastica",
      "Material transpirable",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL"],
      colores: ["Negro", "Gris", "Azul Marino"],
      material: "Poliester 88%, Elastano 12%",
    },
  },
  {
    id: 7,
    name: "Mass Gainer",
    category: "GANANCIA MUSCULAR",
    price: 799,
    image:
      "https://bodyfitsupplements.com.mx/cdn/shop/files/PROTEINASBODY_30.png?v=1733072937",
    featured: true,
    description:
      "Ganador de peso con 50 g de proteina y carbohidratos complejos. Ideal para volumen limpio.",
    features: [
      "50 g de proteina por servicio",
      "Carbohidratos complejos",
      "Enzimas digestivas",
      "Bajo en azucar",
    ],
    specifications: {
      peso: "5.45 kg (12 lb)",
      sabores: ["Vainilla", "Chocolate", "Cookies & Cream"],
      servings: 20,
    },
  },
  {
    id: 8,
    name: "Quemador de Grasa Thermo",
    category: "CONTROL DE PESO",
    price: 649,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: false,
    description:
      "Formula termogenica avanzada que acelera el metabolismo, aumenta la oxidacion de grasas y proporciona energia sostenida para apoyar objetivos de perdida de peso.",
    features: [
      "Termogenesis avanzada",
      "Supresor del apetito",
      "Energia natural",
      "Ingredientes naturales",
    ],
    specifications: {
      peso: "180 capsulas",
      dosis: "2 capsulas al dia",
      duracion: "90 dias",
    },
  },
  {
    id: 9,
    name: "Multivitaminico Premium",
    category: "SALUD Y BIENESTAR",
    price: 399,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: true,
    description:
      "Multivitaminico completo con minerales esenciales. Soporte nutricional para atletas.",
    features: [
      "30+ vitaminas y minerales",
      "Alta biodisponibilidad",
      "Formulacion para atletas",
      "Libre de OGM",
    ],
    specifications: {
      peso: "120 tabletas",
      dosis: "1 tableta al dia",
      duracion: "4 meses",
    },
  },
  {
    id: 10,
    name: "Hoodie Titanium",
    category: "ROPA",
    price: 599,
    image:
      "https://www.nutrimind.net/images/news/analisis_quemadores_grasa/1.png",
    featured: false,
    description:
      "Hoodie premium con capucha y bolsillo canguro. Perfecto para entrenar en climas frios.",
    features: [
      "Tela French Terry",
      "Bolsillo canguro",
      "Corte moderno",
      "Capucha ajustable",
    ],
    specifications: {
      tallas: ["S", "M", "L", "XL", "XXL"],
      colores: ["Negro", "Gris Oscuro", "Rojo Titanium"],
      material: "Algodon 80%, Poliester 20%",
    },
  },
  {
    id: 11,
    name: "Glutamina Recovery",
    category: "RECUPERACION",
    price: 449,
    image: "https://via.placeholder.com/300x300/ef4444/ffffff?text=GLUTAMINA",
    featured: false,
    description:
      "Glutamina pura para recuperacion muscular y salud intestinal. Reduce el dolor muscular.",
    features: [
      "Recuperacion acelerada",
      "Salud intestinal",
      "Sistema inmune",
      "Sin sabor anadido",
    ],
    specifications: {
      peso: "300 g",
      sabores: ["Natural"],
      servings: 60,
    },
  },
  {
    id: 12,
    name: "Proteina Vegana",
    category: "PROTEINA",
    price: 749,
    image: "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=VEGANA",
    featured: true,
    description:
      "Proteina vegetal de guisante y arroz. Alternativa vegana de alta calidad nutricional.",
    features: [
      "Proteina completa vegana",
      "Facil digestion",
      "Sin lacteos ni soya",
      "Aminoacidos esenciales",
    ],
    specifications: {
      peso: "1.8 kg (4 lb)",
      sabores: ["Vainilla Natural", "Chocolate"],
      servings: 45,
    },
  },
];

export const catalogCategories = [
  "TODOS",
  "PRE-ENTRENO",
  "INTRA-ENTRENO",
  "GANANCIA MUSCULAR",
  "PROTEINA",
  "CREATINA",
  "CONTROL DE PESO",
  "SALUD Y BIENESTAR",
  "ROPA",
  "RECUPERACION",
];

export const catalogSortOptions = [
  "RECOMENDADO",
  "PRECIO: MENOR A MAYOR",
  "PRECIO: MAYOR A MENOR",
  "MAS POPULARES",
  "MAS NUEVOS",
];

function getProductRating(product: Product) {
  const numericId = Number(product.id) || 0;
  return product.featured ? 5 : Math.max(3, 5 - (numericId % 2));
}

function getProductReviewCount(product: Product) {
  const numericId = Number(product.id) || 1;
  return 24 + numericId * 9;
}

function getProductOriginalPrice(product: Product) {
  if (product.featured) return product.price + 110;
  if ((Number(product.id) || 0) % 3 === 0) return product.price + 60;
  return null;
}

function getProductBadge(product: Product) {
  if (product.featured) return "Oferta";
  if ((Number(product.id) || 0) % 4 === 0) return "Nuevo";
  return null;
}

function getProductSku(product: Product) {
  return `TH-${String(product.category).slice(0, 3)}-${String(product.id).padStart(3, "0")}`;
}

function isProductInStock(product: Product) {
  return (Number(product.id) || 0) % 5 !== 0;
}

function getProductUsage(product: Product) {
  if (product.category === "ROPA") {
    return "Usalo en entrenamiento, cardio o para completar tu look Titanium antes y despues de cada sesion.";
  }

  return "Sigue la porcion sugerida por el fabricante y ajusta su consumo a tu rutina diaria y objetivos de entrenamiento.";
}

export function buildCatalogProduct(product: Product): CatalogProductView {
  return {
    ...product,
    rating: getProductRating(product),
    reviewCount: getProductReviewCount(product),
    originalPrice: getProductOriginalPrice(product) ?? undefined,
    inStock: isProductInStock(product),
    sku: getProductSku(product),
    usage: getProductUsage(product),
    badge: getProductBadge(product) ?? undefined,
    gallery: [product.image],
  };
}

export function getAllCatalogProducts() {
  return catalogProducts.map(buildCatalogProduct);
}

export function getCatalogProductById(productId: string | number) {
  const match = catalogProducts.find(
    (product) => String(product.id) === String(productId)
  );

  return match ? buildCatalogProduct(match) : null;
}

export function getCatalogProductPath(productId: string | number) {
  return `/catalogue/${productId}`;
}
