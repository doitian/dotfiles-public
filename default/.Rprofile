## -*- R -*-

local({
  old <- getOption("defaultPackages")
  r <- getOption("repos")
  r["CRAN"] <- "http://mirrors.xmu.edu.cn/CRAN"
  options(defaultPackages = c(old, "MASS"), repos = r)
  ## (for Unix terminal users) set the width from COLUMNS if set
  cols <- Sys.getenv("COLUMNS")
  if(nzchar(cols)) options(width = as.integer(cols))
})
