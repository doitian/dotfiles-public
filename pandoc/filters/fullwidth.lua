local prelogue = pandoc.RawInline('latex', '\\begin{fullwidth}')
local epilogue = pandoc.RawInline('latex', '\\end{fullwidth}')

function Block(el)
  return { prelogue, el, epilogue }
end

function Pandoc(doc)
  if (not FORMAT:find('latex')) or doc.meta.fullwidthTags == nil then
    return
  end

  local tags = doc.meta.fullwidthTags
  if type(tags) == 'string' then
    tags = { tags }
  end
  local filter = {}
  for _, tag in ipairs(tags) do
    filter[tag] = Block
  end

  return doc:walk(filter)
end

return {{Pandoc = Pandoc}}
