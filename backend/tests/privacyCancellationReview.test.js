import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { privacyFixture } from './helpers/privacyFixture.js';

async function setup(t) {
  const f = await privacyFixture();
  const request = await f.http(t);
  const proof = await f.cancellation.reauthenticate(f.client.id, (await f.sessionFor(f.client)).id,
    { purpose: 'account-cancellation', method: 'password', password: f.password });
  const row = await f.cancellation.requestCancellation(f.client.id, (await f.sessionFor(f.client)).id,
    { confirmation: 'SOLICITAR CANCELACIÓN', reauthenticationToken: proof.body.reauthenticationToken }, randomUUID());
  const path = `/admin/account-cancellation-requests/${row.requestId}`;
  const decide = (status, version = 1, key = randomUUID(), user = f.admin) => request(path + '/decisions', {
    user, method: 'POST', headers: { 'Idempotency-Key': key }, body: { status, version, reasonCode: 'SYNTHETIC_REVIEW' },
  });
  return { ...f, request, row, path, decide };
}
function syntheticPolicy(f) {
  const categories = ['payment_records','orders_and_receipts','memberships_and_history','security_and_audit','backups',
    'health_and_training','addresses_and_delivery','analytics_and_exports','media_and_provider_data'];
  const raw = JSON.stringify({ id: 'synthetic-test-only', status: 'approved', executor: 'identity-profile-v1', approvedBy: 'synthetic-test-reviewer',
    approvedAt: new Date(f.now() - 1000).toISOString(), validUntil: new Date(f.now() + 60000).toISOString(),
    identity: 'pseudonymize', personalData: 'erase', retention: Object.fromEntries(categories.map((category) =>
      [category, { action: 'retain', reason: 'Synthetic fixture only; not a legal policy', retainUntil: new Date(f.now() + 60000).toISOString() }])) });
  f.env.ACCOUNT_DELETION_POLICY_JSON = raw;
  f.env.ACCOUNT_DELETION_POLICY_SHA256 = createHash('sha256').update(raw).digest('hex');
  f.env.ACCOUNT_DELETION_EXECUTION_ENABLED = 'true';
}
test('administración exige sesión persistida y rol almacenado; no filtra SQL ni credenciales', async (t) => {
  const f = await setup(t);
  for (const [user, expected] of [[null,401],[f.client,403],[f.trainer,403],[f.admin,200]]) {
    const response = await f.request('/admin/account-cancellation-requests', { user });
    assert.equal(response.status, expected); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(JSON.stringify(response.body), /password|token|requestHash|idempotencyKey/);
  }
  f.failNext.add('AccountCancellationRequest.find');
  const failure = await f.request('/admin/account-cancellation-requests', { user: f.admin });
  assert.equal(failure.status,503); assert.doesNotMatch(JSON.stringify(failure.body), /SQL|secret|private@example/);
});
test('consulta propia recupera folio y estado sin exponer trámites ajenos', async (t) => {
  const f = await setup(t);
  assert.equal((await f.request('/user/account-cancellation-requests')).body.requests[0].requestId, f.row.requestId);
  assert.equal((await f.request('/user/account-cancellation-requests', { user: f.other })).body.requests.length, 0);
  assert.equal((await f.request(`/user/account-cancellation-requests/${f.row.requestId}`, { user: f.other })).status,404);
  await f.decide('under_review');
  assert.equal((await f.request(`/user/account-cancellation-requests/${f.row.requestId}`)).body.status,'under_review');
});
test('detalle administrativo limita datos financieros y preserva relaciones', async (t) => {
  const f = await setup(t);
  await f.models.Payment.create({ userId: f.client.id, status: 'paid', secretProviderData: 'private-secret' });
  await f.models.Order.create({ userId: f.other.id, status: 'paid' });
  const response = await f.request(f.path, { user: f.admin });
  assert.equal(response.status,200); assert.equal(response.body.related.payments.count,1);
  assert.equal(response.body.related.orders.count,0); assert.doesNotMatch(JSON.stringify(response.body),/private-secret|secretProviderData/);
  assert.equal((await f.request(f.path, { user:f.client })).status,403);
});
test('decisiones concurrentes idénticas son idempotentes; la clave no admite otro cuerpo', async (t) => {
  const f = await setup(t); const key = randomUUID();
  const responses = await Promise.all(Array.from({ length:8 },()=> f.decide('under_review',1,key)));
  assert.ok(responses.every((r)=>r.status===200)); assert.equal(f.tables.AccountCancellationEvent.length,1);
  assert.equal((await f.decide('rejected',1,key)).status,409);
  assert.equal((await f.decide('under_review',1)).body.code,'CANCELLATION_VERSION_CHANGED');
});
test('decisiones distintas concurrentes no sobrescriben revisión; transiciones terminales se bloquean', async (t) => {
  const f = await setup(t); await f.decide('under_review');
  const responses = await Promise.all([f.decide('awaiting_policy',2), f.decide('rejected',2)]);
  assert.deepEqual(responses.map((r)=>r.status).sort(),[200,409]);
  assert.equal(f.tables.AccountCancellationEvent.length,2);
  const row = f.tables.AccountCancellationRequest[0];
  if(row.status!=='rejected') await f.decide('rejected',3);
  assert.equal((await f.decide('under_review',row.version)).body.code,'INVALID_CANCELLATION_TRANSITION');
  assert.equal((await f.request('/user/profile')).status,200);
});
test('solicitudes bajo revisión impiden duplicados, incluso con otra prueba válida', async (t) => {
  const f = await setup(t); await f.decide('under_review');
  const token = (await f.cancellation.reauthenticate(f.client.id,(await f.sessionFor(f.client)).id,
    {purpose:'account-cancellation',method:'password',password:f.password})).body.reauthenticationToken;
  await assert.rejects(()=>f.cancellation.requestCancellation(f.client.id,(f.tables.Session[0]).id,
    {confirmation:'SOLICITAR CANCELACIÓN',reauthenticationToken:token},randomUUID()),(e)=>e.code==='CANCELLATION_ALREADY_PENDING');
});
test('no existe eliminación destructiva sin política; aprobación HTTP y política alterada no sirven', async (t) => {
  const f = await setup(t); await f.decide('under_review');
  assert.equal((await f.decide('completed',2)).body.code,'RETENTION_POLICY_PENDING_APPROVAL');
  assert.equal(f.client.deletionCompletedAt,undefined); assert.equal(f.tables.AccountCancellationEvent.length,1);
  syntheticPolicy(f); f.env.ACCOUNT_DELETION_POLICY_JSON += ' ';
  assert.equal((await f.decide('completed',2)).body.code,'DELETION_POLICY_UNSUPPORTED');
  const response = await f.request(f.path+'/decisions',{user:f.admin,method:'POST',headers:{'Idempotency-Key':randomUUID()},
    body:{status:'completed',version:2,reasonCode:'SYNTHETIC',policyApproved:true}});
  assert.equal(response.status,422);
});
test('política sintética aprobada no permite completar con membresías u obligaciones abiertas', async (t) => {
  const f = await setup(t); await f.decide('under_review'); syntheticPolicy(f);
  await f.models.UserSubscription.create({userId:f.client.id,status:'active'});
  assert.equal((await f.decide('completed',2)).body.code,'FINANCIAL_REVIEW_REQUIRED');
  assert.equal(f.client.deletionCompletedAt,undefined);
});
test('una política aprobada no activa por sí sola el ejecutor operativo', async (t) => {
  const f=await setup(t); await f.decide('under_review'); syntheticPolicy(f);
  delete f.env.ACCOUNT_DELETION_EXECUTION_ENABLED;
  assert.equal((await f.decide('completed',2)).body.code,'DELETION_EXECUTION_DISABLED');
  assert.equal(f.client.deletionCompletedAt,undefined);
});
test('autorrevisión y sesiones administrativas revocadas se rechazan dentro del servicio', async (t) => {
  const f=await setup(t);
  const service=await f.load('services/accountCancellationAdminService.js');
  const session=await f.sessionFor(f.admin);
  await session.update({revoked:true});
  await assert.rejects(()=>service.decideCancellation(f.admin,session.id,f.row.requestId,{status:'under_review',version:1,reasonCode:'SYNTHETIC_REVIEW'},randomUUID()),(e)=>e.code==='UNAUTHORIZED');
  await session.update({revoked:false});
  await f.tables.AccountCancellationRequest[0].update({userId:f.admin.id});
  assert.equal((await f.decide('under_review')).body.code,'SELF_REVIEW_FORBIDDEN');
});
test('capacidades públicas no revelan usuarios ni políticas internas',async(t)=>{
  const f=await privacyFixture(); const request=await f.http(t);
  const response=await request('/privacy/capabilities',{user:null});
  assert.equal(response.status,200); assert.equal(response.body.schemaVersion,2);
  assert.equal(response.body.deletionRequiresApprovedPolicy,true);
  assert.equal(response.body.databaseReady,true);
  assert.doesNotMatch(JSON.stringify(response.body),/approvedBy|policyId|email|token/);
});
test('capabilities falla cerrado si falta el esquema o la lectura de metadatos',async(t)=>{
  const f=await privacyFixture(); const request=await f.http(t);
  f.env.PRIVACY_TEST_SCHEMA_READY='false';
  let response=await request('/privacy/capabilities',{user:null});
  assert.equal(response.status,503); assert.equal(response.body.databaseReady,false);
  f.env.PRIVACY_TEST_SCHEMA_READY='true'; f.failNext.add('schema.query');
  response=await request('/privacy/capabilities',{user:null});
  assert.equal(response.status,503); assert.doesNotMatch(JSON.stringify(response.body),/SQL|secret|information_schema/);
  assert.equal(f.schemaQueries.length,2);
  assert.ok(f.schemaQueries.every((query)=>/^\s*WITH required/.test(query) && !/\b(?:UPDATE|DELETE|INSERT|ALTER|CREATE|DROP)\b/i.test(query)));
});
test('una política pendiente con hash correcto y ejecución habilitada nunca autoriza una baja',async(t)=>{
  const f=await setup(t); await f.decide('under_review'); syntheticPolicy(f);
  const policy=JSON.parse(f.env.ACCOUNT_DELETION_POLICY_JSON); policy.status='pending_approval';
  f.env.ACCOUNT_DELETION_POLICY_JSON=JSON.stringify(policy);
  f.env.ACCOUNT_DELETION_POLICY_SHA256=createHash('sha256').update(f.env.ACCOUNT_DELETION_POLICY_JSON).digest('hex');
  assert.equal((await f.decide('completed',2)).body.code,'DELETION_POLICY_UNSUPPORTED');
  assert.equal(f.client.deletionCompletedAt,undefined); assert.equal((await f.sessionFor(f.client)).revoked,false);
  assert.equal(f.tables.AccountCancellationEvent.length,1);
});
test('Google no admite suplantar el método, la identidad o el correo en el cuerpo',async(t)=>{
  const f=await privacyFixture(); const request=await f.http(t);
  const session=await f.sessionFor(f.client);
  const token=jwt.sign({id:f.client.id,loginMethod:'google'},f.env.JWT_SECRET,{expiresIn:'1h'});
  await session.update({token}); f.sessionTokens.set(f.client.id,token);
  const body={purpose:'account-cancellation',method:'google-email'};
  for(const fields of [
    {provider:'local',providerId:'subject',isVerified:true,password:null},
    {provider:'google',providerId:null,isVerified:true,password:null},
    {provider:'google',providerId:'subject',isVerified:false,password:null},
  ]) {
    await f.client.update(fields);
    assert.equal((await request('/auth/reauthenticate',{method:'POST',body})).status,409);
  }
  await f.client.update({provider:'google',providerId:'subject',isVerified:true,password:null});
  for(const extra of [{email:f.other.email},{userId:f.other.id},{loginMethod:'google'},{idToken:'untrusted-provider-token'}]) {
    assert.equal((await request('/auth/reauthenticate',{method:'POST',body:{...body,...extra}})).status,422);
  }
  assert.equal(f.deliveries.length,0); assert.equal(f.tables.ReauthenticationProof.length,0);
});
test('finalización sintética es atómica, revoca accesos y conserva finanzas y auditoría', async (t) => {
  const f = await setup(t); await f.decide('under_review'); syntheticPolicy(f);
  await f.models.UserPersonalData.create({userId:f.client.id,fullName:'Synthetic',phone:'55555'});
  const payment = await f.models.Payment.create({userId:f.client.id,status:'paid'});
  const qr = await f.models.AccessQrToken.create({userId:f.client.id,usedAt:null});
  f.failNext.add('AccountCancellationEvent.create');
  assert.equal((await f.decide('completed',2)).status,503);
  assert.equal(f.client.deletionCompletedAt,undefined); assert.equal((await f.sessionFor(f.client)).revoked,false);
  const key=randomUUID(); const done=await f.decide('completed',2,key);
  assert.equal(done.status,200); assert.equal(done.body.status,'completed'); assert.ok(done.body.resolvedAt);
  assert.equal((await f.decide('completed',2,key)).status,200);
  assert.equal(f.client.password,null); assert.ok(f.client.deletionCompletedAt); assert.match(f.client.email,/@account.invalid$/);
  assert.equal(f.tables.UserPersonalData[0].fullName,null); assert.equal((await f.sessionFor(f.client)).revoked,true); assert.ok(qr.usedAt);
  assert.equal(payment.status,'paid'); assert.equal(f.tables.AccountCancellationEvent.length,2);
  assert.equal(f.tables.AccountCancellationEvent[1].policySha256,f.env.ACCOUNT_DELETION_POLICY_SHA256);
  assert.equal((await f.request('/user/profile')).status,401);
});
test('Google sin contraseña requiere sesión Google, identidad verificada y código nuevo de un solo uso', async (t) => {
  const f = await privacyFixture(); const request=await f.http(t);
  await f.client.update({provider:'google',providerId:'synthetic-google-subject',password:null});
  const body={purpose:'account-cancellation',method:'google-email'};
  assert.equal((await request('/auth/reauthenticate',{method:'POST',body})).status,409);
  const session=await f.sessionFor(f.client);
  const token=jwt.sign({id:f.client.id,loginMethod:'google'},f.env.JWT_SECRET,{expiresIn:'1h'});
  await session.update({token}); f.sessionTokens.set(f.client.id,token);
  const started=await request('/auth/reauthenticate',{method:'POST',body});
  assert.equal(started.status,202); assert.equal(started.body.reauthenticationToken,undefined);
  const code=f.deliveries.at(-1).code;
  const verified=await request('/auth/reauthenticate/verify',{method:'POST',body:{challengeId:started.body.challengeId,code}});
  assert.equal(verified.status,200);
  assert.equal((await request('/auth/reauthenticate/verify',{method:'POST',body:{challengeId:started.body.challengeId,code}})).status,403);
  await f.client.update({providerId:'different-subject'});
  assert.equal((await request('/user/account-cancellation-requests',{method:'POST',headers:{'Idempotency-Key':randomUUID()},
    body:{confirmation:'SOLICITAR CANCELACIÓN',reauthenticationToken:verified.body.reauthenticationToken}})).status,403);
  assert.doesNotMatch(JSON.stringify(f.logs),new RegExp(code));
});
