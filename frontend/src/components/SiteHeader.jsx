import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const NAV = [
  { to: "/anomaly", label: "Design Anomaly" },
  { to: "/furniture", label: "Design Furniture" },
  { to: "/work", label: "Work" },
  { to: "/about", label: "About" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-paper/90 backdrop-blur-md hairline-b">
        <div className="px-4 md:px-10 h-14 flex items-center justify-between">
          <Link to="/" data-testid="site-logo" className="flex items-center">
            <img
              src="https://customer-assets-lqy194kg.emergentagent.net/job_spatial-editor/artifacts/lrofb11j_LOGO%20TERBARU-01.webp"
              alt="Abraham — Conceptual & Experimental"
              className="h-7 md:h-8 w-auto object-contain"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-10">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={({ isActive }) =>
                  `mono text-ink transition-opacity hover:opacity-60 ${
                    isActive ? "underline underline-offset-4" : ""
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mono text-mute hidden md:block">2026</div>
          <button
            data-testid="mobile-menu-button"
            className="md:hidden mono text-ink"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 bg-paper pt-24 px-4 md:hidden" data-testid="mobile-menu">
          <nav className="flex flex-col gap-6">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="display text-4xl text-ink"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
