'use client';

import { useState, useEffect } from 'react';
import { Calendar, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { UserSubscription } from '@/lib/types';
import { cn } from '@/lib/utils';

// Helper function to format date consistently
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

interface UserSubscriptionCardProps {
  subscription: UserSubscription | null;
}

export function UserSubscriptionCard({ subscription }: UserSubscriptionCardProps) {
  if (!subscription) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-dashed border-2">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sin Suscripción Activa</h3>
              <p className="text-muted-foreground mb-6">
                Únete a Titanium Sport Gym y comienza tu transformación hoy
              </p>
              <Button className="bg-[#E53935] hover:bg-[#C62828] text-white rounded-full px-8">
                Ver Planes
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const statusConfig = {
    active: { label: 'Activa', color: 'bg-green-500', icon: CheckCircle },
    expired: { label: 'Expirada', color: 'bg-red-500', icon: AlertCircle },
    pending: { label: 'Pendiente', color: 'bg-yellow-500', icon: Clock },
  };

  const status = statusConfig[subscription.status];
  const StatusIcon = status.icon;

  // Calculate progress based on subscription period (assuming 30 days)
  const totalDays = 30;
  const daysUsed = totalDays - subscription.daysRemaining;
  const progress = (daysUsed / totalDays) * 100;

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            TU <span className="text-[#E53935]">SUSCRIPCIÓN</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Resumen de tu membresía actual
          </p>
        </div>

        <Card className="max-w-3xl mx-auto overflow-hidden shadow-lg">
          <div className="bg-gradient-to-r from-[#E53935] to-[#C62828] p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm opacity-80">Plan Actual</p>
                <h3 className="text-2xl font-bold">{subscription.planName}</h3>
              </div>
              <Badge
                className={cn(
                  'px-4 py-1 text-white border-0',
                  status.color
                )}
              >
                <StatusIcon className="h-4 w-4 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inicio</p>
                  <p className="font-semibold">
                    {formatDate(subscription.startDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Días Restantes</p>
                  <p className="font-semibold">{subscription.daysRemaining} días</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#E53935]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximo Pago</p>
                  <p className="font-semibold">${subscription.price} MXN</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progreso del período</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#E53935] text-[#E53935] hover:bg-[#E53935] hover:text-white rounded-full"
              >
                Cambiar Plan
              </Button>
              <Button className="flex-1 bg-[#E53935] hover:bg-[#C62828] text-white rounded-full">
                Renovar Ahora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
