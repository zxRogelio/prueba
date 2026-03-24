'use client';

import { Users, Dumbbell, Calendar, Award } from 'lucide-react';

const stats = [
  {
    icon: Users,
    value: '5,000+',
    label: 'Miembros Activos',
    description: 'Comunidad creciendo cada día',
  },
  {
    icon: Dumbbell,
    value: '200+',
    label: 'Equipos',
    description: 'Última generación',
  },
  {
    icon: Calendar,
    value: '50+',
    label: 'Clases Semanales',
    description: 'Para todos los niveles',
  },
  {
    icon: Award,
    value: '15+',
    label: 'Entrenadores',
    description: 'Certificados internacionalmente',
  },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-foreground text-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className="text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#E53935] flex items-center justify-center">
                <stat.icon className="h-7 w-7 text-white" />
              </div>
              <p className="font-heading text-3xl md:text-4xl font-bold text-white mb-1">
                {stat.value}
              </p>
              <p className="font-heading text-white font-medium mb-1">{stat.label}</p>
              <p className="text-white/60 text-sm">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
