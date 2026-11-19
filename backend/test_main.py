from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

import main
from main import app
from nlp import split_document
from keyword_rules import extract_entities, match_intent


client = TestClient(app)
app.dependency_overrides[main.authenticated_user] = lambda: {"id": "student-id", "email": "student@example.test"}
CONVERSATION_ID = "12345678-1234-5678-1234-567812345678"
MESSAGE_ID = "87654321-4321-8765-4321-876543218765"


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_current_profile_returns_academic_fields(monkeypatch):
    database_mock(monkeypatch, [{
        "role": "student",
        "created_at": "2026-01-01T00:00:00Z",
        "filiere": "Informatique",
        "niveau": "Licence 2",
    }])

    response = client.get("/api/me")

    assert response.status_code == 200
    assert response.json()["filiere"] == "Informatique"
    assert response.json()["niveau"] == "Licence 2"


def test_student_can_delete_all_and_only_own_conversations(monkeypatch):
    connection = database_mock(monkeypatch, [
        [{"id": CONVERSATION_ID}, {"id": "another-own-conversation"}],
    ])

    response = client.delete("/api/conversations")

    assert response.status_code == 200
    assert response.json() == {"deleted": 2}
    query, parameters = connection.execute.call_args.args
    assert "WHERE user_id = %s" in query
    assert parameters == ("student-id",)


def test_student_can_update_only_academic_profile_fields(monkeypatch):
    connection = database_mock(monkeypatch, [{
        "role": "student",
        "created_at": "2026-01-01T00:00:00Z",
        "filiere": "Mathématiques",
        "niveau": "Licence 3",
    }])

    response = client.put(
        "/api/me",
        json={"filiere": "  Mathématiques  ", "niveau": "Licence 3", "role": "admin"},
    )

    assert response.status_code == 200
    assert response.json()["filiere"] == "Mathématiques"
    query, parameters = connection.execute.call_args.args
    update_clause = query.split("WHERE", maxsplit=1)[0]
    assert "role" not in update_clause
    assert parameters == ["Mathématiques", "Licence 3", "student-id"]


def test_profile_update_rejects_empty_payload():
    response = client.put("/api/me", json={})

    assert response.status_code == 422


def test_student_content_routes_use_published_records(monkeypatch):
    results = [
        [{"id": "announcement-id", "title": "Annonce", "content": "Texte officiel."}],
        [{"id": "info-id", "title": "Frais", "content": "Information officielle."}],
        [{"id": "event-id", "title": "Examens", "starts_at": "2026-12-01"}],
    ]
    monkeypatch.setenv("DATABASE_URL", "postgresql://test")
    cursors = []
    for result in results:
        cursor = MagicMock()
        cursor.fetchall.return_value = result
        cursors.append(cursor)
    connection = MagicMock()
    connection.execute.side_effect = cursors
    connection_context = MagicMock()
    connection_context.__enter__.return_value = connection
    monkeypatch.setattr(main.psycopg, "connect", lambda *args, **kwargs: connection_context)

    responses = [
        client.get("/api/announcements"),
        client.get("/api/info"),
        client.get("/api/calendar"),
    ]

    assert [response.status_code for response in responses] == [200, 200, 200]
    assert [response.json()[0]["id"] for response in responses] == [
        "announcement-id", "info-id", "event-id",
    ]
    assert all("published = true" in call.args[0] for call in connection.execute.call_args_list)


def test_admin_can_create_announcement(monkeypatch):
    announcement = {
        "id": "announcement-id",
        "title": "Rentrée",
        "content": "Informations détaillées sur la rentrée universitaire.",
        "source": "https://universite.example/rentree",
        "published": False,
        "published_at": None,
    }
    connection = database_mock(monkeypatch, [
        {"role": "admin"},
        announcement,
        None,
    ])

    response = client.post(
        "/api/admin/announcements",
        json={
            "title": "Rentrée",
            "content": "Informations détaillées sur la rentrée universitaire.",
            "source": "https://universite.example/rentree",
        },
    )

    assert response.status_code == 201
    assert response.json()["published"] is False
    assert connection.execute.call_count == 3


def test_admin_can_export_knowledge_as_json(monkeypatch):
    database_mock(monkeypatch, [
        {"role": "admin"},
        [{"name": "Inscriptions"}],
        [{"name": "inscription", "description": "Démarches d'inscription.",
          "category": "Inscriptions", "examples": ["Comment m'inscrire ?"],
          "responses": ["Présentez un dossier."]}],
    ])

    response = client.get("/api/admin/knowledge/export?format=json")

    assert response.status_code == 200
    assert response.json()["categories"] == ["Inscriptions"]
    assert response.json()["intents"][0]["examples"] == ["Comment m'inscrire ?"]


def test_admin_csv_import_rejects_missing_required_columns(monkeypatch):
    database_mock(monkeypatch, [{"role": "admin"}])

    response = client.post(
        "/api/admin/knowledge/import.csv",
        content="title,content\nexample,text",
        headers={"Content-Type": "text/csv"},
    )

    assert response.status_code == 422
    assert "colonnes" in response.json()["detail"]


def test_academic_event_rejects_invalid_date_range(monkeypatch):
    database_mock(monkeypatch, [{"role": "admin"}])

    response = client.post(
        "/api/admin/calendar",
        json={
            "title": "Examens",
            "description": "Période des examens de fin de semestre.",
            "category": "EXAMEN",
            "source": "https://universite.example/examens",
            "starts_at": "2026-12-10",
            "ends_at": "2026-12-01",
        },
    )

    assert response.status_code == 422


def test_disabled_account_is_rejected_after_supabase_identity_check(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "public-test-key")
    response = MagicMock(status_code=200)
    response.json.return_value = {"id": "student-id", "email": "student@example.test"}
    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: response)
    database_mock(monkeypatch, [{"active": False}])

    with pytest.raises(HTTPException) as error:
        main.authenticated_user("Bearer valid-test-token")

    assert error.value.status_code == 403
    assert error.value.detail == "Ce compte a été désactivé."


def test_admin_cannot_deactivate_another_admin(monkeypatch):
    database_mock(monkeypatch, [{"role": "admin"}, {"role": "super_admin"}, {"role": "admin"}])

    response = client.put(
        "/api/admin/users/87654321-4321-8765-4321-876543218765/status",
        json={"active": False},
    )

    assert response.status_code == 403
    assert "super-administrateur" in response.json()["detail"]


def test_account_deletion_fails_explicitly_without_server_service_key(monkeypatch):
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    database_mock(monkeypatch, [{"role": "super_admin"}])

    response = client.delete("/api/admin/users/87654321-4321-8765-4321-876543218765")

    assert response.status_code == 503
    assert "pas configurée" in response.json()["detail"]


def test_keyword_rules_match_only_unambiguous_explicit_phrases():
    rules = [
        ("inscription", "Comment faire mon inscription"),
        ("inscription", "Déposer un dossier inscription"),
        ("bourse", "Demande bourse financière"),
        ("aide", "Demande aide financière"),
    ]

    assert match_intent("COMMENT faire mon inscription à l’UDI ?", rules) == "inscription"
    assert match_intent("demande de bourse financière", rules) == "bourse"
    assert match_intent("demande aide financière et bourse", rules) is None
    assert match_intent("je voudrais connaître l'université", rules) is None


def test_nlp_extracts_only_dates_levels_and_configured_programs():
    entities = extract_entities(
        "Je suis en L2 informatique, rendez-vous le 03/04/2027.",
        ["Informatique", "Mathématiques"],
    )

    assert entities == {
        "date": "2027-04-03",
        "niveau": "Licence 2",
        "filiere": "Informatique",
    }
    assert extract_entities("Date invalide 31/02/2027") == {}


def test_chat_uses_only_stored_answers_or_a_clear_no_answer_message(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ENABLE_DEMO_KNOWLEDGE", "true")
    connection = database_mock(monkeypatch, [
        [],
        {"id": CONVERSATION_ID},
        None,
        None,
        None,
        {"id": MESSAGE_ID},
    ])
    monkeypatch.setattr(
        main.httpx,
        "post",
        lambda *_args, **_kwargs: pytest.fail("Aucun appel à un modèle externe n'est attendu"),
    )

    response = client.post("/api/chat", json={"message": "Question sur l'inscription"})

    assert response.status_code == 200
    assert "Je n’ai pas trouvé de réponse" in response.json()["text"]
    assert "source" not in response.json()
    assert "intent" not in response.json()
    assert response.json()["verified"] is False
    assert "Aucune réponse vérifiée" in response.json()["warning"]
    assert any("unknown_questions" in call.args[0] for call in connection.execute.call_args_list)


def test_chat_demo_answer_is_fictional_and_only_available_in_development(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("ENABLE_DEMO_KNOWLEDGE", "true")
    database_mock(monkeypatch, [
        [],
        {"id": CONVERSATION_ID},
        None,
        None,
        None,
        {"id": MESSAGE_ID},
    ])

    response = client.post(
        "/api/chat",
        json={
            "message": "Quelles sont les dates fictives d'inscription à l'Université Exemple ?"
        },
    )

    assert response.status_code == 200
    assert response.json()["text"].startswith("FICTIF — Université Exemple")
    assert response.json()["source"] == main.DEMO_SOURCE
    assert response.json()["verified"] is False
    assert "ne concerne pas l’Université de l’Itasy" in response.json()["warning"]


def test_chat_uses_an_admin_written_answer_for_a_matching_keyword_rule(monkeypatch):
    database_mock(monkeypatch, [
        [{"intent": "INSCRIPTION", "text": "Comment faire mon inscription"}],
        {"id": CONVERSATION_ID},
        None,
        None,
        {"text": "Consultez la réponse validée par l’administration."},
        None,
        {"id": MESSAGE_ID},
    ])

    response = client.post(
        "/api/chat",
        json={"message": "Comment faire mon inscription à l’UDI ?"},
    )

    assert response.status_code == 200
    assert response.json()["intent"] == "INSCRIPTION"
    assert response.json()["text"] == "Consultez la réponse validée par l’administration."
    assert response.json()["verified"] is False
    assert "Réponse prédéfinie" in response.json()["warning"]


def test_student_can_send_support_request(monkeypatch):
    database_mock(monkeypatch, [{
        "id": "request-id",
        "created_at": "2026-01-01T00:00:00Z",
    }])

    response = client.post(
        "/api/contact",
        json={"question": "Je ne trouve pas la procédure de réinscription."},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "received"


def test_chat_without_database_is_unavailable(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    response = client.post("/api/chat", json={"message": "Comment faire mon inscription ?"})
    assert response.status_code == 503


def database_mock(monkeypatch, execute_results):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test")
    cursors = []
    for result in execute_results:
        cursor = MagicMock()
        cursor.fetchone.return_value = result
        cursor.fetchall.return_value = result if isinstance(result, list) else []
        cursors.append(cursor)
    connection = MagicMock()
    connection.execute.side_effect = cursors
    connection_context = MagicMock()
    connection_context.__enter__.return_value = connection
    monkeypatch.setattr(main.psycopg, "connect", lambda *args, **kwargs: connection_context)
    return connection


def test_chat_returns_matching_document_and_source(monkeypatch):
    database_mock(monkeypatch, [
        [],
        {"id": CONVERSATION_ID},
        None,
        {"chunk_id": "chunk-id", "title": "Procédure d'inscription",
         "source": "https://universite.example/inscription",
         "content": "Déposez votre dossier auprès du service de scolarité.",
         "similarity": 0.2},
        {"id": MESSAGE_ID},
    ])

    response = client.post("/api/chat", json={"message": "Comment m'inscrire ?"})

    assert response.status_code == 200
    assert response.json()["text"] == "Déposez votre dossier auprès du service de scolarité."
    assert response.json()["source"] == "Procédure d'inscription"
    assert response.json()["source_url"] == "https://universite.example/inscription"


def test_chat_without_matching_document_returns_refusal(monkeypatch):
    connection = database_mock(monkeypatch, [
        [], {"id": CONVERSATION_ID}, None, None, None, {"id": MESSAGE_ID},
    ])
    response = client.post("/api/chat", json={"message": "Quel temps fera-t-il demain ?"})

    assert response.status_code == 200
    assert "Je n’ai pas trouvé de réponse" in response.json()["text"]
    assert "examples" not in response.json()
    assert any("unknown_questions" in call.args[0] for call in connection.execute.call_args_list)


def test_chat_uses_full_text_without_embeddings(monkeypatch):
    connection = database_mock(monkeypatch, [
        [],
        {"id": CONVERSATION_ID},
        None,
        {"chunk_id": "demo-chunk", "title": "DEMO NON OFFICIELLE",
         "source": "Donnée technique", "content": "Démonstration uniquement, contenu fictif.",
         "similarity": 0.2},
        {"id": MESSAGE_ID},
    ])
    response = client.post("/api/chat", json={"message": "inscription universitaire"})

    assert response.status_code == 200
    assert response.json()["source"] == "DEMO NON OFFICIELLE"
    assert "plainto_tsquery('french'" in connection.execute.call_args_list[3].args[0]
    assert "match_document_chunks" not in connection.execute.call_args_list[3].args[0]


def test_invalid_question_is_rejected():
    response = client.post("/api/chat", json={"message": "   "})
    assert response.status_code == 422


def test_admin_routes_reject_student(monkeypatch):
    database_mock(monkeypatch, [{"role": "student"}])
    response = client.get("/api/admin/documents")
    assert response.status_code == 403


def test_document_rejects_invalid_date_range(monkeypatch):
    database_mock(monkeypatch, [{"role": "admin"}])
    response = client.post(
        "/api/admin/documents",
        json={
            "title": "Procédure officielle",
            "category": "INSCRIPTION",
            "source": "https://universite.example/document.pdf",
            "valid_from": "2026-10-10",
            "valid_to": "2026-10-01",
            "content": "Procédure administrative officielle avec le détail nécessaire.",
        },
    )
    assert response.status_code == 422


def test_student_can_delete_own_conversation(monkeypatch):
    database_mock(monkeypatch, [{"id": CONVERSATION_ID}])
    response = client.delete(f"/api/conversations/{CONVERSATION_ID}")
    assert response.status_code == 204


def test_student_cannot_delete_another_users_conversation(monkeypatch):
    database_mock(monkeypatch, [None])
    response = client.delete(f"/api/conversations/{CONVERSATION_ID}")
    assert response.status_code == 404


def test_document_chunking():
    chunks = split_document("A" * 1300)
    assert len(chunks) == 2
    assert chunks[0][-100:] == chunks[1][:100]
