[CmdletBinding(DefaultParameterSetName = 'Safe')]
param(
    [Parameter(ParameterSetName = 'Full', Mandatory = $true)]
    [switch]$Run,
    [Parameter(ParameterSetName = 'Verify', Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$VerifyRun,
    [Parameter(ParameterSetName = 'Selective', Mandatory = $true)]
    [switch]$Selective,
    [Parameter(ParameterSetName = 'Selective')]
    [Parameter(ParameterSetName = 'Full')]
    [switch]$AuthorizeTemporaryWrites
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskSecureUrl = $null
$taskUrlPointer = [IntPtr]::Zero
$taskLocationPushed = $false
$taskStage = 'mode-selection'
$taskVerifyOnly = $PSBoundParameters.ContainsKey('VerifyRun')
$taskSelective = $PSBoundParameters.ContainsKey('Selective')
$taskFull = $PSBoundParameters.ContainsKey('Run')

try {
    # Solo el entorno del proceso; no consulta ni cambia variables de usuario/sistema.
    [Environment]::SetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', $null, 'Process')
    if (-not $taskVerifyOnly -and
        (-not ($Run.IsPresent -or $Selective.IsPresent) -or -not $AuthorizeTemporaryWrites.IsPresent)) {
        Write-Host 'Seleccione -VerifyRun para lectura, o -Run/-Selective con -AuthorizeTemporaryWrites para escrituras temporales.'
        throw 'Choose -VerifyRun for read-only checks, or -Run/-Selective with explicit -AuthorizeTemporaryWrites.'
    }
    $taskStage = 'local-target'
    $taskBackendRoot = Split-Path -Parent $PSScriptRoot
    $taskTarget = Get-Content -LiteralPath (Join-Path $taskBackendRoot 'target.local') -Raw | ConvertFrom-Json
    if ($taskTarget.environment -cne 'test' -or
        $taskTarget.neonBranchId -cne 'br-divine-butterfly-akvmjram' -or
        $taskTarget.host -cne 'ep-falling-wave-akf610u0.c-3.us-west-2.aws.neon.tech' -or
        $taskTarget.expectedDatabaseId -cne 'd0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3' -or
        $taskTarget.branchVerifiedInNeon -isnot [bool] -or
        $taskTarget.branchVerifiedInNeon -ne $true) {
        throw 'The local target does not match the authorized integration branch.'
    }
    $taskNodePath = (Get-Command node -CommandType Application -ErrorAction Stop).Source
    Write-Host 'Destino autorizado: titanium-integracion-test / br-divine-butterfly-akvmjram'
    Write-Host 'Host directo: ep-falling-wave-akf610u0.c-3.us-west-2.aws.neon.tech'
    if ($taskVerifyOnly) {
        Write-Host 'Modo solo lectura: --verify-run --target target.local sobre el manifiesto indicado.'
        Write-Host 'Verifica destino, registros protegidos y fixtures restantes; no ejecuta escenarios ni limpieza.'
    } elseif ($taskSelective) {
        Write-Host 'Seleccion autorizada: group-receipt-rollback y cinco comprobaciones SQLSTATE 23505.'
        Write-Host 'node scripts/verifyMercadoPagoPostgresIntegration.js --run --selective --target target.local --authorize-temporary-writes --confirm-database d0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3'
    } else {
        Write-Host 'El lanzador valida la URL y ejecuta este comando mediante main() del mismo arnes:'
        Write-Host 'node scripts/verifyMercadoPagoPostgresIntegration.js --run --target target.local --authorize-temporary-writes --confirm-database d0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3'
    }

    $taskStage = 'secure-input'
    $taskSecureUrl = Read-Host 'URL PostgreSQL privada del endpoint directo autorizado' -AsSecureString
    if ($taskSecureUrl.Length -eq 0) { throw 'An empty connection URL is not allowed.' }
    $taskUrlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecureUrl)
    [Environment]::SetEnvironmentVariable(
        'TITANIUM_PG_TEST_DATABASE_URL',
        [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskUrlPointer),
        'Process'
    )
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskUrlPointer)
    $taskUrlPointer = [IntPtr]::Zero
    $taskSecureUrl.Dispose()
    $taskSecureUrl = $null

    Push-Location -LiteralPath $taskBackendRoot
    $taskLocationPushed = $true
    $taskStage = if ($taskVerifyOnly) { 'verify-run' } else { 'integration' }
    $taskNodeArguments = @('--input-type=module', '-')
    if ($taskVerifyOnly) { $taskNodeArguments += @('--verify-run', $VerifyRun) }
    if ($taskFull) { $taskNodeArguments += @('--run', '--authorize-temporary-writes') }
    if ($taskSelective) { $taskNodeArguments += @('--selective', '--authorize-temporary-writes') }
    # Codigo estatico por stdin. La URL nunca se interpola en codigo ni argumentos.
    @'
import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { main } from "./scripts/verifyMercadoPagoPostgresIntegration.js";
import { AUTHORIZED_INTEGRATION_TARGET, assertAuthorizedIntegrationTarget, diagnoseIntegrationError, integrationAssert, safeError, validateTarget } from "./tests/integration/mercadoPagoPostgresSupport.js";
import { CASES, SELECTIVE_CASES } from "./tests/integration/mercadoPagoPostgresFixtures.js";

const approved = AUTHORIZED_INTEGRATION_TARGET;
const writeReport = console.log.bind(console);
const started = new Map();
const passed = new Set();
const uniquePassed = new Set();
const uniqueKeys = new Set(["Payments", "Receipts", "UserSubscriptions", "SubscriptionGroups", "SubscriptionGroupMembers"]);
let cleanupVerified = false;
let protectedVerified = false;
let stage = "target_file";
try {
  const modeArgs = process.argv.slice(2);
  const verifyOnly = modeArgs.length === 2 && modeArgs[0] === "--verify-run" && modeArgs[1].length > 0;
  const selective = modeArgs.length === 2 && modeArgs[0] === "--selective" && modeArgs[1] === "--authorize-temporary-writes";
  const full = modeArgs.length === 2 && modeArgs[0] === "--run" && modeArgs[1] === "--authorize-temporary-writes";
  integrationAssert(full || verifyOnly || selective,
    "Invalid launcher mode; refusing to execute.", "launcher_mode");
  const contents = await readFile("target.local", "utf8");
  stage = "target_json";
  const target = JSON.parse(contents);
  stage = "target_validation";
  assertAuthorizedIntegrationTarget(target);
  validateTarget(target, process.env.TITANIUM_PG_TEST_DATABASE_URL);
  writeReport(JSON.stringify({ phase: "authorized-destination", ...approved, connection: "not-yet-opened" }));
  if (verifyOnly) {
    stage = "verify_run";
    await main(["--verify-run", modeArgs[1], "--target", "target.local"]);
  } else {
    const authorizedScenarios = new Set((selective ? SELECTIVE_CASES : CASES).map((scenario) => scenario.name));
    integrationAssert(selective ? authorizedScenarios.size === 1 && authorizedScenarios.has("group-receipt-rollback") : CASES.length === 9,
      "The prepared scenarios must match the authorized selection.", "scenarios");
    // Los informes no contienen filas, URL ni secretos. Anade duracion sin repetir pruebas.
    console.log = (value) => {
      const report = JSON.parse(value);
      if (report.scenario && report.scenario !== "real-unique-constraints") {
        integrationAssert(authorizedScenarios.has(report.scenario), "An unauthorized scenario was reported.", "scenarios", "execution");
      }
      if (report.scenario && report.status === "running") started.set(report.scenario, performance.now());
      if (report.scenario && report.status === "passed") {
        if (started.has(report.scenario)) report.durationMs = Math.round(performance.now() - started.get(report.scenario));
        if (authorizedScenarios.has(report.scenario)) passed.add(report.scenario);
      }
      if (report.phase === "unique-constraint" && report.status === "passed") {
        integrationAssert(uniqueKeys.has(report.table) && report.expectedSqlstate === "23505" && !uniquePassed.has(report.table),
          "Unique-constraint reports must match the five authorized checks.", "unique_reports", "execution");
        uniquePassed.add(report.table);
      }
      if (report.phase === "cleanup" && report.status === "passed") {
        integrationAssert(report.remainingFixtures === 0, "Cleanup must report zero remaining fixture rows.", "remainingFixtures", "cleanup");
        cleanupVerified = true; // cleanupFixtures comprueba cero filas antes de COMMIT.
      }
      if (report.phase === "protected-records") protectedVerified = report.protectedRecordsUnchanged === true;
      writeReport(JSON.stringify(report));
    };
    stage = "execution";
    await main(["--run", ...(selective ? ["--selective"] : []), "--target", "target.local", "--authorize-temporary-writes",
      "--confirm-database", approved.expectedDatabaseId]);
    integrationAssert(passed.size === authorizedScenarios.size && uniquePassed.size === 5 && cleanupVerified && protectedVerified,
      "The selected scenarios, unique probes, cleanup or protected-record check did not finish successfully.", "completion", "execution");
    writeReport(JSON.stringify({ phase: "complete", status: "passed", scenariosPassed: passed.size,
      selection: selective ? "group-receipt-rollback-and-unique-constraints" : "full", uniqueChecksPassed: uniquePassed.size,
      remainingFixtures: 0, protectedRecordsUnchanged: true }));
  }
} catch (error) {
  const diagnostic = safeError(diagnoseIntegrationError(error, stage));
  for (const [scenario, time] of started) {
    if (!passed.has(scenario)) writeReport(JSON.stringify({ scenario, status: "failed",
      durationMs: Math.round(performance.now() - time), error: diagnostic }));
  }
  console.error("PostgreSQL integration stopped; no automatic retry:", diagnostic);
  process.exitCode = 1;
} finally {
  delete process.env.TITANIUM_PG_TEST_DATABASE_URL;
  console.log = writeReport;
}
'@ | & $taskNodePath @taskNodeArguments
    if ($LASTEXITCODE -ne 0) { throw 'Integration failed; review the sanitized diagnostics. No automatic retry.' }
}
catch {
    # No imprimir $_, Exception, InvocationInfo o mensajes que puedan contener entrada privada.
    $taskErrorType = $_.Exception.GetType().Name
    throw "PostgreSQL integration stopped at stage '$taskStage' ($taskErrorType). Review the safe diagnostics; no automatic retry."
}
finally {
    [Environment]::SetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', $null, 'Process')
    if ($taskUrlPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskUrlPointer)
    }
    if ($null -ne $taskSecureUrl) { $taskSecureUrl.Dispose() }
    if ($taskLocationPushed) { Pop-Location }
}
