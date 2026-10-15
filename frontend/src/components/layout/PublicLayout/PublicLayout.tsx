// src/components/layout/PublicLayout/PublicLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer";
import { PwaStatus } from "../../pwa/PwaStatus";

export default function PublicLayout() {
  return (
    <div className="page-container">
      <Header />
      <Outlet />
      <Footer />
      <PwaStatus />
    </div>
  );
}
