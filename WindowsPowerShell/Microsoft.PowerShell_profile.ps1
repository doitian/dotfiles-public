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

try {
  $PortableGit = (Get-Command git | Get-Item).Directory.Parent.FullName
} catch {
  # ignore
}

function vim() {
  bash vi $args
}

Set-Alias vi vim

function dotfiles() {
  cd $env:USERPROFILE\.dotfiles
}
