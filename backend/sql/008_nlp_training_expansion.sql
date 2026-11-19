BEGIN;

WITH seed(example, intent_name) AS (
    VALUES
        ('Puis-je m’inscrire en première année ?', 'INSCRIPTION'),
        ('Quel lien pour la préinscription UDI ?', 'INSCRIPTION'),
        ('Quand remplir le formulaire d’inscription ?', 'INSCRIPTION'),
        ('Comment faire une candidature en licence ?', 'INSCRIPTION'),
        ('Peut-on choisir plusieurs mentions ?', 'INSCRIPTION'),
        ('Comment soumettre mon dossier de candidature ?', 'INSCRIPTION'),

        ('Que dois-je apporter pour constituer mon dossier ?', 'PIECES'),
        ('La photo d’identité est-elle obligatoire ?', 'PIECES'),
        ('Dois-je joindre mon relevé du baccalauréat ?', 'PIECES'),
        ('Quels justificatifs demande l’université ?', 'PIECES'),
        ('La CIN est-elle nécessaire pour l’inscription ?', 'PIECES'),
        ('Puis-je déposer mon relevé plus tard ?', 'PIECES'),

        ('Combien coûte le dossier ?', 'FRAIS'),
        ('Quel est le montant du paiement Mvola ?', 'FRAIS'),
        ('À quel numéro payer les frais ?', 'FRAIS'),
        ('Existe-t-il une référence de transaction ?', 'FRAIS'),
        ('Que faut-il conserver après le paiement ?', 'FRAIS'),
        ('Peut-on payer les frais autrement ?', 'FRAIS'),

        ('Comment obtenir mon diplôme du BACC ?', 'CERTIFICAT'),
        ('Quelle demande écrire pour le diplôme ?', 'CERTIFICAT'),
        ('À qui adresser la demande manuscrite ?', 'CERTIFICAT'),
        ('Quel reçu fournir pour récupérer le diplôme ?', 'CERTIFICAT'),
        ('Quel est le droit de délivrance ?', 'CERTIFICAT'),
        ('Quels papiers pour retirer le diplôme ?', 'CERTIFICAT'),

        ('Où sont les résultats BACC 2026 ?', 'RELEVE'),
        ('Comment voir les résultats du bac ?', 'RELEVE'),
        ('Quelle page contient les listes du baccalauréat ?', 'RELEVE'),
        ('Les résultats sont-ils disponibles sur Internet ?', 'RELEVE'),
        ('Puis-je consulter les listes par image ?', 'RELEVE'),
        ('Comment savoir si j’ai obtenu le baccalauréat ?', 'RELEVE'),

        ('Comment joindre l’Université de l’Itasy ?', 'CONTACT'),
        ('Quel courriel pour l’université ?', 'CONTACT'),
        ('Pouvez-vous donner l’e-mail UDI ?', 'CONTACT'),
        ('Où trouver les coordonnées UDI ?', 'CONTACT'),
        ('Comment demander une confirmation à la scolarité ?', 'CONTACT'),
        ('Quel numéro de téléphone publier ?', 'CONTACT'),

        ('Quels secteurs de formation propose l’UDI ?', 'FORMATION'),
        ('Quelles mentions sont disponibles ?', 'FORMATION'),
        ('Existe-t-il des études en ingénierie ?', 'FORMATION'),
        ('Existe-t-il des parcours en santé ?', 'FORMATION'),
        ('La liste des filières est-elle sur le site ?', 'FORMATION'),
        ('Quels domaines puis-je choisir ?', 'FORMATION')
)
INSERT INTO public.training_examples (intent_id, text)
SELECT i.id, s.example
FROM seed s
JOIN public.intents i ON i.name = s.intent_name
WHERE NOT EXISTS (
    SELECT 1 FROM public.training_examples e
    WHERE e.intent_id = i.id AND e.text = s.example
);

COMMIT;
