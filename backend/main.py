import csv
import io
import json
import os
from contextlib import contextmanager
from datetime import date
from typing import Annotated, Literal
from uuid import UUID

import httpx
import psycopg
from fastapi import Body, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from psycopg.rows import dict_row
from starlette.responses import Response

try:
    from .nlp import split_document
    from .keyword_rules import extract_entities, match_intent
    from .demo_knowledge import DEMO_SOURCE, demo_answer
except ImportError:
    from nlp import split_document
    from keyword_rules import extract_entities, match_intent
    from demo_knowledge import DEMO_SOURCE, demo_answer

app = FastAPI(title="Assistant Étudiant API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
    ).split(","),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


class Suggestion(BaseModel):
    label: str
    icon: str


class BotReply(BaseModel):
    text: str
    source: str | None = None
    source_url: str | None = None
    intent: str | None = None
    intent_confidence: float | None = None
    verified: bool = True
    warning: str | None = None
    entities: dict[str, str] | None = None
    examples: list[Suggestion] | None = None
    conversation_id: UUID | None = None
    message_id: UUID | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    conversation_id: UUID | None = None

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be blank")
        return value.strip()


class DocumentInput(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    category: str = Field(min_length=2, max_length=60)
    source: str = Field(min_length=4, max_length=1000)
    version: str | None = Field(default=None, max_length=80)
    valid_from: date | None = None
    valid_to: date | None = None
    content: str = Field(min_length=30, max_length=200_000)
    status: str = "draft"

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str) -> str:
        if value not in {"draft", "published", "archived"}:
            raise ValueError("status must be draft, published, or archived")
        return value

    @field_validator("valid_to")
    @classmethod
    def validity_dates(cls, value: date | None, info):
        valid_from = info.data.get("valid_from")
        if value and valid_from and value < valid_from:
            raise ValueError("valid_to must be on or after valid_from")
        return value


class DocumentStatus(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str) -> str:
        if value not in {"draft", "published", "archived"}:
            raise ValueError("status must be draft, published, or archived")
        return value


class FeedbackInput(BaseModel):
    message_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ContactRequestInput(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


class AnnouncementInput(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=10, max_length=20_000)
    source: str = Field(min_length=4, max_length=1000)
    published: bool = False


class UniversityInfoInput(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=10, max_length=20_000)
    source: str = Field(min_length=4, max_length=1000)
    valid_from: date | None = None
    valid_to: date | None = None

    @field_validator("valid_to")
    @classmethod
    def validity_dates(cls, value: date | None, info):
        valid_from = info.data.get("valid_from")
        if value and valid_from and value < valid_from:
            raise ValueError("valid_to must be on or after valid_from")
        return value


class AcademicEventInput(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=20_000)
    category: str = Field(min_length=2, max_length=80)
    source: str = Field(min_length=4, max_length=1000)
    starts_at: date
    ends_at: date | None = None
    published: bool = False

    @field_validator("ends_at")
    @classmethod
    def event_dates(cls, value: date | None, info):
        starts_at = info.data.get("starts_at")
        if value and starts_at and value < starts_at:
            raise ValueError("ends_at must be on or after starts_at")
        return value


class PublicationInput(BaseModel):
    published: bool


class UserStatusUpdate(BaseModel):
    active: bool


class UserRoleUpdate(BaseModel):
    role: Literal["student", "admin", "super_admin"]


class CategoryInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class IntentInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=3, max_length=1000)
    category_id: UUID | None = None


class TrainingExampleInput(BaseModel):
    text: str = Field(min_length=3, max_length=500)

    @field_validator("text")
    @classmethod
    def valid_example(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3 or len(normalized.encode("utf-8")) > 2000:
            raise ValueError("text must contain 3 to 500 characters")
        return normalized


class IntentResponseInput(BaseModel):
    text: str = Field(min_length=3, max_length=5000)

    @field_validator("text")
    @classmethod
    def nonblank_response(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("text must not be blank")
        return normalized


class KnowledgeIntentImport(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=3, max_length=1000)
    category: str | None = Field(default=None, max_length=80)
    examples: list[str] = Field(default_factory=list, max_length=500)
    responses: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("examples")
    @classmethod
    def valid_examples(cls, values: list[str]) -> list[str]:
        for example in values:
            if len(example.strip()) < 3 or len(example.strip().encode("utf-8")) > 2000:
                raise ValueError("each example must contain 3 to 500 characters")
        return values


class KnowledgeImport(BaseModel):
    categories: list[str] = Field(default_factory=list, max_length=200)
    intents: list[KnowledgeIntentImport] = Field(default_factory=list, max_length=500)


class ProfileUpdate(BaseModel):
    filiere: str | None = Field(default=None, max_length=120)
    niveau: str | None = Field(default=None, max_length=80)

    @field_validator("filiere", "niveau")
    @classmethod
    def normalize_profile_field(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


FALLBACK_TEXT = (
    "Je n'ai pas trouvé de réponse confirmée dans les documents disponibles. "
    "Reformulez votre question ou contactez le service de scolarité."
)
EXAMPLES = [
    Suggestion(label="Inscription", icon="document-text-outline"),
    Suggestion(label="Pièces à fournir", icon="folder-outline"),
    Suggestion(label="Certificat de scolarité", icon="school-outline"),
    Suggestion(label="Contact et horaires", icon="call-outline"),
]


@contextmanager
def database():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="Le service documentaire n'est pas configuré.")
    try:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            yield connection
    except HTTPException:
        raise
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail="La base documentaire est indisponible.") from error


def authenticated_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    supabase_url = os.getenv("SUPABASE_URL")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not anon_key:
        raise HTTPException(status_code=503, detail="L'authentification n'est pas configurée.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Connexion requise.")
    try:
        response = httpx.get(
            f"{supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": anon_key, "Authorization": authorization},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Le service d'authentification est indisponible.") from error
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Session invalide ou expirée.")
    user = response.json()
    if not user.get("id"):
        raise HTTPException(status_code=401, detail="Session invalide.")
    with database() as connection:
        profile = connection.execute(
            "SELECT active FROM profiles WHERE id = %s", (user["id"],)
        ).fetchone()
    if not profile:
        raise HTTPException(status_code=403, detail="Profil utilisateur introuvable.")
    if not profile["active"]:
        raise HTTPException(status_code=403, detail="Ce compte a été désactivé.")
    return user


CurrentUser = Annotated[dict, Depends(authenticated_user)]


def user_role(user_id: str) -> str:
    with database() as connection:
        profile = connection.execute(
            "SELECT role FROM profiles WHERE id = %s", (user_id,)
        ).fetchone()
    if not profile:
        raise HTTPException(status_code=403, detail="Profil utilisateur introuvable.")
    return profile["role"]


def administrator(user: CurrentUser) -> dict:
    if user_role(user["id"]) not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Accès réservé à l'administration.")
    return user


AdminUser = Annotated[dict, Depends(administrator)]


def super_administrator(user: CurrentUser) -> dict:
    if user_role(user["id"]) != "super_admin":
        raise HTTPException(status_code=403, detail="Accès réservé au super-administrateur.")
    return user


SuperAdminUser = Annotated[dict, Depends(super_administrator)]


def record_admin_action(connection, user_id: str, action: str, target_id: UUID | None) -> None:
    connection.execute(
        "INSERT INTO admin_logs (admin_id, action, target_id) VALUES (%s, %s, %s)",
        (user_id, action, target_id),
    )


def document_chunks(content: str) -> list[str]:
    chunks = split_document(content)
    if not chunks:
        raise HTTPException(status_code=422, detail="Le document ne contient pas de texte indexable.")
    return chunks


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/me")
def get_current_profile(user: CurrentUser):
    with database() as connection:
        profile = connection.execute(
            "SELECT role, created_at, matricule, filiere, niveau FROM profiles WHERE id = %s",
            (user["id"],),
        ).fetchone()
    if not profile:
        raise HTTPException(status_code=403, detail="Profil utilisateur introuvable.")
    return {"id": user["id"], "email": user.get("email"), **profile}


@app.put("/api/me")
def update_current_profile(request: ProfileUpdate, user: CurrentUser):
    updates = request.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Aucun champ de profil à modifier.")
    assignments = ", ".join(f"{field} = %s" for field in updates)
    values = [*updates.values(), user["id"]]
    with database() as connection:
        profile = connection.execute(
            f"""UPDATE profiles SET {assignments}
                WHERE id = %s
                RETURNING role, created_at, matricule, filiere, niveau""",
            values,
        ).fetchone()
    if not profile:
        raise HTTPException(status_code=403, detail="Profil utilisateur introuvable.")
    return {"id": user["id"], "email": user.get("email"), **profile}


@app.post("/api/chat", response_model=BotReply, response_model_exclude_none=True)
def chat(
    request: ChatRequest,
    user: CurrentUser,
):
    with database() as connection:
        rule_rows = connection.execute(
            """SELECT i.name AS intent, e.text
               FROM intents i
               JOIN training_examples e ON e.intent_id = i.id
               ORDER BY i.name, e.id"""
        ).fetchall()
        intent = match_intent(
            request.message,
            [(row["intent"], row["text"]) for row in rule_rows],
        )
        known_programs = [
            item.strip() for item in os.getenv("KNOWN_FILIERES", "").split(",")
            if item.strip()
        ]
        entities = extract_entities(request.message, known_programs)
        intent_confidence = None
        if request.conversation_id:
            conversation = connection.execute(
                "SELECT id FROM conversations WHERE id = %s AND user_id = %s",
                (request.conversation_id, user["id"]),
            ).fetchone()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation introuvable.")
            conversation_id = conversation["id"]
        else:
            conversation_id = connection.execute(
                "INSERT INTO conversations (user_id) VALUES (%s) RETURNING id",
                (user["id"],),
            ).fetchone()["id"]

        connection.execute(
            """INSERT INTO messages (conversation_id, role, content, intent, confidence, entities)
               VALUES (%s, 'user', %s, %s, %s, %s::jsonb)""",
            (conversation_id, request.message, intent, intent_confidence, json.dumps(entities)),
        )
        match = connection.execute(
            """SELECT c.id AS chunk_id, d.title, d.source, c.content,
                      ts_rank_cd(c.search_vector, plainto_tsquery('french', %s)) AS similarity
               FROM document_chunks c
               JOIN documents d ON d.id = c.document_id
               WHERE d.status = 'published'
                 AND (d.valid_from IS NULL OR d.valid_from <= CURRENT_DATE)
                 AND (d.valid_to IS NULL OR d.valid_to >= CURRENT_DATE)
                 AND c.search_vector @@ plainto_tsquery('french', %s)
               ORDER BY similarity DESC
               LIMIT 1""",
            (request.message, request.message),
        ).fetchone()
        if match and match["similarity"] < 0.02:
            match = None
        examples = None
        if match:
            text, source = match["content"], match["title"]
            candidate_url = match["source"]
            source_url = candidate_url if candidate_url.startswith(("https://", "http://")) else None
            source_chunk_id = match["chunk_id"]
            verified = True
            warning = None
        else:
            verified = False
            intent_response = None
            if intent:
                intent_response = connection.execute(
                    """SELECT r.text
                       FROM intent_responses r
                       JOIN intents i ON i.id = r.intent_id
                       WHERE i.name = %s
                       ORDER BY r.created_at DESC, r.id DESC
                       LIMIT 1""",
                    (intent,),
                ).fetchone()
            if intent_response:
                text = intent_response["text"]
                source = None
                warning = (
                    "Réponse prédéfinie par l’administration, sans document officiel "
                    "correspondant trouvé pour cette question."
                )
            else:
                text = demo_answer(request.message)
                if text:
                    source = DEMO_SOURCE
                    warning = (
                        "Information entièrement fictive pour les tests. Elle ne concerne "
                        "pas l’Université de l’Itasy et ne doit pas servir à une démarche."
                    )
                else:
                    source = None
                    text = (
                        "Je n’ai pas trouvé de réponse dans les documents disponibles. "
                        "Votre question a été enregistrée pour vérification par l’administration."
                    )
                    warning = (
                        "Aucune réponse vérifiée n’est disponible dans la base de connaissances."
                    )
            source_url, source_chunk_id = None, None
            examples = None
            connection.execute(
                "INSERT INTO unknown_questions (user_id, question) VALUES (%s, %s)",
                (user["id"], request.message),
            )

        assistant_message_id = connection.execute(
            """INSERT INTO messages
               (conversation_id, role, content, source_chunk_id, intent, confidence)
               VALUES (%s, 'assistant', %s, %s, %s, %s) RETURNING id""",
            (conversation_id, text, source_chunk_id, intent, intent_confidence),
        ).fetchone()["id"]

    return BotReply(
        text=text,
        source=source,
        source_url=source_url,
        intent=intent,
        intent_confidence=intent_confidence,
        entities=entities or None,
        examples=examples,
        verified=verified,
        warning=warning,
        conversation_id=conversation_id,
        message_id=assistant_message_id,
    )


@app.get("/api/conversations")
def list_conversations(user: CurrentUser, limit: int = Query(default=50, ge=1, le=100)):
    with database() as connection:
        return connection.execute(
            """SELECT c.id, c.created_at,
                      (SELECT m.content FROM messages m WHERE m.conversation_id = c.id
                       AND m.role = 'user' ORDER BY m.created_at LIMIT 1) AS title,
                      (SELECT max(m.created_at) FROM messages m WHERE m.conversation_id = c.id) AS updated_at
               FROM conversations c WHERE c.user_id = %s
               ORDER BY updated_at DESC NULLS LAST LIMIT %s""",
            (user["id"], limit),
        ).fetchall()


@app.delete("/api/conversations")
def delete_all_conversations(user: CurrentUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM conversations WHERE user_id = %s RETURNING id",
            (user["id"],),
        ).fetchall()
    return {"deleted": len(deleted)}


@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: UUID, user: CurrentUser):
    with database() as connection:
        conversation = connection.execute(
            "SELECT id FROM conversations WHERE id = %s AND user_id = %s",
            (conversation_id, user["id"]),
        ).fetchone()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation introuvable.")
        return connection.execute(
            """SELECT m.id, m.role, m.content, m.created_at, m.entities, m.intent,
                      m.confidence, d.title AS source, d.source AS source_url
               FROM messages m LEFT JOIN document_chunks c ON c.id = m.source_chunk_id
               LEFT JOIN documents d ON d.id = c.document_id
               WHERE m.conversation_id = %s ORDER BY m.created_at""",
            (conversation_id,),
        ).fetchall()


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def delete_conversation(conversation_id: UUID, user: CurrentUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM conversations WHERE id = %s AND user_id = %s RETURNING id",
            (conversation_id, user["id"]),
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Conversation introuvable.")


@app.post("/api/feedback", status_code=201)
def submit_feedback(request: FeedbackInput, user: CurrentUser):
    with database() as connection:
        message = connection.execute(
            """SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id
               WHERE m.id = %s AND m.role = 'assistant' AND c.user_id = %s""",
            (request.message_id, user["id"]),
        ).fetchone()
        if not message:
            raise HTTPException(status_code=404, detail="Réponse introuvable.")
        connection.execute(
            "INSERT INTO feedback (message_id, rating, comment) VALUES (%s, %s, %s)",
            (request.message_id, request.rating, request.comment),
        )
    return {"status": "received"}


@app.post("/api/contact", status_code=201)
def create_support_request(request: ContactRequestInput, user: CurrentUser):
    with database() as connection:
        support_request = connection.execute(
            """INSERT INTO support_requests (user_id, question)
               VALUES (%s, %s) RETURNING id, created_at""",
            (user["id"], request.question.strip()),
        ).fetchone()
    return {"status": "received", **support_request}


@app.get("/api/announcements")
def list_announcements(_user: CurrentUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, title, content, source, published_at
               FROM announcements
               WHERE published = true
               ORDER BY published_at DESC, created_at DESC"""
        ).fetchall()


@app.get("/api/info")
def list_university_info(_user: CurrentUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, category, title, content, source, valid_from, valid_to
               FROM university_info
               WHERE published = true
                 AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
                 AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
               ORDER BY category, title"""
        ).fetchall()


@app.get("/api/calendar")
def list_academic_events(_user: CurrentUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, title, description, category, source, starts_at, ends_at
               FROM academic_events
               WHERE published = true
                 AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
               ORDER BY starts_at"""
        ).fetchall()


@app.get("/api/admin/announcements")
def admin_list_announcements(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, title, content, source, published, published_at, created_at
               FROM announcements ORDER BY created_at DESC"""
        ).fetchall()


@app.post("/api/admin/announcements", status_code=201)
def admin_create_announcement(request: AnnouncementInput, user: AdminUser):
    with database() as connection:
        announcement = connection.execute(
            """INSERT INTO announcements (title, content, source, published, published_at)
               VALUES (%s, %s, %s, %s, CASE WHEN %s THEN now() ELSE NULL END)
               RETURNING id, title, content, source, published, published_at""",
            (request.title, request.content, request.source, request.published, request.published),
        ).fetchone()
        record_admin_action(connection, user["id"], "announcement.created", announcement["id"])
    return announcement


@app.put("/api/admin/announcements/{announcement_id}")
def admin_update_announcement(announcement_id: UUID, request: AnnouncementInput, user: AdminUser):
    with database() as connection:
        announcement = connection.execute(
            """UPDATE announcements
               SET title = %s, content = %s, source = %s, published = %s,
                   published_at = CASE WHEN %s THEN coalesce(published_at, now()) ELSE NULL END,
                   updated_at = now()
               WHERE id = %s
               RETURNING id, title, content, source, published, published_at""",
            (request.title, request.content, request.source, request.published,
             request.published, announcement_id),
        ).fetchone()
        if not announcement:
            raise HTTPException(status_code=404, detail="Annonce introuvable.")
        record_admin_action(connection, user["id"], "announcement.updated", announcement_id)
    return announcement


@app.delete("/api/admin/announcements/{announcement_id}", status_code=204)
def admin_delete_announcement(announcement_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM announcements WHERE id = %s RETURNING id", (announcement_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Annonce introuvable.")
        record_admin_action(connection, user["id"], "announcement.deleted", announcement_id)


@app.get("/api/admin/info")
def admin_list_university_info(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, category, title, content, source, valid_from, valid_to,
                      published, created_at
               FROM university_info ORDER BY category, title"""
        ).fetchall()


@app.post("/api/admin/info", status_code=201)
def admin_create_university_info(request: UniversityInfoInput, user: AdminUser):
    with database() as connection:
        item = connection.execute(
            """INSERT INTO university_info
               (category, title, content, source, valid_from, valid_to)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING id, category, title, content, source, valid_from, valid_to, published""",
            (request.category, request.title, request.content, request.source,
             request.valid_from, request.valid_to),
        ).fetchone()
        record_admin_action(connection, user["id"], "university_info.created", item["id"])
    return item


@app.put("/api/admin/info/{info_id}")
def admin_update_university_info(info_id: UUID, request: UniversityInfoInput, user: AdminUser):
    with database() as connection:
        item = connection.execute(
            """UPDATE university_info SET category = %s, title = %s, content = %s,
                      source = %s, valid_from = %s, valid_to = %s, updated_at = now()
               WHERE id = %s
               RETURNING id, category, title, content, source, valid_from, valid_to, published""",
            (request.category, request.title, request.content, request.source,
             request.valid_from, request.valid_to, info_id),
        ).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Information introuvable.")
        record_admin_action(connection, user["id"], "university_info.updated", info_id)
    return item


@app.put("/api/admin/info/{info_id}/publish")
def admin_publish_university_info(info_id: UUID, request: PublicationInput, user: AdminUser):
    with database() as connection:
        item = connection.execute(
            """UPDATE university_info SET published = %s, updated_at = now()
               WHERE id = %s RETURNING id, published""",
            (request.published, info_id),
        ).fetchone()
        if not item:
            raise HTTPException(status_code=404, detail="Information introuvable.")
        record_admin_action(
            connection, user["id"],
            "university_info.published" if request.published else "university_info.unpublished",
            info_id,
        )
    return item


@app.delete("/api/admin/info/{info_id}", status_code=204)
def admin_delete_university_info(info_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM university_info WHERE id = %s RETURNING id", (info_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Information introuvable.")
        record_admin_action(connection, user["id"], "university_info.deleted", info_id)


@app.get("/api/admin/calendar")
def admin_list_academic_events(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, title, description, category, source, starts_at, ends_at,
                      published, created_at
               FROM academic_events ORDER BY starts_at"""
        ).fetchall()


@app.post("/api/admin/calendar", status_code=201)
def admin_create_academic_event(request: AcademicEventInput, user: AdminUser):
    with database() as connection:
        event = connection.execute(
            """INSERT INTO academic_events
               (title, description, category, source, starts_at, ends_at, published)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id, title, description, category, source, starts_at, ends_at, published""",
            (request.title, request.description, request.category, request.source,
             request.starts_at, request.ends_at, request.published),
        ).fetchone()
        record_admin_action(connection, user["id"], "academic_event.created", event["id"])
    return event


@app.put("/api/admin/calendar/{event_id}")
def admin_update_academic_event(event_id: UUID, request: AcademicEventInput, user: AdminUser):
    with database() as connection:
        event = connection.execute(
            """UPDATE academic_events SET title = %s, description = %s, category = %s,
                      source = %s, starts_at = %s, ends_at = %s, published = %s,
                      updated_at = now()
               WHERE id = %s
               RETURNING id, title, description, category, source, starts_at, ends_at, published""",
            (request.title, request.description, request.category, request.source,
             request.starts_at, request.ends_at, request.published, event_id),
        ).fetchone()
        if not event:
            raise HTTPException(status_code=404, detail="Échéance introuvable.")
        record_admin_action(connection, user["id"], "academic_event.updated", event_id)
    return event


@app.delete("/api/admin/calendar/{event_id}", status_code=204)
def admin_delete_academic_event(event_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM academic_events WHERE id = %s RETURNING id", (event_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Échéance introuvable.")
        record_admin_action(connection, user["id"], "academic_event.deleted", event_id)


@app.get("/api/admin/documents")
def admin_list_documents(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT d.id, d.title, d.category, d.source, d.content, d.version, d.valid_from,
                      d.valid_to, d.status, d.created_at, d.updated_at,
                      count(c.id)::integer AS chunk_count
               FROM documents d LEFT JOIN document_chunks c ON c.document_id = d.id
               GROUP BY d.id ORDER BY d.updated_at DESC"""
        ).fetchall()


@app.post("/api/admin/documents", status_code=201)
def admin_create_document(request: DocumentInput, user: AdminUser):
    chunks = document_chunks(request.content)
    with database() as connection:
        document = connection.execute(
            """INSERT INTO documents
               (title, category, source, content, version, valid_from, valid_to, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                request.title,
                request.category,
                request.source,
                request.content,
                request.version,
                request.valid_from,
                request.valid_to,
                request.status,
            ),
        ).fetchone()
        for chunk in chunks:
            connection.execute(
                "INSERT INTO document_chunks (document_id, content) VALUES (%s, %s)",
                (document["id"], chunk),
            )
        record_admin_action(connection, user["id"], "document.created", document["id"])
    return {"id": document["id"], "chunks": len(chunks), "status": request.status}


@app.put("/api/admin/documents/{document_id}")
def admin_update_document(document_id: UUID, request: DocumentInput, user: AdminUser):
    chunks = document_chunks(request.content)
    with database() as connection:
        document = connection.execute(
            """UPDATE documents SET title = %s, category = %s, source = %s, content = %s,
                      version = %s, valid_from = %s, valid_to = %s, status = %s, updated_at = now()
               WHERE id = %s RETURNING id""",
            (request.title, request.category, request.source, request.content, request.version,
             request.valid_from, request.valid_to, request.status, document_id),
        ).fetchone()
        if not document:
            raise HTTPException(status_code=404, detail="Document introuvable.")
        connection.execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))
        for chunk in chunks:
            connection.execute(
                "INSERT INTO document_chunks (document_id, content) VALUES (%s, %s)",
                (document_id, chunk),
            )
        record_admin_action(connection, user["id"], "document.updated", document_id)
    return {"id": document_id, "chunks": len(chunks), "status": request.status}


@app.put("/api/admin/documents/{document_id}/status")
def admin_update_document_status(document_id: UUID, request: DocumentStatus, user: AdminUser):
    with database() as connection:
        document = connection.execute(
            "UPDATE documents SET status = %s, updated_at = now() WHERE id = %s RETURNING id",
            (request.status, document_id),
        ).fetchone()
        if not document:
            raise HTTPException(status_code=404, detail="Document introuvable.")
        record_admin_action(connection, user["id"], f"document.{request.status}", document_id)
    return {"id": document_id, "status": request.status}


@app.delete("/api/admin/documents/{document_id}", status_code=204)
def admin_archive_document(document_id: UUID, user: AdminUser):
    with database() as connection:
        document = connection.execute(
            "UPDATE documents SET status = 'archived', updated_at = now() WHERE id = %s RETURNING id",
            (document_id,),
        ).fetchone()
        if not document:
            raise HTTPException(status_code=404, detail="Document introuvable.")
        record_admin_action(connection, user["id"], "document.archived", document_id)


@app.get("/api/admin/statistics")
def admin_statistics(_user: AdminUser):
    with database() as connection:
        totals = connection.execute(
            """SELECT (SELECT count(*) FROM documents) AS documents,
                      (SELECT count(*) FROM profiles WHERE active) AS users,
                      (SELECT count(*) FROM conversations) AS conversations,
                      (SELECT count(*) FROM messages WHERE role = 'user') AS questions,
                      (SELECT count(*) FROM unknown_questions) AS unknown_questions,
                      (SELECT count(*) FROM feedback) AS feedback_count,
                      (SELECT round(avg(rating)::numeric, 2) FROM feedback) AS average_rating"""
        ).fetchone()
        ratings = connection.execute(
            "SELECT rating, count(*)::integer AS count FROM feedback GROUP BY rating ORDER BY rating"
        ).fetchall()
        top_questions = connection.execute(
            """SELECT content AS question, count(*)::integer AS count
               FROM messages WHERE role = 'user'
               GROUP BY content ORDER BY count DESC, question LIMIT 10"""
        ).fetchall()
        daily_questions = connection.execute(
            """SELECT created_at::date AS day, count(*)::integer AS count
               FROM messages WHERE role = 'user' AND created_at >= CURRENT_DATE - interval '30 days'
               GROUP BY created_at::date ORDER BY day"""
        ).fetchall()
    question_count = totals["questions"] or 0
    unknown_count = totals["unknown_questions"] or 0
    understood_rate = (
        round((question_count - unknown_count) / question_count, 4)
        if question_count else None
    )
    return {
        **totals,
        "understood_rate": understood_rate,
        "ratings": ratings,
        "top_questions": top_questions,
        "daily_questions": daily_questions,
    }


@app.get("/api/admin/users")
def admin_list_users(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT p.id, u.email, p.matricule, p.role, p.filiere, p.niveau,
                      p.active, p.created_at
               FROM profiles p JOIN auth.users u ON u.id = p.id
               ORDER BY p.created_at DESC"""
        ).fetchall()


@app.put("/api/admin/users/{user_id}/status")
def admin_update_user_status(user_id: UUID, request: UserStatusUpdate, user: AdminUser):
    if str(user_id) == user["id"] and not request.active:
        raise HTTPException(status_code=422, detail="Vous ne pouvez pas désactiver votre propre compte.")
    with database() as connection:
        target = connection.execute(
            "SELECT role FROM profiles WHERE id = %s", (user_id,)
        ).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        if target["role"] != "student" and user_role(user["id"]) != "super_admin":
            raise HTTPException(status_code=403, detail="Seul le super-administrateur peut modifier un administrateur.")
        updated = connection.execute(
            "UPDATE profiles SET active = %s WHERE id = %s RETURNING id, active",
            (request.active, user_id),
        ).fetchone()
        record_admin_action(
            connection, user["id"],
            "user.activated" if request.active else "user.deactivated", user_id,
        )
    return updated


@app.put("/api/admin/users/{user_id}/role")
def admin_update_user_role(user_id: UUID, request: UserRoleUpdate, user: SuperAdminUser):
    if str(user_id) == user["id"]:
        raise HTTPException(status_code=422, detail="Vous ne pouvez pas modifier votre propre rôle.")
    with database() as connection:
        updated = connection.execute(
            "UPDATE profiles SET role = %s WHERE id = %s RETURNING id, role",
            (request.role, user_id),
        ).fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
        record_admin_action(connection, user["id"], "user.role_updated", user_id)
    return updated


@app.delete("/api/admin/users/{user_id}", status_code=204)
def admin_delete_user(user_id: UUID, user: SuperAdminUser):
    if str(user_id) == user["id"]:
        raise HTTPException(status_code=422, detail="Vous ne pouvez pas supprimer votre propre compte.")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    if not service_key or not supabase_url:
        raise HTTPException(status_code=503, detail="La suppression de comptes n'est pas configurée côté serveur.")
    try:
        response = httpx.delete(
            f"{supabase_url.rstrip('/')}/auth/v1/admin/users/{user_id}",
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=503, detail="Le service de gestion des comptes est indisponible.") from error
    if response.status_code not in {200, 204}:
        raise HTTPException(status_code=502, detail="Supabase n'a pas supprimé le compte.")
    with database() as connection:
        record_admin_action(connection, user["id"], "user.deleted", user_id)


@app.get("/api/admin/unknown-questions")
def admin_list_unknown_questions(_user: AdminUser, unresolved_only: bool = True):
    with database() as connection:
        return connection.execute(
            """SELECT id, question, user_id, resolved, created_at
               FROM unknown_questions
               WHERE (NOT %s OR resolved = false)
               ORDER BY created_at DESC LIMIT 200""",
            (unresolved_only,),
        ).fetchall()


@app.put("/api/admin/unknown-questions/{question_id}/resolve")
def admin_resolve_unknown_question(question_id: UUID, _user: AdminUser):
    with database() as connection:
        question = connection.execute(
            """UPDATE unknown_questions SET resolved = true, resolved_at = now()
               WHERE id = %s RETURNING id, resolved, resolved_at""",
            (question_id,),
        ).fetchone()
    if not question:
        raise HTTPException(status_code=404, detail="Question inconnue introuvable.")
    return question


@app.get("/api/admin/support-requests")
def admin_list_support_requests(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, user_id, question, resolved, created_at
               FROM support_requests
               WHERE resolved = false
               ORDER BY created_at DESC LIMIT 200"""
        ).fetchall()


@app.put("/api/admin/support-requests/{request_id}/resolve")
def admin_resolve_support_request(request_id: UUID, user: AdminUser):
    with database() as connection:
        support_request = connection.execute(
            """UPDATE support_requests SET resolved = true, resolved_at = now()
               WHERE id = %s RETURNING id, resolved, resolved_at""",
            (request_id,),
        ).fetchone()
        if not support_request:
            raise HTTPException(status_code=404, detail="Demande introuvable.")
        record_admin_action(connection, user["id"], "support_request.resolved", request_id)
    return support_request


@app.get("/api/admin/categories")
def admin_list_categories(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            "SELECT id, name FROM categories ORDER BY name"
        ).fetchall()


@app.post("/api/admin/categories", status_code=201)
def admin_create_category(request: CategoryInput, user: AdminUser):
    with database() as connection:
        category = connection.execute(
            "INSERT INTO categories (name) VALUES (%s) RETURNING id, name",
            (request.name.strip(),),
        ).fetchone()
        record_admin_action(connection, user["id"], "category.created", category["id"])
    return category


@app.put("/api/admin/categories/{category_id}")
def admin_update_category(category_id: UUID, request: CategoryInput, user: AdminUser):
    with database() as connection:
        category = connection.execute(
            "UPDATE categories SET name = %s WHERE id = %s RETURNING id, name",
            (request.name.strip(), category_id),
        ).fetchone()
        if not category:
            raise HTTPException(status_code=404, detail="Catégorie introuvable.")
        record_admin_action(connection, user["id"], "category.updated", category_id)
    return category


@app.delete("/api/admin/categories/{category_id}", status_code=204)
def admin_delete_category(category_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM categories WHERE id = %s RETURNING id", (category_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Catégorie introuvable.")
        record_admin_action(connection, user["id"], "category.deleted", category_id)


@app.get("/api/admin/intents")
def admin_list_intents(_user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT i.id, i.name, i.description, i.category_id, c.name AS category
               FROM intents i LEFT JOIN categories c ON c.id = i.category_id
               ORDER BY i.name"""
        ).fetchall()


@app.post("/api/admin/intents", status_code=201)
def admin_create_intent(request: IntentInput, user: AdminUser):
    with database() as connection:
        intent = connection.execute(
            """INSERT INTO intents (name, description, category_id)
               VALUES (%s, %s, %s) RETURNING id, name, description, category_id""",
            (request.name.strip(), request.description.strip(), request.category_id),
        ).fetchone()
        record_admin_action(connection, user["id"], "intent.created", intent["id"])
    return intent


@app.put("/api/admin/intents/{intent_id}")
def admin_update_intent(intent_id: UUID, request: IntentInput, user: AdminUser):
    with database() as connection:
        intent = connection.execute(
            """UPDATE intents SET name = %s, description = %s, category_id = %s
               WHERE id = %s RETURNING id, name, description, category_id""",
            (request.name.strip(), request.description.strip(), request.category_id, intent_id),
        ).fetchone()
        if not intent:
            raise HTTPException(status_code=404, detail="Intention introuvable.")
        record_admin_action(connection, user["id"], "intent.updated", intent_id)
    return intent


@app.delete("/api/admin/intents/{intent_id}", status_code=204)
def admin_delete_intent(intent_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM intents WHERE id = %s RETURNING id", (intent_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Intention introuvable.")
        record_admin_action(connection, user["id"], "intent.deleted", intent_id)


@app.get("/api/admin/intents/{intent_id}/examples")
def admin_list_intent_examples(intent_id: UUID, _user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, intent_id, text, created_at FROM training_examples
               WHERE intent_id = %s ORDER BY created_at""",
            (intent_id,),
        ).fetchall()


@app.post("/api/admin/intents/{intent_id}/examples", status_code=201)
def admin_create_intent_example(intent_id: UUID, request: TrainingExampleInput, user: AdminUser):
    with database() as connection:
        example = connection.execute(
            """INSERT INTO training_examples (intent_id, text)
               VALUES (%s, %s) RETURNING id, intent_id, text""",
            (intent_id, request.text.strip()),
        ).fetchone()
        record_admin_action(connection, user["id"], "training_example.created", example["id"])
    return example


@app.delete("/api/admin/examples/{example_id}", status_code=204)
def admin_delete_intent_example(example_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM training_examples WHERE id = %s RETURNING id", (example_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Exemple introuvable.")
        record_admin_action(connection, user["id"], "training_example.deleted", example_id)


@app.put("/api/admin/examples/{example_id}")
def admin_update_intent_example(example_id: UUID, request: TrainingExampleInput, user: AdminUser):
        with database() as connection:
            example = connection.execute(
                "UPDATE training_examples SET text = %s WHERE id = %s RETURNING id, intent_id, text",
                (request.text.strip(), example_id),
            ).fetchone()
            if not example:
                raise HTTPException(status_code=404, detail="Exemple introuvable.")
            record_admin_action(connection, user["id"], "training_example.updated", example_id)
        return example


@app.get("/api/admin/intents/{intent_id}/responses")
def admin_list_intent_responses(intent_id: UUID, _user: AdminUser):
    with database() as connection:
        return connection.execute(
            """SELECT id, intent_id, text, created_at FROM intent_responses
               WHERE intent_id = %s ORDER BY created_at""",
            (intent_id,),
        ).fetchall()


@app.post("/api/admin/intents/{intent_id}/responses", status_code=201)
def admin_create_intent_response(intent_id: UUID, request: IntentResponseInput, user: AdminUser):
    with database() as connection:
        response = connection.execute(
            """INSERT INTO intent_responses (intent_id, text)
               VALUES (%s, %s) RETURNING id, intent_id, text""",
            (intent_id, request.text.strip()),
        ).fetchone()
        record_admin_action(connection, user["id"], "intent_response.created", response["id"])
    return response


@app.delete("/api/admin/responses/{response_id}", status_code=204)
def admin_delete_intent_response(response_id: UUID, user: AdminUser):
    with database() as connection:
        deleted = connection.execute(
            "DELETE FROM intent_responses WHERE id = %s RETURNING id", (response_id,)
        ).fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Réponse introuvable.")
        record_admin_action(connection, user["id"], "intent_response.deleted", response_id)


@app.put("/api/admin/responses/{response_id}")
def admin_update_intent_response(response_id: UUID, request: IntentResponseInput, user: AdminUser):
    with database() as connection:
        response = connection.execute(
            "UPDATE intent_responses SET text = %s WHERE id = %s RETURNING id, intent_id, text",
            (request.text.strip(), response_id),
        ).fetchone()
        if not response:
            raise HTTPException(status_code=404, detail="Réponse introuvable.")
        record_admin_action(connection, user["id"], "intent_response.updated", response_id)
    return response


@app.get("/api/admin/knowledge/export")
def admin_export_knowledge(
    _user: AdminUser,
    format: Literal["json", "csv"] = Query(default="json"),
):
    with database() as connection:
        categories = connection.execute(
            "SELECT name FROM categories ORDER BY name"
        ).fetchall()
        rows = connection.execute(
            """SELECT i.name, i.description, c.name AS category,
                      coalesce(array_agg(DISTINCT e.text) FILTER (WHERE e.id IS NOT NULL), ARRAY[]::text[]) AS examples,
                      coalesce(array_agg(DISTINCT r.text) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::text[]) AS responses
               FROM intents i
               LEFT JOIN categories c ON c.id = i.category_id
               LEFT JOIN training_examples e ON e.intent_id = i.id
               LEFT JOIN intent_responses r ON r.intent_id = i.id
               GROUP BY i.id, c.name ORDER BY i.name"""
        ).fetchall()
    export_data = {
        "categories": [row["name"] for row in categories],
        "intents": rows,
    }
    if format == "json":
        return export_data

    output = io.StringIO(newline="")
    writer = csv.DictWriter(
        output,
        fieldnames=["category", "intent", "intent_description", "example", "response"],
    )
    writer.writeheader()
    for row in rows:
        examples = row["examples"] or [""]
        responses = row["responses"] or [""]
        for example in examples:
            for response_text in responses:
                writer.writerow({
                    "category": row["category"] or "",
                    "intent": row["name"],
                    "intent_description": row["description"],
                    "example": example,
                    "response": response_text,
                })
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="uniassist-knowledge.csv"'},
    )


@app.post("/api/admin/knowledge/import", status_code=201)
def admin_import_knowledge(request: KnowledgeImport, user: AdminUser):
    with database() as connection:
        for category_name in request.categories:
            normalized = category_name.strip()
            if normalized:
                connection.execute(
                    """INSERT INTO categories (name) VALUES (%s)
                       ON CONFLICT (name) DO NOTHING""",
                    (normalized,),
                )
        for item in request.intents:
            category_id = None
            if item.category:
                category = connection.execute(
                    """INSERT INTO categories (name) VALUES (%s)
                       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                       RETURNING id""",
                    (item.category.strip(),),
                ).fetchone()
                category_id = category["id"]
            intent = connection.execute(
                """INSERT INTO intents (name, description, category_id)
                   VALUES (%s, %s, %s)
                   ON CONFLICT (name) DO UPDATE
                   SET description = EXCLUDED.description, category_id = EXCLUDED.category_id
                   RETURNING id""",
                (item.name.strip(), item.description.strip(), category_id),
            ).fetchone()
            for example in item.examples:
                normalized_example = example.strip()
                if normalized_example:
                    connection.execute(
                        """INSERT INTO training_examples (intent_id, text)
                           VALUES (%s, %s) ON CONFLICT (intent_id, text) DO NOTHING""",
                        (intent["id"], normalized_example),
                    )
            for response_text in item.responses:
                normalized_response = response_text.strip()
                if normalized_response:
                    connection.execute(
                        """INSERT INTO intent_responses (intent_id, text)
                           SELECT %s, %s
                           WHERE NOT EXISTS (
                             SELECT 1 FROM intent_responses
                             WHERE intent_id = %s AND text = %s
                           )""",
                        (intent["id"], normalized_response, intent["id"], normalized_response),
                    )
        record_admin_action(connection, user["id"], "knowledge.imported", None)
    return {
        "categories": len(request.categories),
        "intents": len(request.intents),
        "status": "imported",
    }


@app.post("/api/admin/knowledge/import.csv", status_code=201)
def admin_import_knowledge_csv(
    csv_content: Annotated[str, Body(media_type="text/csv")],
    user: AdminUser,
):
    reader = csv.DictReader(io.StringIO(csv_content))
    expected = {"intent", "intent_description", "example", "response"}
    if not reader.fieldnames or not expected.issubset(reader.fieldnames):
        raise HTTPException(
            status_code=422,
            detail="Le CSV doit contenir les colonnes intent, intent_description, example et response.",
        )
    grouped: dict[str, dict[str, Any]] = {}
    categories: set[str] = set()
    for row in reader:
        name = (row.get("intent") or "").strip()
        description = (row.get("intent_description") or "").strip()
        if not name or not description:
            raise HTTPException(status_code=422, detail="Chaque ligne CSV doit nommer une intention.")
        category = (row.get("category") or "").strip() or None
        if category:
            categories.add(category)
        item = grouped.setdefault(name, {
            "name": name,
            "description": description,
            "category": category,
            "examples": [],
            "responses": [],
        })
        example = (row.get("example") or "").strip()
        response_text = (row.get("response") or "").strip()
        if example and example not in item["examples"]:
            item["examples"].append(example)
        if response_text and response_text not in item["responses"]:
            item["responses"].append(response_text)
    request = KnowledgeImport(
        categories=sorted(categories),
        intents=[KnowledgeIntentImport.model_validate(item) for item in grouped.values()],
    )
    return admin_import_knowledge(request, user)


@app.post("/api/admin/unknown-questions/{question_id}/convert", status_code=201)
def admin_convert_unknown_question(
    question_id: UUID,
    user: AdminUser,
    intent_id: UUID = Query(),
):
    with database() as connection:
        unknown = connection.execute(
            "SELECT question FROM unknown_questions WHERE id = %s AND resolved = false",
            (question_id,),
        ).fetchone()
        if not unknown:
            raise HTTPException(status_code=404, detail="Question inconnue introuvable ou déjà traitée.")
        example = connection.execute(
            """INSERT INTO training_examples (intent_id, text)
               VALUES (%s, %s) RETURNING id, intent_id, text""",
            (intent_id, unknown["question"]),
        ).fetchone()
        connection.execute(
            "UPDATE unknown_questions SET resolved = true, resolved_at = now() WHERE id = %s",
            (question_id,),
        )
        record_admin_action(connection, user["id"], "unknown_question.converted", question_id)
    return example


@app.get("/api/admin/questions")
def admin_list_questions(_user: AdminUser, limit: int = Query(default=100, ge=1, le=500)):
    with database() as connection:
        return connection.execute(
            """SELECT m.id, m.content AS question, m.intent, m.confidence, m.created_at,
                      u.email, c.id AS conversation_id
               FROM messages m
               JOIN conversations c ON c.id = m.conversation_id
               JOIN auth.users u ON u.id = c.user_id
               WHERE m.role = 'user'
               ORDER BY m.created_at DESC LIMIT %s""",
            (limit,),
        ).fetchall()


@app.get("/api/admin/feedback")
def admin_list_feedback(_user: AdminUser, limit: int = Query(default=100, ge=1, le=500)):
    with database() as connection:
        return connection.execute(
            """SELECT f.id, f.rating, f.comment, f.created_at, m.content AS answer,
                      u.email
               FROM feedback f
               JOIN messages m ON m.id = f.message_id
               JOIN conversations c ON c.id = m.conversation_id
               JOIN auth.users u ON u.id = c.user_id
               ORDER BY f.created_at DESC LIMIT %s""",
            (limit,),
        ).fetchall()


