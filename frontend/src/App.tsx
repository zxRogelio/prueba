import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout/PublicLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import PagoResultadoPage from "./pages/PagoResultadoPage";
import HomePage from "./pages/visitor/HomePage";
import CatalogePage from "./pages/visitor/CatalogePage";
import CatalogProductPage from "./pages/visitor/CatalogProductPage";
import SuscripcionesPage from "./pages/visitor/SuscripcionesPage";
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
import FirstLoginPasswordPage from "./pages/FirstLoginPasswordPage";

// Admin
import AdminLayout from "./components/layout/admin/AdminLayout/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminSiteSettingsPage from "./pages/admin/AdminSiteSettingsPage";
import AdminBackupsPage from "./pages/admin/AdminBackupsPage";
import AdminSuscripcionesPage from "./pages/admin/AdminSuscripcionesPage";
import AdminBrandsPage from "./pages/admin/AdminBrandsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminSummaryPage from "./pages/admin/AdminSummaryPage";
import AdminAboutPage from "./pages/admin/AdminAboutPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminRoutinesPage from "./pages/admin/AdminRoutinesPage";
import AdminChargebacksPage from "./pages/admin/AdminChargebacksPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminSalesPredictionPage from "./pages/admin/AdminSalesPredictionPage";
import AdminClientRenewalPredictionPage from "./pages/admin/AdminClientRenewalPredictionPage";
// Client Portal
import ClientInvitationsPage from "./pages/client/ClientInvitationsPage";
import ClientPortalLayout from "./components/layout/client/ClientPortalLayout/ClientPortalLayout";
import ClientPurchaseLayout from "./components/layout/client/ClientPurchaseLayout/ClientPurchaseLayout";
import ClientDashboardPage from "./pages/client/ClientDashboardPage";
import ClientProfilePage from "./pages/client/ClientProfilePage";
import ClientSubscriptionPage from "./pages/client/ClientSubscriptionPage";
import ClientPaymentsPage from "./pages/client/ClientPaymentsPage";
import Configuracion2FA from "./pages/Configuracion2FA";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import TrainerLayout from "./components/layout/trainer/TrainerLayout/TrainerLayout";
import TrainerDashboardPage from "./pages/trainer/TrainerDashboardPage";
import TrainerClientsPage from "./pages/trainer/TrainerClientsPage";
import TrainerRoutinesPage from "./pages/trainer/TrainerRoutinesPage";
import TrainerAgendaPage from "./pages/trainer/TrainerAgendaPage";
import TrainerProfilePage from "./pages/trainer/TrainerProfilePage";
import ClientRoutinesPage from "./pages/client/ClientRoutinesPage";
import ClientRoutineDetailPage from "./pages/client/ClientRoutineDetailPage";

export default function App() {
  return (
    <Routes>
      {/* ✅ Público con header/footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogue" element={<CatalogePage />} />
        <Route path="/catalogue/:productId" element={<CatalogProductPage />} />
        <Route path="/suscripciones" element={<SuscripcionesPage />} />
        <Route path="/about" element={<AboutePage />} />
        <Route path="/AboutPage" element={<AboutePage />} />
        <Route path="/AboutePage" element={<AboutePage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/500" element={<Error500Page />} />
        <Route path="/400" element={<Error400Page />} />
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-account" element={<VerifyAccountPage />} />

        <Route path="/confirmar-acceso" element={<ConfirmAccessPage />} />
        <Route path="/confirm-access" element={<ConfirmAccessPage />} />
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

      {/* ✅ Admin protegido por rol */}
      <Route element={<ProtectedRoute allowedRoles={["administrador"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminSummaryPage />} />
          <Route path="monitoring" element={<AdminDashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="sales-prediction" element={<AdminSalesPredictionPage />} />
          <Route
            path="client-renewal-prediction"
            element={<AdminClientRenewalPredictionPage />}
          />
          <Route path="suscripciones" element={<AdminSuscripcionesPage />} />
          <Route path="pagos" element={<AdminPaymentsPage />} />
          <Route path="chargebacks" element={<AdminChargebacksPage />} />
          <Route path="settings" element={<AdminSiteSettingsPage />} />
          <Route path="backups" element={<AdminBackupsPage />} />
          <Route path="brands" element={<AdminBrandsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="about" element={<AdminAboutPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="/admin/routines" element={<AdminRoutinesPage />} />
        </Route>
      </Route>

      {/* ✅ Cliente protegido por rol */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["administrador", "entrenador", "cliente"]}
          />
        }
      >
        <Route path="/primer-acceso" element={<FirstLoginPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["entrenador"]} />}>
        <Route path="/entrenador" element={<TrainerLayout />}>
          <Route index element={<TrainerDashboardPage />} />
          <Route path="clientes" element={<TrainerClientsPage />} />
          <Route path="rutinas" element={<TrainerRoutinesPage />} />
          <Route path="agenda" element={<TrainerAgendaPage />} />
          <Route path="perfil" element={<TrainerProfilePage />} />
          
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
        <Route element={<ClientPurchaseLayout />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/pago/resultado" element={<PagoResultadoPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
        </Route>

        <Route path="/cliente" element={<ClientPortalLayout />}>
          <Route index element={<ClientDashboardPage />} />
          <Route path="perfil" element={<ClientProfilePage />} />
          <Route path="suscripcion" element={<ClientSubscriptionPage />} />
          <Route path="pagos" element={<ClientPaymentsPage />} />
          <Route path="configuracion" element={<Configuracion2FA />} />
          <Route path="/cliente/invitaciones" element={<ClientInvitationsPage />} />
          <Route path="/cliente/rutinas" element={<ClientRoutinesPage />} />
          <Route path="/cliente/rutinas/:id" element={<ClientRoutineDetailPage />} />
        </Route>
      </Route>

      {/* ✅ Not found al final */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
