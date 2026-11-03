import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./AdminLayout.module.css";
import AdminSidebar from "../AdminSidebar/AdminSidebar";
import AdminTopbar from "../AdminTopbar/AdminTopbar";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const deliveryScreen = pathname === "/admin/pedidos";

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleSidebar = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(nextValue));
  };

  return (
    <div
      className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""} ${deliveryScreen ? styles.deliveryShell : ""}`}
    >
      <aside className={styles.sidebar}>
        <AdminSidebar collapsed={collapsed} />
        {deliveryScreen && !collapsed && <button type="button" className={styles.deliverySidebarDismiss} aria-label="Cerrar menú lateral" onClick={toggleSidebar}>×</button>}
      </aside>

      <main className={styles.main}>
        <AdminTopbar onToggleSidebar={toggleSidebar} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
