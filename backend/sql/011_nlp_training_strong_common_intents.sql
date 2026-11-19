BEGIN;

WITH seed(example, intent_name) AS (
    VALUES
        ('Comment faire une demande d’inscription ?', 'INSCRIPTION'),
        ('Où démarrer mon dossier universitaire ?', 'INSCRIPTION'),
        ('Comment candidater à l’université ?', 'INSCRIPTION'),
        ('Je veux m’inscrire en première année, que faire ?', 'INSCRIPTION'),
        ('Où soumettre mon dossier d’inscription ?', 'INSCRIPTION'),
        ('Comment postuler à une formation UDI ?', 'INSCRIPTION'),
        ('Quel est le lien du formulaire d’inscription ?', 'INSCRIPTION'),
        ('Puis-je remplir l’inscription en ligne ?', 'INSCRIPTION'),
        ('Quand puis-je déposer ma candidature ?', 'INSCRIPTION'),
        ('Quelle procédure pour rejoindre l’université ?', 'INSCRIPTION'),
        ('Comment créer mon dossier de candidat ?', 'INSCRIPTION'),
        ('Je suis nouveau bachelier, comment m’inscrire ?', 'INSCRIPTION'),

        ('Quelle liste de documents pour mon dossier ?', 'PIECES'),
        ('Quels fichiers faut-il télécharger ?', 'PIECES'),
        ('Y a-t-il des justificatifs à fournir ?', 'PIECES'),
        ('Ai-je besoin de ma carte d’identité ?', 'PIECES'),
        ('Le relevé de notes est-il obligatoire ?', 'PIECES'),
        ('Faut-il un acte de naissance ?', 'PIECES'),
        ('Quelle photo utiliser pour l’inscription ?', 'PIECES'),
        ('Quels documents du baccalauréat sont nécessaires ?', 'PIECES'),
        ('Puis-je fournir mes pièces ultérieurement ?', 'PIECES'),
        ('Quelle est la taille maximale de la photo ?', 'PIECES'),
        ('Quel format pour les fichiers joints ?', 'PIECES'),
        ('Faut-il une photocopie certifiée ?', 'PIECES'),

        ('Quel est l’e-mail de l’université ?', 'CONTACT'),
        ('Comment avoir les coordonnées UDI ?', 'CONTACT'),
        ('Quelle adresse mail puis-je utiliser ?', 'CONTACT'),
        ('Comment joindre un responsable ?', 'CONTACT'),
        ('Où envoyer une demande à l’université ?', 'CONTACT'),
        ('Quel est le courriel officiel ?', 'CONTACT'),
        ('Puis-je contacter l’université par téléphone ?', 'CONTACT'),
        ('Où trouver le service de contact ?', 'CONTACT'),
        ('Comment écrire à la scolarité ?', 'CONTACT'),
        ('Quelle adresse pour poser une question ?', 'CONTACT'),
        ('Y a-t-il une page de contact ?', 'CONTACT'),
        ('Comment joindre l’administration UDI ?', 'CONTACT'),

        ('Quelles mentions puis-je étudier ?', 'FORMATION'),
        ('Quels parcours sont proposés ?', 'FORMATION'),
        ('Existe-t-il une offre en sciences de l’ingénieur ?', 'FORMATION'),
        ('Peut-on choisir les sciences de la société ?', 'FORMATION'),
        ('Y a-t-il des formations en lettres ?', 'FORMATION'),
        ('L’université propose-t-elle des études en santé ?', 'FORMATION'),
        ('Quelles écoles ou instituts sont disponibles ?', 'FORMATION'),
        ('Où voir les mentions de l’UDI ?', 'FORMATION'),
        ('Quelle filière correspond à mon baccalauréat ?', 'FORMATION'),
        ('Peut-on demander trois choix de formation ?', 'FORMATION'),
        ('Quels sont les domaines d’études ?', 'FORMATION'),
        ('Où trouver la liste des parcours ?', 'FORMATION')
)
INSERT INTO public.training_examples (intent_id, text)
SELECT i.id, s.example
FROM seed s
JOIN public.intents i ON i.name = s.intent_name
WHERE NOT EXISTS (
    SELECT 1 FROM public.training_examples e
    WHERE e.intent_id=i.id AND e.text=s.example
);

COMMIT;
