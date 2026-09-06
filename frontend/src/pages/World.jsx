import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchPublished, WORLDS, pad } from "@/lib/api";

export default function World({ worldKey }) {
  const world = WORLDS[worldKey];
  const other = worldKey === "anomaly" ? WORLDS.furniture : WORLDS.anomaly;
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    setFilter("All");
    fetchPublished(worldKey).then(setProjects).catch(() => {});
  }, [worldKey]);

  const categories = ["All", ...new Set(projects.map((p) => p.category).filter(Boolean))];
  const visible = filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div data-testid={`world-page-${worldKey}`}>
      <Seo
        title={`${world.title} — abearchitectstudio`}
        siteName="abearchitectstudio"
        description={world.description}
      />

      <section className="px-4 md:px-10 pt-28 md:pt-32">
        <div className="mono text-mute" data-testid="world-label">
          World {world.index} / 02
        </div>
        <h1 className="display text-[13vw] md:text-[9vw] mt-8 md:text-center" data-testid="world-title">
          <MaskedLine delay={0.1}>{world.titleLines[0]}</MaskedLine>
          <MaskedLine delay={0.24} className="text-accent">{world.titleLines[1]}</MaskedLine>
        </h1>
        <p className="text-sm text-mute max-w-lg leading-relaxed mt-10 md:mx-auto md:text-center" data-testid="world-description">
          {world.description}
        </p>
        <div className="flex flex-col md:flex-row justify-between gap-4 mt-16 hairline-b pb-4">
          <span className="mono text-mute" data-testid="world-count">{projects.length} works</span>
          <div className="flex flex-wrap gap-6" data-testid="category-filters">
            {categories.map((c) => (
              <button
                key={c}
                data-testid={`filter-${c.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setFilter(c)}
                className={`mono transition-colors ${
                  filter === c ? "text-ink underline underline-offset-4" : "text-mute hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 md:px-10" data-testid="world-projects">
        {visible.map((p, i) => (
          <Reveal key={p.id} className="hairline-b py-16 md:py-24">
            <Link
              to={`/project/${p.slug}`}
              data-testid={`world-project-${p.slug}`}
              className="grid grid-cols-12 gap-6 items-end group"
            >
              <div className={`col-span-12 md:col-span-5 ${i % 2 === 1 ? "md:order-2 md:col-start-8" : ""}`}>
                <div className="relative">
                  <span className="display text-[7rem] md:text-[9rem] leading-none absolute -top-10 -left-2 select-none" style={{ color: "rgba(23,21,18,0.06)" }} aria-hidden="true">
                    {pad(i)}
                  </span>
                  <div className="relative flex justify-between">
                    <span className="mono text-mute">{pad(i)}</span>
                    <span className="mono text-mute">{p.year}</span>
                  </div>
                  <h2 className="display text-3xl md:text-5xl mt-3 relative">{p.title}</h2>
                  <p className="serif italic text-mute mt-3">{p.operations.join(". ")}.</p>
                  <p className="mono text-mute mt-4">
                    {p.category}
                    {p.location ? `  ·  ${p.location}` : ""}
                  </p>
                </div>
              </div>
              <div className={`col-span-12 md:col-span-6 ${i % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-7"}`}>
                <div className="overflow-hidden">
                  <img
                    src={p.cover}
                    alt={p.title}
                    className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
        {visible.length === 0 && (
          <div className="py-24 mono text-mute" data-testid="no-projects-message">
            No works in this category yet.
          </div>
        )}
      </section>

      <section className="px-4 md:px-10 py-20">
        <Link to={other.path} data-testid="continue-link" className="group block">
          <span className="mono text-mute">Continue — {other.index}</span>
          <span className="display text-[10vw] md:text-[6vw] block mt-4 group-hover:text-accent transition-colors">
            {other.title} →
          </span>
        </Link>
      </section>
    </div>
  );
}
