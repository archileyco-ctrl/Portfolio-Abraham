import Seo from "@/components/Seo";
import { Reveal, MaskedLine } from "@/components/Reveal";

export default function About() {
  return (
    <div data-testid="about-page">
      <Seo
        title="About — abearchitectstudio"
        siteName="abearchitectstudio"
        description="abearchitectstudio is an independent design practice investigating how a single operation can transform a space or an object."
      />
      <section className="px-4 md:px-10 pt-28 md:pt-32">
        <div className="mono text-mute">03 / About</div>
        <h1 className="display lowercase text-[11vw] md:text-[7.5vw] mt-10" data-testid="about-title">
          <MaskedLine delay={0.1}>abearchitectstudio</MaskedLine>
        </h1>
        <Reveal className="grid grid-cols-12 gap-6 mt-16">
          <p className="serif text-2xl md:text-4xl col-span-12 md:col-span-8 leading-snug" data-testid="about-intro">
            A studio working between architecture and the object.
          </p>
        </Reveal>
        <Reveal className="grid grid-cols-12 gap-6 mt-16">
          <div className="col-span-12 md:col-span-6 md:col-start-4">
            <p className="text-sm leading-relaxed text-mute" data-testid="about-bio">
              abearchitectstudio is an independent design practice investigating how a single
              operation can transform a space or an object. The work moves between two bodies:
              Design Anomaly, where architecture is tested through subtraction, displacement
              and deformation; and Design Furniture, where the same operations are compressed
              into chairs, tables and lighting.
            </p>
            <p className="text-sm leading-relaxed text-mute mt-6">
              This is placeholder text. Open the Studio to replace it with your own biography,
              education and practice statement.
            </p>
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-12 gap-6 mt-20">
          <div className="col-span-12 md:col-span-6 md:col-start-4 hairline-t" data-testid="about-facts">
            <div className="hairline-b py-4 grid grid-cols-12 gap-4">
              <span className="mono text-mute col-span-4">Education</span>
              <span className="text-sm col-span-8">M.Arch — replace in Studio settings</span>
            </div>
            <div className="hairline-b py-4 grid grid-cols-12 gap-4">
              <span className="mono text-mute col-span-4">Practice</span>
              <span className="text-sm col-span-8">Independent studio, est. 2024</span>
            </div>
            <div className="hairline-b py-4 grid grid-cols-12 gap-4">
              <span className="mono text-mute col-span-4">Focus</span>
              <span className="text-sm col-span-8">Architecture, spatial research, furniture</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-12 gap-6 mt-20">
          <div className="col-span-12 md:col-span-6 md:col-start-4">
            <div className="mono text-mute mb-4">Contact</div>
            <div className="flex flex-col gap-2 text-sm">
              <a href="mailto:studio@abearchitectstudio.com" data-testid="about-email" className="hover:opacity-60 transition-opacity">
                studio@abearchitectstudio.com
              </a>
              <a href="https://instagram.com/abearchitectstudio" target="_blank" rel="noopener noreferrer" data-testid="about-instagram" className="hover:opacity-60 transition-opacity">
                @abearchitectstudio
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
