-- Accepts a JSON string (`-M` or front matter) or the equivalent YAML
-- structure in front matter, e.g. `{2: [0.3, 0.7]}`.
local function parseColSpecs(value)
  if value == nil then
    return {}
  end
  local typ = pandoc.utils.type(value)
  if typ == 'string' or typ == 'Inlines' then
    return pandoc.json.decode(pandoc.utils.stringify(value))
  end
  local specs = {}
  for key, widths in pairs(value) do
    specs[key] = widths:map(function(width)
      return tonumber(pandoc.utils.stringify(width))
    end)
  end
  return specs
end

function Pandoc(doc)
  if doc.meta.tableColSpecs == nil and doc.meta.tableColSpecsSameWidth == nil then
    return
  end

  local tableColSpecs = parseColSpecs(doc.meta.tableColSpecs)

  local tableId = 0
  function Table(table)
    tableId = tableId + 1
    local specs = tableColSpecs[tableId] or tableColSpecs[tostring(tableId)] or {}
    if #specs > 0 then
      for i, spec in ipairs(specs) do
        table.colspecs[i][2] = spec
      end
    elseif doc.meta.tableColSpecsSameWidth then
      local width = 1 / #table.colspecs
      for i, spec in ipairs(table.colspecs) do
        spec[2] = width
      end
    end
    return table
  end

  return doc:walk {Table = Table}
end
