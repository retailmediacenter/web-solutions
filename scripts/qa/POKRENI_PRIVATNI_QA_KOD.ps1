$ErrorActionPreference = 'Stop'
Write-Host "RMC QA - samo STAGING, bez javnih kodova."
Write-Host "Dostupni za test: frizer (ostali nakon prilagodjavanja poslovne matrice)."
$slug='frizer'
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
