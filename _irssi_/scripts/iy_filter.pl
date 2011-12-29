use strict;
use vars qw($VERSION %IRSSI); 

$VERSION = '0.1';
%IRSSI = (
  name	=> 'iy_filter',
  license	=> 'MIT'
);

sub event_public_message {
  my ($server, $text, $nick, $address, $target) = @_;
  if ($server->{tag} eq "Bitlbee" && $text =~ /^Message from unknown participant ([^:]+):/) {
    $nick = 'h-' . $1;
    $nick =~ s/ //g;
    $text =~ s/^[^:]+: //;

    Irssi::signal_continue($server, $text, $nick, $address, $target);
  }
}

# Irssi::signal_add('event privmsg', 'privmsg');
Irssi::signal_add('message public', 'event_public_message');
