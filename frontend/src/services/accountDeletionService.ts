import axios, { type AxiosRequestConfig } from "axios";
import { API } from "../api/api";

export type CancellationStatus = 'pending_review' | 'under_review' | 'awaiting_policy' | 'rejected' | 'completed';
export interface Cancellation {
  requestId: string; status: CancellationStatus; createdAt: string; resolvedAt: string | null;
  version: number; resolutionCode: string | null;
  retentionSummary: { category: string; policyStatus: string; reason: string | null; retainUntil: string | null }[];
}
export const cancellationLabels: Record<CancellationStatus, string> = {
  pending_review: 'Pendiente de revisión', under_review: 'En revisión', awaiting_policy: 'Pendiente de política aprobada',
  rejected: 'Solicitud rechazada', completed: 'Eliminación de identidad completada con conservación informada',
};
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const date = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const invalid = (): never => { throw new Error('INVALID_DELETION_RESPONSE'); };
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function status(value: unknown): value is CancellationStatus {
  return typeof value === 'string' && Object.hasOwn(cancellationLabels, value);
}
export function parseCancellation(value: unknown, expectedId?: string): Cancellation {
  const row = record(value);
  if (!uuid(row.requestId) || (expectedId !== undefined && row.requestId !== expectedId) || !status(row.status) ||
      !date(row.createdAt) || record(row.membershipImpact).requiresReview !== true || !Number.isSafeInteger(row.version) || Number(row.version) < 1 ||
      (row.resolutionCode !== null && (typeof row.resolutionCode !== 'string' || !/^[A-Z][A-Z0-9_]{2,79}$/.test(row.resolutionCode))) ||
      !Array.isArray(row.retentionSummary) || !row.retentionSummary.length) return invalid();
  const resolved = row.status === 'completed' || row.status === 'rejected';
  if (resolved ? !date(row.resolvedAt) || Date.parse(row.resolvedAt) < Date.parse(row.createdAt) : row.resolvedAt !== null) return invalid();
  const seen = new Set<string>();
  const retentionSummary = row.retentionSummary.map((value) => {
    const rule = record(value);
    if (typeof rule.category !== 'string' || !rule.category || seen.has(rule.category) || !['pending_approval','approved'].includes(String(rule.policyStatus)) ||
        (row.status === 'completed' && rule.policyStatus !== 'approved') ||
        (rule.policyStatus === 'approved' && (typeof rule.reason !== 'string' || !rule.reason.trim() || !date(rule.retainUntil))) ||
        (rule.reason !== null && typeof rule.reason !== 'string') || (rule.retainUntil !== null && !date(rule.retainUntil))) return invalid();
    seen.add(rule.category);
    return { category: rule.category, policyStatus: String(rule.policyStatus), reason: rule.reason as string | null, retainUntil: rule.retainUntil as string | null };
  });
  return { requestId: row.requestId, status: row.status, createdAt: row.createdAt, resolvedAt: row.resolvedAt as string | null,
    version: Number(row.version), resolutionCode: row.resolutionCode as string | null, retentionSummary };
}
function parseRequests(value: unknown) {
  const body = record(value);
  if (!Array.isArray(body.requests) || body.requests.length > 50) return invalid();
  const seen = new Set<string>();
  return body.requests.map((row) => {
    const parsed = parseCancellation(row); if (seen.has(parsed.requestId)) return invalid();
    seen.add(parsed.requestId); return parsed;
  });
}
async function privateRequest(config: AxiosRequestConfig, expectedToken: string | null) {
  // Keep an old operation bound to its initiating account. The shared API
  // interceptor reads localStorage later and could otherwise adopt a new login.
  const client = axios.create({ baseURL: API.defaults.baseURL });
  client.interceptors.request.use((request) => {
    if (!expectedToken || localStorage.getItem('token') !== expectedToken) throw new Error('DELETION_SESSION_CHANGED');
    request.headers.set('Authorization', `Bearer ${expectedToken}`); return request;
  });
  return client.request<unknown>(config);
}
export function deletionError(error: unknown): string {
  if (error instanceof Error && error.message === 'DELETION_SESSION_CHANGED') return 'La sesión cambió. Inicia sesión nuevamente antes de continuar.';
  if (!axios.isAxiosError(error)) return 'No se pudo confirmar la operación. Intenta consultar el estado.';
  const messages: Record<string, string> = {
    RETENTION_POLICY_PENDING_APPROVAL: 'La eliminación está bloqueada hasta aprobar las reglas de conservación.',
    DELETION_POLICY_UNSUPPORTED: 'La política todavía no permite completar esta eliminación.',
    DELETION_EXECUTION_DISABLED: 'La ejecución permanece deshabilitada hasta validar el procedimiento operativo.',
    FINANCIAL_REVIEW_REQUIRED: 'Existen obligaciones o entregas que requieren revisión.',
    CANCELLATION_VERSION_CHANGED: 'El trámite cambió. Actualiza antes de decidir.',
    CANCELLATION_ALREADY_PENDING: 'Ya tienes una solicitud abierta. Actualiza la lista para consultar su folio.',
    REAUTHENTICATION_METHOD_UNAVAILABLE: 'Inicia sesión con Google para verificar una cuenta sin contraseña local.',
    REAUTHENTICATION_FAILED: 'No se pudo verificar tu identidad.', REAUTHENTICATION_REQUIRED: 'La verificación venció o el código no es válido.',
  };
  const status = error.response?.status;
  if (status === 401) return 'La sesión venció. Inicia sesión nuevamente.';
  if (status === 403) return messages[String(error.response?.data?.code)] ?? 'No tienes autorización para esta operación.';
  if (status === 429) return 'Demasiados intentos. Espera antes de continuar.';
  return messages[String(error.response?.data?.code)] ?? 'No se pudo confirmar la operación. Consulta de nuevo antes de reintentar.';
}
export async function listCancellations(signal?: AbortSignal, token = localStorage.getItem('token')): Promise<Cancellation[]> {
  const response = await privateRequest({ method:'GET',url:'/user/account-cancellation-requests',signal }, token);
  if (response.status !== 200) return invalid(); return parseRequests(response.data);
}
export type Reauthentication = { challengeId?: string; method?: 'otp' | 'totp'; expiresAt: string; notBefore?: string; reauthenticationToken?: string };
function parseReauthentication(value: unknown, httpStatus: number): Reauthentication {
  const row = record(value);
  if (!date(row.expiresAt) || Date.parse(row.expiresAt) <= Date.now()) return invalid();
  if (httpStatus === 200 && typeof row.reauthenticationToken === 'string' && /^[A-Za-z0-9_-]{43}$/.test(row.reauthenticationToken) && !('challengeId' in row)) {
    return { reauthenticationToken:row.reauthenticationToken,expiresAt:row.expiresAt };
  }
  if (httpStatus !== 202 || !uuid(row.challengeId) || !['otp','totp'].includes(String(row.method)) || 'reauthenticationToken' in row ||
      (row.method === 'totp' && (!date(row.notBefore) || Date.parse(row.notBefore) >= Date.parse(row.expiresAt)))) return invalid();
  return { challengeId:row.challengeId,method:row.method as 'otp'|'totp',expiresAt:row.expiresAt,
    ...(row.method === 'totp' ? { notBefore:row.notBefore as string } : {}) };
}
export async function verifyIdentity(password: string, google: boolean, token = localStorage.getItem('token')): Promise<Reauthentication> {
  const response = await privateRequest({method:'POST',url:'/auth/reauthenticate',data:{purpose:'account-cancellation',method:google?'google-email':'password',...(google?{}:{password})}},token);
  return parseReauthentication(response.data,response.status);
}
export async function verifyCode(challengeId: string, code: string, token = localStorage.getItem('token')): Promise<Reauthentication> {
  if (!uuid(challengeId) || !/^\d{6}$/.test(code)) return invalid();
  const response = await privateRequest({method:'POST',url:'/auth/reauthenticate/verify',data:{challengeId,code}},token);
  if (response.status !== 200) return invalid(); return parseReauthentication(response.data,200);
}
export async function submitCancellation(reauthenticationToken: string, key: string, token = localStorage.getItem('token')): Promise<Cancellation> {
  const response = await privateRequest({method:'POST',url:'/user/account-cancellation-requests',data:{confirmation:'SOLICITAR CANCELACIÓN',reauthenticationToken},headers:{'Idempotency-Key':key}},token);
  if (response.status !== 202) return invalid(); return parseCancellation(response.data);
}
export interface CancellationDetail extends Cancellation {
  userId:string;
  related:Record<string,{count:number;requiresReview:boolean;records:{id:string;status:string}[]}>;
  events:{eventId:string;actorId:string;toStatus:CancellationStatus;reasonCode:string;recordedAt:string}[];
}
export async function listAdministrativeCancellations(status:CancellationStatus,page:number,signal:AbortSignal,token:string|null) {
  const response=await privateRequest({method:'GET',url:'/admin/account-cancellation-requests',params:{status,page},signal},token);
  const body=record(response.data);
  if(response.status!==200 || body.page!==page || typeof body.hasMore!=='boolean') return invalid();
  return {requests:parseRequests(body),hasMore:body.hasMore};
}
export async function administrativeCancellation(id:string,token:string|null):Promise<CancellationDetail> {
  if(!uuid(id)) return invalid();
  const response=await privateRequest({method:'GET',url:`/admin/account-cancellation-requests/${id}`},token);
  if(response.status!==200) return invalid(); const body=record(response.data);
  if(!uuid(body.userId) || !Array.isArray(body.events)) return invalid();
  const related:CancellationDetail['related']={};
  for(const [category,value] of Object.entries(record(body.related))) {
    if(!['memberships','orders','payments'].includes(category)) return invalid();
    const group=record(value);
    if(!Number.isSafeInteger(group.count) || typeof group.requiresReview!=='boolean' || !Array.isArray(group.records) || group.records.length>100 || Number(group.count)<group.records.length) return invalid();
    related[category]={count:Number(group.count),requiresReview:group.requiresReview,records:group.records.map((value)=>{
      const row=record(value); if(!uuid(row.id) || typeof row.status!=='string' || !row.status) return invalid(); return {id:row.id,status:row.status};
    })};
  }
  const events=body.events.map((value)=>{
    const row=record(value); if(!uuid(row.eventId) || !uuid(row.actorId) || !status(row.toStatus) || typeof row.reasonCode!=='string' || !date(row.recordedAt)) return invalid();
    return {eventId:row.eventId,actorId:row.actorId,toStatus:row.toStatus,reasonCode:row.reasonCode,recordedAt:row.recordedAt};
  });
  return {...parseCancellation(body,id),userId:body.userId,related,events};
}
export async function decideAdministrativeCancellation(id:string,body:{status:CancellationStatus;version:number;reasonCode:string},key:string,token:string|null) {
  if(!uuid(id) || !uuid(key)) return invalid();
  const response=await privateRequest({method:'POST',url:`/admin/account-cancellation-requests/${id}/decisions`,data:body,headers:{'Idempotency-Key':key}},token);
  if(response.status!==200) return invalid(); return parseCancellation(response.data,id);
}
