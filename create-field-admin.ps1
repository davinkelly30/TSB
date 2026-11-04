$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$email = (Read-Host "Actual email").Trim().ToLowerInvariant()
$name = (Read-Host "Name [Davin Kelly]").Trim()
if (-not $name) { $name = "Davin Kelly" }
$securePassword = Read-Host "New password (10+ characters; input is hidden)" -AsSecureString
$pointer = [IntPtr]::Zero

try {
  if (-not $email.Contains("@")) {
    throw "Enter a valid email address."
  }

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $env:TSB_FIELD_ADMIN_EMAIL = $email
  $env:TSB_FIELD_ADMIN_NAME = $name
  $env:TSB_FIELD_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)

  if ($env:TSB_FIELD_ADMIN_PASSWORD.Length -lt 10) {
    throw "Password must be at least 10 characters."
  }

  node .\create-field-admin.js
  if ($LASTEXITCODE -ne 0) {
    throw "Account creation failed."
  }
} finally {
  Remove-Item Env:TSB_FIELD_ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:TSB_FIELD_ADMIN_NAME -ErrorAction SilentlyContinue
  Remove-Item Env:TSB_FIELD_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  if ($securePassword) { $securePassword.Dispose() }
}
