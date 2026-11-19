BEGIN;

INSERT INTO public.announcements (title, content, source, published, published_at)
SELECT
    'Avis aux bacheliers - Délivrance du diplôme',
    'La demande de délivrance du diplôme du Baccalauréat est ouverte auprès de l’Université de l’Itasy. Les pièces demandées comprennent une demande manuscrite, le relevé original du BACC, une copie conforme de la CIN ou une copie d’acte de naissance pour les mineurs, et le reçu de paiement. Le droit annoncé est de 30 000 Ariary sur le compte BOA de l’Office du Baccalauréat Itasy.',
    'https://univ-itasy.com/site/index.php/actualite',
    true,
    '2026-09-16T00:00:00Z'
WHERE NOT EXISTS (
    SELECT 1 FROM public.announcements
    WHERE title = 'Avis aux bacheliers - Délivrance du diplôme'
);

INSERT INTO public.announcements (title, content, source, published, published_at)
SELECT
    'Inscriptions en ligne 2026-2027',
    'L’Université de l’Itasy annonce l’ouverture des inscriptions en ligne pour la sélection en première année de l’année universitaire 2026-2027. Le formulaire demande les informations du candidat, une photo d’identité et permet jusqu’à trois choix de formation.',
    'https://univ-itasy.com/site/index.php/inscription',
    true,
    '2026-09-05T00:00:00Z'
WHERE NOT EXISTS (
    SELECT 1 FROM public.announcements
    WHERE title = 'Inscriptions en ligne 2026-2027'
);

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'CONTACT',
    'Coordonnées publiées',
    'La page officielle de contact publie l’adresse udifaliarivo@gmail.com. Le numéro affiché est incomplètement masqué sur la page (+261 xx xxx xx). Vérifier directement auprès de l’université avant tout déplacement.',
    'https://univ-itasy.com/site/index.php/contact',
    NULL,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'CONTACT' AND title = 'Coordonnées publiées'
);

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'FORMATION',
    'Cinq domaines d’études',
    'Le site officiel présente cinq domaines : Sciences de l’Ingénieur, Sciences et technologie, Sciences de la société, Arts, lettres et sciences humaines, et Sciences de la Santé. Les mentions et parcours exacts doivent être vérifiés sur la page des formations.',
    'https://univ-itasy.com/site/index.php/formation',
    NULL,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'FORMATION' AND title = 'Cinq domaines d’études'
);

INSERT INTO public.university_info (category, title, content, source, valid_from, valid_to, published)
SELECT
    'RESULTATS',
    'Résultats du Baccalauréat 2026',
    'L’Université de l’Itasy publie les listes officielles des résultats du Baccalauréat 2026 de la région Itasy sous forme d’images consultables directement sur son site.',
    'https://univ-itasy.com/site/index.php/resultats-bac',
    '2026-09-01',
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.university_info
    WHERE category = 'RESULTATS' AND title = 'Résultats du Baccalauréat 2026'
);

INSERT INTO public.academic_events (title, description, category, source, starts_at, ends_at, published)
SELECT
    'Salon de l’étudiant - Tsiroanomandidy',
    'Salon de l’étudiant organisé par l’Université de l’Itasy à Tsiroanomandidy, dans la région de Bongolava.',
    'ORIENTATION',
    'https://univ-itasy.com/site/index.php/actualite',
    '2026-09-18',
    '2026-09-18',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_events
    WHERE title = 'Salon de l’étudiant - Tsiroanomandidy'
);

INSERT INTO public.academic_events (title, description, category, source, starts_at, ends_at, published)
SELECT
    'Salon de l’étudiant - Arivonimamo et Faratsiho',
    'Le Salon de l’étudiant s’est tenu à Arivonimamo le 4 septembre 2026 et à Faratsiho le 5 septembre 2026.',
    'ORIENTATION',
    'https://univ-itasy.com/site/index.php/actualite',
    '2026-09-04',
    '2026-09-05',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_events
    WHERE title = 'Salon de l’étudiant - Arivonimamo et Faratsiho'
);

INSERT INTO public.academic_events (title, description, category, source, starts_at, ends_at, published)
SELECT
    'Salon de l’étudiant - Esplanade Ankatso',
    'Présence de l’Université de l’Itasy au stand n°08 de l’Esplanade d’Ankatso à Antananarivo.',
    'ORIENTATION',
    'https://univ-itasy.com/site/index.php/actualite',
    '2026-09-03',
    '2026-09-04',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_events
    WHERE title = 'Salon de l’étudiant - Esplanade Ankatso'
);

INSERT INTO public.categories (name)
SELECT name FROM (VALUES
    ('INSCRIPTION'),
    ('REINSCRIPTION'),
    ('PIECES'),
    ('CERTIFICAT'),
    ('RELEVE'),
    ('CALENDRIER'),
    ('FRAIS'),
    ('CONTACT'),
    ('HORAIRES'),
    ('FORMATION')
) AS names(name)
WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.name = names.name);

INSERT INTO public.intents (name, description)
SELECT
    'FORMATION',
    'Questions sur les domaines et filières proposés.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.intents
    WHERE name = 'FORMATION'
);

WITH data(intent_name, description, category_name, examples, responses) AS (
    VALUES
    (
        'INSCRIPTION',
        'Questions sur l’inscription et la préinscription à l’Université de l’Itasy.',
        'INSCRIPTION',
        ARRAY[
            'Comment faire mon inscription pour la première année ?',
            'Où trouver le formulaire d’inscription UDI ?',
            'Quelles pièces faut-il pour mon inscription ?'
        ],
        ARRAY[
            'Pour l’année 2026-2027, utilisez le formulaire officiel de préinscription UDI, vérifiez les pièces demandées et les modalités de paiement publiées sur https://univ-itasy.com/site/index.php/inscription.'
        ]
    ),
    (
        'PIECES',
        'Questions sur les pièces justificatives demandées.',
        'PIECES',
        ARRAY[
            'Quels documents faut-il pour l’inscription ?',
            'Une photo est-elle obligatoire ?',
            'Ai-je besoin du relevé du baccalauréat ?'
        ],
        ARRAY[
            'Le formulaire demande une photo d’identité, des informations d’état civil et du baccalauréat. Le relevé du BACC peut être fourni ultérieurement si le baccalauréat est obtenu en 2026.'
        ]
    ),
    (
        'FRAIS',
        'Questions sur les frais de dossier publiquement confirmés.',
        'FRAIS',
        ARRAY[
            'Quel est le montant des frais de dossier ?',
            'Comment payer les frais d’inscription ?',
            'Quel numéro Mvola pour payer ?'
        ],
        ARRAY[
            'La page officielle annonce 20 000 Ariary par Mvola au numéro 034 67 311 82. Vérifiez toujours la source officielle avant tout paiement.'
        ]
    ),
    (
        'CERTIFICAT',
        'Questions sur les certificats et diplômes.',
        'CERTIFICAT',
        ARRAY[
            'Comment demander mon diplôme de baccalauréat ?',
            'Quels documents pour la délivrance du diplôme ?',
            'Combien coûte la délivrance du diplôme ?'
        ],
        ARRAY[
            'La demande est adressée au Président de l’Université de l’Itasy avec les pièces annoncées dans l’avis officiel. Le droit publié est de 30 000 Ariary.'
        ]
    ),
    (
        'RELEVE',
        'Questions sur les relevés et résultats du baccalauréat.',
        'RELEVE',
        ARRAY[
            'Où consulter les résultats du baccalauréat 2026 ?',
            'Les résultats Itasy sont-ils publiés ?',
            'Puis-je voir les listes des admis ?'
        ],
        ARRAY[
            'Les résultats du Baccalauréat 2026 sont consultables directement sur la page officielle UDI des résultats : https://univ-itasy.com/site/index.php/resultats-bac.'
        ]
    ),
    (
        'CONTACT',
        'Questions sur les coordonnées de l’Université de l’Itasy.',
        'CONTACT',
        ARRAY[
            'Quel est le contact de l’université ?',
            'Comment contacter la scolarité ?',
            'Quelle adresse électronique pour l’UDI ?'
        ],
        ARRAY[
            'La page officielle publie udifaliarivo@gmail.com. Le téléphone affiché est masqué; utilisez le formulaire ou l’adresse publiée pour confirmation.'
        ]
    ),
    (
        'FORMATION',
        'Questions sur les domaines et filières.',
        'FORMATION',
        ARRAY[
            'Quelles formations sont proposées ?',
            'Quels domaines d’études à l’UDI ?',
            'Y a-t-il des sciences de la santé ?'
        ],
        ARRAY[
            'Le site présente Sciences de l’Ingénieur, Sciences et technologie, Sciences de la société, Arts, lettres et sciences humaines, et Sciences de la Santé.'
        ]
    )
),
upserted AS (
    UPDATE public.intents i
    SET description = d.description,
        category_id = c.id
    FROM data d
    JOIN public.categories c ON c.name = d.category_name
    WHERE i.name = d.intent_name
    RETURNING i.id, i.name
)
SELECT 1
WHERE EXISTS (SELECT 1 FROM upserted);

WITH category_map(category_name, intent_name) AS (
    VALUES
        ('INSCRIPTION','INSCRIPTION'),
        ('PIECES','PIECES'),
        ('FRAIS','FRAIS'),
        ('CERTIFICAT','CERTIFICAT'),
        ('RELEVE','RELEVE'),
        ('CONTACT','CONTACT'),
        ('FORMATION','FORMATION')
),
seed(example, intent_name) AS (
    VALUES
        ('Comment faire mon inscription pour la première année ?', 'INSCRIPTION'),
        ('Où trouver le formulaire d’inscription UDI ?', 'INSCRIPTION'),
        ('Quelles pièces faut-il pour mon inscription ?', 'INSCRIPTION'),
        ('Quels documents faut-il pour l’inscription ?', 'PIECES'),
        ('Une photo est-elle obligatoire ?', 'PIECES'),
        ('Ai-je besoin du relevé du baccalauréat ?', 'PIECES'),
        ('Quel est le montant des frais de dossier ?', 'FRAIS'),
        ('Comment payer les frais d’inscription ?', 'FRAIS'),
        ('Quel numéro Mvola pour payer ?', 'FRAIS'),
        ('Comment demander mon diplôme de baccalauréat ?', 'CERTIFICAT'),
        ('Quels documents pour la délivrance du diplôme ?', 'CERTIFICAT'),
        ('Combien coûte la délivrance du diplôme ?', 'CERTIFICAT'),
        ('Où consulter les résultats du baccalauréat 2026 ?', 'RELEVE'),
        ('Les résultats Itasy sont-ils publiés ?', 'RELEVE'),
        ('Quel est le contact de l’université ?', 'CONTACT'),
        ('Quelle adresse électronique pour l’UDI ?', 'CONTACT'),
        ('Quelles formations sont proposées ?', 'FORMATION'),
        ('Quels domaines d’études à l’UDI ?', 'FORMATION')
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
        ('INSCRIPTION', 'Pour l’année 2026-2027, utilisez le formulaire officiel de préinscription UDI, vérifiez les pièces demandées et les modalités de paiement publiées sur https://univ-itasy.com/site/index.php/inscription.'),
        ('PIECES', 'Le formulaire demande une photo d’identité, des informations d’état civil et du baccalauréat. Le relevé du BACC peut être fourni ultérieurement si le baccalauréat est obtenu en 2026.'),
        ('FRAIS', 'La page officielle annonce 20 000 Ariary par Mvola au numéro 034 67 311 82. Vérifiez toujours la source officielle avant tout paiement.'),
        ('CERTIFICAT', 'La demande est adressée au Président de l’Université de l’Itasy avec les pièces annoncées dans l’avis officiel. Le droit publié est de 30 000 Ariary.'),
        ('RELEVE', 'Les résultats du Baccalauréat 2026 sont consultables directement sur la page officielle UDI : https://univ-itasy.com/site/index.php/resultats-bac.'),
        ('CONTACT', 'La page officielle publie udifaliarivo@gmail.com. Le téléphone affiché est masqué; utilisez l’adresse publiée pour confirmation.'),
        ('FORMATION', 'Le site présente Sciences de l’Ingénieur, Sciences et technologie, Sciences de la société, Arts, lettres et sciences humaines, et Sciences de la Santé.')
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
