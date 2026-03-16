import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout/PublicLayout";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CatalogePage from "./pages/CatalogePage";
import SuscripcionesPage from "./pages/SuscripcionesPage";
import AboutPage from "./pages/AboutPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import AboutePage from "./pages/visitor/AboutePage";
import NotFoundPage from "./pages/NotFoundPage";
import Error500Page from "./pages/Page500";
import Error400Page from "./pages/400";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyAccountPage from "./pages/VerifyAccountPage";
import ConfirmAccessPage from "./pages/ConfirmAccessPage";
import LoginTOTP from "./pages/LoginTOTP";
import VerificarOTP from "./pages/VerificarOTP";
import EsperandoConfirmacionPage from "./pages/EsperandoConfirmacionPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetCode from "./pages/VerifyResetCode";
import NewPassword from "./pages/NewPassword";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

// Admin
import AdminLayout from "./components/layout/admin/AdminLayout/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminSiteSettingsPage from "./pages/admin/AdminSiteSettingsPage";
import AdminSuscripcionesPage from "./pages/admin/AdminSuscripcionesPage";
import AdminBrandsPage from "./pages/admin/AdminBrandsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";

// Client Portal
import ClientPortalLayout from "./components/layout/client/ClientPortalLayout/ClientPortalLayout";
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientProfilePage from "./pages/client/ClientProfilePage";
import ClientSubscriptionPage from "./pages/client/ClientSubscriptionPage";
import ClientPaymentsPage from "./pages/client/ClientPaymentsPage";
import Configuracion2FA from "./pages/Configuracion2FA";

export default function App() {
  return (
    <Routes>
      {/* ✅ Público con header/footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogue" element={<CatalogePage />} />
        <Route path="/suscripciones" element={<SuscripcionesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/AboutPage" element={<AboutPage />} />
        <Route path="/AboutePage" element={<AboutePage />} />

        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/confirmation" element={<ConfirmationPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/500" element={<Error500Page />} />
        <Route path="/400" element={<Error400Page />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-account" element={<VerifyAccountPage />} />

        <Route path="/confirmar-acceso" element={<ConfirmAccessPage />} />
        <Route path="/login-totp" element={<LoginTOTP />} />
        <Route path="/verificar-otp" element={<VerificarOTP />} />
        <Route
          path="/esperando-confirmacion"
          element={<EsperandoConfirmacionPage />}
        />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset" element={<VerifyResetCode />} />
        <Route path="/new-password" element={<NewPassword />} />

        <Route path="/terms" element={<TermsAndConditionsPage />} />
        <Route path="/aviso-privacidad" element={<PrivacyPolicyPage />} />
      </Route>

      {/* ✅ Admin (sin navbar público) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="suscripciones" element={<AdminSuscripcionesPage />} />
        <Route path="settings" element={<AdminSiteSettingsPage />} />
        <Route path="brands" element={<AdminBrandsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
      </Route>

      {/* ✅ Cliente (sin navbar público) */}
      <Route path="/cliente" element={<ClientPortalLayout />}>
        <Route index element={<ClientDashboardPage />} />
        <Route path="perfil" element={<ClientProfilePage />} />
        <Route path="suscripcion" element={<ClientSubscriptionPage />} />
        <Route path="pagos" element={<ClientPaymentsPage />} />
        <Route path="configuracion" element={<Configuracion2FA />} />
      </Route>

      {/* ✅ Not found al final */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
