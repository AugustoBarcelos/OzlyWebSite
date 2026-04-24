import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";

const Support = lazy(() => import("./pages/Support"));
const Guide = lazy(() => import("./pages/Guide"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0c141b] font-[Inter,system-ui,sans-serif] antialiased dark:text-slate-100">
      <Navbar />
      <main>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/support" element={<Support />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
            {/* Landing pública do programa de afiliados — entrada do QR code.
                `/v/` = vendedor. `/refer` (estático, em public/) fica
                para o marketing antigo genérico e é intocado. */}
            <Route path="/v/:code" element={<ReferralLanding />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
