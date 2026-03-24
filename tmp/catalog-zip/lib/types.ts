// Types for Titanium Sport Gym - Ready for backend integration

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  features?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  color?: string;
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  description: string;
  imageUrl: string;
  rating: number;
  experience: string;
  certifications?: string[];
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface Schedule {
  id: string;
  className: string;
  trainer: string;
  day: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolled: number;
  level: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Todos los niveles';
}

export interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  endDate: string;
  daysRemaining: number;
  nextPaymentDate?: string;
  price: number;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaPrimary?: {
    text: string;
    href: string;
  };
  ctaSecondary?: {
    text: string;
    href: string;
  };
}

export type ProductCategory = 
  | 'todos'
  | 'pre-entreno'
  | 'intra-entreno'
  | 'ganancia-muscular'
  | 'proteina'
  | 'creatina'
  | 'control-peso'
  | 'salud-bienestar'
  | 'ropa'
  | 'accesorios'
  | 'equipamiento';

export interface Product {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  imageUrl: string;
  images?: string[];
  category: ProductCategory;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  specifications?: { label: string; value: string }[];
  ingredients?: string;
  usage?: string;
  weight?: string;
  sku?: string;
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  category: 'yoga' | 'fitness' | 'gym' | 'running' | 'all';
  title?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
