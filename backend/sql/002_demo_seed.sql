INSERT INTO public.intents (name, description) VALUES
    ('INSCRIPTION', 'Questions sur l’inscription universitaire.'),
    ('REINSCRIPTION', 'Questions sur la réinscription universitaire.'),
    ('PIECES', 'Questions sur les pièces et justificatifs demandés.'),
    ('CERTIFICAT', 'Questions sur les certificats et attestations.'),
    ('RELEVE', 'Questions sur les relevés de notes.'),
    ('CALENDRIER', 'Questions sur les dates et échéances.'),
    ('FRAIS', 'Questions sur les frais publiquement validés.'),
    ('CONTACT', 'Questions sur les services et contacts.'),
    ('HORAIRES', 'Questions sur les horaires des services.'),
    ('HORS_PERIMETRE', 'Questions sans réponse dans les sources validées.')
ON CONFLICT (name) DO NOTHING;

WITH demo_document AS (
    INSERT INTO public.documents (title, category, source, content, version, status)
    SELECT
        'DEMO NON OFFICIELLE - Assistant en mode test',
        'DEMO',
        'Donnée technique générée pour tester l’application; aucune source universitaire.',
        'DÉMONSTRATION UNIQUEMENT. Ce contenu est fictif et ne constitue pas une procédure universitaire officielle. Les informations sur l’inscription, la réinscription, les pièces justificatives, le certificat de scolarité, les relevés, le calendrier, les frais, les contacts et les horaires doivent être ajoutées à partir de documents autorisés, vérifiés et validés par l’université. Ne prenez aucune décision administrative à partir de cette fiche de test. Consultez le service de scolarité et les sources institutionnelles de votre établissement.',
        'demo-v1',
        'published'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.documents
        WHERE source = 'Donnée technique générée pour tester l’application; aucune source universitaire.'
          AND title = 'DEMO NON OFFICIELLE - Assistant en mode test'
    )
    RETURNING id, content
)
INSERT INTO public.document_chunks (document_id, content, metadata)
SELECT id, content, jsonb_build_object('demo', true, 'official', false)
FROM demo_document;

INSERT INTO public.document_chunks (document_id, content, metadata)
SELECT d.id, d.content, jsonb_build_object('demo', true, 'official', false)
FROM public.documents d
WHERE d.title = 'DEMO NON OFFICIELLE - Assistant en mode test'
  AND d.source = 'Donnée technique générée pour tester l’application; aucune source universitaire.'
  AND NOT EXISTS (
      SELECT 1 FROM public.document_chunks c
      WHERE c.document_id = d.id AND c.metadata @> '{"demo": true}'::jsonb
  );
