use strict;
use DateTime;
use Data::Dumper;
use vars qw($VERSION %IRSSI);

$VERSION = '0.5';
%IRSSI = (
  authors	=> 'Tijmen "timing" Ruizendaal',
  contact	=> 'tijmen.ruizendaal@gmail.com',
  name	=> 'iy_timestamp',
  description	=> 'Replace Irssi\'s timestamps with those sent by BitlBee and ZNC',
  license	=> 'GPLv2',
  url		=> 'http://the-timing.nl/stuff/irssi-bitlbee',
  changed	=> '2010-05-01'
);

my $prev_date = '';
my $tf = Irssi::settings_get_str('timestamp_format');

sub privmsg {
  my ($server, $data, $nick, $address) = @_;
  my ($target, $text) = split(/ :/, $data, 2);
  action($server, $text, $nick, $address, $target, 1);
}

sub action {
  my ($server, $text, $nick, $address, $target, $privmsg) = @_;

  my $timestamp = '';
  if ($server->{tag} eq 'Bitlbee' and $text =~ /\x02\[\x02{3}[-: \d]+\x02\]\x02/) {
    # bitlbee: ^B[^B^B^B2010-03-21 16:33:41^B]^B
    $timestamp = $text;
    $timestamp =~ s/.*\x02\[\x02{3}([-: \d]+)\x02\]\x02.*/$1/;
    $text =~ s/\x02\[\x02{3}[-: \d]+\x02\]\x02 //;
  } elsif ($text =~ /^(\x01ACTION )?\[(\d{4}-\d\d-\d\d )?\d\d(:\d\d)+\]/) {
    # znc playback
    $timestamp = $text;
    $timestamp =~ s/^(\x01ACTION )?\[([^\]]+)\].*/$2/;
    $text =~ s/\[([^\]]+)\] //;
  }
  if ($timestamp ne '') {
    my $window;
    my ($date, $time) = split(/ /, $timestamp);
    if( !$time ){ # the timestamp doesn't have a date
      $time = $date;
      # use today as date
      $date = DateTime->now->ymd;
    }
    my ($year, $month, $day) = split(/-/, $date);
    my ($hour, $min, $sec) = split(/:/, $time);
    my $dt = DateTime->new(year => $year,
                           month => $month,
                           day => $day,
                           hour => $hour,
                           minute => $min,
                           second => $sec);

    if( $date ne $prev_date ){
      if( $target =~ /#|&/ ){ # find channel window based on target
        $window = Irssi::window_find_item($target);
      } else { # find query window based on nick
        $window = Irssi::window_find_item($nick);
      }
      if( $window != undef ){
        my $formatted_date = $day.' '.$dt->month_abbr.' '.$year;
        $window->print('           %g-----%w-%W-%n Day changed to '.$formatted_date.' %W-%w-%g-----%n', MSGLEVEL_NEVER);
      }
    }
    $prev_date = $date;

    $timestamp = $dt->strftime($tf);
    Irssi::settings_set_str('timestamp_format', $timestamp);
    Irssi::signal_emit('setup changed');
    if ($privmsg) {
      Irssi::signal_continue($server, $target . ' :' . $text, $nick, $address);
   } else {
      Irssi::signal_continue($server, $text, $nick, $address, $target);
    }
    Irssi::settings_set_str('timestamp_format', $tf);
    Irssi::signal_emit('setup changed');
  }
}

Irssi::signal_add('event privmsg', 'privmsg');
Irssi::signal_add('event notice', 'privmsg');
Irssi::signal_add('ctcp action', 'action');
