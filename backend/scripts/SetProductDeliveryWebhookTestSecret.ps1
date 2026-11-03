param(
  [Parameter(Mandatory=$true)][guid]$RunId,
  [Parameter(Mandatory=$true)][ValidatePattern('^\d+$')][string]$ApplicationId
)
$ErrorActionPreference='Stop'
$taskDirectory=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\storage\test-reports\remote-test-secrets'))
New-Item -ItemType Directory -Path $taskDirectory -Force | Out-Null
$taskPath=Join-Path $taskDirectory ($RunId.ToString()+'.dpapi')
Write-Host ('Aplicacion de prueba: '+$ApplicationId+'. Consulta su clave de Webhooks; no cambies URLs ni claves de produccion.')
$taskSecret=Read-Host 'Pega la clave de firma de la aplicacion de prueba (entrada oculta)' -AsSecureString
try {
  if ($taskSecret.Length -lt 16) { throw 'La clave de firma esta incompleta.' }
  $taskEncrypted=ConvertFrom-SecureString -SecureString $taskSecret
  [System.IO.File]::WriteAllText($taskPath,$taskEncrypted,[System.Text.UTF8Encoding]::new($false))
  $taskAcl=Get-Acl -LiteralPath $taskPath
  $taskAcl.SetAccessRuleProtection($true,$false)
  foreach($taskSid in @([System.Security.Principal.WindowsIdentity]::GetCurrent().User,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $taskAcl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($taskSid,'FullControl','Allow'))
  }
  Set-Acl -LiteralPath $taskPath -AclObject $taskAcl
  Write-Host ('Clave guardada cifrada para este usuario de Windows: '+$taskPath)
  Write-Host 'No se modifico ningun archivo .env. No compartas la clave en el chat.'
} finally { $taskSecret.Dispose() }
