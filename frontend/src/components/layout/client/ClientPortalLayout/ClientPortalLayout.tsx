/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import Header from "../../Header/Header";         // ✅ usa Header
import MobileMenu from "../../MobileMenu";
import Footer from "../../Footer";
import styles from "./ClientPortalLayout.module.css";

const clientLinks = [
  { to: "/cliente", label: "Resumen" },
  { to: "/cliente/perfil", label: "Mi perfil" },
  { to: "/cliente/suscripcion", label: "Mi suscripción" },
  { to: "/cliente/pagos", label: "Pagos" },
  { to: "/cliente/configuracion", label: "Configuración (2FA)" }, 
];

export default function ClientPortalLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.page}>
      {/* ✅ Header inteligente (cambia según login/rol) */}
      <Header />

      {mobileMenuOpen && (
        <MobileMenu onClose={() => setMobileMenuOpen(false)} />
      )}

      <main className={styles.main}>
        <section className={styles.clientNav}>
          {clientLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/cliente"}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </section>

        <section className={styles.content}>
          <Outlet />
        </section>
      </main>

      <Footer />
    </div>
  );
}
