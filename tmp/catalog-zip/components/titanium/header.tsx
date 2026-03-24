'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Home, Dumbbell, CreditCard, Info, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'INICIO', href: '/', icon: Home, active: true },
  { label: 'PRODUCTOS', href: '/productos', icon: Dumbbell },
  { label: 'SUSCRIPCIONES', href: '/suscripciones', icon: CreditCard },
  { label: 'ACERCA DE NOSOTROS', href: '/nosotros', icon: Info },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out',
        scrolled
          ? 'bg-background/80 backdrop-blur-md shadow-lg py-2'
          : 'bg-background py-4'
      )}
    >
      <div className="container mx-auto px-4">
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-300',
            scrolled ? 'h-14' : 'h-20'
          )}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex items-center">
              <svg
                viewBox="0 0 40 40"
                className={cn(
                  'text-[#E53935] transition-all duration-300',
                  scrolled ? 'h-9 w-9' : 'h-12 w-12'
                )}
                fill="currentColor"
              >
                <circle cx="12" cy="20" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
                <circle cx="28" cy="20" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
              </svg>
              <div className="ml-2 flex flex-col">
                <span
                  className={cn(
                    'font-heading font-bold tracking-wider text-foreground transition-all duration-300',
                    scrolled ? 'text-xl' : 'text-2xl'
                  )}
                >
                  TITANIUM
                </span>
                <span
                  className={cn(
                    'tracking-widest text-[#E53935] transition-all duration-300',
                    scrolled ? 'text-[9px] -mt-1' : 'text-[11px] -mt-0.5'
                  )}
                >
                  Sport Gym
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 font-medium transition-all duration-200 relative group',
                  scrolled ? 'text-sm' : 'text-base',
                  item.active
                    ? 'text-[#E53935]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className={cn('transition-all', scrolled ? 'h-4 w-4' : 'h-5 w-5')} />
                {item.label}
                {/* Animated underline */}
                <span
                  className={cn(
                    'absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#E53935] transition-all duration-300',
                    item.active ? 'w-3/4' : 'w-0 group-hover:w-3/4'
                  )}
                />
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button
              variant="outline"
              className={cn(
                'border-[#E53935] text-[#E53935] hover:bg-[#E53935] hover:text-white rounded-full transition-all duration-300',
                scrolled ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'
              )}
            >
              <UserPlus className={cn('mr-2', scrolled ? 'h-4 w-4' : 'h-5 w-5')} />
              SUSCRIBETE
            </Button>
            <Button
              className={cn(
                'bg-[#E53935] hover:bg-[#C62828] text-white rounded-full transition-all duration-300',
                scrolled ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'
              )}
            >
              <LogIn className={cn('mr-2', scrolled ? 'h-4 w-4' : 'h-5 w-5')} />
              INICIA SESION
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'lg:hidden overflow-hidden transition-all duration-300 ease-in-out',
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="flex flex-col gap-2 py-4 border-t border-border">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 animate-slide-in-left',
                  item.active
                    ? 'text-[#E53935] bg-[#E53935]/10'
                    : 'text-muted-foreground hover:bg-muted'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-4 px-4">
              <Button
                variant="outline"
                className="border-[#E53935] text-[#E53935] w-full rounded-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                SUSCRIBETE
              </Button>
              <Button className="bg-[#E53935] text-white w-full rounded-full">
                <LogIn className="h-4 w-4 mr-2" />
                INICIA SESION
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
