import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory rate limiter (par IP, 10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
  }

  // Validation
  let body: { transcript?: string; logId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const transcript = body?.transcript?.trim();
  if (!transcript || transcript.length < 10) {
    return NextResponse.json({ error: "Transcription manquante ou trop courte." }, { status: 400 });
  }
  if (transcript.length > 8000) {
    return NextResponse.json({ error: "Transcription trop longue (max 8000 caractères)." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API manquante." }, { status: 500 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      thinking: { type: "adaptive" },
      system: `Tu es un assistant spécialisé dans la gestion de chantiers BTP.
Tu résumes des notes vocales de chantier en français, en Markdown structuré.

Format de sortie — utilise uniquement les sections pertinentes parmi :
- **Avancement :** [ce qui a été réalisé]
- **Problèmes :** [blocages, retards, incidents]
- **Actions :** [tâches à faire, matériaux à commander]
- **Matériaux :** [matériaux mentionnés avec quantités]
- **Informations :** [autres informations utiles au suivi]

Règles strictes :
- Maximum 4 points, chaque point sur sa propre ligne commençant par "- "
- Les labels (Avancement, Problèmes, etc.) toujours en gras avec **
- Texte après le label en clair, sans gras
- Phrases courtes et factuelles
- N'invente aucune information`,
      messages: [
        {
          role: "user",
          content: `Transcription de la note vocale :\n\n"${transcript}"`,
        },
      ],
    });

    const textBlock = response.content.find(b => b.type === "text");
    const summary = textBlock && "text" in textBlock ? textBlock.text : null;

    if (!summary) {
      return NextResponse.json({ error: "Impossible de générer un résumé." }, { status: 500 });
    }

    return NextResponse.json({ summary });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Limite de l'API IA atteinte. Réessayez dans quelques instants." }, { status: 429 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé API invalide." }, { status: 500 });
    }
    console.error("AI summarize error:", error);
    return NextResponse.json({ error: "Erreur lors de la génération du résumé." }, { status: 500 });
  }
}
