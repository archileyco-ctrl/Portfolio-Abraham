import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pad } from "@/lib/api";

export default function ProjectGallery({ images, title }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!images.length) return null;

  return (
    <section className="px-4 md:px-10 mt-14" data-testid="project-gallery">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => (
              <div
                key={img.url + i}
                className="min-w-0 flex-[0_0_100%] flex items-center justify-center bg-ink/5"
                data-testid={`gallery-slide-${i}`}
              >
                <img
                  src={img.url}
                  alt={img.caption || title}
                  className="max-h-[62vh] md:max-h-[78vh] w-auto max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              data-testid="gallery-prev-button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={selected === 0}
              className="hidden md:flex items-center justify-center absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink disabled:opacity-30 hover:bg-ink hover:text-paper transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              data-testid="gallery-next-button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={selected === images.length - 1}
              className="hidden md:flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 border border-line bg-paper/80 backdrop-blur-md text-ink disabled:opacity-30 hover:bg-ink hover:text-paper transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <p className="mono text-mute" data-testid="gallery-caption">
          {images[selected]?.caption || ""}
        </p>
        {images.length > 1 && (
          <span className="mono text-mute" data-testid="gallery-counter">
            {pad(selected)} / {pad(images.length - 1)}
          </span>
        )}
      </div>
    </section>
  );
}
