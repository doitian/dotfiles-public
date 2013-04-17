"""
Search in recoll
"""
__kupfer_name__ = _("Recoll 0.1")
__kupfer_sources__ = ()
__kupfer_text_sources__ = ()
__kupfer_contents__ = ()
__kupfer_actions__ = ("RecollSearch", )
__description__ = _("Recoll desktop search integration")
__version__ = "2013-04-16"
__author__ = "Ian Yang <me@iany.me>"

import os

from kupfer.objects import Action, Source, Leaf
from kupfer.objects import TextLeaf, SourceLeaf, FileLeaf
from kupfer.obj.objects import ConstructFileLeaf
from kupfer import utils, pretty
from kupfer import kupferstring
from kupfer import plugin_support

class RecollSearch (Action):
	def __init__(self):
		Action.__init__(self, _("Search in Recoll"))

	def activate(self, leaf):
		utils.spawn_async(["recoll", "-q", leaf.object])
	def get_description(self):
		return _("Open Recoll Search Tool and search for this term")
	def get_icon_name(self):
		return "system-search"
	def item_types(self):
		yield TextLeaf
