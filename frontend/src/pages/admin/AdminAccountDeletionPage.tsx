import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cancellationLabels, deletionError, listAdministrativeCancellations, administrativeCancellation, decideAdministrativeCancellation,
  type Cancellation, type CancellationStatus, type CancellationDetail } from '../../services/accountDeletionService';
import '../../styles/account-deletion.css';

function AdminAccountDeletionForm() {
  const [status, setStatus] = useState<CancellationStatus>('pending_review');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Cancellation[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<CancellationDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<CancellationStatus>('under_review');
  const [revision, setRevision] = useState(0);
  const active = useRef(0);
  const invalidate = useCallback(() => { active.current += 1; }, []);
  const lock = useRef(false);
  const attempt = useRef<{ key: string; id: string; body: { status: CancellationStatus; version: number; reasonCode: string } } | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const token = localStorage.getItem('token');
  const ownsSession = useCallback(() => Boolean(token) && localStorage.getItem('token') === token, [token]);
  useEffect(() => {
    const controller = new AbortController();
    invalidate();
    setDetail(null); setRows([]); setHasMore(false);
    void listAdministrativeCancellations(status, page, controller.signal, token)
      .then((data) => { if (!controller.signal.aborted && ownsSession()) { setRows(data.requests); setHasMore(data.hasMore); } })
      .catch((failure) => { if (!controller.signal.aborted && ownsSession()) setError(deletionError(failure)); });
    return () => { controller.abort(); invalidate(); };
  }, [status, page, revision, invalidate, ownsSession, token]);
  async function load(id: string) {
    if (lock.current || uncertain || !ownsSession()) return;
    const epoch = ++active.current;
    lock.current = true; setBusy(true); setDetail(null); setReason(''); setError('');
    try {
      const data = await administrativeCancellation(id, token);
      if (active.current === epoch && ownsSession()) { setDetail(data); setTarget(data.status === 'under_review' ? 'awaiting_policy' : 'under_review'); }
    } catch (failure) { if (active.current === epoch && ownsSession()) setError(deletionError(failure)); }
    finally { lock.current = false; if (active.current === epoch && ownsSession()) setBusy(false); }
  }
  async function decide() {
    if (!detail || lock.current || !ownsSession()) return;
    const epoch = active.current;
    attempt.current ??= { key: crypto.randomUUID(), id: detail.requestId, body: { status: target, version: detail.version, reasonCode: reason } };
    const pending = attempt.current;
    lock.current = true; setBusy(true); setError('');
    try {
      await decideAdministrativeCancellation(pending.id, pending.body, pending.key, token);
      attempt.current = null; setUncertain(false);
      if (active.current === epoch && ownsSession()) { setRevision((value) => value + 1); setReason(''); }
    } catch (failure) {
      // Keep the same command/key after an uncertain response. The operator
      // must resolve that decision before navigating to a different request.
      const response = (failure as { response?: { status?: number } }).response;
      const retry = !response?.status || response.status >= 500;
      if (!retry) attempt.current = null;
      if (active.current === epoch && ownsSession()) { setUncertain(retry); setError(deletionError(failure)); }
    } finally { lock.current = false; if (active.current === epoch && ownsSession()) setBusy(false); }
  }
  return <main className="deletion-page"><header className="deletion-heading"><h1>Solicitudes de eliminación</h1><p>Revisión administrativa. Las reglas de conservación se aprueban fuera de este formulario.</p></header>
    <div className="deletion-grid"><section className="deletion-card"><h2>Bandeja de solicitudes</h2>
      <label>Estado<select aria-label="Estado de solicitudes" value={status} disabled={busy || uncertain} onChange={(event) => { setStatus(event.target.value as CancellationStatus); setPage(1); }}>{Object.entries(cancellationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {rows.map((row) => <article className="deletion-status" key={row.requestId}><p>{row.requestId}</p><button disabled={busy || uncertain} onClick={() => void load(row.requestId)}>Revisar solicitud</button></article>)}
      {!rows.length && <p>No hay solicitudes en este estado.</p>}
      <button disabled={busy || uncertain || page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page}</span><button disabled={busy || uncertain || !hasMore} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
    </section><section className="deletion-card"><h2>Revisión y decisiones</h2>
      {detail ? <><p>Folio: {detail.requestId}</p><p>Titular: {detail.userId}</p><p>{cancellationLabels[detail.status]} · Versión {detail.version}</p>
        {Object.entries(detail.related).map(([category, value]) => <details key={category}><summary>{category}: {value.count} · {value.requiresReview ? 'Requiere revisión de obligaciones' : 'Revisar conservación'}</summary><ul>{value.records.map((row) => <li key={row.id}>{row.id} · {row.status}</li>)}</ul>{value.count > 100 && <p>Se muestran los primeros 100 registros. Completa la revisión en el módulo correspondiente.</p>}</details>)}
        {['pending_review','under_review','awaiting_policy'].includes(detail.status) && <form onSubmit={(event) => { event.preventDefault(); void decide(); }}>
          <label>Nuevo estado<select value={target} disabled={busy || uncertain} onChange={(event) => setTarget(event.target.value as CancellationStatus)}>
            {(detail.status === 'pending_review' ? ['under_review'] : detail.status === 'under_review' ? ['awaiting_policy','rejected','completed'] : ['under_review','rejected','completed']).map((value) => <option key={value} value={value}>{cancellationLabels[value as CancellationStatus]}</option>)}</select></label>
          <label>Código auditable de motivo<input value={reason} pattern="[A-Z][A-Z0-9_]{2,79}" required disabled={busy || uncertain} onChange={(event) => setReason(event.target.value)} /></label>
          <p>Completar exige política aprobada, vigente y compatible, además de obligaciones resueltas. No se autoriza una eliminación por seleccionar este estado.</p>
          <button disabled={busy}>{uncertain ? 'Reintentar misma decisión' : 'Registrar decisión'}</button>
        </form>}
        <h3>Auditoría</h3><ul>{detail.events.map((event) => <li key={event.eventId}>{event.recordedAt} · {event.actorId} · {cancellationLabels[event.toStatus]} · {event.reasonCode}</li>)}</ul>
      </> : <p>Selecciona un folio para revisar sus relaciones y auditoría.</p>}
      {error && <p role="alert">{error}</p>}
    </section></div>
  </main>;
}
export default function AdminAccountDeletionPage() {
  const { user } = useAuth();
  return <AdminAccountDeletionForm key={`${user?.email}:${localStorage.getItem('token')}`} />;
}
