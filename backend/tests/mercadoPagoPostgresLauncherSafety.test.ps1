# Pruebas locales del ciclo de vida del secreto; sustituye Node y Read-Host.
# No abre conexiones ni ejecuta escenarios/limpieza PostgreSQL.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskLauncher = Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/runMercadoPagoPostgresIntegration.ps1'
$global:taskSecretMarker = 'PGIT_OFFLINE_SECRET_MUST_NOT_BE_PRINTED'
$global:taskTestMode = 'success'
$global:taskReadCount = 0
$global:taskNodeCount = 0
$global:taskInputWasSecure = $false
$global:taskCapturedNodeSource = ''
$global:taskWrongTarget = $false
$global:taskVerifyOnly = $false
$global:taskManifestPath = 'C:\offline fixture\manifest.json'
$global:taskSelective = $false
$global:taskFull = $false

function Get-Content {
    param([string]$LiteralPath, [switch]$Raw)
    if (-not $LiteralPath.EndsWith('target.local')) { throw 'Unexpected local fixture read.' }
    $taskBranchId = if ($global:taskWrongTarget) { 'br-unapproved' } else { 'br-divine-butterfly-akvmjram' }
    return (@{
        environment = 'test'; neonBranchId = $taskBranchId; branchVerifiedInNeon = $true
        host = 'ep-falling-wave-akf610u0.c-3.us-west-2.aws.neon.tech'
        expectedDatabaseId = 'd0281b810c4974a825c124badbed2b848bb04f6b271cd814aace02580d361ea3'
    } | ConvertTo-Json)
}
function Get-Command {
    param([string]$Name, [string]$CommandType, [string]$ErrorAction)
    if ($Name -ne 'node' -or $CommandType -ne 'Application') { throw 'Unexpected command lookup.' }
    return [PSCustomObject]@{ Source = 'Invoke-PgitOfflineNode' }
}
function Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    $global:taskReadCount++
    $global:taskInputWasSecure = $AsSecureString.IsPresent
    if ($global:taskTestMode -eq 'input-error') { throw $global:taskSecretMarker }
    if ($global:taskTestMode -eq 'empty-input') { return [Security.SecureString]::new() }
    return ConvertTo-SecureString -String $global:taskSecretMarker -AsPlainText -Force
}
function Invoke-PgitOfflineNode {
    $global:taskNodeCount++
    $global:taskCapturedNodeSource = ($input | Out-String)
    if ([Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'Process') -cne $global:taskSecretMarker) {
        throw 'The child did not receive the temporary test secret.'
    }
    if ($global:taskCapturedNodeSource.Contains($global:taskSecretMarker)) { throw 'Secret was interpolated in Node source.' }
    $taskExpectedArguments = @('--input-type=module', '-')
    if ($global:taskVerifyOnly) { $taskExpectedArguments += @('--verify-run', $global:taskManifestPath) }
    if ($global:taskFull) { $taskExpectedArguments += @('--run', '--authorize-temporary-writes') }
    if ($global:taskSelective) { $taskExpectedArguments += @('--selective', '--authorize-temporary-writes') }
    if ($args.Count -ne $taskExpectedArguments.Count) { throw 'Unexpected Node argument count.' }
    for ($taskArgumentIndex = 0; $taskArgumentIndex -lt $args.Count; $taskArgumentIndex++) {
        if ($args[$taskArgumentIndex] -cne $taskExpectedArguments[$taskArgumentIndex]) { throw 'Unexpected Node argument.' }
    }
    if ($global:taskTestMode -eq 'node-error') { throw $global:taskSecretMarker }
    $global:LASTEXITCODE = if ($global:taskTestMode -eq 'node-exit') { 1 } else { 0 }
}

$taskLauncherTokens = $null
$taskLauncherParseErrors = $null
$taskLauncherAst = [Management.Automation.Language.Parser]::ParseFile($taskLauncher, [ref]$taskLauncherTokens, [ref]$taskLauncherParseErrors)
if ($taskLauncherParseErrors.Count -ne 0) { throw 'PowerShell launcher has syntax errors.' }
# El lanzador tampoco incluye comandos para persistir o volcar el secreto.
if ($taskLauncherAst.Extent.Text -match 'Set-Content|Out-File|Start-Transcript|SetEnvironmentVariable\([^\r\n]+,\s*.(User|Machine).') {
    throw 'Unexpected secret persistence command in launcher.'
}
$taskOriginalLocation = (Get-Location).Path
$taskUserVariableBefore = [Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'User')
$taskMachineVariableBefore = [Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'Machine')
try {
    foreach ($taskLaunchMode in @('full', 'verify', 'selective')) {
    $taskVerifyMode = $taskLaunchMode -eq 'verify'
    $global:taskVerifyOnly = $taskVerifyMode
    $global:taskSelective = $taskLaunchMode -eq 'selective'
    $global:taskFull = $taskLaunchMode -eq 'full'
    foreach ($taskMode in @('success', 'node-exit', 'node-error', 'input-error', 'empty-input', 'wrong-target')) {
        $global:taskTestMode = $taskMode
        $global:taskWrongTarget = $taskMode -eq 'wrong-target'
        $global:taskReadCount = 0
        $global:taskNodeCount = 0
        $global:taskInputWasSecure = $false
        $taskCaughtError = $null
        $taskOutput = @()
        [Environment]::SetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'stale-offline-test-value', 'Process')
        try {
            $taskLaunchParameters = @{}
            if ($taskVerifyMode) { $taskLaunchParameters.VerifyRun = $global:taskManifestPath }
            if ($global:taskFull) { $taskLaunchParameters.Run = $true; $taskLaunchParameters.AuthorizeTemporaryWrites = $true }
            if ($global:taskSelective) { $taskLaunchParameters.Selective = $true; $taskLaunchParameters.AuthorizeTemporaryWrites = $true }
            $taskOutput = @(& $taskLauncher @taskLaunchParameters 6>&1)
        }
        catch { $taskCaughtError = $_ }
        if ($taskMode -eq 'success' -and $null -ne $taskCaughtError) {
            throw ('Success test unexpectedly failed: ' + $taskCaughtError.Exception.Message.Replace($global:taskSecretMarker, '[redacted]'))
        }
        if ($taskMode -ne 'success' -and $null -eq $taskCaughtError) { throw 'Failure test unexpectedly succeeded.' }
        if ([Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'Process')) {
            throw 'Temporary environment variable survived launcher completion.'
        }
        if ((Get-Location).Path -cne $taskOriginalLocation) { throw 'Launcher did not restore the current directory.' }
        if (($taskOutput | Out-String).Contains($global:taskSecretMarker) -or
            ($taskCaughtError | Out-String).Contains($global:taskSecretMarker)) { throw 'Private input leaked into diagnostics.' }
        if ($taskVerifyMode -and ($taskOutput | Out-String).Contains('--authorize-temporary-writes')) {
            throw 'Read-only launcher advertised write authorization.'
        }
        if ($taskMode -eq 'wrong-target') {
            if ($global:taskReadCount -ne 0 -or $global:taskNodeCount -ne 0) { throw 'Unapproved target reached the prompt or child.' }
        } else {
            if (-not $global:taskInputWasSecure) { throw 'Read-Host did not use AsSecureString.' }
            $taskExpectedNodes = if ($taskMode -in @('input-error', 'empty-input')) { 0 } else { 1 }
            if ($global:taskNodeCount -ne $taskExpectedNodes) { throw 'Unexpected number of child invocations.' }
        }
        Write-Output "PASS launcher lifecycle: $taskMode / mode=$taskLaunchMode (offline; no PostgreSQL)"
    }
    }
    foreach ($taskInvalidParameters in @(
        @{},
        @{ Run = $true },
        @{ Run = $false; AuthorizeTemporaryWrites = $true },
        @{ Run = $true; AuthorizeTemporaryWrites = $false },
        @{ AuthorizeTemporaryWrites = $true },
        @{ Run = $true; Selective = $true; AuthorizeTemporaryWrites = $true },
        @{ VerifyRun = $global:taskManifestPath; AuthorizeTemporaryWrites = $true },
        @{ Run = $true; VerifyRun = $global:taskManifestPath; AuthorizeTemporaryWrites = $true },
        @{ Selective = $true },
        @{ Selective = $false; AuthorizeTemporaryWrites = $true },
        @{ Selective = $true; AuthorizeTemporaryWrites = $false },
        @{ Selective = $true; AuthorizeTemporaryWrites = $true; VerifyRun = $global:taskManifestPath }
    )) {
        $global:taskReadCount = 0; $global:taskNodeCount = 0
        $taskRejected = $false
        try { & $taskLauncher @taskInvalidParameters 6>$null }
        catch { $taskRejected = $true }
        if (-not $taskRejected -or $global:taskReadCount -ne 0 -or $global:taskNodeCount -ne 0) {
            throw 'Unsafe execution flags reached the private prompt or child.'
        }
        Write-Output 'PASS accidental/unauthorized execution rejection (offline; no PostgreSQL)'
    }
    if ([Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'User') -cne $taskUserVariableBefore -or
        [Environment]::GetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', 'Machine') -cne $taskMachineVariableBefore) {
        throw 'Launcher changed a persistent environment variable.'
    }
}
finally {
    [Environment]::SetEnvironmentVariable('TITANIUM_PG_TEST_DATABASE_URL', $null, 'Process')
}
