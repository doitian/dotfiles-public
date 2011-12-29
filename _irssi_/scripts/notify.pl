use strict;
use Irssi;

use vars qw($VERSION %IRSSI);

$VERSION = '0.1';
%IRSSI = (
  authors     => 'Ian Yang',
  contact     => 'me@iany.me',
  name        => 'notify',
  description => 'Irssi integration with growl and notify-send',
  license     => 'MIT',
  changed     => '2011-12-24'
);

my $notify_timmer = undef;
my $notify_enabled = 1;

sub enable_notify {
  $notify_enabled = 1;
  if (defined($notify_timmer)) {
    Irssi::timeout_remove($notify_timmer);
    $notify_timmer = undef;
  }
}
sub disable_notify {
  $notify_enabled = 0;
  if (defined($notify_timmer)) {
    Irssi::timeout_remove($notify_timmer);
  }

  my $notify_flood = Irssi::settings_get_int("notify_flood");
  $notify_timmer = Irssi::timeout_add($notify_flood * 1000, 'enable_notify', undef);
}

sub send_notify
{
  my($title, $text) = @_;
  my $notify_cmd = Irssi::settings_get_str("notify_cmd");
  if ($notify_cmd) {
    system($notify_cmd, $title, $text);
  }
}

sub event_printtext
{
  my ($dest, $text, $stripped) = @_;
  my $opt = MSGLEVEL_HILIGHT;
  if(Irssi::settings_get_bool('notify_priv_msg')) {
    $opt = MSGLEVEL_HILIGHT|MSGLEVEL_MSGS;
  }

  my $server = $dest->{server};
  my $active = Irssi::active_win();
  return if ($active->get_active_name() eq $dest->{window}->get_active_name() &&
             !Irssi::settings_get_bool("notify_for_active_window"));

  return if ($server->{usermode_away} &&
             !Irssi::settings_get_bool("notify_when_away"));
      
  if ($notify_enabled && ($dest->{level} & $opt) && (($dest->{level} & MSGLEVEL_NOHILIGHT) == 0)) {
    disable_notify();

    my ($_, $body) = split / /, $stripped, 2;
    send_notify($dest->{target}, $body);
  }
}

Irssi::signal_add_last("print text", \&event_printtext);

Irssi::settings_add_str("notify", "notify_cmd", "echo");
Irssi::settings_add_int("notify", "notify_flood", "5");
Irssi::settings_add_bool("notify", "notify_priv_msg", 1);
Irssi::settings_add_bool("notify", "notify_when_away", 0);
Irssi::settings_add_bool("notify", "notify_for_active_window", 1);
