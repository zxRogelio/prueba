// API Service Layer - Ready for backend integration
// Replace BASE_URL with your actual backend URL

import type {
  Service,
  SubscriptionPlan,
  Trainer,
  Schedule,
  UserSubscription,
  HeroSlide,
  Product,
  ApiResponse,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Generic fetch wrapper with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Services API
export async function getServices(): Promise<Service[]> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<Service[]>>('/services').then(res => res.data);
  return mockServices;
}

// Subscription Plans API
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<SubscriptionPlan[]>>('/plans').then(res => res.data);
  return mockPlans;
}

// Trainers API
export async function getTrainers(): Promise<Trainer[]> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<Trainer[]>>('/trainers').then(res => res.data);
  return mockTrainers;
}

// Schedule API
export async function getSchedule(day?: string): Promise<Schedule[]> {
  // TODO: Replace with actual API call
  // const query = day ? `?day=${day}` : '';
  // return fetchApi<ApiResponse<Schedule[]>>(`/schedule${query}`).then(res => res.data);
  return day ? mockSchedule.filter(s => s.day === day) : mockSchedule;
}

// User Subscription API (requires auth)
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<UserSubscription>>(`/users/${userId}/subscription`).then(res => res.data);
  return mockUserSubscription;
}

// Hero Slides API
export async function getHeroSlides(): Promise<HeroSlide[]> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<HeroSlide[]>>('/hero-slides').then(res => res.data);
  return mockHeroSlides;
}

// Products API
export async function getProducts(category?: string): Promise<Product[]> {
  // TODO: Replace with actual API call
  // const query = category ? `?category=${category}` : '';
  // return fetchApi<ApiResponse<Product[]>>(`/products${query}`).then(res => res.data);
  if (!category || category === 'todos') return mockProducts;
  return mockProducts.filter(p => p.category === category);
}

export async function getProductById(id: string): Promise<Product | null> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<Product>>(`/products/${id}`).then(res => res.data);
  return mockProducts.find(p => p.id === id) || null;
}

export async function getRelatedProducts(productId: string, category: string): Promise<Product[]> {
  // TODO: Replace with actual API call
  // return fetchApi<ApiResponse<Product[]>>(`/products/${productId}/related`).then(res => res.data);
  return mockProducts.filter(p => p.category === category && p.id !== productId).slice(0, 4);
}

export const productCategories = [
  { value: 'todos', label: 'TODOS' },
  { value: 'pre-entreno', label: 'PRE-ENTRENO' },
  { value: 'intra-entreno', label: 'INTRA-ENTRENO' },
  { value: 'ganancia-muscular', label: 'GANANCIA MUSCULAR' },
  { value: 'proteina', label: 'PROTEINA' },
  { value: 'creatina', label: 'CREATINA' },
  { value: 'control-peso', label: 'CONTROL DE PESO' },
  { value: 'salud-bienestar', label: 'SALUD + BIENESTAR' },
  { value: 'ropa', label: 'ROPA' },
  { value: 'accesorios', label: 'ACCESORIOS' },
];

// ============================================
// MOCK DATA - Remove when connecting to backend
// ============================================

const mockServices: Service[] = [
  {
    id: '1',
    title: 'Entrenamiento de Fuerza',
    description: 'Área equipada con racks, barras olímpicas y mancuernas para todos los niveles.',
    icon: 'dumbbell',
    features: ['Equipos de última generación', 'Zona de peso libre', 'Máquinas guiadas'],
  },
  {
    id: '2',
    title: 'Clases Funcionales',
    description: 'HIIT, cardio boxing y circuitos que aceleran tu progreso y queman grasa.',
    icon: 'zap',
    features: ['CrossFit', 'HIIT', 'Cardio Boxing', 'Circuitos'],
  },
  {
    id: '3',
    title: 'Plan Personalizado',
    description: 'Rutinas y seguimiento con metas claras para fuerza, volumen o definición.',
    icon: 'target',
    features: ['Evaluación inicial', 'Plan nutricional', 'Seguimiento mensual'],
  },
  {
    id: '4',
    title: 'Cardio Zone',
    description: 'Área completa con cintas, elípticas, bicicletas y remos para tu resistencia.',
    icon: 'heart',
    features: ['Equipos modernos', 'Pantallas interactivas', 'Aire acondicionado'],
  },
  {
    id: '5',
    title: 'Spinning',
    description: 'Clases grupales de ciclismo indoor con música y entrenadores motivadores.',
    icon: 'bike',
    features: ['Bicicletas profesionales', 'Iluminación LED', 'Instructor certificado'],
  },
  {
    id: '6',
    title: 'Yoga & Pilates',
    description: 'Mejora tu flexibilidad, postura y equilibrio mental con nuestras clases.',
    icon: 'sparkles',
    features: ['Yoga Vinyasa', 'Pilates Mat', 'Meditación'],
  },
];

const mockPlans: SubscriptionPlan[] = [
  {
    id: '1',
    name: 'Básico',
    price: 299,
    currency: 'MXN',
    period: 'mes',
    features: [
      'Acceso al gimnasio',
      'Horario limitado (6am - 2pm)',
      'Zona de cardio',
      'Vestidores',
    ],
  },
  {
    id: '2',
    name: 'Premium',
    price: 499,
    currency: 'MXN',
    period: 'mes',
    isPopular: true,
    features: [
      'Acceso ilimitado 24/7',
      'Todas las áreas',
      'Clases grupales incluidas',
      'Casillero personal',
      'Evaluación mensual',
    ],
  },
  {
    id: '3',
    name: 'Elite',
    price: 799,
    currency: 'MXN',
    period: 'mes',
    features: [
      'Todo lo de Premium',
      'Entrenador personal (4 sesiones)',
      'Plan nutricional',
      'Acceso a spa',
      'Invitados (2/mes)',
      'Estacionamiento VIP',
    ],
  },
];

const mockTrainers: Trainer[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    specialty: 'Entrenamiento Funcional',
    description: 'Especialista en CrossFit y preparación física con más de 8 años de experiencia.',
    imageUrl: '/trainers/trainer-1.jpg',
    rating: 4.9,
    experience: '8 años',
    certifications: ['CrossFit L2', 'NSCA-CPT', 'Nutrición Deportiva'],
  },
  {
    id: '2',
    name: 'María González',
    specialty: 'Yoga & Pilates',
    description: 'Instructora certificada en múltiples disciplinas de yoga y pilates reformer.',
    imageUrl: '/trainers/trainer-2.jpg',
    rating: 4.8,
    experience: '6 años',
    certifications: ['RYT-500', 'Pilates Reformer', 'Meditación'],
  },
  {
    id: '3',
    name: 'Roberto Silva',
    specialty: 'Musculación',
    description: 'Ex competidor de fisiculturismo, especialista en hipertrofia y definición.',
    imageUrl: '/trainers/trainer-3.jpg',
    rating: 4.9,
    experience: '10 años',
    certifications: ['IFBB Pro', 'NSCA-CSCS', 'Sports Nutrition'],
  },
  {
    id: '4',
    name: 'Ana Martínez',
    specialty: 'Cardio & HIIT',
    description: 'Experta en entrenamiento cardiovascular y clases de alta intensidad.',
    imageUrl: '/trainers/trainer-4.jpg',
    rating: 4.7,
    experience: '5 años',
    certifications: ['ACE-CPT', 'Spinning Instructor', 'TRX'],
  },
];

const mockSchedule: Schedule[] = [
  { id: '1', className: 'CrossFit', trainer: 'Carlos Mendoza', day: 'Lunes', startTime: '06:00', endTime: '07:00', capacity: 20, enrolled: 15, level: 'Todos los niveles' },
  { id: '2', className: 'Yoga Flow', trainer: 'María González', day: 'Lunes', startTime: '08:00', endTime: '09:00', capacity: 15, enrolled: 12, level: 'Principiante' },
  { id: '3', className: 'HIIT Cardio', trainer: 'Ana Martínez', day: 'Lunes', startTime: '18:00', endTime: '19:00', capacity: 25, enrolled: 22, level: 'Intermedio' },
  { id: '4', className: 'Musculación Guiada', trainer: 'Roberto Silva', day: 'Martes', startTime: '07:00', endTime: '08:00', capacity: 12, enrolled: 10, level: 'Avanzado' },
  { id: '5', className: 'Spinning', trainer: 'Ana Martínez', day: 'Martes', startTime: '19:00', endTime: '20:00', capacity: 20, enrolled: 18, level: 'Todos los niveles' },
  { id: '6', className: 'Pilates', trainer: 'María González', day: 'Miércoles', startTime: '09:00', endTime: '10:00', capacity: 15, enrolled: 14, level: 'Principiante' },
  { id: '7', className: 'Functional Training', trainer: 'Carlos Mendoza', day: 'Miércoles', startTime: '17:00', endTime: '18:00', capacity: 20, enrolled: 16, level: 'Intermedio' },
  { id: '8', className: 'Body Pump', trainer: 'Roberto Silva', day: 'Jueves', startTime: '18:00', endTime: '19:00', capacity: 25, enrolled: 20, level: 'Todos los niveles' },
  { id: '9', className: 'Yoga Restaurativo', trainer: 'María González', day: 'Viernes', startTime: '08:00', endTime: '09:00', capacity: 15, enrolled: 8, level: 'Principiante' },
  { id: '10', className: 'CrossFit Open', trainer: 'Carlos Mendoza', day: 'Sábado', startTime: '10:00', endTime: '11:30', capacity: 20, enrolled: 19, level: 'Avanzado' },
];

const mockUserSubscription: UserSubscription = {
  id: 'sub_001',
  planId: '2',
  planName: 'Premium',
  status: 'active',
  startDate: '2026-01-15',
  endDate: '2026-04-15',
  daysRemaining: 22,
  nextPaymentDate: '2026-04-15',
  price: 499,
};

const mockHeroSlides: HeroSlide[] = [
  {
    id: '1',
    title: 'TITANIUM SPORT GYM',
    subtitle: 'BIENVENIDO A:',
    description: 'Descubre un espacio diseñado para potenciar tu rendimiento. Con equipamiento de última generación, entrenadores certificados y una comunidad que te impulsa a superar tus límites cada día.',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80',
    ctaPrimary: { text: 'SUSCRÍBETE', href: '/suscripciones' },
    ctaSecondary: { text: 'CONOCE MÁS', href: '/nosotros' },
  },
  {
    id: '2',
    title: 'ENTRENA CON LOS MEJORES',
    subtitle: 'COACHES CERTIFICADOS',
    description: 'Nuestros entrenadores están certificados internacionalmente y listos para guiarte hacia tus metas fitness.',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1920&q=80',
    ctaPrimary: { text: 'VER ENTRENADORES', href: '/entrenadores' },
    ctaSecondary: { text: 'AGENDAR CLASE', href: '/horarios' },
  },
];

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Proteina Whey Gold Standard',
    description: 'Proteina de suero de alta calidad',
    fullDescription: 'Optimum Nutrition Gold Standard 100% Whey es la proteina de suero mas vendida del mundo. Cada porcion proporciona 24g de proteina de alta calidad procedente de aislado de proteina de suero principalmente, con bajo contenido en grasa, colesterol, lactosa y otros ingredientes.',
    price: 899.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80',
      'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800&q=80',
    ],
    category: 'proteina',
    categoryLabel: 'PROTEINA',
    rating: 5,
    reviewCount: 128,
    inStock: true,
    isFeatured: true,
    specifications: [
      { label: 'Porciones', value: '74' },
      { label: 'Proteina por porcion', value: '24g' },
      { label: 'Calorias', value: '120' },
      { label: 'Sabor', value: 'Chocolate' },
    ],
    ingredients: 'Aislado de proteina de suero, Concentrado de proteina de suero, Peptidos de suero, Lecitina, Saborizantes naturales y artificiales.',
    usage: 'Mezclar 1 scoop (30.4g) con 180-240ml de agua fria. Consumir 1-2 porciones diarias.',
    weight: '2.27 kg',
    sku: 'ON-WGS-001',
  },
  {
    id: '2',
    name: 'Creatina Monohidratada',
    description: 'Creatina pura para fuerza y rendimiento',
    fullDescription: 'Creatina monohidratada de la mas alta pureza. Aumenta la fuerza, potencia y rendimiento en entrenamientos de alta intensidad. Forma micronizada para mejor absorcion.',
    price: 599.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&q=80',
    category: 'creatina',
    categoryLabel: 'CREATINA',
    rating: 5,
    reviewCount: 89,
    inStock: true,
    specifications: [
      { label: 'Porciones', value: '100' },
      { label: 'Creatina por porcion', value: '5g' },
      { label: 'Tipo', value: 'Monohidratada' },
    ],
    weight: '500g',
    sku: 'CR-MH-001',
  },
  {
    id: '3',
    name: 'Pre-Entreno Explosive',
    description: 'Energia extrema para tu entrenamiento',
    fullDescription: 'Formula pre-entreno de alta potencia con cafeina, beta-alanina y citrulina para maximizar tu energia, enfoque y rendimiento durante el entrenamiento.',
    price: 699.00,
    originalPrice: 799.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=500&q=80',
    category: 'pre-entreno',
    categoryLabel: 'PRE-ENTRENO',
    rating: 5,
    reviewCount: 67,
    inStock: true,
    isOnSale: true,
    specifications: [
      { label: 'Porciones', value: '30' },
      { label: 'Cafeina', value: '300mg' },
      { label: 'Beta-Alanina', value: '3.2g' },
    ],
    weight: '300g',
    sku: 'PE-EXP-001',
  },
  {
    id: '4',
    name: 'BCAA Amino Acidos',
    description: 'Aminoacidos ramificados para recuperacion',
    fullDescription: 'BCAA en proporcion 2:1:1 para optimizar la recuperacion muscular, reducir el catabolismo y mejorar la sintesis proteica durante y despues del entrenamiento.',
    price: 499.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&q=80',
    category: 'intra-entreno',
    categoryLabel: 'INTRA-ENTRENO',
    rating: 4,
    reviewCount: 45,
    inStock: true,
    specifications: [
      { label: 'Porciones', value: '50' },
      { label: 'BCAA por porcion', value: '7g' },
      { label: 'Proporcion', value: '2:1:1' },
    ],
    weight: '400g',
    sku: 'BCAA-001',
  },
  {
    id: '5',
    name: 'Mass Gainer Pro',
    description: 'Ganador de masa para volumen muscular',
    fullDescription: 'Formula de alta densidad calorica con proteinas de alta calidad, carbohidratos complejos y grasas saludables para promover el aumento de masa muscular magra.',
    price: 799.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&q=80',
    category: 'ganancia-muscular',
    categoryLabel: 'GANANCIA MUSCULAR',
    rating: 5,
    reviewCount: 56,
    inStock: true,
    isFeatured: true,
    specifications: [
      { label: 'Porciones', value: '16' },
      { label: 'Calorias por porcion', value: '1250' },
      { label: 'Proteina', value: '50g' },
      { label: 'Carbohidratos', value: '252g' },
    ],
    weight: '5.4 kg',
    sku: 'MG-PRO-001',
  },
  {
    id: '6',
    name: 'Quemador de Grasa Thermo',
    description: 'Termogenico para control de peso',
    fullDescription: 'Formula termogenica avanzada que acelera el metabolismo, aumenta la oxidacion de grasas y proporciona energia sostenida para apoyar tus objetivos de perdida de peso.',
    price: 649.00,
    originalPrice: 749.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&q=80',
    category: 'control-peso',
    categoryLabel: 'CONTROL DE PESO',
    rating: 4,
    reviewCount: 78,
    inStock: true,
    isOnSale: true,
    specifications: [
      { label: 'Capsulas', value: '120' },
      { label: 'Cafeina', value: '200mg' },
      { label: 'L-Carnitina', value: '500mg' },
    ],
    sku: 'TH-FAT-001',
  },
  {
    id: '7',
    name: 'Tank Top Titanium',
    description: 'Playera deportiva premium',
    fullDescription: 'Tank top de alto rendimiento con tecnologia de secado rapido y ajuste atletico. Perfecta para entrenamientos intensos. Material ligero y transpirable.',
    price: 349.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80',
    category: 'ropa',
    categoryLabel: 'ROPA',
    rating: 5,
    reviewCount: 34,
    inStock: true,
    specifications: [
      { label: 'Material', value: '92% Poliester, 8% Elastano' },
      { label: 'Tallas', value: 'S, M, L, XL' },
      { label: 'Colores', value: 'Negro, Rojo, Gris' },
    ],
    sku: 'TT-TANK-001',
  },
  {
    id: '8',
    name: 'Shorts Deportivos',
    description: 'Shorts de entrenamiento comodos',
    fullDescription: 'Shorts de entrenamiento con cintura elastica ajustable, bolsillos laterales y forro interior. Ideales para cualquier tipo de actividad fisica.',
    price: 299.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500&q=80',
    category: 'ropa',
    categoryLabel: 'ROPA',
    rating: 4,
    reviewCount: 52,
    inStock: true,
    specifications: [
      { label: 'Material', value: '100% Poliester' },
      { label: 'Tallas', value: 'S, M, L, XL, XXL' },
      { label: 'Largo', value: '7 pulgadas' },
    ],
    sku: 'TT-SHORT-001',
  },
  {
    id: '9',
    name: 'Guantes de Entrenamiento',
    description: 'Proteccion y agarre para tus manos',
    fullDescription: 'Guantes de entrenamiento con palmas acolchadas, soporte de muneca ajustable y material transpirable. Perfectos para levantamiento de pesas y ejercicios con barras.',
    price: 249.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500&q=80',
    category: 'accesorios',
    categoryLabel: 'ACCESORIOS',
    rating: 5,
    reviewCount: 112,
    inStock: true,
    specifications: [
      { label: 'Material', value: 'Cuero sintetico y neopreno' },
      { label: 'Tallas', value: 'S, M, L, XL' },
      { label: 'Caracteristicas', value: 'Soporte de muneca, palmas acolchadas' },
    ],
    sku: 'TT-GLOVE-001',
  },
  {
    id: '10',
    name: 'Multivitaminico Sport',
    description: 'Vitaminas y minerales para atletas',
    fullDescription: 'Formula completa de vitaminas y minerales disenada especificamente para atletas y personas activas. Apoya la energia, inmunidad y recuperacion.',
    price: 399.00,
    currency: 'MXN',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=500&q=80',
    category: 'salud-bienestar',
    categoryLabel: 'SALUD + BIENESTAR',
    rating: 5,
    reviewCount: 67,
    inStock: true,
    specifications: [
      { label: 'Tabletas', value: '120' },
      { label: 'Porciones', value: '60' },
      { label: 'Vitaminas', value: '23' },
      { label: 'Minerales', value: '12' },
    ],
    sku: 'MV-SPORT-001',
  },
];
