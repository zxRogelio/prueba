// src/components/layout/PublicLayout/PublicLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer";

export default function PublicLayout() {
  return (
    <div className="page-container">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
