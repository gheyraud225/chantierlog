import jsPDF from "jspdf";
import { DailyLog, Project, PdfSettings } from "./types";

const W = 210;
const H = 297;
const ML = 18;
const MR = 18;
const CW = W - ML - MR;
const BOTTOM = 272;

const DARK    = [20,  20,  20]  as [number, number, number];
const GRAY1   = [80,  80,  80]  as [number, number, number];
const GRAY2   = [140, 140, 140] as [number, number, number];
const GRAY3   = [210, 210, 210] as [number, number, number];
const BGLIGHT = [250, 249, 246] as [number, number, number];
const WHITE   = [255, 255, 255] as [number, number, number];

// ─── Helpers ─────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setTextC(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function needsPage(doc: jsPDF, y: number, needed: number, accent: [number, number, number]): number {
  if (y + needed > BOTTOM) {
    doc.addPage();
    drawRunningHeader(doc, accent);
    return 28;
  }
  return y;
}

// ─── Running header ───────────────────────────────────────

function drawRunningHeader(doc: jsPDF, accent: [number, number, number]) {
  setFill(doc, accent);
  doc.rect(0, 0, W, 10, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setTextC(doc, WHITE);
  doc.text("ChantierLog", ML, 6.5);
}

// ─── Footer ──────────────────────────────────────────────

function drawFooters(doc: jsPDF, settings: PdfSettings) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    setFill(doc, BGLIGHT);
    doc.rect(0, H - 14, W, 14, "F");
    setDraw(doc, GRAY3);
    doc.setLineWidth(0.3);
    doc.line(ML, H - 14, W - MR, H - 14);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    setTextC(doc, GRAY2);
    doc.text(settings.footerText, ML, H - 7);
    doc.text(`Page ${i} / ${total}`, W - MR, H - 7, { align: "right" });
  }
}

// ─── Page de garde ───────────────────────────────────────

function drawCoverPage(
  doc: jsPDF,
  project: Project,
  logCount: number,
  settings: PdfSettings,
  accent: [number, number, number]
) {
  setFill(doc, accent);
  doc.rect(0, 0, W, 42, "F");

  setFill(doc, DARK);
  doc.rect(0, H - 30, W, 30, "F");

  // Logo ou nom app
  if (settings.logoBase64) {
    try {
      doc.addImage(settings.logoBase64, "PNG", ML, 8, 24, 24);
    } catch {
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      setTextC(doc, WHITE);
      doc.text("ChantierLog", ML, 22);
    }
  } else {
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    setTextC(doc, WHITE);
    doc.text("ChantierLog", ML, 22);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setTextC(doc, [255, 220, 140]);
  doc.text("Journal de chantier numérique", ML, 32);

  const centerY = 100;

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  setTextC(doc, DARK);
  const titleLines = doc.splitTextToSize(project.name, CW) as string[];
  titleLines.forEach((line, i) => {
    doc.text(line, ML, centerY + i * 14);
  });

  const afterTitle = centerY + titleLines.length * 14 + 4;

  setDraw(doc, accent);
  doc.setLineWidth(1.2);
  doc.line(ML, afterTitle, ML + 40, afterTitle);

  let infoY = afterTitle + 14;

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  setTextC(doc, GRAY1);
  doc.text(`Client : ${project.clientName}`, ML, infoY);
  infoY += 10;

  if (project.clientPhone) {
    doc.setFontSize(10);
    setTextC(doc, GRAY2);
    doc.text(`Tel : ${project.clientPhone}`, ML, infoY);
    infoY += 7;
  }
  if (project.clientEmail) {
    doc.setFontSize(10);
    setTextC(doc, GRAY2);
    doc.text(`Email : ${project.clientEmail}`, ML, infoY);
    infoY += 7;
  }

  const addressParts = [
    project.address,
    project.postalCode && project.city
      ? `${project.postalCode} ${project.city}`
      : project.city || project.postalCode,
  ].filter(Boolean);

  if (addressParts.length > 0) {
    doc.setFontSize(10);
    setTextC(doc, GRAY2);
    doc.text(addressParts.join(", "), ML, infoY);
    infoY += 7;
  }

  if (project.startDate || project.endDate) {
    doc.setFontSize(9);
    setTextC(doc, GRAY2);
    const dates = [
      project.startDate ? `Début : ${new Date(project.startDate).toLocaleDateString("fr-FR")}` : "",
      project.endDate ? `Fin prévue : ${new Date(project.endDate).toLocaleDateString("fr-FR")}` : "",
    ].filter(Boolean).join("   ");
    doc.text(dates, ML, infoY);
    infoY += 7;
  }

  if (project.description) {
    infoY += 3;
    doc.setFontSize(9);
    setTextC(doc, GRAY2);
    const descLines = doc.splitTextToSize(project.description, CW) as string[];
    descLines.slice(0, 3).forEach(line => {
      doc.text(line, ML, infoY);
      infoY += 6;
    });
  }

  infoY += 10;
  doc.setFontSize(10);
  setTextC(doc, GRAY2);
  doc.text(
    `Rapport du ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}`,
    ML, infoY
  );
  infoY += 7;
  doc.text(`${logCount} note${logCount > 1 ? "s" : ""} de chantier`, ML, infoY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setTextC(doc, GRAY3);
  doc.text(settings.footerText, ML, H - 16);
  setTextC(doc, GRAY2);
  doc.text(new Date().toLocaleDateString("fr-FR"), W - MR, H - 16, { align: "right" });
}

// ─── En-tête section notes ────────────────────────────────

function drawNotesHeader(doc: jsPDF, project: Project, accent: [number, number, number]): number {
  drawRunningHeader(doc, accent);
  let y = 22;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setTextC(doc, GRAY2);
  doc.text("RAPPORT DE CHANTIER", ML, y);

  y += 7;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setTextC(doc, DARK);
  doc.text(project.name, ML, y);

  y += 5;
  setDraw(doc, GRAY3);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);

  return y + 10;
}

// ─── Une note ────────────────────────────────────────────

function drawLog(
  doc: jsPDF,
  log: DailyLog,
  y: number,
  index: number,
  settings: PdfSettings,
  accent: [number, number, number]
): number {
  y = needsPage(doc, y, 20, accent);

  const dateStr = new Date(log.date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  setFill(doc, accent);
  doc.rect(ML, y - 3, 2, 8, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setTextC(doc, accent);
  doc.text(`NOTE ${String(index + 1).padStart(2, "0")}`, ML + 5, y + 1);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setTextC(doc, GRAY1);
  doc.text(dateStr, ML + 30, y + 1);

  if (log.authorName) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    setTextC(doc, GRAY2);
    doc.text(`Par : ${log.authorName}`, W - MR, y + 1, { align: "right" });
  }

  y += 10;

  // Contenu texte
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  setTextC(doc, DARK);
  const lines = doc.splitTextToSize(log.content, CW) as string[];
  lines.forEach((line) => {
    y = needsPage(doc, y, 7, accent);
    doc.text(line, ML, y);
    y += 6;
  });

  y += 4;

  // Note vocale (transcript brut)
  if (log.voiceNoteTranscript) {
    y = needsPage(doc, y, 14, accent);
    setFill(doc, [240, 240, 240]);
    const transcriptLines = doc.splitTextToSize(log.voiceNoteTranscript, CW - 6) as string[];
    const boxH = transcriptLines.length * 5 + 10;
    doc.roundedRect(ML, y, CW, boxH, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    setTextC(doc, GRAY2);
    doc.text("Note vocale transcrite :", ML + 3, y + 5);
    doc.setFont("helvetica", "italic");
    setTextC(doc, GRAY1);
    doc.setFontSize(9);
    let ty = y + 10;
    transcriptLines.forEach((line) => {
      ty = needsPage(doc, ty, 6, accent);
      doc.text(line, ML + 3, ty);
      ty += 5;
    });
    y = ty + 3;
  }

  // Champs custom
  if (settings.showCustomFields && Object.keys(log.customFields).length > 0) {
    y = needsPage(doc, y, 10, accent);
    setFill(doc, [245, 245, 245]);
    const cfLines = Object.entries(log.customFields);
    const cfH = cfLines.length * 6 + 6;
    doc.roundedRect(ML, y, CW, cfH, 2, 2, "F");

    doc.setFontSize(8);
    y += 5;
    cfLines.forEach(([key, value]) => {
      setTextC(doc, GRAY2);
      doc.setFont("helvetica", "bold");
      doc.text(`${key} :`, ML + 3, y);
      doc.setFont("helvetica", "normal");
      setTextC(doc, GRAY1);
      const valStr = typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value);
      doc.text(valStr, ML + 50, y);
      y += 6;
    });
    y += 4;
  }

  // Photos
  if (settings.showPhotos && log.photos.length > 0) {
    const imgW = (CW - 6) / 2;
    const imgH = imgW * 0.72;

    for (let i = 0; i < log.photos.length; i += 2) {
      y = needsPage(doc, y, imgH + 4, accent);

      const x1 = ML;
      const x2 = ML + imgW + 6;

      try {
        doc.addImage(log.photos[i].base64, "JPEG", x1, y, imgW, imgH);
        setDraw(doc, GRAY3);
        doc.setLineWidth(0.2);
        doc.rect(x1, y, imgW, imgH);
      } catch {}

      if (i + 1 < log.photos.length) {
        try {
          doc.addImage(log.photos[i + 1].base64, "JPEG", x2, y, imgW, imgH);
          setDraw(doc, GRAY3);
          doc.setLineWidth(0.2);
          doc.rect(x2, y, imgW, imgH);
        } catch {}
      }

      y += imgH + 4;
    }
  }

  y += 6;

  setDraw(doc, GRAY3);
  doc.setLineWidth(0.2);
  doc.line(ML, y, W - MR, y);

  y += 10;
  return y;
}

// ─── Export principal ─────────────────────────────────────

export async function generatePDF(
  logs: DailyLog[],
  project: Project,
  settings?: PdfSettings
): Promise<void> {
  const doc = new jsPDF();

  const defaultSettings: PdfSettings = {
    organizationId: "",
    primaryColor: "#F0A500",
    logoBase64: "",
    showCover: true,
    showPhotos: true,
    showCustomFields: true,
    footerText: "Document confidentiel — généré automatiquement",
  };

  const s = settings ?? defaultSettings;
  const accent = hexToRgb(s.primaryColor);

  if (s.showCover) {
    drawCoverPage(doc, project, logs.length, s, accent);
  }

  if (logs.length > 0) {
    if (s.showCover) doc.addPage();
    let y = drawNotesHeader(doc, project, accent);
    logs.forEach((log, i) => {
      y = drawLog(doc, log, y, i, s, accent);
    });
  }

  drawFooters(doc, s);

  const filename = `rapport-${project.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.pdf`;
  doc.save(filename);
}