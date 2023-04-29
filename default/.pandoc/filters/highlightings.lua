function CodeBlock(el)
  if #el.classes == 0 then
    el.classes[1] = 'text'
  end
  return el
end

return {{CodeBlock = CodeBlock}}
