import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { useAuth } from "../../features/auth/AuthProvider";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "../../features/auth/pages/ForgotPasswordPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";
import { ResetPasswordPage } from "../../features/auth/pages/ResetPasswordPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { PurchasedItemsPage } from "../../features/dashboard/pages/PurchasedItemsPage";
import { GearListsPage } from "../../features/gear-lists/pages/GearListsPage";
import { GearListDetailPage } from "../../features/gear-lists/pages/GearListDetailPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import { LoadingState } from "../../shared/components/QueryState";
import { NotFoundPage } from "./NotFoundPage";

function ProtectedRoutes() {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <main id="main-content" tabIndex={-1}>
        <LoadingState label="Recuperando sesión..." />
      </main>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <AppLayout />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<DashboardPage />} />
        <Route path="/lists" element={<GearListsPage />} />
        <Route path="/lists/:listId" element={<GearListDetailPage />} />
        <Route path="/purchased" element={<PurchasedItemsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
