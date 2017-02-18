if (Get-Module -ListAvailable -Name posh-git) {
  Import-Module posh-git

  function prompt {
    $realLASTEXITCODE = $LASTEXITCODE

    Write-Host($pwd.ProviderPath) -nonewline

    Write-VcsStatus

    $global:LASTEXITCODE = $realLASTEXITCODE
    return "> "
  }

  Start-SshAgent -Quiet
}

Set-Alias which Get-Command
Set-Alias g git
Set-Alias ll Get-ChildItem
Set-Alias vi vim

try {
  $PortableGit = (Get-Command git | Get-Item).Directory.Parent.FullName
} catch {
  # ignore
}

function dotfiles() {
  cd $env:USERPROFILE\.dotfiles
}

function cmake-vcpkg {
  cmake -DCMAKE_TOOLCHAIN_FILE=${env:VCPKG_ROOT}\scripts\buildsystems\vcpkg.cmake $Args
}
