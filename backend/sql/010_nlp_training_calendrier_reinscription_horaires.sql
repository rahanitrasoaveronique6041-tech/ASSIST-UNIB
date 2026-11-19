BEGIN;

WITH seed(example, intent_name) AS (
    VALUES
        ('Comment se réinscrire pour l’année suivante ?', 'REINSCRIPTION'),
        ('Quelle démarche pour continuer mes études à l’UDI ?', 'REINSCRIPTION'),
        ('Où déposer ma demande de réinscription ?', 'REINSCRIPTION'),
        ('Comment renouveler mon inscription universitaire ?', 'REINSCRIPTION'),
        ('Est-ce que je dois remplir un nouveau dossier de réinscription ?', 'REINSCRIPTION'),
        ('Quel formulaire utiliser pour la réinscription ?', 'REINSCRIPTION'),
        ('Où obtenir les modalités de réinscription ?', 'REINSCRIPTION'),
        ('Je suis déjà étudiant, comment renouveler mon statut ?', 'REINSCRIPTION'),
        ('Ma réinscription doit-elle être faite en ligne ?', 'REINSCRIPTION'),
        ('Comment confirmer mon année suivante ?', 'REINSCRIPTION'),
        ('La procédure de renouvellement est-elle publiée ?', 'REINSCRIPTION'),
        ('Puis-je parler à la scolarité pour la réinscription ?', 'REINSCRIPTION'),

        ('Quelle est la date des examens du semestre ?', 'CALENDRIER'),
        ('Quand commencent les examens universitaires ?', 'CALENDRIER'),
        ('À quelle date se déroule la période d’examens ?', 'CALENDRIER'),
        ('Le calendrier scolaire est-il disponible ?', 'CALENDRIER'),
        ('Où consulter le calendrier académique ?', 'CALENDRIER'),
        ('Quand auront lieu les partiels ?', 'CALENDRIER'),
        ('Quand commence le prochain semestre ?', 'CALENDRIER'),
        ('Quelles sont les échéances académiques ?', 'CALENDRIER'),
        ('Existe-t-il une date officielle pour les examens ?', 'CALENDRIER'),
        ('Quand sont les vacances universitaires ?', 'CALENDRIER'),
        ('Où trouver les dates d’examens ?', 'CALENDRIER'),
        ('Le planning des cours et examens est-il publié ?', 'CALENDRIER'),

        ('Quelle heure ouvre la scolarité ?', 'HORAIRES'),
        ('À quelle heure ferme le secrétariat ?', 'HORAIRES'),
        ('Quand puis-je venir au service administratif ?', 'HORAIRES'),
        ('Quels sont les horaires d’accueil ?', 'HORAIRES'),
        ('À quel moment peut-on visiter l’administration ?', 'HORAIRES'),
        ('La scolarité reçoit-elle le matin ?', 'HORAIRES'),
        ('La scolarité reçoit-elle l’après-midi ?', 'HORAIRES'),
        ('Où connaître les heures d’ouverture ?', 'HORAIRES'),
        ('Le service est-il ouvert aujourd’hui ?', 'HORAIRES'),
        ('Peut-on venir à quelle heure ?', 'HORAIRES'),
        ('Quel est le planning d’ouverture ?', 'HORAIRES'),
        ('Les horaires des bureaux sont-ils disponibles ?', 'HORAIRES')
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
