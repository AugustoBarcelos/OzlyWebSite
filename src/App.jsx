import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Support from "./pages/Support";
import Guide from "./pages/Guide";

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-[Inter,system-ui,sans-serif] antialiased">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/support" element={<Support />} />
        <Route path="/guide" element={<Guide />} />
      </Routes>
      <Footer />
    </div>
  );
}
