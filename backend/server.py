import os
import re
import io
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Depends
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from PIL import Image
import bcrypt
import jwt

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
EDITOR_PASSCODE = os.environ['EDITOR_PASSCODE']
JWT_ALGORITHM = "HS256"

UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'}

app = FastAPI()
api_router = APIRouter(prefix="/api")


class ImageItem(BaseModel):
    url: str
    caption: str = ""
    ratio: str = "auto"
    crop: bool = False


class SectionItem(BaseModel):
    heading: str = ""
    text: str = ""


class FactItem(BaseModel):
    label: str = ""
    value: str = ""


class AboutIn(BaseModel):
    intro: str = ""
    bio: List[str] = []
    facts: List[FactItem] = []
    email: str = ""
    instagram: str = ""


class PasscodeChange(BaseModel):
    current_passcode: str
    new_passcode: str


class HomeIntroIn(BaseModel):
    bg_image: str = ""


DEFAULT_ABOUT = {
    "intro": "A studio working between architecture and the object.",
    "bio": [
        "abearchitectstudio is an independent design practice investigating how a single "
        "operation can transform a space or an object. The work moves between three bodies: "
        "Design Anomaly, where architecture is tested through subtraction, displacement and "
        "deformation; Design Furniture, where the same operations are compressed into chairs, "
        "tables and lighting; and Work, where the practice is applied to supervision, building "
        "design and competition briefs.",
        "This is placeholder text. Open the Studio to replace it with your own biography, "
        "education and practice statement.",
    ],
    "facts": [
        {"label": "Education", "value": "M.Arch — replace in Studio settings"},
        {"label": "Practice", "value": "Independent studio, est. 2024"},
        {"label": "Focus", "value": "Architecture, spatial research, furniture"},
    ],
    "email": "studio@abearchitectstudio.com",
    "instagram": "@abearchitectstudio",
}


class ProjectIn(BaseModel):
    title: str
    slug: str = ""
    world: str = "anomaly"
    category: str = ""
    year: str = ""
    location: str = ""
    role: str = ""
    summary: str = ""
    concept: str = ""
    question: str = ""
    transformation: str = ""
    material: str = ""
    construction: str = ""
    status: str = ""
    operations: List[str] = []
    sections: List[SectionItem] = []
    images: List[ImageItem] = []
    cover: str = ""
    published: bool = False
    featured: bool = False


def serialize(doc):
    doc.pop('_id', None)
    return doc


def slugify(text):
    s = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return s or 'project'


async def unique_slug(base, exclude_id=None):
    slug = slugify(base)
    candidate, n = slug, 2
    while True:
        query = {'slug': candidate}
        if exclude_id:
            query['id'] = {'$ne': exclude_id}
        if not await db.projects.find_one(query):
            return candidate
        candidate = f"{slug}-{n}"
        n += 1


def make_token():
    payload = {"sub": "editor", "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def require_editor(request: Request):
    auth = request.headers.get('Authorization', '')
    token = auth[7:] if auth.startswith('Bearer ') else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return True


def hash_passcode(passcode: str) -> str:
    return bcrypt.hashpw(passcode.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_passcode(passcode: str, hashed: str) -> bool:
    return bcrypt.checkpw(passcode.encode('utf-8'), hashed.encode('utf-8'))


# ---------- Auth ----------

@api_router.post("/auth/login")
async def login(body: dict):
    settings = await db.settings.find_one({"id": "auth"})
    if not settings or not verify_passcode(body.get('passcode', ''), settings['passcode_hash']):
        raise HTTPException(status_code=401, detail="Wrong passcode")
    return {"token": make_token()}


@api_router.get("/auth/verify")
async def verify(_=Depends(require_editor)):
    return {"ok": True}


@api_router.post("/admin/change-passcode")
async def change_passcode(body: PasscodeChange, _=Depends(require_editor)):
    settings = await db.settings.find_one({"id": "auth"})
    if not settings or not verify_passcode(body.current_passcode, settings['passcode_hash']):
        raise HTTPException(status_code=401, detail="Current passcode is incorrect")
    if len(body.new_passcode) < 4:
        raise HTTPException(status_code=400, detail="New passcode must be at least 4 characters")
    await db.settings.update_one(
        {"id": "auth"},
        {"$set": {"passcode_hash": hash_passcode(body.new_passcode)}},
    )
    return {"ok": True}


# ---------- About content ----------

@api_router.get("/about")
async def get_about():
    doc = await db.settings.find_one({"id": "about"})
    if not doc:
        return DEFAULT_ABOUT
    return serialize(doc)


@api_router.put("/admin/about")
async def update_about(body: AboutIn, _=Depends(require_editor)):
    data = body.model_dump()
    data['id'] = 'about'
    await db.settings.update_one({"id": "about"}, {"$set": data}, upsert=True)
    return data


# ---------- Home intro splash ----------

@api_router.get("/home-intro")
async def get_home_intro():
    doc = await db.settings.find_one({"id": "home_intro"})
    bg = doc.get("bg_image", "") if doc else ""
    if not bg:
        first = await db.projects.find_one({"published": True}, sort=[("order", 1)])
        bg = first.get("cover", "") if first else ""
    return {"bg_image": bg}


@api_router.put("/admin/home-intro")
async def update_home_intro(body: HomeIntroIn, _=Depends(require_editor)):
    data = body.model_dump()
    data['id'] = 'home_intro'
    await db.settings.update_one({"id": "home_intro"}, {"$set": data}, upsert=True)
    return data


# ---------- Public project routes ----------

@api_router.get("/projects")
async def list_projects(world: str = None, category: str = None):
    query = {"published": True}
    if world:
        query["world"] = world
    if category:
        query["category"] = category
    docs = await db.projects.find(query).sort("order", 1).to_list(1000)
    return [serialize(d) for d in docs]


@api_router.get("/projects/{slug}")
async def get_project(slug: str):
    doc = await db.projects.find_one({"slug": slug, "published": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize(doc)


# ---------- Editor routes ----------

@api_router.get("/admin/projects")
async def admin_list(_=Depends(require_editor)):
    docs = await db.projects.find({}).sort("order", 1).to_list(1000)
    return [serialize(d) for d in docs]


@api_router.get("/admin/projects/by-slug/{slug}")
async def admin_get_by_slug(slug: str, _=Depends(require_editor)):
    doc = await db.projects.find_one({"slug": slug})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize(doc)


@api_router.post("/admin/projects")
async def admin_create(project: ProjectIn, _=Depends(require_editor)):
    data = project.model_dump()
    data['id'] = str(uuid.uuid4())
    data['slug'] = await unique_slug(data['slug'] or data['title'])
    data['order'] = await db.projects.count_documents({})
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    if not data['cover'] and data['images']:
        data['cover'] = data['images'][0]['url']
    await db.projects.insert_one(data)
    data.pop('_id', None)
    return data


@api_router.put("/admin/projects/{project_id}")
async def admin_update(project_id: str, project: ProjectIn, _=Depends(require_editor)):
    existing = await db.projects.find_one({"id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    data = project.model_dump()
    data['slug'] = await unique_slug(data['slug'] or data['title'], exclude_id=project_id)
    if not data['cover'] and data['images']:
        data['cover'] = data['images'][0]['url']
    await db.projects.update_one({"id": project_id}, {"$set": data})
    updated = await db.projects.find_one({"id": project_id})
    return serialize(updated)


@api_router.delete("/admin/projects/{project_id}")
async def admin_delete(project_id: str, _=Depends(require_editor)):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


@api_router.post("/admin/projects/reorder")
async def admin_reorder(body: dict, _=Depends(require_editor)):
    ids = body.get('ids', [])
    for i, pid in enumerate(ids):
        await db.projects.update_one({"id": pid}, {"$set": {"order": i}})
    return {"ok": True}


def compress_image(content: bytes, ext: str) -> bytes:
    if ext not in {'.jpg', '.jpeg', '.png', '.webp'}:
        return content
    try:
        img = Image.open(io.BytesIO(content))
        max_dim = 2400
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))), Image.LANCZOS)
        buf = io.BytesIO()
        if ext in {'.jpg', '.jpeg'}:
            img.convert('RGB').save(buf, format='JPEG', quality=82, optimize=True)
        elif ext == '.webp':
            img.save(buf, format='WEBP', quality=82)
        else:
            img.save(buf, format='PNG', optimize=True)
        return buf.getvalue()
    except Exception:
        return content


@api_router.post("/admin/uploads")
async def admin_upload(files: List[UploadFile] = File(...), _=Depends(require_editor)):
    urls = []
    for f in files:
        ext = Path(f.filename).suffix.lower()
        if ext not in ALLOWED_EXT:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        name = f"{uuid.uuid4().hex}{ext}"
        content = await f.read()
        content = compress_image(content, ext)
        (UPLOAD_DIR / name).write_bytes(content)
        urls.append(f"/api/uploads/{name}")
    return {"urls": urls}


# ---------- Seed ----------

IMG = "https://static.prod-images.emergentagent.com/jobs/f0e30525-0ca3-4849-8ab3-4d6e9a712f20/images"

SEED = [
    {
        "title": "Subtracted Volume", "slug": "subtracted-volume", "world": "anomaly",
        "category": "Architecture", "year": "2025", "location": "Lisbon, Portugal",
        "role": "Concept, design, visualisation",
        "summary": "A single rectangular void carved through a concrete mass turns an opaque building into a frame for the horizon.",
        "concept": "The project begins with a closed block — a mute concrete volume sitting on a gravel field. Rather than adding openings, the design removes one. A single subtraction, proportioned to the golden section of the façade, passes entirely through the building. The void becomes the only room that matters: a threshold that belongs to neither inside nor outside.",
        "question": "What happens to a building when its most important space is the one that has been taken away?",
        "operations": ["Subtraction", "Void", "Framing"],
        "transformation": "From mass to frame. The removed volume displaces the programme to the perimeter; circulation wraps around the void, and every interior room borrows light from the cut.",
        "sections": [
            {"heading": "The void as programme", "text": "Once the cut is made, the building organises itself around absence. Rooms are pushed to the edges. The void is used for nothing in particular — it is a place to stand in the wind and watch the light move across the inner faces of the cut."},
            {"heading": "Edge", "text": "The subtraction exposes the thickness of the wall. Board-formed concrete records the timber shuttering, so the material remembers the act of casting even after the volume has been removed."},
        ],
        "material": "Board-formed concrete, raked gravel, oxidised steel reveals",
        "construction": "In-situ concrete shell with a post-tensioned lintel spanning the void",
        "status": "Concept study",
        "images": [
            {"url": f"{IMG}/48c4ef8743c3fd9ff8c64730771953a0fbff31ca673086e1c9fd6a4570d5bef1.jpeg", "caption": "The void seen from the gravel approach."},
            {"url": f"{IMG}/6f0fedb209e1e5841eb4280a88325ecce52f0316435108b1186918d2c5661e99.jpeg", "caption": "Study model 1:50 — Lisbon, spring light."},
        ],
        "cover": f"{IMG}/48c4ef8743c3fd9ff8c64730771953a0fbff31ca673086e1c9fd6a4570d5bef1.jpeg",
        "published": True, "featured": True,
    },
    {
        "title": "Folded Threshold", "slug": "folded-threshold", "world": "anomaly",
        "category": "Spatial Experiment", "year": "2024", "location": "Rotterdam, Netherlands",
        "role": "Design, fabrication",
        "summary": "A gallery floor folds upward into wall and roof, turning a single continuous surface into an enclosure.",
        "concept": "A floor is a flat plane until it decides not to be. The installation lifts one edge of the gallery floor, folds it and lets it peel upward into a wall and then a roof. The visitor passes underneath a surface that used to be the ground.",
        "question": "Can a single surface produce floor, wall and ceiling without a joint?",
        "operations": ["Folding", "Peeling", "Continuity"],
        "transformation": "From plane to enclosure. The fold introduces a threshold; the peel introduces light. Together they produce a space that is read as one gesture.",
        "sections": [
            {"heading": "Operation", "text": "Flat plane → single fold → peel. The geometry is developable so that it can be cast flat and bent."},
            {"heading": "Threshold", "text": "The moment of passing underneath the peel is the whole project. Everything else — structure, joints, finish — is arranged to make that moment as quiet as possible."},
        ],
        "material": "Glass-fibre reinforced concrete, 40mm, on a hidden steel rib",
        "construction": "Six prefabricated shell segments, dry-jointed on site",
        "status": "Built — temporary installation",
        "images": [
            {"url": f"{IMG}/d7216abc6c89b6e6412829bfd765875e8aaee845bb3d8e91880c13472a06d36a.jpeg", "caption": "The folded plane inside the gallery."},
            {"url": f"{IMG}/e1551e5dd546b741213b983819d252f5955ffddbb562be881a9ef2612a81e655.jpeg", "caption": "Axonometric — flat plane, single fold, peel."},
        ],
        "cover": f"{IMG}/d7216abc6c89b6e6412829bfd765875e8aaee845bb3d8e91880c13472a06d36a.jpeg",
        "published": True, "featured": True,
    },
    {
        "title": "Displaced Grid Pavilion", "slug": "displaced-grid-pavilion", "world": "anomaly",
        "category": "Installation", "year": "2025", "location": "Venice, Italy",
        "role": "Design, structural concept",
        "summary": "A regular steel grid is broken by a single displaced bay, producing a room where two orders collide.",
        "concept": "The pavilion is a perfectly regular 3×3 grid of thin steel columns — until a single bay is displaced by half a module. The shift breaks the reading of the grid and produces an unexpected room where two orders collide.",
        "question": "How small can a displacement be and still change how a space is understood?",
        "operations": ["Displacement", "Collision", "Interruption"],
        "transformation": "From field to room. The displaced bay compresses one passage and widens another; the pavilion acquires a front and a back that the pure grid never had.",
        "sections": [
            {"heading": "Two orders", "text": "The grid is the most neutral spatial device architecture has. Displacing part of it does not destroy the order — it reveals it. The visitor suddenly sees the grid because it has been interrupted."},
        ],
        "material": "Blackened steel, 40×40 hollow sections",
        "construction": "Welded frames bolted to a stone plinth",
        "status": "Competition entry",
        "images": [
            {"url": f"{IMG}/1d500d6439210fc35dd7f6444363e5775f47d4e5b939f3d7fd5acb42ef70c55f.jpeg", "caption": "The pavilion on the plaza. Long shadows register the shift more clearly than the columns themselves."},
        ],
        "cover": f"{IMG}/1d500d6439210fc35dd7f6444363e5775f47d4e5b939f3d7fd5acb42ef70c55f.jpeg",
        "published": True, "featured": True,
    },
    {
        "title": "Peel Chair", "slug": "peel-chair", "world": "furniture",
        "category": "Chair", "year": "2025", "location": "Studio",
        "role": "Design, prototyping",
        "summary": "One sheet of steel, scored, peeled and bent until it stands — a chair made of exactly one gesture.",
        "concept": "The chair is one sheet. Nothing is added and nothing is removed — the sheet is scored, peeled and bent until it stands. The backrest is the part of the seat that was lifted; the void it leaves behind is what makes the chair light.",
        "question": "Can a chair be made of exactly one gesture?",
        "operations": ["Peeling", "Bending", "Tension"],
        "transformation": "From plane to seat. The peel introduces a curve, the curve introduces stiffness, and the stiffness allows the sheet to carry a body.",
        "sections": [
            {"heading": "Edge", "text": "The raw cut is left visible. The oxidised surface records the bending: where the steel was stretched the colour is lighter, where it was compressed it darkens."},
            {"heading": "Process", "text": "01 — Flat sheet, scored along a single curve.\n02 — Peel: the scored strip is lifted by hand and jig.\n03 — Bend: seat and legs are folded from the remaining plane."},
        ],
        "material": "3mm mild steel, oxidised and waxed",
        "construction": "Laser-scored, cold-bent, no welds",
        "status": "Prototype 02",
        "images": [
            {"url": f"{IMG}/064828c5bd5ad764824e264cfe04e80bce3272e2560755e5b5a5f4a1257c16f3.jpeg", "caption": "Prototype 02 in the studio."},
            {"url": f"{IMG}/76148321238f1f45a60be6799fbfe9cbea1dcb9f8701d7715b40e84224e3b5bb.jpeg", "caption": "Detail of bent oxidised steel edge."},
        ],
        "cover": f"{IMG}/064828c5bd5ad764824e264cfe04e80bce3272e2560755e5b5a5f4a1257c16f3.jpeg",
        "published": True, "featured": True,
    },
    {
        "title": "Compression Stool", "slug": "compression-stool", "world": "furniture",
        "category": "Stool", "year": "2024", "location": "Studio",
        "role": "Design, fabrication",
        "summary": "Laminated ash pressed until the stack sags — a rigid object recording a force that is no longer there.",
        "concept": "Thin layers of ash are stacked and pressed. The pressure is uneven, so the stack sags and bulges. The stool records a force that is no longer there — it looks soft, but it is completely rigid.",
        "question": "Can a rigid object describe the softness of the body that will sit on it?",
        "operations": ["Compression", "Sagging", "Layering"],
        "transformation": "From stack to seat. The laminations move from geometry to figure; the object gains a posture.",
        "sections": [
            {"heading": "Weight", "text": "The former was shaped by hand while the glue was wet. The stool therefore records two bodies: the one that made it and the one that will sit on it."},
        ],
        "material": "Ash veneer, natural glue, oil finish",
        "construction": "Vacuum-pressed laminations over a deformable former",
        "status": "Edition of 8",
        "images": [
            {"url": f"{IMG}/7644dfb15baca48ec3fa1b4c1c34a68858c35aa99d9590675a1eee6be7c65e52.jpeg", "caption": "Compression Stool, ash."},
        ],
        "cover": f"{IMG}/7644dfb15baca48ec3fa1b4c1c34a68858c35aa99d9590675a1eee6be7c65e52.jpeg",
        "published": True, "featured": False,
    },
    {
        "title": "Split Table", "slug": "split-table", "world": "furniture",
        "category": "Table", "year": "2025", "location": "Studio",
        "role": "Design",
        "summary": "A long oak plane split down its centre — the gap gives the table an axis and two territories.",
        "concept": "A table is a plane. Splitting it introduces a line that cannot be crossed: objects sit on one side or the other. The gap is narrow enough to be safe and wide enough to be seen. It gives the table an axis.",
        "question": "What does a table become when it has a void down its centre?",
        "operations": ["Splitting", "Void creation", "Axis"],
        "transformation": "From slab to instrument. The split defines two territories and a shared line between them.",
        "sections": [
            {"heading": "Exploded", "text": "The two halves are held apart by the frame; the gap is structural and visual."},
            {"heading": "Axis", "text": "The split is not decorative. It aligns the table with the room and gives the people around it a line to speak across."},
        ],
        "material": "Solid dark oak, blackened steel",
        "construction": "Two book-matched planks on a welded steel underframe",
        "status": "In production",
        "images": [
            {"url": f"{IMG}/85da2884a71e70fd7f62385eac1c4d275ebc7a6e3e1efc5dcef2e93ae1fba046.jpeg", "caption": "Split Table, oak and steel."},
            {"url": f"{IMG}/9312208b57feac7e2424dac41adad97384ffce63ea643bb2eb4b2c4a823ba187.jpeg", "caption": "Exploded axonometric — the two halves held apart by the frame."},
        ],
        "cover": f"{IMG}/85da2884a71e70fd7f62385eac1c4d275ebc7a6e3e1efc5dcef2e93ae1fba046.jpeg",
        "published": True, "featured": True,
    },
]


@app.on_event("startup")
async def seed_projects():
    if await db.projects.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        for i, p in enumerate(SEED):
            doc = dict(p)
            doc['id'] = str(uuid.uuid4())
            doc['order'] = i
            doc['created_at'] = now
            await db.projects.insert_one(doc)
        logger.info(f"Seeded {len(SEED)} projects")

    if not await db.settings.find_one({"id": "auth"}):
        await db.settings.insert_one({"id": "auth", "passcode_hash": hash_passcode(EDITOR_PASSCODE)})
        logger.info("Seeded editor passcode")

    if not await db.settings.find_one({"id": "about"}):
        about = dict(DEFAULT_ABOUT)
        about['id'] = 'about'
        await db.settings.insert_one(about)
        logger.info("Seeded about content")


app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
