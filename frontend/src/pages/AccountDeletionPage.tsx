import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { cancellationLabels, deletionError, listCancellations, submitCancellation, verifyCode, verifyIdentity, type Cancellation, type Reauthentication } from '../services/accountDeletionService';
import '../styles/account-deletion.css';

function AccountDeletionForm({ identity }: { identity: string }) {
  const [requests, setRequests] = useState<Cancellation[]>([]);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [google, setGoogle] = useState(false);
  const [verification, setVerification] = useState<Reauthentication | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(false);
  const mounted = useRef(false);
  const lock = useRef(false);
  const attempt = useRef<{ token: string; key: string } | null>(null);
  const session = localStorage.getItem('token');
  const current = () => mounted.current && localStorage.getItem('token') === session;
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void listCancellations(controller.signal, session).then((rows) => { if (current()) setRequests(rows); })
      .catch((failure) => { if (current() && !axios.isCancel(failure)) setError(deletionError(failure)); });
    return () => { mounted.current = false; controller.abort(); attempt.current = null; };
    // Each identity/session has a separate mounted form and no retained secrets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, session]);
  async function perform(run: () => Promise<void>) {
    if (lock.current || !current()) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await run(); } catch (failure) { if (current()) setError(deletionError(failure)); }
    finally { if (current()) { setBusy(false); setPassword(''); setCode(''); } lock.current = false; }
  }
  function authenticate(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      if (verification && Date.parse(verification.expiresAt) <= Date.now()) { setVerification(null); setError('La verificación venció. Verifica tu identidad nuevamente.'); return; }
      if (verification?.notBefore && Date.parse(verification.notBefore) > Date.now()) { setError('Espera al siguiente código de tu autenticador.'); return; }
      const result = verification?.challengeId ? await verifyCode(verification.challengeId, code, session) : await verifyIdentity(password, google, session);
      if (current()) setVerification(result);
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!attempt.current) {
      if (!verification?.reauthenticationToken || Date.parse(verification.expiresAt) <= Date.now()) {
        setVerification(null); setCode(''); setConfirmation(''); setError('La verificación venció. Verifica tu identidad nuevamente.'); return;
      }
      if (confirmation !== 'SOLICITAR CANCELACIÓN') { setError('Escribe SOLICITAR CANCELACIÓN para confirmar el trámite.'); return; }
    }
    void perform(async () => {
      attempt.current ??= { token: verification!.reauthenticationToken!, key: crypto.randomUUID() };
      try {
        const result = await submitCancellation(attempt.current.token, attempt.current.key, session);
        if (!current()) return;
        setRequests((rows) => [result, ...rows.filter((row) => row.requestId !== result.requestId)]);
        setMessage(result.status === 'pending_review' ? 'Solicitud recibida. Conserva el folio; todavía requiere revisión.' : `Estado confirmado: ${cancellationLabels[result.status]}.`);
        setVerification(null); setConfirmation(''); setRetry(false); attempt.current = null;
      } catch (failure) {
        if (current()) {
          const uncertain = !axios.isAxiosError(failure) || !failure.response || failure.response.status >= 500;
          setRetry(uncertain);
          if (!uncertain) { attempt.current = null; setVerification(null); }
        }
        throw failure;
      }
    });
  }
  const open = requests.some((row) => ['pending_review', 'under_review', 'awaiting_policy'].includes(row.status));
  return <section className="deletion-card">
    <h2>Tu solicitud</h2>
    <p>Sesión de {identity}. La solicitud se asocia a tu cuenta verificada.</p>
    {!open && <>
      {!verification?.reauthenticationToken && <form onSubmit={authenticate}>
        {!verification?.challengeId ? <>
          <label className="deletion-check"><input type="checkbox" checked={google} disabled={busy} onChange={(event) => setGoogle(event.target.checked)} /> Mi cuenta usa Google y no tiene contraseña local</label>
          {google ? <p>Inicia sesión con Google. Después verificaremos tu correo vinculado o tu factor configurado con un código nuevo.</p> : <label>Contraseña actual<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>}
        </> : <><p>{verification.method === 'totp' ? 'Usa un código del autenticador posterior al inicio del trámite.' : 'Consulta el código nuevo enviado a tu correo verificado.'}</p>
          <label>Código de verificación<input inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required disabled={busy} /></label></>}
        <button disabled={busy}>{verification?.challengeId ? 'Confirmar código' : 'Verificar identidad'}</button>
        {verification?.challengeId && <button type="button" disabled={busy} onClick={() => { setVerification(null); setCode(''); }}>Reiniciar verificación</button>}
      </form>}
      {(verification?.reauthenticationToken || retry) && <form onSubmit={submit}>
        <label>Escribe SOLICITAR CANCELACIÓN<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy || retry} autoComplete="off" /></label>
        {retry && <p>La respuesta no pudo confirmarse. Reintenta la misma operación para recuperar su folio.</p>}
        <button disabled={busy}>{retry ? 'Reintentar misma solicitud' : 'Solicitar cancelación'}</button>
        {!retry && <button type="button" disabled={busy} onClick={() => { setVerification(null); setConfirmation(''); }}>Reiniciar verificación</button>}
      </form>}
    </>}
    {open && <p>Ya tienes un trámite abierto. Tu cuenta continúa activa mientras se revisa.</p>}
    <button disabled={busy} onClick={() => void perform(async () => { const rows = await listCancellations(undefined, session); if (current()) setRequests(rows); })}>Actualizar estado</button>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <div aria-live="polite">{requests.map((row) => <article className="deletion-status" key={row.requestId}>
      <h3>{cancellationLabels[row.status]}</h3><p>Folio: <strong>{row.requestId}</strong></p>
      <p>Recibida: {new Date(row.createdAt).toLocaleString('es-MX')}</p>
      {row.resolvedAt && <p>Resolución: {new Date(row.resolvedAt).toLocaleString('es-MX')}</p>}
      <ul>{row.retentionSummary.map((rule) => <li key={rule.category}>{rule.category}: {rule.policyStatus === 'approved' ? `${rule.reason}; hasta ${rule.retainUntil}` : 'Reglas pendientes de aprobación'}</li>)}</ul>
    </article>)}</div>
  </section>;
}
export default function AccountDeletionPage() {
  const { user } = useAuth();
  return <main className="deletion-page">
    <header className="deletion-heading"><p>TITANIUM SPORT GYM · PRIVACIDAD</p><h1>Solicita la eliminación de tu cuenta</h1>
      <p>Puedes iniciar y consultar el trámite desde esta página, sin instalar la aplicación.</p></header>
    <div className="deletion-grid"><section className="deletion-card"><h2>Antes de solicitarla</h2>
      <p>Verificaremos tu identidad antes de registrar una solicitud. Recibir un folio inicia una revisión; no confirma que tus datos ya se hayan eliminado.</p>
      <p>El responsable debe revisar tus membresías, pedidos, entregas y pagos. No se cancelan cobros ni obligaciones automáticamente.</p>
      <p>Las reglas de eliminación y conservación todavía requieren aprobación. Mientras estén pendientes, la eliminación efectiva permanece bloqueada. No hay un plazo de resolución aprobado para anunciar.</p>
      <p>Cuando exista una política aprobada, el estado del trámite informará qué datos se conservan, el motivo y su fecha de conservación.</p>
      <Link to="/aviso-privacidad">Consultar aviso de privacidad y canal ARCO</Link>
    </section>
    {user ? <AccountDeletionForm key={`${user.email}:${localStorage.getItem('token')}`} identity={user.email} /> : <section className="deletion-card"><h2>Verifica tu identidad</h2>
      <p>Inicia sesión con tu cuenta habitual, incluida Google y el segundo factor si corresponde. Después vuelve a esta página para solicitar o consultar el trámite.</p>
      <Link to="/login" state={{ from: { pathname: '/eliminar-cuenta' } }}>Iniciar sesión para continuar</Link>
      <p>Tu correo por sí solo no autoriza una solicitud.</p></section>}
    </div>
  </main>;
}
