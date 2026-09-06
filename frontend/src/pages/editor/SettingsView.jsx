import { useState } from "react";
import { toast } from "sonner";
import { adminChangePasscode, fetchAbout, adminUpdateAbout, fetchHomeIntro, adminUpdateHomeIntro, adminUpload } from "@/lib/api";
import { useEffect, useRef } from "react";

const Field = ({ label, children }) => (
  <div className="mb-5">
    <label className="mono text-mute block mb-2">{label}</label>
    {children}
  </div>
);

function PasscodeCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) return toast.error("New passcodes do not match");
    if (next.length < 4) return toast.error("Passcode must be at least 4 characters");
    setBusy(true);
    try {
      await adminChangePasscode(current, next);
      toast.success("Passcode updated");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not update passcode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-line p-6 max-w-md" data-testid="passcode-form">
      <div className="mono text-mute mb-4">Change passcode</div>
      <Field label="Current passcode">
        <input type="password" className="e-input" data-testid="current-passcode-input" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New passcode">
        <input type="password" className="e-input" data-testid="new-passcode-input" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
      <Field label="Confirm new passcode">
        <input type="password" className="e-input" data-testid="confirm-passcode-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <button type="submit" className="e-btn e-btn-solid" data-testid="save-passcode-button" disabled={busy}>
        {busy ? "Saving…" : "Update passcode"}
      </button>
    </form>
  );
}

function HomeIntroCard() {
  const [bgImage, setBgImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchHomeIntro().then((d) => setBgImage(d.bg_image || "")).catch(() => {});
  }, []);

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const [url] = await adminUpload([files[0]]);
      setBgImage(url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await adminUpdateHomeIntro(bgImage);
      toast.success("Home opening screen updated");
    } catch {
      toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-line p-6 max-w-md" data-testid="home-intro-form">
      <div className="mono text-mute mb-4">Home opening screen background</div>
      {bgImage && <img src={bgImage} alt="" className="w-full aspect-[16/9] object-cover border border-line mb-3" data-testid="home-intro-preview" />}
      <div className="flex gap-3 items-center">
        <button type="button" className="e-btn" data-testid="home-intro-upload-button" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Uploading…" : "+ Upload background"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden data-testid="home-intro-file-input" onChange={(e) => upload(e.target.files)} />
        {bgImage && (
          <button type="button" className="mono text-accent" data-testid="home-intro-remove-button" onClick={() => setBgImage("")}>
            Remove
          </button>
        )}
      </div>
      <button type="button" className="e-btn e-btn-solid mt-4" data-testid="save-home-intro-button" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function AboutEditorCard() {
  const [about, setAbout] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAbout().then(setAbout).catch(() => toast.error("Could not load About content"));
  }, []);

  if (!about) return <div className="mono text-mute py-6">Loading…</div>;

  const set = (k, v) => setAbout((s) => ({ ...s, [k]: v }));
  const setBio = (i, v) => setAbout((s) => ({ ...s, bio: s.bio.map((b, j) => (j === i ? v : b)) }));
  const setFact = (i, k, v) => setAbout((s) => ({ ...s, facts: s.facts.map((f, j) => (j === i ? { ...f, [k]: v } : f)) }));

  const save = async () => {
    setBusy(true);
    try {
      await adminUpdateAbout(about);
      toast.success("About page updated");
    } catch {
      toast.error("Could not save About content");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-line p-6 max-w-2xl" data-testid="about-editor-form">
      <div className="mono text-mute mb-4">About page content</div>
      <Field label="Intro line (large serif)">
        <input className="e-input" data-testid="about-field-intro" value={about.intro} onChange={(e) => set("intro", e.target.value)} />
      </Field>
      {about.bio.map((para, i) => (
        <Field key={i} label={`Biography paragraph ${i + 1}`}>
          <div className="flex gap-2">
            <textarea className="e-input" rows={3} data-testid={`about-field-bio-${i}`} value={para} onChange={(e) => setBio(i, e.target.value)} />
            <button type="button" className="mono text-accent" data-testid={`about-remove-bio-${i}`}
              onClick={() => set("bio", about.bio.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </Field>
      ))}
      <button type="button" className="e-btn mb-6" data-testid="about-add-bio-button" onClick={() => set("bio", [...about.bio, ""])}>
        + Add paragraph
      </button>

      <div className="hairline-t pt-6 mt-2">
        <div className="mono text-mute mb-4">Facts</div>
        {about.facts.map((f, i) => (
          <div key={i} className="flex gap-3 mb-3 items-center" data-testid={`about-fact-row-${i}`}>
            <input className="e-input" placeholder="Label" data-testid={`about-fact-label-${i}`} value={f.label} onChange={(e) => setFact(i, "label", e.target.value)} />
            <input className="e-input" placeholder="Value" data-testid={`about-fact-value-${i}`} value={f.value} onChange={(e) => setFact(i, "value", e.target.value)} />
            <button type="button" className="mono text-accent" data-testid={`about-remove-fact-${i}`}
              onClick={() => set("facts", about.facts.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" className="e-btn" data-testid="about-add-fact-button" onClick={() => set("facts", [...about.facts, { label: "", value: "" }])}>
          + Add fact
        </button>
      </div>

      <div className="hairline-t pt-6 mt-6 grid grid-cols-2 gap-4">
        <Field label="Email">
          <input className="e-input" data-testid="about-field-email" value={about.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input className="e-input" data-testid="about-field-instagram" value={about.instagram} onChange={(e) => set("instagram", e.target.value)} />
        </Field>
      </div>

      <button type="button" className="e-btn e-btn-solid mt-2" data-testid="save-about-button" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save About page"}
      </button>
    </div>
  );
}

export default function SettingsView({ onBack }) {
  return (
    <div className="min-h-screen bg-paper text-ink" data-testid="settings-view">
      <header className="hairline-b px-4 md:px-10 h-14 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <span className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</span>
          <span className="mono text-mute">Settings</span>
        </div>
        <button className="e-btn" data-testid="settings-back-button" onClick={onBack}>← Back</button>
      </header>
      <div className="px-4 md:px-10 py-8 max-w-4xl flex flex-col gap-10">
        <PasscodeCard />
        <HomeIntroCard />
        <AboutEditorCard />
      </div>
    </div>
  );
}
