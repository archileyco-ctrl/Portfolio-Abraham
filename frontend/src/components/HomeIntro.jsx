import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchHomeIntro } from "@/lib/api";

const LOGO_URL =
  "https://customer-assets-lqy194kg.emergentagent.net/job_spatial-editor/artifacts/lrofb11j_LOGO%20TERBARU-01.webp";

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-paper cursor-pointer overflow-hidden"
        >
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-[0.12]"
              data-testid="home-intro-bg"
            />
          )}
          <motion.img
            src={LOGO_URL}
            alt="Abraham — Conceptual & Experimental"
            initial={{ opacity: 0, scale: 0.88, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[72vw] max-w-md md:max-w-4xl h-auto object-contain"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
