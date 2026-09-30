// netlify/functions/generate-story.js
// Appelle l'API Anthropic côté serveur — la clé API n'est jamais exposée au client

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { univers, lieu, objet, prenom } = JSON.parse(event.body || "{}");

  if (!univers || !lieu || !objet) {
    return { statusCode: 400, body: JSON.stringify({ error: "Paramètres manquants" }) };
  }

  const prenomStr = prenom ? `Le héros s'appelle ${prenom}.` : "";

  const prompt = `Tu es un auteur de livres pour enfants de 4 à 8 ans, créatif, drôle et inventif — dans le style de Roald Dahl pour enfants : surprenant, avec de l'humour, des rebondissements inattendus, des personnages hauts en couleur.

Écris une histoire courte (4 paragraphes de 2-3 phrases chacun) avec ces paramètres :
- Univers : ${univers}
- Lieu : ${lieu}  
- Objet important : ${objet}
${prenomStr}

CONTRAINTE ABSOLUE — Annotations phonèmes :
Dans le texte, chaque fois qu'un mot contient un des phonèmes suivants, tu DOIS l'annoter avec ce format exact : <ph son="CLE">lettres</ph>

Les phonèmes et leurs clés :
- "on" / "om" (jamais suivi d'un autre m) → clé: "on" — ex: b<ph son="on">on</ph>b<ph son="on">on</ph>, t<ph son="on">om</ph>be
- "ou" → clé: "ou" — ex: s<ph son="ou">ou</ph>ris, l<ph son="ou">ou</ph>p
- "ai" / "é" / "è" / "ê" / "er" (fin de mot uniquement) / "ez" → clé: "ai" — ex: f<ph son="ai">é</ph>e, m<ph son="ai">ai</ph>son, all<ph son="ai">er</ph>
- "an" / "en" / "am" / "em" (jamais suivi d'une voyelle) → clé: "an" — ex: <ph son="an">en</ph>fant, c<ph son="an">am</ph>pagne
- "in" / "ain" / "ein" / "un" → clé: "in" — ex: lap<ph son="in">in</ph>, p<ph son="in">ain</ph>
- "eau" / "au" → clé: "eau" — ex: g<ph son="eau">eau</ph>x, <ph son="eau">au</ph>ssi
- "oi" → clé: "oi" — ex: v<ph son="oi">oi</ph>là, r<ph son="oi">oi</ph>
- "oin" → clé: "oin" — ex: l<ph son="oin">oin</ph>, b<ph son="oin">oin</ph>
- "ch" → clé: "ch" — ex: <ph son="ch">ch</ph>at, <ph son="ch">ch</ph>eval

RÈGLES STRICTES :
1. N'annote QUE les lettres exactes qui font le son — pas le mot entier
2. "em" et "en" → pas de phonème si suivi d'une voyelle (ex: "ennemi", "email" → pas annoté)
3. "er" → phonème "ai" UNIQUEMENT en fin de mot (chercher ✓, perroquet ✗)
4. "om" → phonème "on" UNIQUEMENT si pas suivi d'un autre m (tomber ✓, comme ✗)
5. Utilise AU MOINS 6 phonèmes différents dans l'histoire
6. L'histoire doit être VRAIMENT drôle, créative, avec un retournement de situation inattendu
7. Les personnages doivent avoir des noms originaux et amusants
8. Inclus des détails sensoriels et des dialogues vivants

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "titre": "Titre accrocheur et amusant",
  "paragraphes": [
    "Paragraphe 1 avec annotations <ph son=\\"clé\\">lettres</ph>...",
    "Paragraphe 2...",
    "Paragraphe 3...",
    "Paragraphe 4..."
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const text = data.content[0].text.replace(/```json|```/g, "").trim();
    const story = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(story),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
