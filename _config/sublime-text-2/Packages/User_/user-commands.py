import sublime, sublime_plugin

def transform_selection(view, f, extend = False):
  new_sel = []
  sel = view.sel()
  size = view.size()

  for r in sel:
    new_pt = f(r.b)

    if new_pt < 0: new_pt = 0
    elif new_pt > size: new_pt = size

    if extend:
      new_sel.append(sublime.Region(r.a, new_pt))
    else:
      new_sel.append(sublime.Region(new_pt))

  sel.clear()
  for r in new_sel:
    sel.add(r)

class UserMoveToCharacter(sublime_plugin.TextCommand):
  def find_next(self, forward, char, before, pt):
    lr = self.view.line(pt)

    extra = 0 if before else 1

    if forward:
      line = self.view.substr(sublime.Region(pt, lr.b))
      idx = line.find(char, 1)
      if idx >= 0:
        return pt + idx + 1 * extra
    else:
      line = self.view.substr(sublime.Region(lr.a, pt))[::-1]
      idx = line.find(char, 0)
      if idx >= 0:
        return pt - idx - 1 * extra

    return pt

  def run(self, edit, character, extend = False, forward = True, before = False, record = True):
    # if record:
    #   global g_last_move_command
    #   g_last_move_command = {'character': character, 'extend': extend,
    #     'forward':forward, 'before':before}

    transform_selection(self.view,
      lambda pt: self.find_next(forward, character, before, pt),
      extend=extend)

class UserSwitchSels(sublime_plugin.TextCommand):
  def run(self, edit):
    new_sel = []
    sel = self.view.sel()
  
    for r in sel:
      new_sel.append(sublime.Region(r.b, r.a))

    sel.clear()
    for r in new_sel:
      sel.add(r)
