'use client';

import { useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Schedule } from '@/lib/types';
import { cn } from '@/lib/utils';

const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const fullDays: Record<string, string> = {
  'Lun': 'Lunes',
  'Mar': 'Martes',
  'Mie': 'Miércoles',
  'Jue': 'Jueves',
  'Vie': 'Viernes',
  'Sab': 'Sábado',
  'Dom': 'Domingo',
};

const timeSlots = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '16:00', '17:00', '18:00', '19:00', '20:00'
];

interface ScheduleSectionProps {
  schedule: Schedule[];
}

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  const [selectedDay, setSelectedDay] = useState('Lun');

  const getClassForTimeSlot = (time: string) => {
    const dayFull = fullDays[selectedDay];
    return schedule.find(
      (item) => item.day === dayFull && item.startTime === time
    );
  };

  const filteredClasses = schedule.filter(
    (item) => item.day === fullDays[selectedDay]
  );

  const levelColors: Record<string, { bg: string; text: string; border: string }> = {
    'Principiante': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500' },
    'Intermedio': { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500' },
    'Avanzado': { bg: 'bg-[#E53935]/10', text: 'text-[#E53935]', border: 'border-[#E53935]' },
    'Todos los niveles': { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500' },
  };

  return (
    <section className="py-20 bg-[#1a1a1a] text-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-4">
            HORARIOS DE <span className="text-[#E53935]">CLASES</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Planifica tu semana con nuestras clases grupales dirigidas por entrenadores certificados
          </p>
        </div>

        {/* Day Selector - Tabs Style */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-[#2a2a2a] rounded-full p-1.5">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'px-5 md:px-8 py-3 rounded-full font-heading font-medium text-sm md:text-base transition-all duration-300',
                  selectedDay === day
                    ? 'bg-[#E53935] text-white shadow-lg shadow-[#E53935]/30'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Table */}
        <div className="max-w-5xl mx-auto">
          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-[#333]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#E53935]">
                  <th className="px-6 py-4 text-left font-heading font-semibold">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Hora
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left font-heading font-semibold">Clase</th>
                  <th className="px-6 py-4 text-left font-heading font-semibold">Entrenador</th>
                  <th className="px-6 py-4 text-left font-heading font-semibold">Nivel</th>
                  <th className="px-6 py-4 text-center font-heading font-semibold">Lugares</th>
                  <th className="px-6 py-4 text-center font-heading font-semibold">Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.length > 0 ? (
                  filteredClasses.map((classItem, index) => {
                    const spotsLeft = classItem.capacity - classItem.enrolled;
                    const isFull = spotsLeft <= 0;
                    const colors = levelColors[classItem.level];

                    return (
                      <tr
                        key={classItem.id}
                        className={cn(
                          'border-b border-[#333] transition-colors hover:bg-[#2a2a2a] animate-fade-in',
                          index % 2 === 0 ? 'bg-[#222]' : 'bg-[#1a1a1a]'
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-5">
                          <span className="font-mono text-[#E53935] font-semibold">
                            {classItem.startTime} - {classItem.endTime}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-heading font-semibold text-lg">
                            {classItem.className}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-400">
                          {classItem.trainer}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium border',
                              colors.bg,
                              colors.text,
                              colors.border
                            )}
                          >
                            {classItem.level}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                'font-bold text-lg',
                                isFull ? 'text-red-500' : spotsLeft <= 3 ? 'text-amber-500' : 'text-emerald-500'
                              )}
                            >
                              {spotsLeft}
                            </span>
                            <span className="text-xs text-gray-500">disponibles</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <Button
                            size="sm"
                            disabled={isFull}
                            className={cn(
                              'rounded-full px-6 transition-all',
                              isFull
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-[#E53935] hover:bg-[#C62828] text-white hover:shadow-lg hover:shadow-[#E53935]/30'
                            )}
                          >
                            {isFull ? 'Lleno' : 'Reservar'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="font-heading text-lg">No hay clases programadas para {fullDays[selectedDay]}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-4">
            {filteredClasses.length > 0 ? (
              filteredClasses.map((classItem, index) => {
                const spotsLeft = classItem.capacity - classItem.enrolled;
                const isFull = spotsLeft <= 0;
                const colors = levelColors[classItem.level];

                return (
                  <div
                    key={classItem.id}
                    className={cn(
                      'bg-[#222] rounded-xl p-5 border border-[#333] animate-fade-in-up',
                      isFull && 'opacity-60'
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading font-bold text-lg">{classItem.className}</h3>
                        <p className="text-sm text-gray-400">{classItem.trainer}</p>
                      </div>
                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border',
                          colors.bg,
                          colors.text,
                          colors.border
                        )}
                      >
                        {classItem.level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[#E53935]">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-semibold">
                          {classItem.startTime} - {classItem.endTime}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isFull ? 'text-red-500' : spotsLeft <= 3 ? 'text-amber-500' : 'text-emerald-500'
                        )}
                      >
                        {isFull ? 'Lleno' : `${spotsLeft} lugares`}
                      </span>
                    </div>

                    <Button
                      className={cn(
                        'w-full rounded-full',
                        isFull
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-[#E53935] hover:bg-[#C62828] text-white'
                      )}
                      disabled={isFull}
                    >
                      {isFull ? 'Clase Llena' : 'Reservar Lugar'}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-500">No hay clases programadas para {fullDays[selectedDay]}</p>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-10">
          {Object.entries(levelColors).map(([level, colors]) => (
            <div key={level} className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', colors.border, 'border-2')} />
              <span className="text-sm text-gray-400">{level}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
