$ErrorActionPreference = 'Stop'
Write-Host "RMC QA - samo STAGING, bez javnih kodova."
Write-Host "QA scenariji: 1 - Frizer (EXACT_TIME); 2 - Vodoinstalater (DAY_PART)"
$answer=(Read-Host 'Izaberi 1 ili 2 [podrazumevano 2]').Trim()
switch ($answer) {
  '1' { $slug='frizer' }
  '2' { $slug='vodoinstalater' }
  ''  { $slug='vodoinstalater' }
  default { Write-Host 'STOP: Nepoznat scenario. Nista nije poslato.'; exit 2 }
}
Write-Host "Izabran scenario: $slug. CODE i administratorski kljuc ostaju PRIVATNI."
$keySecure=Read-Host -AsSecureString -Prompt 'RMC_QA_ADMIN_KEY sa Render STAGING Environment'
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
try { $key=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
try {
  $data=Invoke-RestMethod -Method Post -Uri "https://rmc-web-solutions-api-staging.onrender.com/api/qa/pairing/$slug" -Headers @{Authorization="Bearer $key"} -ContentType 'application/json' -Body '{}'
  if($data.scenario -ne $slug) { throw 'QA API nije potvrdio scenario.' }
  Write-Host "SITE ID: $($data.siteId)"
  Write-Host "KOD ZA UPARIVANJE: $($data.pairingCode)"
  Write-Host "Vazi: $([math]::Round($data.expiresIn/60)) minuta. Unesi ga ISKLJUCIVO u STAGING Business Portal."
  Write-Host 'KOD se NE cuva u fajlovima, HTML-u ili ZIP-u.'
} catch { Write-Host "Greska: $($_.Exception.Message)"; exit 1 } finally { Remove-Variable key -ErrorAction SilentlyContinue }
