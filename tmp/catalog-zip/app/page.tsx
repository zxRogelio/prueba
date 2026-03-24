import { Header } from '@/components/titanium/header';
import { HeroCarousel } from '@/components/titanium/hero-carousel';
import { StatsSection } from '@/components/titanium/stats-section';
import { ServicesSection } from '@/components/titanium/services-section';
import { ProductsSection } from '@/components/titanium/products-section';
import { UserSubscriptionCard } from '@/components/titanium/user-subscription-card';
import { SubscriptionPlans } from '@/components/titanium/subscription-plans';
import { TrainersSection } from '@/components/titanium/trainers-section';
import { ScheduleSection } from '@/components/titanium/schedule-section';
import { CTASection } from '@/components/titanium/cta-section';
import { Footer } from '@/components/titanium/footer';
import {
  getServices,
  getSubscriptionPlans,
  getTrainers,
  getSchedule,
  getUserSubscription,
  getHeroSlides,
  getProducts,
} from '@/lib/api';

// Server Component - Fetches data on the server
export default async function HomePage() {
  // Fetch all data in parallel for better performance
  // These functions are ready to be connected to your backend
  const [
    services,
    plans,
    trainers,
    schedule,
    userSubscription,
    heroSlides,
    products,
  ] = await Promise.all([
    getServices(),
    getSubscriptionPlans(),
    getTrainers(),
    getSchedule(),
    // TODO: Replace with actual user ID from auth
    getUserSubscription('user_123'),
    getHeroSlides(),
    getProducts(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <Header />

      {/* Spacer for fixed header */}
      <div className="h-28" />

      {/* Hero Carousel Section */}
      <HeroCarousel slides={heroSlides} />

      {/* Stats Section */}
      <StatsSection />

      {/* Services Section - Why Titanium */}
      <ServicesSection services={services} />

      {/* Products Section */}
      <ProductsSection products={products} />

      {/* User Subscription Summary (only shown if logged in) */}
      <UserSubscriptionCard subscription={userSubscription} />

      {/* Subscription Plans */}
      <SubscriptionPlans plans={plans} />

      {/* Trainers Section */}
      <TrainersSection trainers={trainers} />

      {/* Class Schedule */}
      <ScheduleSection schedule={schedule} />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
