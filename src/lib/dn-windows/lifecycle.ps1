param($Request)
$ErrorActionPreference = 'Stop'
$root = $Request.Root
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$name = "Global\dn-pushover-$sid"
$lifecycle = New-Object Threading.Mutex($false, "$name-lifecycle")
$locked = $false
$utf8 = New-Object Text.UTF8Encoding($false)
$packageName = 'DnPushover.NotificationListener'

function Stop-Listener {
  $running = New-Object Threading.Mutex($false, "$name-running")
  $owned = $false
  $stop = $null
  $listenerProcess = $null
  try {
    try { $owned = $running.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }
    if ($owned) { return }
    try { $stop = [Threading.EventWaitHandle]::OpenExisting("$name-stop") }
    catch [Threading.WaitHandleCannotBeOpenedException] { throw 'Listener is starting; retry teardown.' }
    $state = Join-Path $root 'running.json'
    if (Test-Path -LiteralPath $state) {
      $listenerPid = ([IO.File]::ReadAllText($state) | ConvertFrom-Json).Pid
      $listenerProcess = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
      if ($listenerProcess -and $listenerProcess.Path -ne (Join-Path $root 'app\dn-pushover-listener.exe')) {
        $listenerProcess.Dispose()
        $listenerProcess = $null
      }
    }
    [void]$stop.Set()
    try { $owned = $running.WaitOne(30000) } catch [Threading.AbandonedMutexException] { $owned = $true }
    if (-not $owned) { throw 'Listener did not stop within 30 seconds; files and package were left intact.' }
    if ($listenerProcess -and -not $listenerProcess.WaitForExit(10000)) {
      throw 'Listener released its mutex but did not exit; files and package were left intact.'
    }
  } finally {
    if ($owned) { $running.ReleaseMutex() }
    if ($null -ne $stop) { $stop.Dispose() }
    if ($null -ne $listenerProcess) { $listenerProcess.Dispose() }
    $running.Dispose()
  }
}

try {
  try { $locked = $lifecycle.WaitOne(600000) } catch [Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { throw 'Another dn-pushover lifecycle operation is still running; retry later.' }
  if ($Request.Action -eq 'teardown') {
    Stop-Listener
    if ($Request.Cleanup) {
      Get-AppxPackage -Name $packageName | Remove-AppxPackage -ErrorAction Stop
      if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
    }
    Write-Output 'Windows notification forwarding stopped.'
    return
  }

  if ([Environment]::OSVersion.Version.Build -lt 19041) { throw 'Windows 10 build 19041 or newer is required.' }

  function Get-SdkTool([string]$tool) {
    $arch = switch ($Request.Architecture) { 'arm64' { 'arm64' } default { 'x64' } }
    foreach ($base in @("${env:ProgramFiles(x86)}\Windows Kits\10\bin", "$env:ProgramFiles\Windows Kits\10\bin")) {
      if (-not (Test-Path -LiteralPath $base)) { continue }
      foreach ($ver in (Get-ChildItem -LiteralPath $base -Directory | Sort-Object Name -Descending)) {
        $candidate = Join-Path $ver.FullName "$arch\$tool"
        if (Test-Path -LiteralPath $candidate) { return $candidate }
      }
    }
    throw "Missing $tool. Install the Windows SDK so makeappx.exe and signtool.exe are available."
  }

  function Get-SigningCertificate {
    $subject = 'CN=dn-pushover'
    $open = [Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite
    $my = New-Object Security.Cryptography.X509Certificates.X509Store 'My', 'CurrentUser'
    $my.Open($open)
    try {
      $cutoff = (Get-Date).AddDays(1)
      $cert = $null
      foreach ($item in $my.Certificates) {
        if ($item.Subject -eq $subject -and $item.HasPrivateKey -and $item.NotAfter -gt $cutoff) {
          if (-not $cert -or $item.NotAfter -gt $cert.NotAfter) { $cert = $item }
        }
      }
      if (-not $cert) {
        $rsa = New-Object Security.Cryptography.RSACng 2048
        $name = New-Object Security.Cryptography.X509Certificates.X500DistinguishedName $subject
        $request = New-Object Security.Cryptography.X509Certificates.CertificateRequest -ArgumentList @(
          $name, $rsa, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1
        )
        $request.CertificateExtensions.Add((New-Object Security.Cryptography.X509Certificates.X509KeyUsageExtension ([Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature, $true)))
        $oids = New-Object Security.Cryptography.OidCollection
        [void]$oids.Add((New-Object Security.Cryptography.Oid '1.3.6.1.5.5.7.3.3'))
        $request.CertificateExtensions.Add((New-Object Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension $oids, $true))
        $request.CertificateExtensions.Add((New-Object Security.Cryptography.X509Certificates.X509BasicConstraintsExtension $false, $false, 0, $true))
        $created = $request.CreateSelfSigned([DateTimeOffset]::Now.AddDays(-1), [DateTimeOffset]::Now.AddYears(5))
        $flags = [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet -bor [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::UserKeySet
        $cert = New-Object Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList @($created.Export([Security.Cryptography.X509Certificates.X509ContentType]::Pfx, ''), '', $flags)
        $cert.FriendlyName = 'dn-pushover'
        $my.Add($cert)
      }
    } finally { $my.Close() }
    $people = New-Object Security.Cryptography.X509Certificates.X509Store 'TrustedPeople', 'CurrentUser'
    $people.Open($open)
    try {
      $found = $false
      foreach ($item in $people.Certificates) {
        if ($item.Thumbprint -eq $cert.Thumbprint) { $found = $true; break }
      }
      if (-not $found) {
        $public = New-Object Security.Cryptography.X509Certificates.X509Certificate2 (, $cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
        $people.Add($public)
      }
    } finally { $people.Close() }
    if (-not (Test-TrustedPeople 'LocalMachine' $cert.Thumbprint)) {
      try { Add-TrustedPeople 'LocalMachine' $cert }
      catch {
        $cer = Join-Path $root 'dn-pushover.cer'
        [IO.File]::WriteAllBytes($cer, $cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
        $cerLiteral = $cer.Replace("'", "''")
        $import = "`$ErrorActionPreference='Stop'; `$c=New-Object Security.Cryptography.X509Certificates.X509Certificate2 '$cerLiteral'; `$s=New-Object Security.Cryptography.X509Certificates.X509Store 'TrustedPeople','LocalMachine'; `$s.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite); try{`$s.Add(`$c)}finally{`$s.Close()}"
        $elevated = Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -Wait -PassThru -ArgumentList @('-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand', [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($import)))
        if ($null -eq $elevated -or $elevated.ExitCode -ne 0 -or -not (Test-TrustedPeople 'LocalMachine' $cert.Thumbprint)) {
          throw 'Accept the User Account Control prompt to trust the dn-pushover signing certificate, then rerun setup. Later setups skip this if the certificate is already in LocalMachine\TrustedPeople.'
        }
      }
    }
    return $cert
  }

  function Test-TrustedPeople([string]$location, [string]$thumbprint) {
    $store = New-Object Security.Cryptography.X509Certificates.X509Store 'TrustedPeople', $location
    try {
      $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
      foreach ($item in $store.Certificates) {
        if ($item.Thumbprint -eq $thumbprint) { return $true }
      }
      return $false
    } catch { return $false }
    finally { $store.Close() }
  }

  function Add-TrustedPeople([string]$location, $cert) {
    $store = New-Object Security.Cryptography.X509Certificates.X509Store 'TrustedPeople', $location
    $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    try {
      $public = New-Object Security.Cryptography.X509Certificates.X509Certificate2 (, $cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
      $store.Add($public)
    } finally { $store.Close() }
  }
  $app = Join-Path $root 'app'
  $exe = Join-Path $app 'dn-pushover-listener.exe'
  if (-not (Test-Path -LiteralPath $exe)) {
    $sdkHelp = 'Install the .NET 10 SDK via Scoop: scoop bucket add versions; scoop install versions/dotnet-sdk-lts. Open a new terminal and verify dotnet --list-sdks includes 10.0.x, then rerun setup. No SDK is downloaded automatically.'
    $dotnet = $null
    foreach ($candidate in @(
      (Get-Command dotnet -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
      "$env:USERPROFILE\scoop\apps\dotnet-sdk-lts\current\dotnet.exe",
      "$env:USERPROFILE\scoop\shims\dotnet.exe",
      $(if ($env:DOTNET_ROOT) { Join-Path $env:DOTNET_ROOT 'dotnet.exe' })
    )) {
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $sdks = & $candidate --list-sdks
        if ($LASTEXITCODE -eq 0 -and ($sdks -match '^10\.0\.\d+ ')) { $dotnet = $candidate; break }
      }
    }
    if (-not $dotnet) { throw $sdkHelp }
    $rid = switch ($Request.Architecture) {
      'x64' { 'win-x64' }
      'arm64' { 'win-arm64' }
      'ia32' { 'win-x86' }
      default { throw "Unsupported Windows architecture: $($Request.Architecture)" }
    }
    $source = Join-Path $root 'source'
    [void][IO.Directory]::CreateDirectory($source)
    foreach ($asset in $Request.Assets.PSObject.Properties) {
      [IO.File]::WriteAllText((Join-Path $source $asset.Name), [string]$asset.Value, $utf8)
    }
    $build = Join-Path $root ("build-" + [Guid]::NewGuid().ToString('N'))
    Push-Location $source
    try {
      & $dotnet publish 'Listener.csproj' -c Release -r $rid --self-contained true -o $build
      if ($LASTEXITCODE -ne 0) { throw 'Listener build failed. Fix the SDK/restore error above and retry setup.' }
      Stop-Listener
      if (Test-Path -LiteralPath $app) { Remove-Item -LiteralPath $app -Recurse -Force }
      Move-Item -LiteralPath $build -Destination $app
    } finally {
      Pop-Location
      if (Test-Path -LiteralPath $build) { Remove-Item -LiteralPath $build -Recurse -Force }
    }
  }
  Stop-Listener
  $package = Join-Path $root 'package'
  $assets = Join-Path $package 'Assets'
  [void][IO.Directory]::CreateDirectory($assets)
  [IO.File]::WriteAllText((Join-Path $package 'AppxManifest.xml'), $Request.Assets.'AppxManifest.xml', $utf8)
  Add-Type -AssemblyName System.Drawing
  foreach ($logo in @(@('StoreLogo.png', 50), @('Logo.png', 150), @('SmallLogo.png', 44))) {
    $bitmap = New-Object Drawing.Bitmap([int]$logo[1], [int]$logo[1])
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.Clear([Drawing.Color]::FromArgb(35, 95, 155))
      $bitmap.Save((Join-Path $assets $logo[0]), [Drawing.Imaging.ImageFormat]::Png)
    } finally { $graphics.Dispose(); $bitmap.Dispose() }
  }
  $makeappx = Get-SdkTool 'makeappx.exe'
  $signtool = Get-SdkTool 'signtool.exe'
  $cert = Get-SigningCertificate
  $msix = Join-Path $root 'dn-pushover.msix'
  & $makeappx pack /o /nv /d $package /p $msix
  if ($LASTEXITCODE -ne 0) { throw 'makeappx failed while building the identity package.' }
  & $signtool sign /fd SHA256 /s My /sha1 $cert.Thumbprint $msix
  if ($LASTEXITCODE -ne 0) { throw 'signtool failed while signing the identity package. Trust of the local dn-pushover certificate may have failed.' }
  $registered = Get-AppxPackage -Name $packageName
  if ($registered -and ($registered.SignatureKind -eq 'None' -or $registered.IsDevelopmentMode)) {
    $registered | Remove-AppxPackage -ErrorAction Stop
    $registered = $null
  }
  if (-not $registered) {
    Add-AppxPackage -Path $msix -ExternalLocation $app -ErrorAction Stop
  }
  $config = Join-Path $root 'config.json'
  [IO.File]::WriteAllText($config, [string]$Request.InvocationJson, $utf8)
  $ready = Join-Path $root ("startup-" + [Guid]::NewGuid().ToString('N') + '.json')
  $process = $null
  $success = $false
  try {
    $process = Start-Process -FilePath $exe -ArgumentList '--config', $config, '--ready', $ready -WorkingDirectory $app -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(120)
    while ([DateTime]::UtcNow -lt $deadline) {
      if (Test-Path -LiteralPath $ready) {
        $status = [IO.File]::ReadAllText($ready) | ConvertFrom-Json
        if ($status.Error) { throw $status.Error }
        if ($status.Ready -ne $true) { throw 'Invalid listener startup response.' }
        if ($process.HasExited) { throw 'Listener exited immediately after startup.' }
        $success = $true
        Write-Output 'Windows notification forwarding enabled (no autostart).'
        break
      }
      if ($process.HasExited) { throw "Listener exited before readiness (exit $($process.ExitCode)); see $root\listener.log." }
      Start-Sleep -Milliseconds 200
    }
    if (-not $success) { throw 'Notification consent/startup timed out after 120 seconds. Run setup again and allow notification access.' }
  } finally {
    if (-not $success -and $null -ne $process -and -not $process.HasExited) {
      $process.Kill()
      if (-not $process.WaitForExit(10000)) { throw 'Failed to terminate the timed-out listener.' }
    }
    if ($null -ne $process) { $process.Dispose() }
    foreach ($path in @($ready, "$ready.tmp")) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
    }
  }
} finally {
  if ($locked) { $lifecycle.ReleaseMutex() }
  $lifecycle.Dispose()
}
