'use client';

import { ArrowRight, Phone, MapPin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#E53935] to-[#C62828] text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4 text-balance animate-fade-in-up">
              ¿LISTO PARA COMENZAR TU TRANSFORMACION?
            </h2>
            <p className="text-white/90 text-lg mb-8 leading-relaxed animate-fade-in-up animation-delay-100">
              Unete a la comunidad Titanium y empieza a ver resultados desde el primer dia. 
              Nuestros entrenadores te guiaran en cada paso del camino.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-200">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#E53935] hover:bg-gray-100 rounded-full px-8"
              >
                <Link href="/suscripciones">
                  Comenzar Ahora
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/20 bg-transparent rounded-full px-8"
              >
                <Link href="/contacto">Contáctanos</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Contact Info */}
          <div className="grid gap-6">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Llámanos</p>
                <p className="font-semibold text-lg">+52 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Escríbenos</p>
                <p className="font-semibold text-lg">contacto@titaniumgym.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Visítanos</p>
                <p className="font-semibold text-lg">Av. Principal #123, CDMX</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
