import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchHomeIntro } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets-lqy194kg.emergentagent.net/job_spatial-editor/artifacts/oe4wy2me_Abraham%20Logo.webp";

export default function HomeIntro() {
  const [visible, setVisible] = useState(true);
  const [bgImage, setBgImage] = useState("");

  useEffect(() => {
    fetchHomeIntro().then((d) => setBgImage(d.bg_image || "")).catch(() => {});
    const timer = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-testid="home-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink cursor-pointer overflow-hidden"
        >
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-50"
              data-testid="home-intro-bg"
            />
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative bg-paper px-10 py-7 md:px-14 md:py-9"
          >
            <img src={LOGO_URL} alt="Abraham — Conceptual & Experimental" className="h-8 md:h-11 w-auto object-contain" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
