BEGIN;

WITH source_data(title, category, source, content, version) AS (
    VALUES
    (
        'Rentrée universitaire 2026 - Université de l’Itasy',
        'INSCRIPTION',
        'https://univ-itasy.com/site/index.php',
        'Page officielle de l’Université de l’Itasy consultée le 19 novembre 2026 : la page annonce une rentrée universitaire 2026 et des inscriptions pour l’année universitaire 2026-2027. Elle invite les candidats à découvrir les formations proposées et à utiliser le formulaire d’inscription officiel. Cette page ne précise pas elle-même une date limite générale. Vérifier les modalités actuelles sur https://univ-itasy.com/site/index.php/inscription.',
        'accueil vérifié le 2026-11-19'
    ),
    (
        'Frais de dossier pour la première année - Université de l’Itasy',
        'FRAIS',
        'https://univ-itasy.com/site/index.php/inscription',
        'Source officielle consultée le 19 novembre 2026 : le formulaire de préinscription indique des frais de dossier de 20 000 Ariary, payables par Mvola au 034 67 311 82. La référence de transaction reçue par SMS doit être saisie exactement et peut être vérifiée avec les relevés Mvola officiels. Toute fausse référence peut entraîner le rejet du dossier. Avant tout paiement, vérifier à nouveau le formulaire officiel https://univ-itasy.com/site/index.php/inscription.',
        'page vérifiée le 2026-11-19'
    ),
    (
        'Pièces du dossier de préinscription - Université de l’Itasy',
        'PIECES',
        'https://univ-itasy.com/site/index.php/inscription',
        'Source officielle consultée le 19 novembre 2026 : le formulaire exige les informations d’état civil, les coordonnées, les informations des parents, le numéro d’inscription au Baccalauréat, l’année, la série et le lycée d’origine. Une photo d’identité JPG, PNG ou WEBP de maximum 25 Mo est obligatoire. Le relevé de notes du Baccalauréat est facultatif si le baccalauréat a été obtenu en 2026, et peut être fourni ultérieurement. Le candidat peut sélectionner jusqu’à trois choix de formation.',
        'page vérifiée le 2026-11-19'
    )
), inserted_documents AS (
    INSERT INTO public.documents (title, category, source, content, version, status)
    SELECT s.title, s.category, s.source, s.content, s.version, 'published'
    FROM source_data s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.title = s.title AND d.source = s.source
    )
    RETURNING id, content
)
INSERT INTO public.document_chunks (document_id, content, metadata)
SELECT id, content, jsonb_build_object(
    'source', 'official-udi-website',
    'verified_on', '2026-11-19',
    'official', true
)
FROM inserted_documents;

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'REINSCRIPTION',
    'Réinscription',
    'Aucune procédure générale de réinscription n’a été trouvée dans les pages UDI consultées. Il faut contacter directement l’Université de l’Itasy ou consulter les annonces institutionnelles avant toute démarche.',
    'https://univ-itasy.com/site/index.php/contact',
    NULL,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'REINSCRIPTION' AND title = 'Réinscription'
);

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'HORAIRES',
    'Horaires des services',
    'Aucun horaire général des services n’est publié dans les pages UDI consultées. Les horaires doivent être confirmés auprès de l’Université ou de son service concerné.',
    'https://univ-itasy.com/site/index.php/contact',
    NULL,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'HORAIRES' AND title = 'Horaires des services'
);

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'CALENDRIER',
    'Calendrier des examens',
    'Aucun calendrier officiel des examens n’a été trouvé dans les pages UDI consultées. Seuls certains événements et salons publics sont annoncés sur le site institutionnel.',
    'https://univ-itasy.com/site/index.php/actualite',
    NULL,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'CALENDRIER' AND title = 'Calendrier des examens'
);

INSERT INTO public.categories (name)
SELECT name
FROM (VALUES ('REINSCRIPTION'), ('CALENDRIER'), ('HORAIRES')) AS names(name)
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories c WHERE c.name = names.name
);

WITH category_seed(name) AS (
    VALUES ('REINSCRIPTION'), ('CALENDRIER'), ('HORAIRES')
)
INSERT INTO public.intents (name, description)
SELECT name,
       CASE name
           WHEN 'REINSCRIPTION' THEN 'Questions sur une procédure de réinscription non vérifiée sur les pages consultées.'
           WHEN 'CALENDRIER' THEN 'Questions sur les dates académiques; un calendrier officiel d’examens n’est pas encore publié.'
           ELSE 'Questions sur les horaires des services non vérifiés.'
       END
FROM category_seed
WHERE NOT EXISTS (
    SELECT 1 FROM public.intents i WHERE i.name = category_seed.name
);

UPDATE public.intents i
SET category_id = c.id
FROM public.categories c
WHERE i.name = c.name
  AND i.name IN ('REINSCRIPTION', 'CALENDRIER', 'HORAIRES');

WITH seed(example, intent_name) AS (
    VALUES
        ('Comment faire ma réinscription ?', 'REINSCRIPTION'),
        ('Quels documents pour se réinscrire ?', 'REINSCRIPTION'),
        ('La réinscription est-elle ouverte ?', 'REINSCRIPTION'),
        ('Quel est le calendrier des examens ?', 'CALENDRIER'),
        ('Quand auront lieu les examens ?', 'CALENDRIER'),
        ('Quelles sont les dates du semestre ?', 'CALENDRIER'),
        ('Quels sont les horaires de la scolarité ?', 'HORAIRES'),
        ('À quelle heure ouvre l’université ?', 'HORAIRES'),
        ('À quelle heure ferme le service ?', 'HORAIRES')
)
INSERT INTO public.training_examples (intent_id, text)
SELECT i.id, s.example
FROM seed s
JOIN public.intents i ON i.name = s.intent_name
WHERE NOT EXISTS (
    SELECT 1 FROM public.training_examples e
    WHERE e.intent_id = i.id AND e.text = s.example
);

WITH seed(intent_name, response) AS (
    VALUES
        ('REINSCRIPTION', 'Aucune procédure générale de réinscription n’est publiée dans les pages UDI consultées. Contactez l’université par udifaliarivo@gmail.com ou via la page officielle https://univ-itasy.com/site/index.php/contact.'),
        ('CALENDRIER', 'Aucun calendrier officiel des examens n’est publié dans les pages UDI consultées. Consultez les annonces institutionnelles sur https://univ-itasy.com/site/index.php/actualite.'),
        ('HORAIRES', 'Aucun horaire général n’est publié dans les pages UDI consultées. Contactez directement l’Université de l’Itasy pour confirmation.')
)
INSERT INTO public.intent_responses (intent_id, text)
SELECT i.id, s.response
FROM seed s
JOIN public.intents i ON i.name = s.intent_name
WHERE NOT EXISTS (
    SELECT 1 FROM public.intent_responses r
    WHERE r.intent_id = i.id AND r.text = s.response
);

COMMIT;
