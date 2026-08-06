import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { NotificationsProvider } from "./hooks/useNotifications";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { HowItWorks } from "./components/HowItWorks";
import { Pricing } from "./components/Pricing";
import { CtaBanner } from "./components/CtaBanner";
import { Footer } from "./components/Footer";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { WorkOrdersPage } from "./pages/WorkOrdersPage";
import { SchedulingPage } from "./pages/SchedulingPage";
import { TechnicianMobilePage } from "./pages/TechnicianMobilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/PlaceholderPage";

function MarketingSite() {
  const { session, loading } = useAuth();

  // Redirect logged-in users to dashboard
  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketingSite />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute roles={["owner", "manager"]}>
                <AppLayout>
                  <CustomersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-orders"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <WorkOrdersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scheduling"
            element={
              <ProtectedRoute roles={["owner", "manager", "dispatcher"]}>
                <AppLayout>
                  <SchedulingPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-jobs"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TechnicianMobilePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NotificationsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={["owner", "manager"]}>
                <AppLayout>
                  <ReportsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={["owner"]}>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </NotificationsProvider>
    </AuthProvider>
  );
}
