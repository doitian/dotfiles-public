require 'guard/notifier'

notifiers_options = {
  :emacs => {
    :fontcolor => "#acbc90",
    :default => "#1e2320",
    :success => "#013009",
    :failed => "#310602",
    :pending => "#534626"
  },
  :tmux => {
    :success                => 'colour64',
    :failed                 => 'colour124',
    :pending                => 'colour136',
    :default                => 'colour239',
    :display_message        => false,
  }
}

::Guard::Notifier::NOTIFIERS.each do |group|
  group.map { |n| n.first }.find { |notifier|
    ::Guard::Notifier.add_notification(notifier,
                                       notifiers_options[notifier] || {},
                                       true)
  }
end
