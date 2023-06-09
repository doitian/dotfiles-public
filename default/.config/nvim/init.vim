" Preamble {{{1
set runtimepath^=~/.vim
set mouse=vi
let &packpath=&runtimepath

augroup csfix_au
  autocmd!
  autocmd ColorScheme PaperColor hi VertSplit cterm=reverse
augroup END

function! LoadNvimPlugs()
  Plug 'nvim-treesitter/nvim-treesitter' , {'do': ':TSUpdate'}

  Plug 'github/copilot.vim'
  Plug 'ii14/lsp-command'
  Plug 'neovim/nvim-lspconfig'
  Plug 'ojroques/nvim-lspfuzzy'
  Plug 'williamboman/nvim-lsp-installer'

  Plug 'folke/trouble.nvim'
  Plug 'lewis6991/gitsigns.nvim'

  " cmp
  Plug 'hrsh7th/cmp-nvim-lsp'
  Plug 'hrsh7th/cmp-buffer'
  Plug 'hrsh7th/cmp-path'
  Plug 'hrsh7th/nvim-cmp'
  Plug 'quangnguyen30192/cmp-nvim-ultisnips'
endfunction

let g:copilot_node_command = $HOME . "/.asdf/installs/nodejs/lts/bin/node"
if exists("$SCOOP")
  let g:copilot_node_command = $SCOOP . "/apps/nodejs-lts/current/node.exe"
endif

if exists("$VIM_PYTHON3_HOST_PROG")
  let g:python3_host_prog = $VIM_PYTHON3_HOST_PROG
elseif filereadable("/usr/local/bin/python3")
  let g:python3_host_prog = "/usr/local/bin/python3"
elseif exists("$SCOOP")
  let g:python3_host_prog = $SCOOP . "/shims/python3.exe"
endif

source ~/.vimrc

command! Reload :exe "source " . stdpath('config') . "/init.vim" | :filetype detect | :nohl
command! LspFold setlocal foldmethod=expr foldexpr=nvim_treesitter#foldexpr()

set signcolumn=number
set completeopt=menu,menuone,noselect
set foldmethod=expr
set foldexpr=nvim_treesitter#foldexpr()

" Test {{{2
nnoremap <silent> <Leader>eV :tab drop <C-R>=stdpath('config')<CR>/init.vim<CR>
nnoremap <leader>jtt <cmd>TroubleToggle<cr>
nnoremap <leader>jtw <cmd>TroubleToggle workspace_diagnostics<cr>
nnoremap <leader>jtd <cmd>TroubleToggle document_diagnostics<cr>
nnoremap <leader>jtq <cmd>TroubleToggle quickfix<cr>
nnoremap <leader>jtl <cmd>TroubleToggle loclist<cr>
nnoremap <leader>jtr <cmd>TroubleToggle lsp_references<cr>

" Lua {{{1
lua <<EOF
  -- Setup nvim-cmp.
  local cmp = require'cmp'

  cmp.setup({
    snippet = {
      -- REQUIRED - you must specify a snippet engine
      expand = function(args)
        -- vim.fn["vsnip#anonymous"](args.body) -- For `vsnip` users.
        vim.fn["UltiSnips#Anon"](args.body) -- For `ultisnips` users.
      end,
    },
    window = {
      completion = cmp.config.window.bordered(),
      documentation = cmp.config.window.bordered(),
    },
    mapping = cmp.mapping.preset.insert({
      ['<C-b>'] = cmp.mapping.scroll_docs(-4),
      ['<C-f>'] = cmp.mapping.scroll_docs(4),
      ['<C-l>'] = cmp.mapping.complete(),
      ['<C-e>'] = cmp.mapping.abort(),
      ['<CR>'] = cmp.mapping.confirm({ select = true }),
    }),
    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      -- { name = 'vsnip' }, -- For vsnip users.
      { name = 'ultisnips' }, -- For ultisnips users.
    }, {
      { name = 'buffer' },
      { name = 'path' },
    })
  })

  -- Setup lspconfig.
  require("nvim-lsp-installer").setup {}
  require('lspfuzzy').setup {}

  local lsp_mapping_opts = { noremap=true, silent=true }
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev, lsp_mapping_opts)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next, lsp_mapping_opts)
  vim.keymap.set('n', '<Leader><CR>', vim.diagnostic.open_float, lsp_mapping_opts)
  vim.api.nvim_create_user_command('Cdiag', vim.diagnostic.setqflist, {})
  vim.api.nvim_create_user_command('Ldiag', vim.diagnostic.setloclist, {})

  -- Use an on_attach function to only map the following keys
  -- after the language server attaches to the current buffer
  local on_attach = function(client, bufnr)
    -- Enable completion triggered by <c-x><c-o>
    vim.api.nvim_buf_set_option(bufnr, 'omnifunc', 'v:lua.vim.lsp.omnifunc')

    -- Mappings.
    -- See `:help vim.lsp.*` for documentation on any of the below functions
    local bufopts = { noremap=true, silent=true, buffer=bufnr }
    vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, bufopts)
    vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, bufopts)
    vim.keymap.set('n', 'gd', vim.lsp.buf.definition, bufopts)
    vim.keymap.set('n', 'go', vim.lsp.buf.type_definition, bufopts)
    vim.keymap.set('n', 'K', vim.lsp.buf.hover, bufopts)
    vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, bufopts)
    vim.keymap.set('n', '<Leader>jx', vim.lsp.buf.code_action, bufopts)
    vim.keymap.set('x', '<Leader>jx', vim.lsp.buf.code_action, bufopts)
    vim.keymap.set('n', '<Leader>jwa', vim.lsp.buf.add_workspace_folder, bufopts)
    vim.keymap.set('n', '<Leader>jwr', vim.lsp.buf.remove_workspace_folder, bufopts)
    vim.keymap.set('n', '<Leader>jwl', function()
      print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
    end, bufopts)
  end

  local capabilities = require('cmp_nvim_lsp').default_capabilities()
  local lspconfig = require('lspconfig')
  local servers = {
    ruff_lsp = {},
    rust_analyzer = {}
  }

  for server, server_local_opts in pairs(servers) do
    local server_opts = {
      on_attach = on_attach,
      capabilities = capabilities
    }
    server_opts = vim.tbl_deep_extend('force', server_opts, server_local_opts)
    lspconfig[server].setup(server_opts)
  end

  vim.diagnostic.config {
    virtual_text = false,
    underline = false,
  }

  require("trouble").setup {
    icons = false,
    fold_open = "v",
    fold_closed = ">",
    indent_lines = false,
    use_diagnostic_signs = true
  }

  -- treesitter
  require'nvim-treesitter.configs'.setup {
    -- A list of parser names, or "all"
    ensure_installed = {'rust', 'python'},

    -- Install parsers synchronously (only applied to `ensure_installed`)
    sync_install = false,

    -- Automatically install missing parsers when entering buffer
    auto_install = false,

    -- List of parsers to ignore installing (for "all")
    ignore_install = false,

    highlight = {
      enable = true,
      disable = false,

      -- Setting this to true will run `:h syntax` and tree-sitter at the same time.
      -- Set this to `true` if you depend on 'syntax' being enabled (like for indentation).
      -- Using this option may slow down your editor, and you may see some duplicate highlights.
      -- Instead of true it can also be a list of languages
      additional_vim_regex_highlighting = false,
    },
  }

  require('gitsigns').setup{
    signs = {
      add          = { hl = 'GitGutterAdd'   , text = '▏', numhl='GitGutterAdd'   , linehl='GitGutterAddLine'    },
      change       = { hl = 'GitGutterChange', text = '▏', numhl='GitGutterChange', linehl='GitGutterChangeLine' },
      delete       = { hl = 'GitGutterDelete', text = '▸', numhl='GitGutterDelete', linehl='GitGutterDeleteLine' },
      topdelete    = { hl = 'GitGutterDelete', text = '▸', numhl='GitGutterDelete', linehl='GitGutterDeleteLine' },
      changedelete = { hl = 'GitGutterChange', text = '▏', numhl='GitGutterChange', linehl='GitGutterChangeLine' },
    },

    numhl = true,

    on_attach = function(bufnr)
      local gs = package.loaded.gitsigns

      local function map(mode, l, r, opts)
        opts = opts or {}
        opts.buffer = bufnr
        vim.keymap.set(mode, l, r, opts)
      end

      -- Navigation
      map('n', ']c', function()
        if vim.wo.diff then return ']c' end
        vim.schedule(function() gs.next_hunk() end)
        return '<Ignore>'
      end, {expr=true, buffer=bufnr})

      map('n', '[c', function()
        if vim.wo.diff then return '[c' end
        vim.schedule(function() gs.prev_hunk() end)
        return '<Ignore>'
      end, {expr=true, buffer=bufnr})

      -- Text object
      map({'o', 'x'}, 'ih', ':<C-U>Gitsigns select_hunk<CR>', {buffer=bufnr})
    end
  }
EOF
