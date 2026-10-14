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
  if pandoc.utils.type(tags) ~= 'List' then
    tags = { tags }
  end
  local filter = {}
  for _, tag in ipairs(tags) do
    filter[pandoc.utils.stringify(tag)] = Block
  end

  return doc:walk(filter)
end

return {{Pandoc = Pandoc}}
