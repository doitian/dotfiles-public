function CodeBlock(el)
  if #el.classes == 0 then
    el.classes[1] = 'text'
  end
  return el
end

function replace (el)
  if vars[el.text] then
    return pandoc.Span(vars[el.text])
  else
    return el
  end
end

return {{CodeBlock = CodeBlock}}
