import { supabase } from "./supabase";
import {
  Organization, OrganizationMember,
  Project, ProjectField, FieldTemplate, FieldType, DailyLog, PdfSettings,
  SubscriptionPlan, AdminOrgView,
} from "./types";

// ─── Auth helpers ─────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentMember(): Promise<OrganizationMember | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    userId: data.user_id,
    role: data.role,
    name: data.name,
    createdAt: data.created_at,
  };
}

// ─── Organisation ─────────────────────────────────────────

export async function createOrganization(name: string, ownerName: string): Promise<Organization | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name })
    .select()
    .single();

  if (orgError || !org) {
    console.error("ORG ERROR code:", orgError?.code);
    console.error("ORG ERROR message:", orgError?.message);
    console.error("ORG ERROR hint:", orgError?.hint);
    console.error("ORG ERROR details:", orgError?.details);
    return null;
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "owner",
      name: ownerName,
    });

  if (memberError) {
    console.error("MEMBER ERROR code:", memberError?.code);
    console.error("MEMBER ERROR message:", memberError?.message);
    console.error("MEMBER ERROR hint:", memberError?.hint);
    return null;
  }

  return {
    id: org.id,
    name: org.name,
    createdAt: org.created_at,
    subscriptionStatus: "trial" as const,
  };
}

// ─── Invitation ───────────────────────────────────────────

export async function createInviteCode(role: "manager" | "worker"): Promise<string | null> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return null;

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { error } = await supabase
    .from("invite_codes")
    .insert({
      organization_id: member.organizationId,
      code,
      role,
      created_by: member.userId,
    });

  if (error) { console.error(error); return null; }
  return code;
}

export async function joinWithCode(code: string, name: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data: invite, error: inviteError } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .is("used_by", null)
    .single();

  if (inviteError || !invite) return false;

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      name,
    });

  if (memberError) { console.error(memberError); return false; }

  await supabase
    .from("invite_codes")
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return true;
}

// ─── Membres ──────────────────────────────────────────────

export async function getOrgMembers(): Promise<OrganizationMember[]> {
  const member = await getCurrentMember();
  if (!member) return [];

  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", member.organizationId);

  if (error) { console.error(error); return []; }

  return data.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    name: row.name,
    createdAt: row.created_at,
  }));
}

// ─── Projets ──────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const member = await getCurrentMember();
  if (!member) return [];

  let query = supabase
    .from("projects")
    .select("*")
    .eq("organization_id", member.organizationId)
    .order("created_at", { ascending: false });

  if (member.role === "worker") {
    const { data: pm } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", member.userId);

    const ids = pm?.map(p => p.project_id) ?? [];
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data, error } = await query;
  if (error) { console.error(error); return []; }

  return data.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    clientName: row.client_name,
    clientPhone: row.client_phone ?? "",
    clientEmail: row.client_email ?? "",
    address: row.address ?? "",
    description: row.description ?? "",
    status: row.status ?? "active",
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    city: row.city ?? "",
    postalCode: row.postal_code ?? "",
  }));
}

export async function addProject(project: Project): Promise<Project | null> {
  const user = await getCurrentUser();
  const member = await getCurrentMember();
  if (!user || !member) return null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: project.id,
      organization_id: member.organizationId,
      name: project.name,
      client_name: project.clientName,
      client_phone: project.clientPhone || null,
      client_email: project.clientEmail || null,
      address: project.address || null,
      description: project.description || null,
      status: project.status,
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      created_by: user.id,
      city: project.city || null,
postal_code: project.postalCode || null,
    })
    .select()
    .single();

  if (error || !data) { console.error(error); return null; }

  return { ...project, createdBy: user.id, createdAt: data.created_at };
}

export async function updateProject(project: Project): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({
      name: project.name,
      client_name: project.clientName,
      client_phone: project.clientPhone || null,
      client_email: project.clientEmail || null,
      address: project.address || null,
      description: project.description || null,
      status: project.status,
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      city: project.city || null,
postal_code: project.postalCode || null,
    })
    .eq("id", project.id);
  if (error) console.error(error);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) console.error(error);
}

// ─── Field Templates ──────────────────────────────────────

export async function getFieldTemplates(): Promise<FieldTemplate[]> {
  const member = await getCurrentMember();
  if (!member) return [];

  const { data, error } = await supabase
    .from("field_templates")
    .select("*")
    .eq("organization_id", member.organizationId)
    .order("category")
    .order("position");

  if (error) { console.error(error); return []; }

  return data.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    label: row.label,
    fieldType: row.field_type as FieldType,
    category: row.category ?? "",
    position: row.position,
    createdAt: row.created_at,
  }));
}

export async function addFieldTemplate(
  label: string,
  fieldType: FieldType,
  category: string
): Promise<FieldTemplate | null> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return null;

  const { data, error } = await supabase
    .from("field_templates")
    .insert({
      organization_id: member.organizationId,
      label,
      field_type: fieldType,
      category: category || null,
    })
    .select()
    .single();

  if (error || !data) { console.error(error); return null; }

  return {
    id: data.id,
    organizationId: data.organization_id,
    label: data.label,
    fieldType: data.field_type as FieldType,
    category: data.category ?? "",
    position: data.position,
    createdAt: data.created_at,
  };
}

export async function deleteFieldTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("field_templates")
    .delete()
    .eq("id", id);
  if (error) console.error(error);
}

type ProjectFieldRow = {
  field_template_id: string;
  field_templates: {
    id: string;
    organization_id: string;
    label: string;
    field_type: string;
    category: string | null;
    position: number;
    created_at: string;
  } | null;
};

export async function getProjectFieldTemplates(projectId: string): Promise<FieldTemplate[]> {
  const { data, error } = await supabase
    .from("project_fields")
    .select("field_template_id, field_templates(*)")
    .eq("project_id", projectId);

  if (error || !data) { console.error(error); return []; }

  return (data as unknown as ProjectFieldRow[])
    .filter(row => row.field_templates)
    .map(row => {
      const t = row.field_templates!;
      return {
        id: t.id,
        organizationId: t.organization_id,
        label: t.label,
        fieldType: t.field_type as FieldType,
        category: t.category ?? "",
        position: t.position,
        createdAt: t.created_at,
      };
    });
}

export async function toggleProjectField(
  projectId: string,
  templateId: string,
  enabled: boolean
): Promise<void> {
  if (enabled) {
    const { error } = await supabase
      .from("project_fields")
      .insert({ project_id: projectId, field_template_id: templateId });
    if (error) console.error(error);
  } else {
    const { error } = await supabase
      .from("project_fields")
      .delete()
      .eq("project_id", projectId)
      .eq("field_template_id", templateId);
    if (error) console.error(error);
  }
}

// ─── Logs ─────────────────────────────────────────────────

export async function getLogs(projectId: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  if (error) { console.error(error); return []; }

  return data.map(row => ({
    id: row.id,
    projectId: row.project_id,
    authorId: row.author_id,
    authorName: row.author_name ?? "",
    content: row.content,
    date: row.date,
    photos: row.photos ?? [],
    customFields: row.custom_fields ?? {},
    title: row.title ?? undefined,
    voiceNoteUrl: row.voice_note_url ?? undefined,
    voiceNoteTranscript: row.voice_note_transcript ?? undefined,
    voiceNoteSummary: row.voice_note_summary ?? undefined,
  }));
}

export async function addLog(log: DailyLog): Promise<void> {
  const { error } = await supabase.from("daily_logs").insert({
    id: log.id,
    project_id: log.projectId,
    author_id: log.authorId,
    author_name: log.authorName,
    title: log.title ?? null,
    content: log.content,
    date: log.date,
    photos: log.photos,
    custom_fields: log.customFields,
    voice_note_url: log.voiceNoteUrl ?? null,
    voice_note_transcript: log.voiceNoteTranscript ?? null,
    voice_note_summary: log.voiceNoteSummary ?? null,
  });
  if (error) console.error(error);
}

export async function updateLogVoice(
  logId: string,
  fields: { voiceNoteUrl?: string; voiceNoteTranscript?: string; voiceNoteSummary?: string }
): Promise<void> {
  const update: Record<string, string | null> = {};
  if (fields.voiceNoteUrl !== undefined)      update.voice_note_url = fields.voiceNoteUrl;
  if (fields.voiceNoteTranscript !== undefined) update.voice_note_transcript = fields.voiceNoteTranscript;
  if (fields.voiceNoteSummary !== undefined)  update.voice_note_summary = fields.voiceNoteSummary;
  const { error } = await supabase.from("daily_logs").update(update).eq("id", logId);
  if (error) console.error(error);
}

export async function updateLog(log: Partial<DailyLog> & { id: string }): Promise<void> {
  const update: Record<string, string | null> = {};
  if (log.content !== undefined) update.content = log.content;
  if (log.title !== undefined) update.title = log.title;
  const { error } = await supabase
    .from("daily_logs")
    .update(update)
    .eq("id", log.id);
  if (error) console.error(error);
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from("daily_logs").delete().eq("id", id);
  if (error) console.error(error);
}

// ─── Project members ──────────────────────────────────────

export async function getProjectMembers(projectId: string): Promise<OrganizationMember[]> {
  const { data: pm, error } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId);

  if (error || !pm) return [];

  const userIds = pm.map(p => p.user_id);
  if (userIds.length === 0) return [];

  const { data: members } = await supabase
    .from("organization_members")
    .select("*")
    .in("user_id", userIds);

  return (members ?? []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function addProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId });
  if (error) console.error(error);
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) console.error(error);
}

// ─── Stats ────────────────────────────────────────────────

export type StatsPeriod = "week" | "month" | "year";

export type StatsData = {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  totalLogs: number;
  totalMembers: number;
  logsByAuthor: { name: string; count: number; projects: number }[];
  projectsByCommune: { commune: string; count: number }[];
  activityByDay: { date: string; count: number; label: string }[];
  mostActiveProjects: { name: string; count: number }[];
};

export async function getStats(period: StatsPeriod = "month"): Promise<StatsData | null> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return null;
  const orgId = member.organizationId;

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, status, address, city, name")
    .eq("organization_id", orgId);

  const projectIds = projectsData?.map(p => p.id) ?? [];
  if (projectIds.length === 0) return {
    totalProjects: 0,
    projectsByStatus: { active: 0, paused: 0, done: 0 },
    totalLogs: 0,
    totalMembers: 0,
    logsByAuthor: [],
    projectsByCommune: [],
    activityByDay: [],
    mostActiveProjects: [],
  };

  const { data: logsData } = await supabase
    .from("daily_logs")
    .select("id, author_name, project_id, date")
    .in("project_id", projectIds);

  const { data: membersData } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", orgId);

  // Période
  const now = new Date();
  let days = 30;
  if (period === "week") days = 7;
  if (period === "year") days = 365;

  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - (days - 1));
  periodStart.setHours(0, 0, 0, 0);

  // Projets par statut
  const projectsByStatus: Record<string, number> = { active: 0, paused: 0, done: 0 };
  (projectsData ?? []).forEach(p => {
    if (p.status in projectsByStatus) projectsByStatus[p.status]++;
  });

  // Logs par auteur
  const authorMap: Record<string, { count: number; projects: Set<string> }> = {};
  (logsData ?? []).forEach(log => {
    const name = log.author_name || "Inconnu";
    if (!authorMap[name]) authorMap[name] = { count: 0, projects: new Set() };
    authorMap[name].count++;
    authorMap[name].projects.add(log.project_id);
  });
  const logsByAuthor = Object.entries(authorMap)
    .map(([name, data]) => ({ name, count: data.count, projects: data.projects.size }))
    .sort((a, b) => b.count - a.count);

  // Projets par commune
  const communeMap: Record<string, number> = {};
  (projectsData ?? []).forEach(p => {
    const city = p.city;
    if (city) communeMap[city] = (communeMap[city] ?? 0) + 1;
  });
  const projectsByCommune = Object.entries(communeMap)
    .map(([commune, count]) => ({ commune, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Activité par période
const activityByDay: { date: string; count: number; label: string }[] = [];

if (period === "year") {
  // Agréger par mois
  const monthMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = 0;
  }
  (logsData ?? []).forEach(log => {
    const month = log.date?.slice(0, 7);
    if (month && month in monthMap) monthMap[month]++;
  });
  Object.entries(monthMap).forEach(([month, count]) => {
    const d = new Date(month + "-01");
    activityByDay.push({
      date: month,
      count,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
    });
  });
} else {
  const dayMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  (logsData ?? []).forEach(log => {
    const day = log.date?.slice(0, 10);
    if (day && day in dayMap) dayMap[day]++;
  });
  Object.entries(dayMap).forEach(([date, count]) => {
    const d = new Date(date);
    const label = period === "week"
      ? d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })
      : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    activityByDay.push({ date, count, label });
  });
}

  // Chantiers les plus actifs
  const projectLogMap: Record<string, number> = {};
  (logsData ?? []).forEach(log => {
    projectLogMap[log.project_id] = (projectLogMap[log.project_id] ?? 0) + 1;
  });
  const mostActiveProjects = Object.entries(projectLogMap)
    .map(([pid, count]) => ({
      name: projectsData?.find(p => p.id === pid)?.name ?? "Inconnu",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalProjects: projectsData?.length ?? 0,
    projectsByStatus,
    totalLogs: logsData?.length ?? 0,
    totalMembers: membersData?.length ?? 0,
    logsByAuthor,
    projectsByCommune,
    activityByDay,
    mostActiveProjects,
  };
}

// ─── PDF Settings ─────────────────────────────────────────

export async function getPdfSettings(): Promise<PdfSettings | null> {
  const member = await getCurrentMember();
  if (!member) return null;

  const { data } = await supabase
    .from("pdf_settings")
    .select("*")
    .eq("organization_id", member.organizationId)
    .single();

  if (!data) {
    return {
      organizationId: member.organizationId,
      primaryColor: "#F0A500",
      logoBase64: "",
      showCover: true,
      showPhotos: true,
      showCustomFields: true,
      footerText: "Document confidentiel — généré automatiquement",
    };
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    primaryColor: data.primary_color ?? "#F0A500",
    logoBase64: data.logo_base64 ?? "",
    showCover: data.show_cover ?? true,
    showPhotos: data.show_photos ?? true,
    showCustomFields: data.show_custom_fields ?? true,
    footerText: data.footer_text ?? "Document confidentiel — généré automatiquement",
  };
}

export async function updatePdfSettings(settings: PdfSettings): Promise<void> {
  const member = await getCurrentMember();
  if (!member) return;

  const { error } = await supabase
    .from("pdf_settings")
    .upsert({
      organization_id: member.organizationId,
      primary_color: settings.primaryColor,
      logo_base64: settings.logoBase64 || null,
      show_cover: settings.showCover,
      show_photos: settings.showPhotos,
      show_custom_fields: settings.showCustomFields,
      footer_text: settings.footerText,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" });

  if (error) console.error(error);
}
// ─── Profil & Organisation ────────────────────────────────

export async function updateMemberName(name: string): Promise<void> {
  const member = await getCurrentMember();
  if (!member) return;
  const { error } = await supabase
    .from("organization_members")
    .update({ name })
    .eq("id", member.id);
  if (error) console.error(error);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) console.error(error);
}

export async function updateOrganizationName(name: string): Promise<void> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return;
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", member.organizationId);
  if (error) console.error(error);
}

export async function removeMember(userId: string): Promise<void> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return;
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", member.organizationId);
  if (error) console.error(error);
}

export async function updateMemberRole(userId: string, role: "manager" | "worker"): Promise<void> {
  const member = await getCurrentMember();
  if (!member || member.role !== "owner") return;
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("user_id", userId)
    .eq("organization_id", member.organizationId);
  if (error) console.error(error);
}

export async function getOrganization(): Promise<Organization | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", member.organizationId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    subscriptionPlanId: data.subscription_plan_id ?? undefined,
    subscriptionStatus: data.subscription_status ?? "trial",
    subscriptionExpiresAt: data.subscription_expires_at ?? undefined,
    trialEndsAt: data.trial_ends_at ?? undefined,
  };
}

// ─── Stats personnelles (worker) ──────────────────────────

export type PersonalStatsData = {
  totalLogs: number;
  totalPhotos: number;
  totalProjects: number;
  mostActiveDay: string;
  mostActiveCommune: string | null;
  activityByDay: { date: string; count: number; label: string }[];
  lastLogDate: string | null;
  logsByProject: { name: string; count: number }[];
};

export async function getPersonalStats(): Promise<PersonalStatsData | null> {
  const member = await getCurrentMember();
  if (!member) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  // Tous les logs de cet utilisateur
  const { data: logsData } = await supabase
    .from("daily_logs")
    .select("id, project_id, date, photos, author_name")
    .eq("author_id", user.id)
    .order("date", { ascending: false });

  if (!logsData || logsData.length === 0) return {
    totalLogs: 0,
    totalPhotos: 0,
    totalProjects: 0,
    mostActiveDay: "—",
    mostActiveCommune: null,
    activityByDay: [],
    lastLogDate: null,
    logsByProject: [],
  };

  // Total photos
  const totalPhotos = logsData.reduce((acc, log) => {
    return acc + ((log.photos as unknown[])?.length ?? 0);
  }, 0);

  // Projets distincts
  const projectIds = [...new Set(logsData.map(l => l.project_id))];

  // Infos projets (nom + ville)
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, city")
    .in("id", projectIds);

  // Logs par projet
  const projectLogMap: Record<string, number> = {};
  logsData.forEach(log => {
    projectLogMap[log.project_id] = (projectLogMap[log.project_id] ?? 0) + 1;
  });
  const logsByProject = Object.entries(projectLogMap)
    .map(([pid, count]) => ({
      name: projectsData?.find(p => p.id === pid)?.name ?? "Inconnu",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Jour le plus actif (lundi, mardi...)
  const dayCount: Record<number, number> = {};
  logsData.forEach(log => {
    const day = new Date(log.date).getDay(); // 0=dim, 1=lun...
    dayCount[day] = (dayCount[day] ?? 0) + 1;
  });
  const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const mostActiveDayIndex = Object.entries(dayCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const mostActiveDay = mostActiveDayIndex !== undefined
    ? DAY_NAMES[Number(mostActiveDayIndex)]
    : "—";

  // Commune la plus travaillée
  const communeCount: Record<string, number> = {};
  logsData.forEach(log => {
    const city = projectsData?.find(p => p.id === log.project_id)?.city;
    if (city) communeCount[city] = (communeCount[city] ?? 0) + 1;
  });
  const mostActiveCommune = Object.entries(communeCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Activité 30 derniers jours
  const now = new Date();
  const dayMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  logsData.forEach(log => {
    const day = log.date?.slice(0, 10);
    if (day && day in dayMap) dayMap[day]++;
  });
  const activityByDay = Object.entries(dayMap).map(([date, count]) => {
    const d = new Date(date);
    return {
      date,
      count,
      label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    };
  });

  return {
    totalLogs: logsData.length,
    totalPhotos,
    totalProjects: projectIds.length,
    mostActiveDay,
    mostActiveCommune,
    activityByDay,
    lastLogDate: logsData[0]?.date ?? null,
    logsByProject,
  };
}

// ─── Abonnements ──────────────────────────────────────────

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_monthly");
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    name: row.name,
    label: row.label,
    maxProjects: row.max_projects,
    maxPhotosPerLog: row.max_photos_per_log,
    maxMembers: row.max_members,
    aiSummary: row.ai_summary,
    pdfExport: row.pdf_export,
    customFields: row.custom_fields,
    voiceNotes: row.voice_notes,
    priceMonthly: Number(row.price_monthly),
    createdAt: row.created_at,
  }));
}

export async function getOrgSubscriptionPlan(): Promise<SubscriptionPlan | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const { data, error } = await supabase
    .from("organizations")
    .select("subscription_plan_id, subscription_plans(*)")
    .eq("id", member.organizationId)
    .single();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = (data as any).subscription_plans;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    maxProjects: row.max_projects,
    maxPhotosPerLog: row.max_photos_per_log,
    maxMembers: row.max_members,
    aiSummary: row.ai_summary,
    pdfExport: row.pdf_export,
    customFields: row.custom_fields,
    voiceNotes: row.voice_notes,
    priceMonthly: Number(row.price_monthly),
    createdAt: row.created_at,
  };
}

// ─── Admin plateforme ─────────────────────────────────────

export async function isPlatformAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();
  return !!data;
}

export async function getAdminOrganizations(): Promise<AdminOrgView[]> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return [];
  const { data, error } = await supabase
    .from("admin_organizations_view")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    subscriptionStatus: row.subscription_status,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    trialEndsAt: row.trial_ends_at ?? undefined,
    planName: row.plan_name ?? "free",
    planLabel: row.plan_label ?? "Gratuit",
    priceMonthly: Number(row.price_monthly ?? 0),
    maxProjects: row.max_projects ?? 3,
    maxPhotosPerLog: row.max_photos_per_log ?? 3,
    maxMembers: row.max_members ?? 5,
    aiSummary: row.ai_summary ?? false,
    pdfExport: row.pdf_export ?? false,
    voiceNotes: row.voice_notes ?? false,
    memberCount: row.member_count ?? 0,
    projectCount: row.project_count ?? 0,
    ownerName: row.owner_name ?? undefined,
  }));
}

export async function adminUpdateOrgSubscription(
  orgId: string,
  planId: string,
  status: "trial" | "active" | "expired" | "cancelled",
  expiresAt?: string
): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_plan_id: planId,
      subscription_status: status,
      subscription_expires_at: expiresAt ?? null,
    })
    .eq("id", orgId);
  if (error) console.error(error);
}

export async function adminAddPlatformAdmin(userId: string): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("platform_admins")
    .insert({ user_id: userId });
  if (error) console.error(error);
}

export async function adminRemovePlatformAdmin(userId: string): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("platform_admins")
    .delete()
    .eq("user_id", userId);
  if (error) console.error(error);
}

export async function adminRenameOrg(orgId: string, name: string): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", orgId);
  if (error) console.error(error);
}

export type AdminOrgMember = {
  id: string;
  userId: string;
  name: string;
  role: "owner" | "manager" | "worker";
  createdAt: string;
};

export async function adminGetOrgMembers(orgId: string): Promise<AdminOrgMember[]> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return [];
  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, name, role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    role: r.role,
    createdAt: r.created_at,
  }));
}

export async function adminUpdateMemberRole(memberId: string, role: "owner" | "manager" | "worker"): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);
  if (error) console.error(error);
}

export async function adminRemoveMember(memberId: string): Promise<void> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return;
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);
  if (error) console.error(error);
}

export async function adminCreateInviteCode(orgId: string, role: "manager" | "worker"): Promise<string | null> {
  const isAdmin = await isPlatformAdmin();
  if (!isAdmin) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { error } = await supabase
    .from("invite_codes")
    .insert({ organization_id: orgId, code, role, created_by: user.id });
  if (error) { console.error(error); return null; }
  return code;
}