require 'guard/notifiers/emacs'
require 'guard/notifiers/tmux'

if ::Guard::Notifier::Emacs.available?(true)
  notification :emacs, {
    :fontcolor => "#acbc90",
    :default => "#1e2320",
    :success => "#013009",
    :failed => "#310602",
    :pending => "#534626"
  }
end

if ::Guard::Notifier::Tmux.available?(true)
  notification :tmux, {
    :success                => 'colour64',
    :failed                 => 'colour124',
    :pending                => 'colour136',
    :default                => 'colour239',
    :display_message        => false,
  }
end
