'use client';

import { Star, Instagram, Twitter, Linkedin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Trainer } from '@/lib/types';

interface TrainersSectionProps {
  trainers: Trainer[];
}

export function TrainersSection({ trainers }: TrainersSectionProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            NUESTROS <span className="text-[#E53935]">ENTRENADORES</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Profesionales certificados comprometidos con tu éxito
          </p>
        </div>

        {/* Trainers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trainers.map((trainer, index) => (
            <Card
              key={trainer.id}
              className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative aspect-[4/5] bg-gradient-to-b from-muted to-muted/50 overflow-hidden">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage
                    src={trainer.imageUrl}
                    alt={trainer.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-none text-4xl bg-gradient-to-br from-[#E53935] to-[#C62828] text-white">
                    {trainer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="text-white">
                    <p className="text-sm">{trainer.description}</p>
                    {trainer.socialLinks && (
                      <div className="flex gap-3 mt-3">
                        {trainer.socialLinks.instagram && (
                          <a
                            href={trainer.socialLinks.instagram}
                            className="hover:text-[#E53935] transition-colors"
                            aria-label={`${trainer.name} Instagram`}
                          >
                            <Instagram className="h-5 w-5" />
                          </a>
                        )}
                        {trainer.socialLinks.twitter && (
                          <a
                            href={trainer.socialLinks.twitter}
                            className="hover:text-[#E53935] transition-colors"
                            aria-label={`${trainer.name} Twitter`}
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        )}
                        {trainer.socialLinks.linkedin && (
                          <a
                            href={trainer.socialLinks.linkedin}
                            className="hover:text-[#E53935] transition-colors"
                            aria-label={`${trainer.name} LinkedIn`}
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-heading font-bold text-lg">{trainer.name}</h3>
                    <p className="text-sm text-[#E53935]">{trainer.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{trainer.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span>{trainer.experience} de experiencia</span>
                </div>
                {trainer.certifications && (
                  <div className="flex flex-wrap gap-1">
                    {trainer.certifications.slice(0, 2).map((cert) => (
                      <Badge
                        key={cert}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {cert}
                      </Badge>
                    ))}
                    {trainer.certifications.length > 2 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{trainer.certifications.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
