'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HeroSlide } from '@/lib/types';
import Link from 'next/link';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const slide = slides[currentSlide];

  return (
    <section className="relative h-[600px] md:h-[700px] overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${slide.imageUrl})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
        <div className="text-center text-white max-w-4xl">
          {slide.subtitle && (
            <p className="text-[#E53935] font-semibold tracking-widest mb-2 text-sm md:text-base">
              {slide.subtitle}
            </p>
          )}
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight text-balance animate-fade-in-up">
            {slide.title}
          </h1>
          <p className="font-heading text-[#E53935] text-xl md:text-3xl font-bold italic mb-6 animate-fade-in-up animation-delay-100">
            TU DESTINO DE TRANSFORMACION
          </p>
          <p className="text-gray-200 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            {slide.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {slide.ctaPrimary && (
              <Button
                asChild
                size="lg"
                className="bg-[#E53935] hover:bg-[#C62828] text-white rounded-full px-8 py-6 text-base font-semibold"
              >
                <Link href={slide.ctaPrimary.href}>{slide.ctaPrimary.text}</Link>
              </Button>
            )}
            {slide.ctaSecondary && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#E53935] text-[#E53935] bg-transparent hover:bg-[#E53935] hover:text-white rounded-full px-8 py-6 text-base font-semibold"
              >
                <Link href={slide.ctaSecondary.href}>{slide.ctaSecondary.text}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#E53935] text-white flex items-center justify-center hover:bg-[#C62828] transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#E53935] text-white flex items-center justify-center hover:bg-[#C62828] transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 bg-[#E53935]'
                : 'w-2 bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
