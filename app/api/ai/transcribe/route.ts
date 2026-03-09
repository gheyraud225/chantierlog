import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rate limiter simple : 20 req/min par IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Clé API OpenAI manquante." }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: "Fichier audio manquant." }, { status: 400 });
  }

  // Limite : 25 MB (limite Whisper)
  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier audio trop volumineux (max 25 MB)." }, { status: 400 });
  }

  // Convertir le Blob en File avec extension reconnue par Whisper
  const ext = audioFile.type.includes("mp4") ? "mp4"
    : audioFile.type.includes("ogg") ? "ogg"
    : audioFile.type.includes("wav") ? "wav"
    : "webm";

  const file = new File([audioFile], `audio.${ext}`, { type: audioFile.type });

  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "fr",
      response_format: "text",
    });

    const transcript = typeof response === "string" ? response.trim() : "";
    if (!transcript) {
      return NextResponse.json({ error: "Aucune parole détectée dans l'enregistrement." }, { status: 200 });
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) return NextResponse.json({ error: "Clé API OpenAI invalide." }, { status: 500 });
      if (error.status === 429) return NextResponse.json({ error: "Quota OpenAI atteint." }, { status: 429 });
    }
    console.error("Whisper transcription error:", error);
    return NextResponse.json({ error: "Erreur lors de la transcription." }, { status: 500 });
  }
}
