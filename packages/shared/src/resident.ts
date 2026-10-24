import { z } from 'zod';
export const neighborhoods = [
  { id: 'amman-nour', name: 'Al Nour District', nameAr: 'حي النور', city: 'Amman', cityAr: 'عمّان', latitude: 31.9566, longitude: 35.9457 },
  { id: 'amman-amal', name: 'Al Amal District', nameAr: 'حي الأمل', city: 'Amman', cityAr: 'عمّان', latitude: 31.973, longitude: 35.903 },
  { id: 'irbid-waha', name: 'Al Waha District', nameAr: 'حي الواحة', city: 'Irbid', cityAr: 'إربد', latitude: 32.5556, longitude: 35.85 },
  { id: 'aqaba-nour', name: 'Al Nour District', nameAr: 'حي النور', city: 'Aqaba', cityAr: 'العقبة', latitude: 29.5319, longitude: 35.0061 },
  { id: 'zarqa-amal', name: 'Al Amal District', nameAr: 'حي الأمل', city: 'Zarqa', cityAr: 'الزرقاء', latitude: 32.0728, longitude: 36.088 },
] as const;
export type Neighborhood = typeof neighborhoods[number];
export const neighborhoodId = z.enum(neighborhoods.map(n => n.id));
export const categories = ['lighting', 'roads', 'waste', 'water', 'other', 'unsure'] as const;
export const categorySchema = z.enum(categories);
export const jordanLocationSchema = z.object({ label: z.string().trim().min(2).max(240), latitude: z.number().min(29).max(33.5), longitude: z.number().min(34.8).max(39.4) }).strict();
export type JordanLocation = z.infer<typeof jordanLocationSchema>;
export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80), phone: z.string().trim().max(25).regex(/^[+\d ()-]*$/),
  bio: z.string().trim().max(160), homeNeighborhood: neighborhoodId,
  followedNeighborhoods: z.array(neighborhoodId).max(5).refine(a => new Set(a).size === a.length),
  reportUpdates: z.boolean(), areaAlerts: z.boolean(), avatarColor: z.enum(['teal', 'ink', 'amber']),
  location: jordanLocationSchema.optional(),
  followedLocations: z.array(jordanLocationSchema).max(10).default([]),
  onboardingCompleted: z.boolean().default(false),
}).strict();
export type ResidentProfile = z.infer<typeof profileSchema> & { email: string };
export const reportLocationSchema = z.object({ label: z.string().trim().min(2).max(240), latitude: z.number().min(29).max(33.5).optional(), longitude: z.number().min(34.8).max(39.4).optional() }).strict().refine(v => (v.latitude === undefined) === (v.longitude === undefined), { message: 'Provide both coordinates or neither.' });
export type ReportLocation = z.infer<typeof reportLocationSchema>;
export const reportSchema = z.object({
  kind:z.enum(['problem','improvement']).optional(),
  triageId:z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(5).max(100), description: z.string().trim().min(15).max(2000),
  category: categorySchema, neighborhood: neighborhoodId.optional(), landmark: z.string().trim().max(160),
  submissionId: z.uuid(),
  location: reportLocationSchema,
  photoIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(3),
  publicVisibility: z.boolean().optional(), publicSummary: z.string().trim().max(240).optional(),
  analysisId:z.string().regex(/^[a-f\d]{24}$/i).optional(),
  draftVersion: z.number().int().min(0).optional(),
}).strict().refine(v => !v.publicVisibility || (v.publicSummary?.length ?? 0) >= 15, { path: ['publicSummary'], message: 'Write a public summary (15–240 characters).' });
export const reportDraftSchema = z.object({
  kind:z.enum(['problem','improvement']).optional(),
  title: z.string().max(100), description: z.string().max(2000), category: categorySchema,
  landmark: z.string().max(160), submissionId: z.uuid(),
  location: z.object({ label: z.string().max(240), latitude: z.number().min(29).max(33.5).optional(), longitude: z.number().min(34.8).max(39.4).optional() }).strict(),
  photoIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(3), publicVisibility: z.boolean(), publicSummary: z.string().max(240),
}).strict();
export type ReportDraftData = z.infer<typeof reportDraftSchema>;
export type ReportDraft = { data: ReportDraftData; version: number; updatedAt: string };
export type NewReport = z.infer<typeof reportSchema>;
export type ResidentReport = {
  kind?:'problem'|'improvement';
  id: string; caseNumber: string; title: string; description: string; category: typeof categories[number];
  neighborhood: string; landmark: string; latitude: number | null; longitude: number | null;
  status: 'submitted' | 'under_review' | 'in_progress' | 'awaiting_citizen_confirmation' | 'closed' | 'reopened';
  agency: string | null; agencyAr: string | null; createdAt: string; isDemo: boolean;
  locationLabel?: string;
  photoIds: string[];
  publicVisibility?: boolean; publicSummary?: string;
  history: { message: string; messageAr: string; date: string; actor?: string; type?: string; photoIds?: string[] }[];
  analysis?:import('./ai').AIReview|null;
  tasks?: CaseTask[]; transfers?: CaseTransfer[]; waitingSince?: string; nextAction?: 'agency_review'|'lead_update'|'transfer_decision'|'citizen_response'|'citizen_confirmation'|'none';
  citizenRequest?: {question:string;awaiting:boolean;requestedAt:string}|null;
  resolution?: {summary:string;photoIds:string[];submittedAt:string}|null;
};
export type CaseTask={id:string;agencyId:string;agency:string;agencyAr:string;title:string;required:boolean;state:'pending'|'in_progress'|'completed';note:string;photoIds:string[];updatedAt:string};
export type CaseTransfer={id:string;fromAgencyId:string;toAgencyId:string;fromAgency:string;toAgency:string;fromAgencyAr:string;toAgencyAr:string;reason:string;responseReason:string;state:'pending'|'accepted'|'declined'|'cancelled';createdAt:string;updatedAt:string};
export type AgencyWorkspace={report:ResidentReport;agencies:{id:string;name:string;nameAr:string}[];notes:{id:string;body:string;actor:string;date:string}[];isLead:boolean;canAccept:boolean};
export type AgencyOverviewData={counts:{unassigned:number;active:number;awaiting:number;closed:number;incoming:number;tasks:number};recent:ResidentReport[];weekly:{date:string;count:number}[]};
export type ReportPage = { items: ResidentReport[]; nextCursor: string | null };
export type PublicReport = Pick<ResidentReport, 'id' | 'title' | 'category' | 'status' | 'createdAt' | 'isDemo'> & { summary: string };
export type ResidentAlert = {
  affectsHome?:boolean;
  id: string; title: string; titleAr: string; description: string; descriptionAr: string;
  agency: string; agencyAr: string; neighborhood: string; status: 'active' | 'scheduled' | 'resolved' | 'cancelled';
  startsAt: string; endsAt: string | null; instructions: string; instructionsAr: string;
  updates: { message: string; messageAr: string; date: string }[]; isDemo: boolean;
};
export type ResidentNotification = { threadId?:string|null; id: string; title: string; titleAr: string; body: string; bodyAr: string; date: string; read: boolean; reportId: string | null; alertId: string | null };
export type ResidentData = { contribution:{reports:number;inProgress:number;resolved:number}; profile: ResidentProfile; reports: ResidentReport[]; alerts: ResidentAlert[]; notifications: ResidentNotification[] };
