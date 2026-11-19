BEGIN;

INSERT INTO public.intents (name, description)
SELECT
    'HORS_PERIMETRE',
    'Questions sans lien avec les études, l’administration universitaire ou les sources UDI.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.intents WHERE name = 'HORS_PERIMETRE'
);

WITH seed(example) AS (
    VALUES
        ('Quel temps fera-t-il demain ?'),
        ('Raconte-moi une blague'),
        ('Quel est le score du match ?'),
        ('Comment cuisiner du riz ?'),
        ('Bonjour comment vas-tu ?'),
        ('Quelle est la capitale de la France ?'),
        ('Écris-moi un poème'),
        ('Qui a gagné la guerre ?'),
        ('Comment réparer ma voiture ?'),
        ('Quelle est la météo aujourd’hui ?'),
        ('Peux-tu parler anglais ?'),
        ('Quelle est la recette du chocolat ?'),
        ('Aide-moi à jouer aux échecs'),
        ('Quel film regarder ce soir ?'),
        ('Comment programmer une application ?'),
        ('Peux-tu résoudre cette équation ?'),
        ('Quelle est l’actualité sportive ?'),
        ('Raconte une histoire'),
        ('Qui est le président ?'),
        ('Comment perdre du poids ?')
)
INSERT INTO public.training_examples (intent_id, text)
SELECT i.id, s.example
FROM seed s
JOIN public.intents i ON i.name = 'HORS_PERIMETRE'
WHERE NOT EXISTS (
    SELECT 1 FROM public.training_examples e
    WHERE e.intent_id = i.id AND e.text = s.example
);

WITH seed(example) AS (
    VALUES
        ('Fais-moi rire'),
        ('Tu connais une blague ?'),
        ('Dis-moi quelque chose de drôle'),
        ('J’ai besoin d’une plaisanterie'),
        ('Peux-tu raconter une petite histoire ?'),
        ('Parle-moi de tes loisirs'),
        ('Quel est ton plat préféré ?'),
        ('Peux-tu composer une chanson ?'),
        ('Écris un texte poétique'),
        ('Comment apprendre à jouer au football ?'),
        ('Qui va gagner le match ?'),
        ('Quel est le dernier score ?'),
        ('Peux-tu prédire le vainqueur ?'),
        ('Quelle chaîne diffuse le match ?'),
        ('Quel est le programme télé ?'),
        ('Quel film est sorti récemment ?'),
        ('Quelle série regarder ?'),
        ('Comment réparer mon téléphone ?'),
        ('Pourquoi mon ordinateur ne démarre pas ?'),
        ('Écris du code Python'),
        ('Comment installer un logiciel ?'),
        ('Quelle est la température ?'),
        ('Va-t-il pleuvoir demain ?'),
        ('Fera-t-il froid cet après-midi ?'),
        ('Quelle tenue porter aujourd’hui ?'),
        ('Comment perdre cinq kilos ?'),
        ('Comment se faire plus d’argent ?'),
        ('Pourquoi j’ai mal au ventre ?'),
        ('Quelle maladie ai-je ?'),
        ('Comment faire pousser des plantes ?')
)
INSERT INTO public.training_examples (intent_id, text)
SELECT i.id, s.example
FROM seed s
JOIN public.intents i ON i.name = 'HORS_PERIMETRE'
WHERE NOT EXISTS (
    SELECT 1 FROM public.training_examples e
    WHERE e.intent_id = i.id AND e.text = s.example
);

COMMIT;
