export type Role = "owner" | "manager" | "worker";
export type ProjectStatus = "active" | "paused" | "done";
export type FieldType = "text" | "number" | "boolean";
export type NewProject = Omit<Project, "organizationId" | "createdBy">;
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export type Organization = {
  id: string;
  name: string;
  createdAt: string;
  subscriptionPlanId?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  trialEndsAt?: string;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  label: string;
  maxProjects: number;       // -1 = illimité
  maxPhotosPerLog: number;
  maxMembers: number;        // -1 = illimité
  aiSummary: boolean;
  pdfExport: boolean;
  customFields: boolean;
  voiceNotes: boolean;
  priceMonthly: number;
  createdAt: string;
};

export type FieldTemplate = {
  id: string;
  organizationId: string;
  label: string;
  fieldType: FieldType;
  category?: string;
  position: number;
  createdAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  name: string;
  createdAt: string;
};

export type InviteCode = {
  id: string;
  organizationId: string;
  code: string;
  role: Role;
  createdBy: string;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  address?: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdBy: string;
  createdAt: string;
  city?: string;
  postalCode?: string;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
};

export type ProjectField = {
  id: string;
  projectId: string;
  label: string;
  fieldType: FieldType;
  position: number;
};

export type Photo = {
  id: string;
  base64: string;
};

export type DailyLog = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  date: string;
  photos: Photo[];
  customFields: Record<string, string | number | boolean>;
  voiceNoteUrl?: string;
  voiceNoteTranscript?: string;
  voiceNoteSummary?: string;
};

export type PdfSettings = {
  id?: string;
  organizationId: string;
  primaryColor: string;
  logoBase64?: string;
  showCover: boolean;
  showPhotos: boolean;
  showCustomFields: boolean;
  footerText: string;
};

// Admin plateforme — vue agrégée
export type AdminOrgView = {
  id: string;
  name: string;
  createdAt: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  trialEndsAt?: string;
  planName: string;
  planLabel: string;
  priceMonthly: number;
  maxProjects: number;
  maxPhotosPerLog: number;
  maxMembers: number;
  aiSummary: boolean;
  pdfExport: boolean;
  voiceNotes: boolean;
  memberCount: number;
  projectCount: number;
  ownerName?: string;
};
