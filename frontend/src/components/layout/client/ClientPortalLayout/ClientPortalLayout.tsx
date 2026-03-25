import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ClientSidebar from "../ClientSidebar/ClientSidebar";
import ClientTopbar from "../ClientTopbar/ClientTopbar";
import { getClientPortalMeta } from "../clientPortalNavigation";
import styles from "./ClientPortalLayout.module.css";

export default function ClientPortalLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const meta = getClientPortalMeta(location.pathname);

  useEffect(() => {
    const savedValue = localStorage.getItem("clientSidebarCollapsed");
    if (savedValue !== null) {
      setCollapsed(JSON.parse(savedValue));
    }
  }, []);

  const toggleSidebar = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    localStorage.setItem("clientSidebarCollapsed", JSON.stringify(nextValue));
  };

  return (
    <div
      className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
    >
      <aside className={styles.sidebar}>
        <ClientSidebar collapsed={collapsed} />
      </aside>

      <main className={styles.main}>
        <ClientTopbar
          title={meta.title}
          description={meta.description}
          onToggleSidebar={toggleSidebar}
        />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
