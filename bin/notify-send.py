#!/usr/bin/env python2

import os, sys, gtk, pynotify
import optparse

def print_version(*args):
    print os.path.basename(sys.argv[0]) + " 1.0"
    exit()

def parse_hint(option, opt_str, value, parser):
    components = value.split(':')
    if len(components) != 3:
        raise optparse.OptionValueError(
            "Hint must be specified as TYPE:NAME:VALUE"
            )
    (type, name, value) = components
    if not type or not name:
        raise optparse.OptionValueError(
            "Hint must have type and name"
            )

    if not type in ["int", "double", "string", "byte"]:
        raise optparse.OptionValueError(
            "Hint type must be int, double, string or byte"
            )

    parser.values.hint.append((type, name, value));

parser = optparse.OptionParser(
    usage="%prog [OPTION...] <SUMMARY> [BODY]",
    add_help_option=False
    )

help_options = optparse.OptionGroup(parser, "Help Options")
help_options.add_option("-?", "--help",
                        action="help",
                        help="Show help options.")
help_options.add_option("-v", "--version",
                        action="callback",
                        callback=print_version,
                        help="Version of the package.")
parser.add_option_group(help_options)

app_options = optparse.OptionGroup(parser, "Application Options")
app_options.add_option(
    "-u", "--urgency",
    metavar="LEVEL",
    type="choice",
    choices=["low", "normal", "critical"],
    default="normal",
    help="Specifies the urgency level (low, normal, critical)."
    )
app_options.add_option(
    "-t", "--expire-time",
    metavar="TIME",
    type="int",
    default=-1,
    help="Specifies the timeout in milliseconds at which to expire the notification."
    )
app_options.add_option(
    "-i", "--icon",
    help="Specifies an icon filename or stock icon to display."
    )
app_options.add_option(
    "-c", "--category", metavar="TYPE",
    help="Specifies the notification category."
    )
app_options.add_option(
    "-h", "--hint", metavar="TYPE:NAME:VALUE",
    action="callback", type="string", callback=parse_hint,
    default=[],
    help="Specifies basic extra data to pass. Valid types are int, double, string and byte."
    )
app_options.add_option(
    "-n", "--name", metavar="NAME",
    default=os.path.basename(sys.argv[0]),
    help="Application Name"
    )
app_options.add_option(
    "-r", "--replaces-id", metavar="ID",
    type="int", default=0,
    help="Replaces id"
    )
app_options.add_option(
    "-q", "--quiet", action="store_true",
    help="Do not print notification id"
    )
app_options.add_option(
    "-s", "--sync", action="store_true",
    help="Quit when notification disappears"
    )
parser.add_option_group(app_options)

try:
    (options, args) = parser.parse_args()
    if len(args) == 0:
        raise optparse.OptionValueError("SUMMARY must be specified")
    if len(args) > 2:
        raise optparse.OptionValueError("too may positional arguments")

    summary = args[0]
    body = None
    if len(args) > 1:
        body = args[1]
except optparse.OptionValueError as e:
    print e
    exit(1)

pynotify.init(options.name)
n = pynotify.Notification(summary, body, options.icon)
if options.replaces_id:
    n.props.id = options.replaces_id
if options.category:
    n.set_category(options.category)
n.set_timeout(options.expire_time)
n.set_urgency({
        "low": pynotify.URGENCY_LOW,
        "normal": pynotify.URGENCY_NORMAL,
        "critical": pynotify.URGENCY_CRITICAL
        }[options.urgency])
for (type, name, value) in options.hint:
    try:
        if type == "int":
            n.set_hint_int32(name, int(value))
        elif type == "double":
            n.set_hint_double(name, float(value))
        elif type == "byte":
            n.set_hint_byte(name, value)
        else:
            n.set_hint_string(name, value)
    except Exception as e:
        print("Hint %s: value %s cannot convert to type %s"
              % (name, value, type))
        print e
        exit(1)

def notify_quit(n):
    gtk.main_quit()

n.connect('closed', notify_quit)
n.show()

if not options.quiet:
    print n.props.id

if options.sync:
    gtk.main()
