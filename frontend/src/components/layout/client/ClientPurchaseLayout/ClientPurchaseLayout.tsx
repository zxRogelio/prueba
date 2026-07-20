import { Outlet } from "react-router-dom";
import Header from "../../Header/Header";
import Footer from "../../Footer";

export default function ClientPurchaseLayout() {
  return (
    <div className="page-container">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
