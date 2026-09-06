import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import { adminCreate, adminUpdate, adminUpload, WORLDS } from "@/lib/api";
import { SortableItem, DragHandle } from "@/components/editor/SortableItem";

const EMPTY = {
  title: "", slug: "", world: "anomaly", category: "", year: "", location: "",
  role: "", summary: "", concept: "", question: "", transformation: "",
  material: "", construction: "", status: "",
  operations: [], sections: [], images: [], cover: "",
  published: false, featured: false,
};

const Field = ({ label, children }) => (
  <div className="mb-5">
    <label className="mono text-mute block mb-2">{label}</label>
    {children}
  </div>
);

export default function ProjectForm({ initial, onSaved, onCancel }) {
  const [p, setP] = useState(() => ({
    ...EMPTY,
    ...(initial || {}),
    operationsText: (initial?.operations || []).join(", "),
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setP((s) => ({ ...s, [k]: v }));
  const isEdit = Boolean(initial?.id);

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await adminUpload(Array.from(files));
      setP((s) => {
        const images = [...s.images, ...urls.map((url) => ({ url, caption: "", ratio: "auto", crop: false }))];
        return { ...s, images, cover: s.cover || urls[0] };
      });
      toast.success(`${urls.length} image(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = p.images.findIndex((img) => img.url === active.id);
    const newIndex = p.images.findIndex((img) => img.url === over.id);
    set("images", arrayMove(p.images, oldIndex, newIndex));
  };

  const save = async (publish) => {
    if (!p.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      ...p,
      published: publish === undefined ? p.published : publish,
      operations: p.operationsText.split(",").map((s) => s.trim()).filter(Boolean),
      cover: p.cover || p.images[0]?.url || "",
    };
    delete payload.operationsText;
    try {
      const saved = isEdit ? await adminUpdate(p.id, payload) : await adminCreate(payload);
      toast.success(`"${saved.title}" saved`);
      onSaved();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink" data-testid="project-form">
      <header className="hairline-b px-4 md:px-10 h-14 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <span className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</span>
          <span className="mono text-mute">{isEdit ? `Edit — ${initial.title}` : "New project"}</span>
        </div>
        <button className="e-btn" data-testid="cancel-button" onClick={onCancel}>← Back</button>
      </header>

      <div className="px-4 md:px-10 py-8 max-w-4xl grid grid-cols-12 gap-10">
        <div className="col-span-12 md:col-span-7">
          <Field label="Title *">
            <input className="e-input" data-testid="field-title" value={p.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => { if (!p.slug) set("slug", p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input className="e-input" data-testid="field-slug" value={p.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            <Field label="World">
              <select className="e-input" data-testid="field-world" value={p.world} onChange={(e) => set("world", e.target.value)}>
                {Object.values(WORLDS).map((w) => (
                  <option key={w.key} value={w.key}>{w.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <input
                className="e-input"
                data-testid="field-category"
                list="category-suggestions"
                value={p.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Architecture, Chair…"
              />
              <datalist id="category-suggestions">
                {(WORLDS[p.world]?.categories || []).map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Year">
              <input className="e-input" data-testid="field-year" value={p.year} onChange={(e) => set("year", e.target.value)} />
            </Field>
            <Field label="Location">
              <input className="e-input" data-testid="field-location" value={p.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Role">
              <input className="e-input" data-testid="field-role" value={p.role} onChange={(e) => set("role", e.target.value)} />
            </Field>
          </div>
          <Field label="Summary (one line)">
            <input className="e-input" data-testid="field-summary" value={p.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="Concept">
            <textarea className="e-input" rows={4} data-testid="field-concept" value={p.concept} onChange={(e) => set("concept", e.target.value)} />
          </Field>
          <Field label="Question (large italic line)">
            <input className="e-input" data-testid="field-question" value={p.question} onChange={(e) => set("question", e.target.value)} />
          </Field>
          <Field label="Design operations (comma separated)">
            <input className="e-input" data-testid="field-operations" value={p.operationsText} onChange={(e) => set("operationsText", e.target.value)} placeholder="Subtraction, Void, Framing" />
          </Field>
          <Field label="Transformation">
            <textarea className="e-input" rows={3} data-testid="field-transformation" value={p.transformation} onChange={(e) => set("transformation", e.target.value)} />
          </Field>

          <div className="hairline-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="mono text-mute">Text sections</span>
              <button className="e-btn" data-testid="add-section-button"
                onClick={() => set("sections", [...p.sections, { heading: "", text: "" }])}>
                + Add section
              </button>
            </div>
            {p.sections.map((s, i) => (
              <div key={i} className="border border-line p-4 mb-4" data-testid={`section-${i}`}>
                <div className="flex justify-between mb-3">
                  <span className="mono text-mute">Section {i + 1}</span>
                  <button className="mono text-accent" data-testid={`remove-section-${i}`}
                    onClick={() => set("sections", p.sections.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
                <input className="e-input mb-3" placeholder="Heading" data-testid={`section-heading-${i}`} value={s.heading}
                  onChange={(e) => set("sections", p.sections.map((x, j) => j === i ? { ...x, heading: e.target.value } : x))} />
                <textarea className="e-input" rows={3} placeholder="Text" data-testid={`section-text-${i}`} value={s.text}
                  onChange={(e) => set("sections", p.sections.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5">
          <Field label="Material">
            <input className="e-input" data-testid="field-material" value={p.material} onChange={(e) => set("material", e.target.value)} />
          </Field>
          <Field label="Construction">
            <input className="e-input" data-testid="field-construction" value={p.construction} onChange={(e) => set("construction", e.target.value)} />
          </Field>
          <Field label="Status">
            <input className="e-input" data-testid="field-status" value={p.status} onChange={(e) => set("status", e.target.value)} placeholder="Prototype, Concept study…" />
          </Field>

          <div className="hairline-t pt-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="mono text-mute">Images</span>
              <button className="e-btn" data-testid="upload-images-button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Uploading…" : "+ Upload images"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden data-testid="file-input"
                onChange={(e) => upload(e.target.files)} />
            </div>
            {p.images.length === 0 && <div className="mono text-mute py-4">No images yet.</div>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
              <SortableContext items={p.images.map((img) => img.url)} strategy={verticalListSortingStrategy}>
                {p.images.map((img, i) => (
                  <SortableItem key={img.url} id={img.url}>
                    {({ attributes, listeners }) => (
                      <div className="border border-line p-3 mb-3 bg-paper" data-testid={`image-row-${i}`}>
                        <div className="flex gap-3 items-start">
                          <DragHandle attributes={attributes} listeners={listeners} testid={`image-drag-handle-${i}`} />
                          <img src={img.url} alt="" className="w-20 h-14 object-cover border border-line" />
                          <div className="flex-1">
                            <input className="e-input !py-1.5 text-xs" placeholder="Caption" data-testid={`image-caption-${i}`} value={img.caption}
                              onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, caption: e.target.value } : x))} />
                            <div className="flex gap-2 mt-2 items-center">
                              <select
                                className="e-input !py-1.5 !w-auto text-xs"
                                data-testid={`image-ratio-${i}`}
                                value={img.ratio || "auto"}
                                onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, ratio: e.target.value } : x))}
                              >
                                <option value="auto">Original</option>
                                <option value="square">Square 1:1</option>
                                <option value="landscape">Landscape 4:3</option>
                                <option value="portrait">Portrait 3:4</option>
                                <option value="wide">Wide 16:9</option>
                              </select>
                              <label className="mono text-mute flex items-center gap-1 text-xs cursor-pointer">
                                <input type="checkbox" data-testid={`image-crop-${i}`} checked={!!img.crop}
                                  disabled={(img.ratio || "auto") === "auto"}
                                  onChange={(e) => set("images", p.images.map((x, j) => j === i ? { ...x, crop: e.target.checked } : x))} />
                                Crop
                              </label>
                            </div>
                            <div className="flex gap-2 mt-2 items-center">
                              <button className={`mono px-2 py-1 border ${p.cover === img.url ? "bg-ink text-paper border-transparent" : "border-line text-mute"}`}
                                data-testid={`set-cover-${i}`} onClick={() => set("cover", img.url)}>
                                {p.cover === img.url ? "Cover ✓" : "Set cover"}
                              </button>
                              <button className="mono text-accent ml-auto" data-testid={`image-remove-${i}`}
                                onClick={() => setP((s) => {
                                  const images = s.images.filter((_, j) => j !== i);
                                  return { ...s, images, cover: s.cover === img.url ? images[0]?.url || "" : s.cover };
                                })}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="hairline-t pt-6 mt-6 flex items-center gap-6">
            <label className="mono text-mute flex items-center gap-2 cursor-pointer">
              <input type="checkbox" data-testid="field-featured" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured on home
            </label>
          </div>

          <div className="flex gap-3 mt-8">
            <button className="e-btn flex-1" data-testid="save-draft-button" disabled={saving} onClick={() => save()}>
              {saving ? "Saving…" : p.published ? "Save" : "Save as draft"}
            </button>
            <button className="e-btn e-btn-solid flex-1" data-testid="save-publish-button" disabled={saving}
              onClick={() => save(true)}>
              {saving ? "Saving…" : "Save & publish"}
            </button>
          </div>
          {isEdit && (
            <a href={`/project/${p.slug}${p.published ? "" : "?preview=1"}`} target="_blank" rel="noopener noreferrer"
              className="e-btn w-full text-center block mt-3" data-testid="form-preview-button">
              Preview on site →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
