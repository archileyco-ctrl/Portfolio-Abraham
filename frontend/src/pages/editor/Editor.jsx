import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminLogin, adminVerify, adminFetchAll, adminDelete, adminReorder,
  adminUpdate, getToken, setToken, clearToken, WORLDS, pad,
} from "@/lib/api";
import ProjectForm from "./ProjectForm";

function Login({ onSuccess }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await adminLogin(passcode);
      setToken(token);
      onSuccess();
    } catch {
      setError("Wrong passcode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4" data-testid="editor-login">
      <form onSubmit={submit} className="w-full max-w-sm border border-line p-8">
        <div className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</div>
        <div className="mono text-mute mt-1 mb-8">Private editor</div>
        <label className="mono text-mute block mb-2" htmlFor="passcode">Passcode</label>
        <input
          id="passcode"
          data-testid="passcode-input"
          type="password"
          className="e-input"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoFocus
        />
        {error && <div className="mono text-accent mt-3" data-testid="login-error">{error}</div>}
        <button type="submit" data-testid="login-submit-button" className="e-btn e-btn-solid w-full mt-6" disabled={busy}>
          {busy ? "Entering…" : "Enter editor"}
        </button>
      </form>
    </div>
  );
}

export default function Editor() {
  const [authed, setAuthed] = useState(null);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);

  const load = () => adminFetchAll().then(setProjects).catch(() => toast.error("Could not load projects"));

  useEffect(() => {
    if (!getToken()) return setAuthed(false);
    adminVerify()
      .then(() => setAuthed(true))
      .catch(() => { clearToken(); setAuthed(false); });
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  if (authed === null) return <div className="min-h-screen bg-paper" />;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= projects.length) return;
    const next = [...projects];
    [next[i], next[j]] = [next[j], next[i]];
    setProjects(next);
    try {
      await adminReorder(next.map((p) => p.id));
    } catch {
      toast.error("Reorder failed");
      load();
    }
  };

  const toggle = async (p, field) => {
    try {
      await adminUpdate(p.id, { ...p, [field]: !p[field] });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await adminDelete(p.id);
      toast.success(`"${p.title}" deleted`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (view === "form")
    return (
      <ProjectForm
        initial={editing}
        onSaved={() => { setView("list"); setEditing(null); load(); }}
        onCancel={() => { setView("list"); setEditing(null); }}
      />
    );

  return (
    <div className="min-h-screen bg-paper text-ink" data-testid="editor-dashboard">
      <header className="hairline-b px-4 md:px-10 h-14 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <span className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</span>
          <span className="mono text-mute">Editor</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="e-btn" data-testid="view-site-button">View site</a>
          <button
            className="e-btn e-btn-solid"
            data-testid="add-project-button"
            onClick={() => { setEditing(null); setView("form"); }}
          >
            Add new project
          </button>
          <button className="e-btn" data-testid="logout-button" onClick={() => { clearToken(); setAuthed(false); }}>
            Log out
          </button>
        </div>
      </header>

      <div className="px-4 md:px-10 py-8 max-w-6xl">
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="display text-3xl" data-testid="editor-heading">Projects</h1>
          <span className="mono text-mute">{projects.length} total</span>
        </div>

        {Object.values(WORLDS).map((w) => {
          const list = projects.filter((p) => p.world === w.key);
          return (
            <div key={w.key} className="mb-10">
              <div className="mono text-mute hairline-b pb-2 mb-2" data-testid={`world-group-${w.key}`}>
                {w.title} — {list.length}
              </div>
              {list.map((p) => {
                const gi = projects.findIndex((x) => x.id === p.id);
                return (
                  <div key={p.id} className="hairline-b py-3 flex items-center gap-4" data-testid={`editor-row-${p.slug}`}>
                    <div className="flex flex-col">
                      <button data-testid={`move-up-${p.slug}`} onClick={() => move(gi, -1)} className="mono text-mute hover:text-ink leading-none" title="Move up">↑</button>
                      <button data-testid={`move-down-${p.slug}`} onClick={() => move(gi, 1)} className="mono text-mute hover:text-ink leading-none" title="Move down">↓</button>
                    </div>
                    <span className="mono text-mute w-8">{pad(gi)}</span>
                    {p.cover ? (
                      <img src={p.cover} alt="" className="w-16 h-11 object-cover border border-line" />
                    ) : (
                      <div className="w-16 h-11 border border-line" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.title}</div>
                      <div className="mono text-mute">{p.category} — {p.year}</div>
                    </div>
                    <button
                      data-testid={`toggle-publish-${p.slug}`}
                      onClick={() => toggle(p, "published")}
                      className={`mono px-3 py-1 border ${p.published ? "bg-ink text-paper border-transparent" : "border-line text-mute"}`}
                      title="Publish / unpublish"
                    >
                      {p.published ? "Published" : "Draft"}
                    </button>
                    <button
                      data-testid={`toggle-featured-${p.slug}`}
                      onClick={() => toggle(p, "featured")}
                      className={`mono px-3 py-1 border ${p.featured ? "text-accent border-accent" : "border-line text-mute"}`}
                      title="Show on home page"
                    >
                      {p.featured ? "Featured" : "Feature"}
                    </button>
                    <a
                      href={`/project/${p.slug}${p.published ? "" : "?preview=1"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="e-btn"
                      data-testid={`preview-${p.slug}`}
                    >
                      Preview
                    </a>
                    <button className="e-btn" data-testid={`edit-${p.slug}`} onClick={() => { setEditing(p); setView("form"); }}>
                      Edit
                    </button>
                    <button className="e-btn hover:!bg-accent hover:!border-accent" data-testid={`delete-${p.slug}`} onClick={() => remove(p)}>
                      Delete
                    </button>
                  </div>
                );
              })}
              {list.length === 0 && (
                <div className="mono text-mute py-6">No projects yet — add one.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
