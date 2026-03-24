'use client';

import { Dumbbell, Zap, Target, Heart, Bike, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Service } from '@/lib/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dumbbell: Dumbbell,
  zap: Zap,
  target: Target,
  heart: Heart,
  bike: Bike,
  sparkles: Sparkles,
};

interface ServicesSectionProps {
  services: Service[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            ¿POR QUE <span className="text-[#E53935]">TITANIUM</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Instalaciones de primer nivel diseñadas para llevar tu entrenamiento al siguiente nivel
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const IconComponent = iconMap[service.icon] || Dumbbell;
            return (
              <Card
                key={service.id}
                className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-card hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#E53935]/10 flex items-center justify-center group-hover:bg-[#E53935] transition-colors">
                      <IconComponent className="h-6 w-6 text-[#E53935] group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-lg mb-2 text-foreground">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {service.description}
                      </p>
                      {service.features && (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {service.features.slice(0, 3).map((feature) => (
                            <li
                              key={feature}
                              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                            >
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
