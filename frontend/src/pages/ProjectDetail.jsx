import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { Reveal, MaskedLine } from "@/components/Reveal";
import { fetchProject, fetchPublished, adminFetchBySlug, getToken, WORLDS, pad } from "@/lib/api";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="hairline-b py-4 grid grid-cols-12 gap-4" data-testid={`info-${label.toLowerCase()}`}>
      <span className="mono text-mute col-span-4">{label}</span>
      <span className="text-sm col-span-8">{value}</span>
    </div>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const isPreview = params.get("preview") === "1";
  const [project, setProject] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setProject(null);
    setMissing(false);
    fetchProject(slug)
      .then(setProject)
      .catch(async () => {
        if (isPreview && getToken()) {
          try {
            setProject(await adminFetchBySlug(slug));
            return;
          } catch {}
        }
        setMissing(true);
      });
  }, [slug, isPreview]);

  useEffect(() => {
    if (project?.world) fetchPublished(project.world).then(setSiblings).catch(() => {});
  }, [project?.world]);

  if (missing)
    return (
      <div className="px-4 md:px-10 pt-40 min-h-[70vh]" data-testid="project-not-found">
        <span className="mono text-mute">Project not found</span>
        <h1 className="display text-5xl mt-6">This work does not exist.</h1>
        <Link to="/" className="mono text-ink underline underline-offset-4 mt-8 inline-block">
          Back to index →
        </Link>
      </div>
    );

  if (!project) return <div className="min-h-[70vh]" data-testid="project-loading" />;

  const index = siblings.findIndex((p) => p.slug === project.slug);
  const next = siblings.length > 1 ? siblings[(index + 1) % siblings.length] : null;
  const images = project.images || [];
  const sections = project.sections || [];
  const restImages = images.slice(1);

  return (
    <div data-testid="project-page">
      <Seo
        title={`${project.title} — abearchitectstudio`}
        siteName="abearchitectstudio"
        description={project.summary || project.concept}
      />
      {isPreview && !project.published && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper mono px-6 py-3" data-testid="preview-banner">
          Preview — this project is unpublished
        </div>
      )}

      <section className="px-4 md:px-10 pt-28 md:pt-32">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 md:col-span-2">
            <span className="display text-[5rem] md:text-[8rem] leading-none" data-testid="project-number">
              {index >= 0 ? pad(index) : "··"}
            </span>
            <div className="mono text-mute mt-4">{WORLDS[project.world]?.title}</div>
          </div>
          <div className="col-span-9 md:col-span-10">
            <h1 className="display text-4xl md:text-7xl" data-testid="project-title">
              <MaskedLine delay={0.1}>{project.title}</MaskedLine>
            </h1>
            {project.summary && (
              <p className="serif text-lg md:text-xl text-mute max-w-lg mt-6" data-testid="project-summary">
                {project.summary}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 hairline-t mt-14 pt-5" data-testid="project-meta">
          <div><div className="mono text-mute mb-2">Year</div><div className="text-sm">{project.year}</div></div>
          <div><div className="mono text-mute mb-2">Location</div><div className="text-sm">{project.location}</div></div>
          <div><div className="mono text-mute mb-2">Category</div><div className="text-sm">{project.category}</div></div>
          <div><div className="mono text-mute mb-2">Role</div><div className="text-sm">{project.role}</div></div>
        </div>
      </section>

      {images[0] && (
        <section className="px-4 md:px-10 mt-14">
          <Reveal>
            <img src={images[0].url} alt={project.title} className="w-full aspect-[16/10] md:aspect-[21/10] object-cover" data-testid="project-hero-image" />
            {images[0].caption && (
              <p className="mono text-mute mt-3">{images[0].caption}</p>
            )}
          </Reveal>
        </section>
      )}

      {project.concept && (
        <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute">Concept</span>
          </div>
          <Reveal className="col-span-12 md:col-span-7">
            <p className="serif text-xl md:text-2xl leading-relaxed" data-testid="project-concept">
              {project.concept}
            </p>
          </Reveal>
        </section>
      )}

      {project.question && (
        <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12">
          <Reveal className="col-span-12 md:col-span-8 md:col-start-3">
            <p className="serif italic text-2xl md:text-4xl leading-snug" data-testid="project-question">
              {project.question}
            </p>
          </Reveal>
        </section>
      )}

      {project.operations?.length > 0 && (
        <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute">Design operation</span>
          </div>
          <div className="col-span-12 md:col-span-7" data-testid="project-operations">
            {project.operations.map((op, i) => (
              <div key={op} className="hairline-b py-4 flex justify-between items-baseline">
                <span className="display text-xl md:text-2xl">{op}</span>
                <span className="mono text-mute">{pad(i)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {project.transformation && (
        <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <span className="mono text-mute">Transformation</span>
          </div>
          <Reveal className="col-span-12 md:col-span-7">
            <p className="serif text-xl md:text-2xl leading-relaxed" data-testid="project-transformation">
              {project.transformation}
            </p>
          </Reveal>
        </section>
      )}

      {sections.map((s, i) => (
        <div key={i}>
          {restImages[i] && (
            <section className="px-4 md:px-10 mt-20 md:mt-28">
              <Reveal>
                <img src={restImages[i].url} alt={s.heading || project.title} className="w-full h-auto" data-testid={`project-image-${i + 2}`} />
                {restImages[i].caption && (
                  <p className="mono text-mute mt-3">{restImages[i].caption}</p>
                )}
              </Reveal>
            </section>
          )}
          <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-3">
              {s.heading && <span className="mono text-mute">{s.heading}</span>}
            </div>
            <Reveal className="col-span-12 md:col-span-7">
              {s.text.split("\n").filter(Boolean).map((line, j) => (
                <p key={j} className="serif text-lg md:text-xl leading-relaxed mb-4" data-testid={`project-section-${i}`}>
                  {line}
                </p>
              ))}
            </Reveal>
          </section>
        </div>
      ))}

      {restImages.slice(sections.length).map((img, i) => (
        <section className="px-4 md:px-10 mt-20 md:mt-28" key={i}>
          <Reveal>
            <img src={img.url} alt={project.title} className="w-full h-auto" data-testid={`project-image-extra-${i}`} />
            {img.caption && <p className="mono text-mute mt-3">{img.caption}</p>}
          </Reveal>
        </section>
      ))}

      <section className="px-4 md:px-10 mt-20 md:mt-28 grid grid-cols-12 gap-6" data-testid="project-info">
        <div className="col-span-12 md:col-span-3">
          <span className="mono text-mute">Project information</span>
        </div>
        <div className="col-span-12 md:col-span-7 hairline-t">
          <InfoRow label="Material" value={project.material} />
          <InfoRow label="Construction" value={project.construction} />
          <InfoRow label="Status" value={project.status} />
          <InfoRow label="Role" value={project.role} />
          <InfoRow label="Year" value={project.year} />
          <InfoRow label="Location" value={project.location} />
          <InfoRow label="World" value={WORLDS[project.world]?.title} />
          <InfoRow label="Category" value={project.category} />
        </div>
      </section>

      {next && (
        <section className="px-4 md:px-10 mt-24 md:mt-32 hairline-t pt-16">
          <Link to={`/project/${next.slug}`} data-testid="next-project-link" className="grid grid-cols-12 gap-6 items-center group">
            <div className="col-span-12 md:col-span-8">
              <span className="mono text-mute">Next — {pad(siblings.findIndex((p) => p.id === next.id))}</span>
              <h2 className="display text-4xl md:text-6xl mt-4 group-hover:text-accent transition-colors">
                {next.title}
              </h2>
              <p className="mono text-mute mt-4">
                {next.category} — {next.year}
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 overflow-hidden">
              <img
                src={next.cover}
                alt={next.title}
                className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
