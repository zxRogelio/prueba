'use client';

import { Check, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionPlan } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SubscriptionPlansProps {
  plans: SubscriptionPlan[];
}

export function SubscriptionPlans({ plans }: SubscriptionPlansProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            NUESTROS <span className="text-[#E53935]">PLANES</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Elige el plan que mejor se adapte a tus objetivos y estilo de vida
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-300 hover:-translate-y-1 animate-fade-in-up',
                plan.isPopular
                  ? 'border-[#E53935] border-2 shadow-xl scale-105 z-10'
                  : 'border-border shadow-md hover:shadow-lg'
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-[#E53935] text-white px-3 py-1">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="font-heading text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    {plan.currency}/{plan.period}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-[#E53935] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    'w-full rounded-full',
                    plan.isPopular
                      ? 'bg-[#E53935] hover:bg-[#C62828] text-white'
                      : 'bg-foreground hover:bg-foreground/90 text-background'
                  )}
                >
                  Elegir Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
