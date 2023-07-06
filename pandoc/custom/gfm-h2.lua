local logging = require 'logging'

function Writer(doc, opts)
  local filter = {
    Header = function (h)
      h.level = h.level + 1
      return h
    end
  }
  doc = doc:walk(filter)
  table.insert(doc.blocks, 1, pandoc.Header(1, doc.meta.title))
  return pandoc.write(doc, 'gfm', opts)
end

function Template()
  local template = pandoc.template
  return template.default('gfm')
end
