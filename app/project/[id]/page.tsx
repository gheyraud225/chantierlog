"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getLogs, addLog, deleteLog, getProjects,
  updateProject, updateLog, updateLogVoice, getCurrentUser,
  getCurrentMember, getOrgMembers,
  getProjectMembers, addProjectMember, removeProjectMember,
  getFieldTemplates, getProjectFieldTemplates, toggleProjectField,
  getPdfSettings, getOrgSubscriptionPlan,
} from "@/lib/storage";
import { DailyLog, Photo, Project, ProjectStatus, OrganizationMember, FieldTemplate, PdfSettings, SubscriptionPlan } from "@/lib/types";
import { generatePDF } from "@/lib/pdf";
import ConfirmDialog from "@/components/ConfirmDialog";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "En cours", paused: "En pause", done: "Terminé",
};
const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  paused: "text-amber-400 bg-amber-400/10",
  done:   "text-gray-400 bg-gray-400/10",
};

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

export default function ProjectPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [author, setAuthor] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("chantierlog_author") ?? "";
  });
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogContent, setEditLogContent] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("active");
  const [editDescription, setEditDescription] = useState("");
  const [content, setContent] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [isImproving, setIsImproving] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([]);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [projectMembers, setProjectMembers] = useState<OrganizationMember[]>([]);
  const [allFields, setAllFields] = useState<FieldTemplate[]>([]);
  const [projectFields, setProjectFields] = useState<FieldTemplate[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"team" | "fields" | "edit" | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notes vocales
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAutoSummarizing, setIsAutoSummarizing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Résumé IA
  const [summarizingLogId, setSummarizingLogId] = useState<string | null>(null);

  // Unused state suppression
  void editingProject;

  useEffect(() => {
    Promise.all([
      getProjects(), getLogs(id), getCurrentMember(), getOrgMembers(),
      getProjectMembers(id), getFieldTemplates(), getProjectFieldTemplates(id),
      getPdfSettings(), getOrgSubscriptionPlan(),
    ]).then(([projects, logsData, me, org, pm, allF, projF, pdfS, planData]) => {
      setProject(projects.find(p => p.id === id) ?? null);
      setLogs(logsData);
      setCurrentMember(me);
      setOrgMembers(org);
      setProjectMembers(pm);
      setAllFields(allF);
      setProjectFields(projF);
      setPdfSettings(pdfS);
      setPlan(planData);
      setLoading(false);
    });
  }, [id]);

  async function startRecording() {
    setRecordingError("");
    setVoiceTranscript("");
    audioChunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      const msg = "Accès au microphone refusé. Vérifie les permissions du navigateur.";
      setRecordingError(msg);
      toast.error(msg);
      return;
    }

    // Choisir le meilleur format supporté par le navigateur
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]
      .find(t => MediaRecorder.isTypeSupported(t)) ?? "";

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });

      // Transcrire via Whisper (serveur)
      setIsTranscribing(true);
      const transcribeToastId = toast.loading("Transcription en cours...");
      let transcript = "";
      try {
        const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);
        const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (data.transcript) {
          transcript = data.transcript;
          setVoiceTranscript(transcript);
          toast.success("Transcription terminée", { id: transcribeToastId });
        } else if (data.error) {
          setRecordingError(data.error);
          toast.error(data.error, { id: transcribeToastId });
        }
      } catch {
        const msg = "Impossible de contacter le serveur de transcription.";
        setRecordingError(msg);
        toast.error(msg, { id: transcribeToastId });
      } finally {
        setIsTranscribing(false);
      }

      // Résumé IA automatique → pré-remplit le champ note
      if (transcript) {
        if (plan?.aiSummary) {
          setIsAutoSummarizing(true);
          try {
            const res = await fetch("/api/ai/summarize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transcript }),
            });
            if (res.ok) {
              const { title, summary } = await res.json();
              if (summary) setContent(summary);
              if (title) setNoteTitle(title);
            }
          } catch { /* silently fallback to transcript */ }
          finally { setIsAutoSummarizing(false); }
        } else {
          // Pas d'IA : pré-remplir avec la transcription brute
          setContent(transcript);
        }
      }
    };
    mr.start();
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function clearVoiceNote() {
    setVoiceTranscript("");
    setRecordingError("");
  }

  async function handleImprove() {
    if (!content.trim() || content.length < 20) return;
    setIsImproving(true);
    const toastId = toast.loading("Amélioration en cours...");
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: content, mode: "text" }),
      });
      if (res.ok) {
        const { title, summary } = await res.json();
        if (summary) setContent(summary);
        if (title) setNoteTitle(title);
        toast.success("Note améliorée par l'IA", { id: toastId });
      } else {
        toast.error("Erreur lors de l'amélioration", { id: toastId });
      }
    } catch {
      toast.error("Impossible de contacter le serveur", { id: toastId });
    } finally {
      setIsImproving(false);
    }
  }

  async function handleSubmit() {
    if (!content.trim() && !voiceTranscript.trim()) return;
    const user = await getCurrentUser();

    const newLog: DailyLog = {
      id: crypto.randomUUID(),
      projectId: id,
      authorId: user?.id ?? "",
      authorName: author,
      title: noteTitle || undefined,
      content: content || voiceTranscript,
      date: new Date().toISOString(),
      photos: pendingPhotos,
      customFields: customFieldValues,
      voiceNoteTranscript: voiceTranscript || undefined,
    };
    const toastId = toast.loading("Enregistrement...");
    await addLog(newLog);
    setLogs(prev => [...prev, newLog]);
    setContent("");
    setNoteTitle("");
    setPendingPhotos([]);
    setCustomFieldValues({});
    clearVoiceNote();
    toast.success("Note ajoutée", { id: toastId });
  }

  async function handleSummarize(log: DailyLog) {
    if (!log.voiceNoteTranscript && !log.content) return;
    setSummarizingLogId(log.id);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: log.voiceNoteTranscript ?? log.content }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        if (summary) {
          await updateLog({ id: log.id, content: summary });
          setLogs(prev => prev.map(l => l.id === log.id ? { ...l, content: summary } : l));
        }
      }
    } finally {
      setSummarizingLogId(null);
    }
  }

  async function handleDelete(logId: string) {
    await deleteLog(logId);
    setLogs(prev => prev.filter(log => log.id !== logId));
    setConfirmDeleteLogId(null);
    toast.success("Note supprimée");
  }

  async function handleUpdateProject() {
    if (!editName.trim() || !editClientName.trim() || !project) return;
    const updated: Project = {
      ...project, name: editName, clientName: editClientName,
      clientPhone: editClientPhone, clientEmail: editClientEmail,
      address: editAddress, city: editCity, postalCode: editPostalCode,
      description: editDescription, status: editStatus,
      startDate: editStartDate, endDate: editEndDate,
    };
    const toastId = toast.loading("Sauvegarde...");
    await updateProject(updated);
    setProject(updated);
    setActivePanel(null);
    toast.success("Chantier mis à jour", { id: toastId });
  }

  const handleUpdateLog = useCallback(async (logId: string) => {
    if (!editLogContent.trim()) return;
    const toastId = toast.loading("Sauvegarde...");
    await updateLog({ ...logs.find(l => l.id === logId)!, content: editLogContent });
    setLogs(logs.map(log => log.id === logId ? { ...log, content: editLogContent } : log));
    setEditingLogId(null);
    toast.success("Note modifiée", { id: toastId });
  }, [editLogContent, logs]);

  async function handleAssign(userId: string) {
    await addProjectMember(id, userId);
    const member = orgMembers.find(m => m.userId === userId);
    if (member) setProjectMembers(prev => [...prev, member]);
  }

  async function handleUnassign(userId: string) {
    await removeProjectMember(id, userId);
    setProjectMembers(prev => prev.filter(m => m.userId !== userId));
  }

  async function handleToggleField(templateId: string, enabled: boolean) {
    await toggleProjectField(id, templateId, enabled);
    if (enabled) {
      const field = allFields.find(f => f.id === templateId);
      if (field) setProjectFields(prev => [...prev, field]);
    } else {
      setProjectFields(prev => prev.filter(f => f.id !== templateId));
    }
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const maxPhotos = plan?.maxPhotosPerLog ?? 3;
    const files = Array.from(e.target.files ?? []);
    if (pendingPhotos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos par note (votre abonnement)`);
      return;
    }
    const base64List = await Promise.all(files.map(readFileAsBase64));
    const newPhotos: Photo[] = base64List.map(base64 => ({ id: crypto.randomUUID(), base64 }));
    setPendingPhotos(prev => [...prev, ...newPhotos]);
  }

  function openEdit() {
    setEditName(project?.name ?? "");
    setEditClientName(project?.clientName ?? "");
    setEditClientPhone(project?.clientPhone ?? "");
    setEditClientEmail(project?.clientEmail ?? "");
    setEditAddress(project?.address ?? "");
    setEditCity(project?.city ?? "");
    setEditPostalCode(project?.postalCode ?? "");
    setEditDescription(project?.description ?? "");
    setEditStatus(project?.status ?? "active");
    setEditStartDate(project?.startDate ?? "");
    setEditEndDate(project?.endDate ?? "");
    setActivePanel(activePanel === "edit" ? null : "edit");
  }

  const canUseVoiceNotes = plan?.voiceNotes ?? false;
  const canUseAI = plan?.aiSummary ?? false;
  const maxPhotos = plan?.maxPhotosPerLog ?? 3;

  const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 focus:bg-white/[0.06] transition-all";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              aria-label="Retour"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-white truncate text-sm sm:text-base">{project?.name ?? ""}</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500 truncate">
                  {project?.clientName}
                  {project?.city ? ` · ${project.city}` : ""}
                </p>
                {project && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[project.status]}`}>
                    {STATUS_LABELS[project.status]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {currentMember?.role !== "worker" && (
              <>
                {/* Desktop buttons */}
                <button
                  onClick={() => setActivePanel(activePanel === "team" ? null : "team")}
                  className={`hidden sm:flex h-9 px-3 rounded-lg text-xs font-medium transition-all border items-center focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                    activePanel === "team"
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                  }`}
                >
                  Équipe {projectMembers.length > 0 && `(${projectMembers.length})`}
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "fields" ? null : "fields")}
                  className={`hidden sm:flex h-9 px-3 rounded-lg text-xs font-medium transition-all border items-center focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                    activePanel === "fields"
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                  }`}
                >
                  Champs {projectFields.length > 0 && `(${projectFields.length})`}
                </button>
                <button
                  onClick={openEdit}
                  className={`hidden sm:flex h-9 px-3 rounded-lg text-xs font-medium transition-all border items-center focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                    activePanel === "edit"
                      ? "bg-white/10 border-white/20 text-white"
                      : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                  }`}
                >
                  Modifier
                </button>

                {/* Mobile: compact action menu */}
                <div className="relative sm:hidden">
                  <button
                    onClick={() => setActivePanel(activePanel ? null : "team")}
                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      activePanel && activePanel !== "edit"
                        ? "bg-white/10 border-white/20 text-white"
                        : "border-white/5 text-gray-500 hover:text-gray-300"
                    }`}
                    aria-label="Menu"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="2" r="1.5" fill="currentColor"/>
                      <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                      <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                  {activePanel && activePanel !== "edit" && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setActivePanel(null)} />
                      <div className="absolute right-0 top-11 z-20 w-44 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {["team", "fields"].map(panel => (
                          <button
                            key={panel}
                            onClick={() => setActivePanel(activePanel === panel ? null : panel as "team" | "fields")}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                              activePanel === panel
                                ? "text-orange-400 bg-orange-500/5"
                                : "text-gray-300 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            {panel === "team" ? `Équipe${projectMembers.length > 0 ? ` (${projectMembers.length})` : ""}` : `Champs${projectFields.length > 0 ? ` (${projectFields.length})` : ""}`}
                          </button>
                        ))}
                        <div className="border-t border-white/5" />
                        <button
                          onClick={() => { openEdit(); }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          Modifier le chantier
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={async () => {
                    if (!project) return;
                    const toastId = toast.loading("Génération du PDF...");
                    try {
                      await generatePDF(logs, project, pdfSettings ?? undefined);
                      toast.success("PDF téléchargé", { id: toastId });
                    } catch {
                      toast.error("Erreur lors de la génération du PDF", { id: toastId });
                    }
                  }}
                  disabled={!project}
                  className="h-9 px-3 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
                >
                  PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Panneau modifier */}
      {activePanel === "edit" && (
        <div className="border-b border-white/5 bg-[#0e0e10]">
          <div className="max-w-3xl mx-auto px-5 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Modifier le chantier</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du chantier" className={`col-span-2 ${inputClass}`} />
              <input value={editClientName} onChange={e => setEditClientName(e.target.value)} placeholder="Nom du client" className={inputClass} />
              <input value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} placeholder="Téléphone" className={inputClass} />
              <input value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} placeholder="Email" className={inputClass} />
              <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Rue" className={inputClass} />
              <input value={editPostalCode} onChange={e => setEditPostalCode(e.target.value)} placeholder="Code postal" className={inputClass} />
              <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="Commune" className={inputClass} />
              <input value={editStartDate} onChange={e => setEditStartDate(e.target.value)} type="date" className={inputClass} />
              <input value={editEndDate} onChange={e => setEditEndDate(e.target.value)} type="date" className={inputClass} />
              <select value={editStatus} onChange={e => setEditStatus(e.target.value as ProjectStatus)} className={`col-span-2 ${inputClass}`}>
                <option value="active">En cours</option>
                <option value="paused">En pause</option>
                <option value="done">Terminé</option>
              </select>
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Description" rows={3} className={`col-span-2 resize-none ${inputClass}`} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpdateProject} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50">Sauvegarder</button>
              <button onClick={() => setActivePanel(null)} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/20">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau équipe */}
      {activePanel === "team" && currentMember?.role !== "worker" && (
        <div className="border-b border-white/5 bg-[#0e0e10]">
          <div className="max-w-3xl mx-auto px-5 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Équipe du chantier</p>
            {orgMembers.filter(m => m.role === "worker").length === 0 && (
              <p className="text-xs text-gray-600 py-2">Aucun ouvrier dans l&apos;organisation.</p>
            )}
            <div className="space-y-2">
              {orgMembers.filter(m => m.role === "worker").map(member => {
                const assigned = projectMembers.some(pm => pm.userId === member.userId);
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{member.name}</p>
                      <p className="text-xs text-gray-600">Ouvrier</p>
                    </div>
                    <button
                      onClick={() => assigned ? handleUnassign(member.userId) : handleAssign(member.userId)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        assigned
                          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                          : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                      }`}
                    >
                      {assigned ? "Retirer" : "Assigner"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Panneau champs */}
      {activePanel === "fields" && currentMember?.role !== "worker" && (
        <div className="border-b border-white/5 bg-[#0e0e10]">
          <div className="max-w-3xl mx-auto px-5 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Champs actifs sur ce chantier</p>
            {allFields.length === 0 && (
              <p className="text-xs text-gray-600 py-2">Aucun champ dans la bibliothèque.</p>
            )}
            <div className="space-y-2">
              {allFields.map(field => {
                const active = projectFields.some(f => f.id === field.id);
                return (
                  <div key={field.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{field.label}</p>
                      <p className="text-xs text-gray-600">
                        {field.category ? `${field.category} · ` : ""}
                        {field.fieldType === "text" ? "Texte" : field.fieldType === "number" ? "Nombre" : "Oui / Non"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleField(field.id, !active)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        active
                          ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                          : "border-white/10 text-gray-500 hover:border-orange-500/30 hover:text-orange-400"
                      }`}
                    >
                      {active ? "✓ Actif" : "Activer"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">

        {/* Formulaire nouvelle note */}
        <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Nouvelle note</p>
          <input
            value={author}
            onChange={(e) => { setAuthor(e.target.value); localStorage.setItem("chantierlog_author", e.target.value); }}
            placeholder="Votre nom"
            className={inputClass}
          />
          <input
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            placeholder="Titre de la note (optionnel — généré automatiquement par l'IA)"
            className={inputClass}
          />
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Avancement, problèmes, matériaux..."
              rows={4}
              className={`resize-none ${inputClass}`}
            />
            {canUseAI && !isRecording && (
              <div className="flex justify-end">
                {isImproving || isAutoSummarizing ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-orange-400 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                    <span className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                    {isAutoSummarizing ? "Résumé IA en cours..." : "Amélioration..."}
                  </div>
                ) : content.length > 20 ? (
                  <button
                    onClick={handleImprove}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-orange-400 hover:text-orange-300 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                  >
                    ✨ Améliorer avec l&apos;IA
                  </button>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Note vocale ── */}
          {canUseVoiceNotes ? (
            <div className="space-y-2 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">Note vocale</p>
                {voiceTranscript && (
                  <button onClick={clearVoiceNote} className="text-xs text-red-400 hover:text-red-300">
                    Effacer
                  </button>
                )}
              </div>

              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-lg text-sm text-gray-300 transition-all"
                >
                  <span className="text-base">🎙</span>
                  {voiceTranscript ? "Réenregistrer" : "Commencer l'enregistrement"}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Arrêter
                  <span className="font-mono text-xs ml-1 opacity-80">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
                  </span>
                </button>
              )}

              {recordingError && (
                <p className="text-xs text-red-400">{recordingError}</p>
              )}

              {isRecording && (
                <p className="text-xs text-gray-500 italic">
                  Enregistrement en cours... Parle dans ton micro.
                </p>
              )}

              {isTranscribing && !isRecording && (
                <p className="text-xs text-blue-400 italic animate-pulse">
                  Transcription en cours via Whisper...
                </p>
              )}

              {isAutoSummarizing && (
                <p className="text-xs text-orange-400 italic animate-pulse">
                  Résumé IA en cours... La note sera pré-remplie.
                </p>
              )}

              {voiceTranscript && !isRecording && !isTranscribing && !isAutoSummarizing && (
                <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Transcription brute :</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{voiceTranscript}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-lg px-4 py-3">
              <span className="text-base">🎙</span>
              <div>
                <p className="text-xs text-gray-500">Notes vocales disponibles à partir du plan <span className="text-orange-400">Starter</span></p>
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="space-y-2 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Photos ({pendingPhotos.length}/{maxPhotos})</label>
            </div>
            <input
              type="file" accept="image/*" multiple onChange={handlePhotos}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-gray-300 file:text-xs hover:file:bg-white/15 cursor-pointer"
            />
            {pendingPhotos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {pendingPhotos.map(photo => (
                  <div key={photo.id} className="relative group">
                    <img src={photo.base64} alt="" className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                    <button
                      onClick={() => setPendingPhotos(prev => prev.filter(p => p.id !== photo.id))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-400 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center transition-colors shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                      aria-label="Supprimer la photo"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Champs custom */}
          {projectFields.length > 0 && (
            <div className="space-y-3 border-t border-white/5 pt-4">
              <p className="text-xs text-gray-600 uppercase tracking-widest">Informations complémentaires</p>
              {projectFields.map(field => (
                <div key={field.id} className="space-y-1">
                  <label className="text-xs text-gray-500">{field.label}</label>
                  {field.fieldType === "boolean" ? (
                    <select
                      value={String(customFieldValues[field.label] ?? "")}
                      onChange={e => setCustomFieldValues(prev => ({ ...prev, [field.label]: e.target.value === "true" }))}
                      className={inputClass}
                    >
                      <option value="">--</option>
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  ) : (
                    <input
                      type={field.fieldType === "number" ? "number" : "text"}
                      value={String(customFieldValues[field.label] ?? "")}
                      onChange={e => setCustomFieldValues(prev => ({
                        ...prev,
                        [field.label]: field.fieldType === "number" ? Number(e.target.value) : e.target.value
                      }))}
                      placeholder={field.fieldType === "number" ? "0" : "..."}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!content.trim() && !voiceTranscript.trim()}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-40 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            Ajouter la note
          </button>
        </section>

        {/* Notes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              Notes ({logs.length})
            </p>
          </div>

          {loading && (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 animate-pulse space-y-3">
                  <div className="h-3 bg-white/10 rounded w-48" />
                  <div className="h-3 bg-white/10 rounded w-20" />
                  <div className="space-y-2 pt-1">
                    <div className="h-3 bg-white/[0.07] rounded w-full" />
                    <div className="h-3 bg-white/[0.07] rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && logs.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <p className="text-3xl">📋</p>
              <p className="text-gray-500 text-sm">Aucune note pour ce chantier.</p>
              <p className="text-gray-700 text-xs">Utilisez le formulaire ci-dessus pour ajouter votre première note.</p>
            </div>
          )}

          {/* Timeline */}
          <div className="relative space-y-3">
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-5 transition-all space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-mono">
                      {new Date(log.date).toLocaleDateString("fr-FR", {
                        weekday: "long", day: "2-digit", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {log.authorName && (
                      <p className="text-xs text-orange-400 mt-0.5 font-medium">{log.authorName}</p>
                    )}
                  </div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => { setEditingLogId(log.id); setEditLogContent(log.content); }}
                      className="text-xs text-gray-600 hover:text-orange-400 transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setConfirmDeleteLogId(log.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {editingLogId === log.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editLogContent}
                      onChange={e => setEditLogContent(e.target.value)}
                      rows={3}
                      className={`resize-none ${inputClass}`}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateLog(log.id)} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg transition-colors">Sauvegarder</button>
                      <button onClick={() => setEditingLogId(null)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-lg transition-colors">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {log.title && (
                      <p className="text-sm font-semibold text-gray-100">{log.title}</p>
                    )}
                    <p className="text-sm text-gray-300 leading-relaxed">{log.content}</p>
                  </div>
                )}

                {/* Note vocale du log */}
                {log.voiceNoteTranscript && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>🎙</span> Transcription vocale
                    </p>
                    <p className="text-xs text-gray-400 leading-relaxed">{log.voiceNoteTranscript}</p>
                  </div>
                )}

                {Object.keys(log.customFields).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(log.customFields).map(([key, value]) => (
                      <span key={key} className="text-xs bg-white/5 border border-white/5 rounded-lg px-2 py-1">
                        <span className="text-gray-600">{key} : </span>
                        <span className="text-gray-300">{typeof value === "boolean" ? (value ? "Oui" : "Non") : String(value)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {log.photos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {log.photos.map(photo => (
                      <img key={photo.id} src={photo.base64} alt="" className="w-24 h-24 object-cover rounded-xl border border-white/10" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {confirmDeleteLogId && (
        <ConfirmDialog
          message="Supprimer cette note ? Cette action est irréversible."
          onConfirm={() => handleDelete(confirmDeleteLogId)}
          onCancel={() => setConfirmDeleteLogId(null)}
        />
      )}
    </div>
  );
}
