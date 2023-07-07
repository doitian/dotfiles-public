function Pandoc(doc)
  if doc.meta.replaceFirst == nil then
    table.remove(doc.blocks, 1)
  else
    doc.blocks[1] = pandoc.Header(1, pandoc.Str(doc.meta.replaceFirst))
  end
  return doc
end
