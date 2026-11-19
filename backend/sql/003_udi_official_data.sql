BEGIN;

UPDATE public.documents
SET status = 'archived', updated_at = now()
WHERE title = 'DEMO NON OFFICIELLE - Assistant en mode test'
  AND source = 'Donnée technique générée pour tester l’application; aucune source universitaire.';

INSERT INTO public.intents (name, description) VALUES
    ('INSCRIPTION', 'Préinscription officielle en première année à l’Université de l’Itasy.'),
    ('REINSCRIPTION', 'Réinscription à vérifier auprès du service de scolarité de l’UDI.'),
    ('PIECES', 'Pièces justificatives publiées par l’Université de l’Itasy.'),
    ('CERTIFICAT', 'Certificats et attestations à confirmer auprès de la scolarité UDI.'),
    ('RELEVE', 'Relevés et résultats à confirmer auprès de la scolarité UDI.'),
    ('CALENDRIER', 'Dates officielles publiées par l’Université de l’Itasy.'),
    ('FRAIS', 'Frais de dossier explicitement publiés par l’UDI.'),
    ('CONTACT', 'Coordonnées publiées par le site institutionnel de l’UDI.'),
    ('HORAIRES', 'Horaires à confirmer auprès de l’UDI; aucun horaire général vérifié.'),
    ('HORS_PERIMETRE', 'Demande non couverte par les sources UDI publiées et indexées.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

WITH source_data(title, category, source, content, version) AS (
    VALUES
    (
        'Préinscription en première année 2026-2027 - Université de l’Itasy',
        'INSCRIPTION',
        'https://univ-itasy.com/site/index.php/inscription',
        'Source officielle : formulaire de préinscription de l’Université de l’Itasy, consulté le 2 octobre 2026. La page concerne la sélection des dossiers en première année pour l’année universitaire 2026-2027 et indique que les inscriptions en ligne sont ouvertes. Le formulaire demande les informations d’état civil et d’identité, les coordonnées, les informations sur les parents, le numéro d’inscription au baccalauréat, l’année, la série et le lycée d’origine. Une photo d’identité récente est obligatoire (JPG, PNG ou WEBP, maximum 25 Mo). Le relevé de notes du baccalauréat est facultatif si le baccalauréat a été obtenu en 2026; la page indique qu’il peut aussi être fourni ultérieurement. Le candidat peut choisir jusqu’à trois formations. Frais de dossier publiés : 20 000 Ariary, à transférer par Mvola au 034 67 311 82 (nom affiché : Heritoky). Il faut saisir la référence exacte du SMS de confirmation; l’UDI indique qu’elle est vérifiée avec les relevés officiels Mvola. La page consultée ne donne pas de date limite de clôture. Vérifier le formulaire officiel avant tout paiement ou dépôt : https://univ-itasy.com/site/index.php/inscription.',
        '2026-2027; page vérifiée le 2026-10-02'
    ),
    (
        'Domaines de formation - Université de l’Itasy',
        'ORIENTATION',
        'https://univ-itasy.com/site/index.php/formation',
        'La page officielle des offres de formation de l’Université de l’Itasy présente cinq domaines d’études : Sciences de l’Ingénieur, Sciences et technologie, Sciences de la société, Arts, lettres et sciences humaines, et Sciences de la Santé. Pour les détails des mentions, parcours, conditions d’admission et disponibilités de l’année en cours, consulter la page officielle : https://univ-itasy.com/site/index.php/formation ou contacter l’université. Les parcours affichés sur le site peuvent évoluer; cette réponse ne remplace pas la vérification du formulaire ou de l’offre à jour.',
        'page vérifiée le 2026-10-02'
    )
), inserted_documents AS (
    INSERT INTO public.documents (title, category, source, content, version, status)
    SELECT s.title, s.category, s.source, s.content, s.version, 'published'
    FROM source_data s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.source = s.source AND d.version = s.version
    )
    RETURNING id, title, content
)
INSERT INTO public.document_chunks (document_id, content, metadata)
SELECT id, content, jsonb_build_object('source', 'official-udi-website', 'verified_on', '2026-10-02')
FROM inserted_documents;

COMMIT;
