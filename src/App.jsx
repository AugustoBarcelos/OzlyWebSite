import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";

const Support = lazy(() => import("./pages/Support"));
const Guide = lazy(() => import("./pages/Guide"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const PrivacyPolicyBusiness = lazy(() => import("./pages/PrivacyPolicyBusiness"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const TermsBusiness = lazy(() => import("./pages/TermsBusiness"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const BusinessLanding = lazy(() => import("./pages/BusinessLanding"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const AffiliateAuth = lazy(() => import("./pages/AffiliateAuth"));
const AffiliateApply = lazy(() => import("./pages/AffiliateApply"));
const InviteLanding = lazy(() => import("./pages/InviteLanding"));

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
            {/* Marketing/content routes exist in 3 languages. EN lives at the
                root; PT and ES under /pt/ and /es/ prefixes — each variant is
                prerendered with native meta + hreflang by scripts/postbuild.js,
                so crawlers index all three. Keep in sync with LOCALIZED_ROUTES
                in src/i18n/index.jsx. */}
            {["/", "/pt", "/es"].map((prefix) => (
              <Route key={prefix} path={prefix}>
                <Route index element={<Home />} />
                <Route path="support" element={<Support />} />
                <Route path="guide" element={<Guide />} />
                <Route path="guide/business" element={<Guide variant="business" />} />
                <Route path="business" element={<BusinessLanding />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogPost />} />
              </Route>
            ))}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy/business" element={<PrivacyPolicyBusiness />} />
            <Route path="/terms-of-use" element={<TermsOfUse />} />
            <Route path="/terms-of-use/business" element={<TermsBusiness />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            {/* Landing pública do programa de afiliados — entrada do QR code.
                `/v/` = vendedor. `/refer` (estático, em public/) fica
                para o marketing antigo genérico e é intocado. */}
            <Route path="/v/:code" element={<ReferralLanding />} />
            {/* Dashboard privado do afiliado — auth via magic link por email. */}
            <Route path="/me/auth" element={<AffiliateAuth />} />
            <Route path="/me/:code" element={<AffiliateDashboard />} />
            {/* Form público de aplicação pra virar afiliado. */}
            <Route path="/affiliates/apply" element={<AffiliateApply />} />
            {/* Fallback web dos convites de organização — o app intercepta
                via Universal/App Link; sem app instalado cai aqui. */}
            <Route path="/invite/:token" element={<InviteLanding />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
