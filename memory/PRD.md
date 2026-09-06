# PRD — abearchitectstudio Portfolio + Private Editor

## Original problem statement
The user has a finished architecture portfolio (reference: spatial-studio-v2 preview) and needs a private Editor to manage projects (add/edit/delete/upload images/reorder/publish/unpublish) without touching code. Public site design must remain unchanged; all content must be dynamic from the backend. No Supabase; simple persistent DB + local file storage.

## User decisions
- Editor protected by a single shared passcode (JWT exchange)
- Images stored on local persistent file storage (/app/backend/uploads, served at /api/uploads/*)
- Keep the exact existing site structure (two worlds: Design Anomaly, Design Furniture)
- Publish/unpublish + manual ordering + featured flag

## Architecture
- Backend: FastAPI + MongoDB (motor). String UUID ids, `_id` excluded. Routes under /api.
  - Public: GET /api/projects (published only, ?world=&category=), GET /api/projects/{slug}
  - Auth: POST /api/auth/login {passcode} → JWT; GET /api/auth/verify
  - Admin (Bearer JWT): GET /api/admin/projects, GET /api/admin/projects/by-slug/{slug}, POST/PUT/DELETE /api/admin/projects/{id}, POST /api/admin/projects/reorder {ids}, POST /api/admin/uploads (multipart)
  - Seed: 6 original projects seeded on startup when collection is empty (content + image URLs preserved from the reference site)
- Frontend: React + Tailwind + framer-motion + lenis. Public pages: /, /anomaly, /furniture, /project/:slug, /about (faithful reproduction of reference design). Private /editor (passcode login, dashboard, project form). Draft preview via /project/:slug?preview=1 with editor token.

## User personas
- Visitor: browses portfolio, never sees admin controls
- Studio owner: manages all projects via /editor with passcode

## Implemented (2026-09-06)
- Faithful public portfolio (home, both world pages with category filters, project detail, about) fully driven by backend data
- Private editor at /editor: add/edit/delete, multi-image upload, cover selection, image reorder/captions, text sections, publish/unpublish, featured flag, reorder via up/down, draft preview
- Passcode auth (JWT), local persistent uploads
- Editor passcode: atelier2026 (see /app/memory/test_credentials.md)

## Implemented (2026-09-06, session 2)
- New third world "Work" (path /work) with 3 fixed categories: Supervisor, Building Design, Competition Design — always shown as filter chips even with 0 projects. Fully manageable from Editor exactly like Anomaly/Furniture (world dropdown + category datalist suggestions)
- About page is now a CMS: intro line, bio paragraphs (add/remove), facts rows (add/remove), email/instagram — served via GET /api/about (public), edited via PUT /api/admin/about, editable in Editor → Settings
- Drag-and-drop reordering (dnd-kit) replacing old up/down arrow buttons: project rows in Editor dashboard (per world group, drag handle -> calls POST /api/admin/projects/reorder) and images inside ProjectForm (client-side array reorder, persisted on Save)
- Editor Settings screen: change passcode (bcrypt hash stored in Mongo `settings` collection id="auth", seeded from EDITOR_PASSCODE on first boot only; POST /api/admin/change-passcode verifies current + updates hash). Passcode changed to `abearch4231`
- Automatic image compression on upload: Pillow resizes any image >2400px on its longest side and re-encodes jpg/webp at quality=82 / png with optimize (server-side in POST /api/admin/uploads, gif/avif passed through untouched)
- Public site header logo replaced: top-left now renders the Abraham wordmark image instead of "abearchitectstudio" text (editor/admin headers unchanged, out of scope)

## Verified (session 2)
- Backend: 17/17 pytest cases (auth, passcode change, About CMS, Projects CRUD incl. "work" world, reorder, uploads+compression) — 100% pass
- Frontend: logo image, 4 nav links, /work hero+categories, /about dynamic content, editor login with new passcode, 3 world groups with drag handles, Settings view (passcode + about cards) — 100% pass via testing_agent (see /app/test_reports/iteration_1.json)

## Backlog
- P1: Drag-and-drop reordering in editor
- P1: Editable About page text (currently static, as on reference)
- P2: Image compression/resizing on upload
- P2: Delete uploaded files from disk when removed from a project
- P2: Change passcode from editor UI
