package.path = pandoc.path.join({ pandoc.path.directory(PANDOC_SCRIPT_FILE), '?.lua' })
  .. ';' .. package.path
local logging = require 'logging'

function Pandoc(doc)
  logging.temp('doc', doc)
end
