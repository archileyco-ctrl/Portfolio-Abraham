import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pad } from "@/lib/api";

const RATIO_CLASS = { square: "aspect-square", landscape: "aspect-[4/3]", portrait: "aspect-[3/4]", wide: "aspect-[16/9]" };

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

  if (!images?.length) return null;

  return (
    <section className="mt-14" data-testid="project-gallery">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {images.map((img, i) => {
              const hasRatio = img.ratio && img.ratio !== "auto";
              return (
                <div
                  key={img.url + i}
                  className="min-w-0 flex-[0_0_100%] flex items-center justify-center bg-ink/5"
                  data-testid={`gallery-slide-${i}`}
                >
                  {hasRatio ? (
                    <div className={`w-full ${RATIO_CLASS[img.ratio] || ""}`}>
                      <img
                        src={img.url}
                        alt={img.caption || title}
                        className={`w-full h-full ${img.crop ? "object-cover" : "object-contain"}`}
                      />
                    </div>
                  ) : (
                    <img
                      src={img.url}
                      alt={img.caption || title}
                      className="w-full h-[70vh] md:h-[92vh] object-cover"
                      data-testid={`gallery-hero-image-${i}`}
                    />
                  )}
                </div>
              );
            })}
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

      <div className="flex justify-between items-center mt-3 px-4 md:px-10">
        <p className="mono text-mute" data-testid="gallery-caption">
          {images[selected]?.caption || ""}
        </p>
        {images.length > 1 && (
          <span className="mono text-mute" data-testid="gallery-counter">
            {pad(selected)} / {pad(images.length - 1)}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto px-4 md:px-10" data-testid="gallery-thumbnails">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              data-testid={`gallery-thumb-${i}`}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`shrink-0 w-16 h-11 border overflow-hidden transition-opacity ${
                selected === i ? "border-ink opacity-100" : "border-line opacity-45 hover:opacity-80"
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
