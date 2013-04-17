"""
Attach tmux sessions
"""
__kupfer_name__ = _("Tmux")
__kupfer_sources__ = ("TmuxSessionsSource", )
__description__ = _("Active tmux sessions")
__version__ = ""
__author__ = "Ian Yang <me@iany.me>"

import os

from kupfer.objects import Leaf, Action, Source
from kupfer.obj.helplib import FilesystemWatchMixin
from kupfer import utils



def tmux_sessions_infos():
	"""
	Yield tuples of id, windows, time, status
	for running tmux sessions
	"""
	pipe = os.popen("tmux ls")
	output = pipe.read()
	for line in output.splitlines():
		id, remaining = line.split(": ", 1)
                windows, remaining = remaining.split(" (created ", 1)
                time, remaining = remaining.split(") ")
                status = 'detached'
                if remaining.find(')') >= 0:
                        status = remaining.split("(")[-1].strip(")")
                yield (id, windows, time, status)

class TmuxSession (Leaf):
	"""Represented object is the session id as string"""
	def get_actions(self):
		return (AttachSession(),)

	def is_valid(self):
		for id, windows, time, status in tmux_sessions_infos():
			if self.object == id:
				return True
		else:
			return False

	def get_description(self):
		for id, windows, time, status in tmux_sessions_infos():
			if self.object == id:
				break
		else:
			return "%s (%s)" % (self.name, self.object)
		# Handle localization of status
		status_dict = {
			"attached": _("Attached"),
			"detached": _("Detached"),
		}
		status = status_dict.get(status, status)
		return (_("%(status)s session (%(id)s) with %(windows)s created %(time)s") %
				{"status": status, "id": id, "windows": windows, "time": time})

	def get_icon_name(self):
		return "gnome-window-manager"

class TmuxSessionsSource (Source, FilesystemWatchMixin):
	"""Source for tmux sessions"""
	def __init__(self):
		super(TmuxSessionsSource, self).__init__(_("tmux Sessions"))

	def initialize(self): pass

	def get_items(self):
		for id, windows, time, status in tmux_sessions_infos():
			yield TmuxSession(id, id)

	def get_description(self):
		return _("Active tmux sessions")
	def get_icon_name(self):
		return "terminal"
	def provides(self):
		yield TmuxSession

class AttachSession (Action):
	"""
	"""
	def __init__(self):
		name = _("Attach")
		super(AttachSession, self).__init__(name)
	def activate(self, leaf):
		id = leaf.object
		action_argv = ['tmux', '-u', 'attach-session', '-t', ('%s' % id)]
		utils.spawn_in_terminal(action_argv)

