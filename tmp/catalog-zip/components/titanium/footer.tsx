'use client';

import Link from 'next/link';
import { Twitter, Instagram, Facebook } from 'lucide-react';

const footerLinks = {
  titanium: [
    { label: 'Quiénes somos', href: '/nosotros' },
    { label: 'Habla con nosotros', href: '/contacto' },
    { label: 'Aviso de Privacidad', href: '/privacidad' },
  ],
  planes: [
    { label: 'Membresías', href: '/membresias' },
    { label: 'Contratos', href: '/contratos' },
    { label: 'Titanium Coach', href: '/coach' },
    { label: 'Titanium Body', href: '/body' },
  ],
  company: [
    { label: 'Quiero ser entrenador', href: '/entrenadores/aplicar' },
    { label: 'Promociona tu marca', href: '/marcas' },
    { label: 'Indica un local', href: '/locales' },
    { label: 'Trabaja con nosotros', href: '/empleos' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/titaniumgym', label: 'Twitter' },
  { icon: Instagram, href: 'https://instagram.com/titaniumgym', label: 'Instagram' },
  { icon: Facebook, href: 'https://facebook.com/titaniumgym', label: 'Facebook' },
];

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo & Social */}
          <div>
            <Link href="/" className="flex items-center mb-6">
              <div className="flex items-center">
                <svg viewBox="0 0 40 40" className="h-10 w-10 text-[#E53935]" fill="currentColor">
                  <circle cx="12" cy="20" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
                  <circle cx="28" cy="20" r="8" strokeWidth="2" stroke="currentColor" fill="none" />
                </svg>
                <div className="ml-1 flex flex-col">
                  <span className="font-heading text-xl font-bold tracking-wider text-foreground">TITANIUM</span>
                  <span className="text-[10px] tracking-widest text-[#E53935] -mt-1">Sport Gym</span>
                </div>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 uppercase tracking-wider font-medium">
              Síguenos
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center hover:bg-[#E53935] hover:text-white transition-colors text-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Titanium Links */}
          <div>
            <h4 className="font-heading font-bold text-foreground mb-4 uppercase tracking-wider">
              TITANIUM
            </h4>
            <ul className="space-y-2">
              {footerLinks.titanium.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-[#E53935] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Planes Links */}
          <div>
            <h4 className="font-heading font-bold text-foreground mb-4 uppercase tracking-wider">
              PLANES
            </h4>
            <ul className="space-y-2">
              {footerLinks.planes.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-[#E53935] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading font-bold text-foreground mb-4 uppercase tracking-wider">
              NUESTRA COMPANIA
            </h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-[#E53935] transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              *Consulte las condiciones promocionales y reglamentos en la página:{' '}
              <Link href="/terminos" className="text-[#E53935] hover:underline">
                titaniumsportgym.com/terminos-condiciones
              </Link>
            </p>
            <p>© {new Date().getFullYear()} Titanium Sport Gym. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
