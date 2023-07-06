function Pandoc(pandoc)
  table.remove(pandoc.blocks, 1)
  return pandoc
end
