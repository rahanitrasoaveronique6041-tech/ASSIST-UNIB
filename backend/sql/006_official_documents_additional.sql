BEGIN;

WITH source_data(title, category, source, content, version) AS (
    VALUES
    (
        'Contact institutionnel - Université de l’Itasy',
        'CONTACT',
        'https://univ-itasy.com/site/index.php/contact',
        'Source officielle consultée le 19 novembre 2026 : la page de contact de l’Université de l’Itasy indique l’adresse électronique udifaliarivo@gmail.com. Le numéro de téléphone affiché sur la page est masqué sous la forme +261 xx xxx xx. Pour toute demande urgente ou pour confirmer un service, une procédure ou un horaire, utiliser l’adresse électronique publiée ou consulter directement les services de l’université. Le lien officiel de contact est https://univ-itasy.com/site/index.php/contact.',
        'page vérifiée le 2026-11-19'
    ),
    (
        'Délivrance du Diplôme du Baccalauréat - Université de l’Itasy',
        'CERTIFICAT',
        'https://univ-itasy.com/site/index.php/actualite',
        'Avis publié par l’Université de l’Itasy le 16 septembre 2026 : la demande de délivrance du diplôme du Baccalauréat est ouverte auprès de l’Université de l’Itasy. Les pièces annoncées sont une demande manuscrite adressée au Président de l’Université de l’Itasy, le relevé de notes du BACC original, une photocopie certifiée conforme de la CIN ou une copie d’acte de naissance originale datant de moins de trois mois pour les mineurs, ainsi qu’une photocopie du reçu de paiement du droit de délivrance. Le droit publié est de 30 000 Ariary. Le paiement est indiqué sur le compte bancaire BOA de l’Office du Baccalauréat Itasy : 00009 05701 22340650127 07. Conserver le reçu original pour récupérer le diplôme. Vérifier les modalités, la validité du compte et les pièces exigées sur la source officielle avant tout paiement : https://univ-itasy.com/site/index.php/actualite.',
        'avis publié le 2026-09-16'
    ),
    (
        'Résultats du Baccalauréat 2026 - Université de l’Itasy',
        'RELEVE',
        'https://univ-itasy.com/site/index.php/resultats-bac',
        'Source officielle consultée le 19 novembre 2026 : l’Université de l’Itasy publie sur son site les listes officielles des résultats du Baccalauréat 2026 de la région Itasy sous forme d’images protégées contre le téléchargement. Pour consulter les résultats, ouvrir directement la page officielle des résultats et rechercher le nom concerné dans les pages publiées. Ne pas confondre cette page avec une décision d’admission ou une inscription universitaire : elle présente uniquement les listes de résultats baccalauréat annoncées par l’établissement. Source : https://univ-itasy.com/site/index.php/resultats-bac.',
        'résultats 2026; page vérifiée le 2026-11-19'
    ),
    (
        'Inscriptions en ligne 2026-2027 - Université de l’Itasy',
        'INSCRIPTION',
        'https://univ-itasy.com/site/index.php/inscription',
        'Source officielle consultée le 19 novembre 2026 : l’Université de l’Itasy annonce que les inscriptions en ligne pour la sélection en première année sont ouvertes pour l’année universitaire 2026-2027. La procédure indiquée comprend le remplissage du formulaire en ligne, la fourniture d’une photo d’identité récente, le paiement des frais de dossier de 20 000 Ariary par Mvola et le suivi de l’état du dossier. Les pièces évoquées sont une photo d’identité, le relevé de notes du Baccalauréat lorsqu’il n’a pas été obtenu en 2026, et la référence exacte du paiement Mvola. Le dossier peut demander jusqu’à trois choix de formation. Vérifier toute échéance et les modalités actuelles directement sur https://univ-itasy.com/site/index.php/inscription.',
        'rentrée 2026-2027; page vérifiée le 2026-11-19'
    )
), inserted_documents AS (
    INSERT INTO public.documents (title, category, source, content, version, status)
    SELECT s.title, s.category, s.source, s.content, s.version, 'published'
    FROM source_data s
    WHERE NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.source = s.source AND d.title = s.title
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

COMMIT;
