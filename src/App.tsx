import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useEffect, useState } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUpload from "./pages/AdminUpload";
import AdminFiles from "./pages/AdminFiles";
import AuthCallback from "./components/auth/AuthCallback";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

// Cookie consent wrapper component
const CookieConsentWrapper = ({ children }) => {
  const [showConsent, setShowConsent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if the cookie exists
    const hasAcceptedCookies = document.cookie.includes("cookieConsent=true");
    setShowConsent(!hasAcceptedCookies);
  }, []);

  const handleAccept = () => {
    // Cookie is set by the component itself
    setShowConsent(false);
  };

  const handleDecline = () => {
    // Redirect to Rick Roll on decline
    window.location.href = "https://www.youtube.com/watch?v=xvFZjo5PgG0";
  };

  return (
    <>
      {children}
      {showConsent && (
        <CookieConsent
          variant="default"
          onAcceptCallback={handleAccept}
          onDeclineCallback={handleDecline}
        />
      )}
    </>
  );
};

// Main app with cookie consent wrapper
const AppRoutes = () => {
  return (
    <CookieConsentWrapper>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} /> {/* Removed ProtectedRoute wrapper */}
        <Route path="/admin" element={
          <ProtectedRoute requiredAdmin={true}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/upload" element={
          <ProtectedRoute requiredAdmin={true}>
            <AdminUpload />
          </ProtectedRoute>
        } />
        <Route path="/admin/files" element={
          <ProtectedRoute requiredAdmin={true}>
            <AdminFiles />
          </ProtectedRoute>
        } />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </CookieConsentWrapper>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
