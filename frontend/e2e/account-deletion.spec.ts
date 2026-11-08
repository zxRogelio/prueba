import { expect, test, type Page } from '@playwright/test';

const folio = '73b38a8e-2fc5-4000-a005-4fb67b12bfaf';
const receipt = { requestId: folio, status: 'pending_review', createdAt: new Date().toISOString(), resolvedAt: null,
  version: 1, resolutionCode: null, membershipImpact: { requiresReview: true }, retentionSummary: [
    { category: 'payment_records', policyStatus: 'pending_approval', reason: null, retainUntil: null },
  ] };
async function session(page: Page, email = 'synthetic@example.invalid', role = 'cliente') {
  await page.addInitScript(({ value, role }) => {
    localStorage.setItem('token', 'synthetic-session-token');
    localStorage.setItem('user', JSON.stringify({ email: value, rol: role }));
  }, { value: email, role });
}
test.beforeEach(async ({ page }) => {
  // Every API call is intercepted: no local backend, Neon or provider is used.
  await page.route('http://127.0.0.1:5190/api/**', (route) => route.fulfill({ json: { requests: [], categories: [], brands: [], products: [], cart: null } }));
});
test('public page works at phone and desktop sizes, requires login and links privacy', async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/eliminar-cuenta');
    await expect(page.getByRole('heading', { name: 'Solicita la eliminación de tu cuenta' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Iniciar sesión para continuar' })).toBeVisible();
    await expect(page.locator('input[type=email]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Consultar aviso de privacidad y canal ARCO' })).toHaveAttribute('href','/aviso-privacidad');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path:'test-results/account-deletion/public-mobile.png', fullPage:true });
  }
});
test('password verification, uncertain retry preserves key, refresh recovers actual status', async ({ page }) => {
  await session(page);
  await page.route('**/api/auth/reauthenticate', (route) => route.fulfill({ json: { reauthenticationToken: 'a'.repeat(43), expiresAt: new Date(Date.now()+300000).toISOString() } }));
  const keys: string[] = [];
  await page.route('**/api/user/account-cancellation-requests', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { requests: keys.length > 1 ? [{ ...receipt, status:'awaiting_policy', version:3 }] : [] } });
    keys.push(route.request().headers()['idempotency-key']);
    return route.fulfill({ status: keys.length === 1 ? 503 : 202, json: keys.length === 1 ? { code:'PRIVACY_SERVICE_UNAVAILABLE' } : receipt });
  });
  await page.goto('/eliminar-cuenta');
  await page.getByLabel('Contraseña actual').fill('Synthetic!123');
  await page.getByRole('button', { name: 'Verificar identidad' }).click();
  await page.getByLabel('Escribe SOLICITAR CANCELACIÓN').fill('SOLICITAR CANCELACIÓN');
  await page.getByRole('button', { name: 'Solicitar cancelación', exact:true }).click();
  await page.getByRole('button', { name: 'Reintentar misma solicitud' }).click();
  await expect(page.getByText(folio,{exact:true})).toBeVisible();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  await page.getByRole('button',{name:'Actualizar estado'}).click();
  await expect(page.getByRole('heading',{name:'Pendiente de política aprobada'})).toBeVisible();
  await page.reload();
  await expect(page.getByText(folio,{exact:true})).toBeVisible();
});
test('Google step-up sends no password and waits for the fresh challenge', async ({ page }) => {
  await session(page);
  let submitted: unknown;
  await page.route('**/api/auth/reauthenticate', (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({status:202,json:{challengeId:folio,method:'otp',expiresAt:new Date(Date.now()+300000).toISOString()}});
  });
  await page.goto('/eliminar-cuenta');
  await page.getByLabel('Mi cuenta usa Google y no tiene contraseña local').check();
  await page.getByRole('button',{name:'Verificar identidad'}).click();
  await expect(page.getByLabel('Código de verificación')).toBeVisible();
  await expect(page.getByRole('button',{name:'Solicitar cancelación',exact:true})).toHaveCount(0);
  expect(submitted).toEqual({purpose:'account-cancellation',method:'google-email'});
});
test('HTTP 401 shows a session error without displaying the server diagnostics', async ({ page }) => {
  await session(page);
  await page.route('**/api/user/account-cancellation-requests', (route)=>route.fulfill({status:401,json:{error:'private SQL secret'}}));
  await page.goto('/eliminar-cuenta');
  await expect(page.getByRole('alert')).toContainText('La sesión venció');
  await expect(page.getByText('private SQL secret')).toHaveCount(0);
});
test('admin revision handles a stale version and keeps policy-blocked completion pending', async ({ page }) => {
  await session(page,'synthetic-admin@example.invalid','administrador');
  let revision=1;
  await page.route('**/api/admin/account-cancellation-requests*',route=>route.fulfill({json:{requests:[receipt],page:1,hasMore:false}}));
  await page.route(`**/api/admin/account-cancellation-requests/${folio}`,route=>route.fulfill({json:{...receipt,
    status:revision===1?'pending_review':'under_review',version:revision,userId:'11111111-1111-4111-8111-111111111111',
    related:{memberships:{count:1,requiresReview:true,records:[{id:'22222222-2222-4222-8222-222222222222',status:'active'}]}},events:[]}}));
  await page.route(`**/api/admin/account-cancellation-requests/${folio}/decisions`,route=>{
    const first=revision===1; revision=2;
    return route.fulfill({status:409,json:{code:first?'CANCELLATION_VERSION_CHANGED':'RETENTION_POLICY_PENDING_APPROVAL'}});
  });
  await page.goto('/admin/solicitudes-eliminacion');
  await page.getByRole('button',{name:'Revisar solicitud'}).click();
  await expect(page.getByText(/Requiere revisión de obligaciones/)).toBeVisible();
  await page.getByLabel('Código auditable de motivo').fill('SYNTHETIC_REVIEW');
  await page.getByRole('button',{name:'Registrar decisión'}).click();
  await expect(page.getByRole('alert')).toContainText('El trámite cambió');
  await page.getByRole('button',{name:'Revisar solicitud'}).click();
  await page.getByLabel('Nuevo estado').selectOption('completed');
  await page.getByLabel('Código auditable de motivo').fill('SYNTHETIC_REVIEW');
  await page.getByRole('button',{name:'Registrar decisión'}).click();
  await expect(page.getByRole('alert')).toContainText('La eliminación está bloqueada');
  await expect(page.getByText('En revisión · Versión 2')).toBeVisible();
});
test('admin uncertain decision retries the same immutable command and key',async({page})=>{
  await session(page,'synthetic-admin@example.invalid','administrador');
  await page.route('**/api/admin/account-cancellation-requests*',route=>route.fulfill({json:{requests:[receipt],page:1,hasMore:false}}));
  await page.route(`**/api/admin/account-cancellation-requests/${folio}`,route=>route.fulfill({json:{...receipt,userId:'11111111-1111-4111-8111-111111111111',related:{},events:[]}}));
  const attempts:{key:string;body:unknown}[]=[];
  await page.route(`**/api/admin/account-cancellation-requests/${folio}/decisions`,route=>{
    attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
    return route.fulfill({status:attempts.length===1?503:200,json:attempts.length===1?{code:'PRIVACY_SERVICE_UNAVAILABLE'}:{...receipt,status:'under_review',version:2}});
  });
  await page.goto('/admin/solicitudes-eliminacion');
  await page.getByRole('button',{name:'Revisar solicitud'}).click();
  await page.getByLabel('Código auditable de motivo').fill('SYNTHETIC_REVIEW');
  await page.getByRole('button',{name:'Registrar decisión'}).click();
  await expect(page.getByRole('combobox',{name:'Estado de solicitudes'})).toBeDisabled();
  await page.getByRole('button',{name:'Reintentar misma decisión'}).click();
  await expect(page.getByText('Selecciona un folio para revisar sus relaciones y auditoría.')).toBeVisible();
  expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
});
test('awaiting-policy folio defaults to a valid return to review',async({page})=>{
  await session(page,'synthetic-admin@example.invalid','administrador');
  const pending={...receipt,status:'awaiting_policy',version:3};
  let decided=false,command:unknown;
  await page.route('**/api/admin/account-cancellation-requests*',route=>{
    const selected=new URL(route.request().url()).searchParams.get('status');
    return route.fulfill({json:{requests:selected==='awaiting_policy'&&!decided?[pending]:[],page:1,hasMore:false}});
  });
  await page.route(`**/api/admin/account-cancellation-requests/${folio}`,route=>route.fulfill({json:{...pending,userId:'11111111-1111-4111-8111-111111111111',related:{},events:[]}}));
  await page.route(`**/api/admin/account-cancellation-requests/${folio}/decisions`,route=>{
    command=route.request().postDataJSON(); decided=true;
    return route.fulfill({json:{...receipt,status:'under_review',version:4,resolutionCode:'SYNTHETIC_REVIEW'}});
  });
  await page.goto('/admin/solicitudes-eliminacion');
  await page.getByRole('combobox',{name:'Estado de solicitudes'}).selectOption('awaiting_policy');
  await page.getByRole('button',{name:'Revisar solicitud'}).click();
  await expect(page.getByLabel('Nuevo estado')).toHaveValue('under_review');
  await page.getByLabel('Código auditable de motivo').fill('SYNTHETIC_REVIEW');
  await page.getByRole('button',{name:'Registrar decisión'}).click();
  await expect(page.getByText('Selecciona un folio para revisar sus relaciones y auditoría.')).toBeVisible();
  expect(command).toEqual({status:'under_review',version:3,reasonCode:'SYNTHETIC_REVIEW'});
});

test('loading another folio removes the old decision form and blocks stale actions',async({page})=>{
  await session(page,'synthetic-admin@example.invalid','administrador');
  const other='55555555-5555-4555-8555-555555555555';
  const detail=(requestId:string)=>({...receipt,requestId,userId:'11111111-1111-4111-8111-111111111111',related:{},events:[]});
  await page.route('**/api/admin/account-cancellation-requests*',route=>route.fulfill({json:{requests:[receipt,{...receipt,requestId:other}],page:1,hasMore:false}}));
  await page.route(`**/api/admin/account-cancellation-requests/${folio}`,route=>route.fulfill({json:detail(folio)}));
  let release!:()=>void, received!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const reached=new Promise<void>(resolve=>{received=resolve;});
  await page.route(`**/api/admin/account-cancellation-requests/${other}`,async(route)=>{received();await gate;await route.fulfill({json:detail(other)});});
  await page.goto('/admin/solicitudes-eliminacion');
  await page.getByRole('button',{name:'Revisar solicitud'}).first().click();
  await expect(page.getByRole('button',{name:'Registrar decisión'})).toBeVisible();
  await page.getByRole('button',{name:'Revisar solicitud'}).nth(1).click(); await reached;
  await expect(page.getByRole('button',{name:'Registrar decisión'})).toHaveCount(0);
  await expect(page.getByRole('combobox',{name:'Estado de solicitudes'})).toBeDisabled();
  release();
  await expect(page.getByText(`Folio: ${other}`,{exact:true})).toBeVisible();
});
test('expired proof returns to identity verification without sending a cancellation',async({page})=>{
  await session(page); const now=new Date(); await page.clock.setFixedTime(now);
  await page.route('**/api/auth/reauthenticate',route=>route.fulfill({json:{reauthenticationToken:'a'.repeat(43),expiresAt:new Date(now.getTime()+300000).toISOString()}}));
  const writes:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/user/account-cancellation-requests'))writes.push(request.url());});
  await page.goto('/eliminar-cuenta');
  await page.getByLabel('Contraseña actual').fill('Synthetic!123');
  await page.getByRole('button',{name:'Verificar identidad'}).click();
  await page.getByLabel('Escribe SOLICITAR CANCELACIÓN').fill('SOLICITAR CANCELACIÓN');
  await page.clock.setFixedTime(new Date(now.getTime()+360000));
  await page.getByRole('button',{name:'Solicitar cancelación',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('La verificación venció');
  await expect(page.getByLabel('Contraseña actual')).toBeVisible(); expect(writes).toHaveLength(0);
});
test('malformed HTTP 200 never announces verified identity',async({page})=>{
  await session(page);
  await page.route('**/api/auth/reauthenticate',route=>route.fulfill({json:{reauthenticationToken:'not-a-valid-proof',expiresAt:'invalid'}}));
  await page.goto('/eliminar-cuenta');
  await page.getByLabel('Contraseña actual').fill('Synthetic!123');
  await page.getByRole('button',{name:'Verificar identidad'}).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo confirmar');
  await expect(page.getByLabel('Escribe SOLICITAR CANCELACIÓN')).toHaveCount(0);
});
