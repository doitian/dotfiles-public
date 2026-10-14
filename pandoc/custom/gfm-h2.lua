function Writer(doc, opts)
  local filter = {
    Header = function(h)
      h.level = h.level + 1
      return h
    end,
  }
  doc = doc:walk(filter)
  if doc.meta.title then
    table.insert(doc.blocks, 1, pandoc.Header(1, doc.meta.title))
  end
  return pandoc.write(doc, "gfm", opts)
end

function Template()
  local template = pandoc.template
  return template.default("gfm")
end
