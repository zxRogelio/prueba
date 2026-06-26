import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import TrainerSidebar from "../TrainerSidebar/TrainerSidebar";
import TrainerTopbar from "../TrainerTopbar/TrainerTopbar";
import { getTrainerPortalMeta } from "../trainerPortalNavigation";
import styles from "./TrainerLayout.module.css";

const TRAINER_MOBILE_BREAKPOINT = 980;

export default function TrainerLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const meta = getTrainerPortalMeta(location.pathname);

  useEffect(() => {
    const savedValue = localStorage.getItem("trainerSidebarCollapsed");

    if (window.innerWidth <= TRAINER_MOBILE_BREAKPOINT) {
      setCollapsed(true);
      return;
    }

    if (savedValue !== null) {
      setCollapsed(JSON.parse(savedValue));
    }
  }, []);

  useEffect(() => {
    if (window.innerWidth <= TRAINER_MOBILE_BREAKPOINT) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    localStorage.setItem("trainerSidebarCollapsed", JSON.stringify(nextValue));
  };

  return (
    <div
      className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
    >
      <aside className={styles.sidebar}>
        <TrainerSidebar collapsed={collapsed} />
      </aside>

      <main className={styles.main}>
        <TrainerTopbar
          title={meta.title}
          breadcrumb={meta.breadcrumb}
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
