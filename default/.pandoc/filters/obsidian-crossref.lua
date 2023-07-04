local logging = require 'logging'


local label = lpeg.R("az", "AZ", "09") + lpeg.S("-")
local kinds = lpeg.P("fig")

local anchor = lpeg.P("^") * kinds * lpeg.P("-") * lpeg.C((1 - lpeg.S(" \n"))^1) * lpeg.P("$")
local ref

function Str(str)
  logging.info('str', str)
  return str
end
