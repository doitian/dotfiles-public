" Preamble {{{1
set runtimepath^=~/.vim
let &packpath=&runtimepath

function! LoadNvimPlugs()
  Plug 'github/copilot.vim'
  Plug 'nvim-treesitter/nvim-treesitter' , {'do': ':TSUpdate'}

  Plug 'williamboman/nvim-lsp-installer'
  Plug 'neovim/nvim-lspconfig'
  Plug 'ii14/lsp-command'
  Plug 'ojroques/nvim-lspfuzzy'

  Plug 'hrsh7th/cmp-nvim-lsp'
  Plug 'hrsh7th/cmp-buffer'
  Plug 'hrsh7th/cmp-path'
  Plug 'hrsh7th/cmp-cmdline'
  Plug 'hrsh7th/nvim-cmp'

  " For vsnip users.
  " Plug 'hrsh7th/cmp-vsnip'
  " Plug 'hrsh7th/vim-vsnip'

  " For ultisnips users.
  Plug 'quangnguyen30192/cmp-nvim-ultisnips'

  Plug 'lewis6991/gitsigns.nvim'
endfunction

let g:copilot_node_command = $HOME . "/.asdf/shims/node"
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

command! Reload :eval "source " . stdpath('config') . "/init.vim" | :filetype detect | :nohl
command! LspFold setlocal foldmethod=expr foldexpr=nvim_treesitter#foldexpr()

nnoremap <silent> <Leader>eV :tab drop <C-R>=stdpath('config')<CR>/init.vim<CR>

set signcolumn=number
set completeopt=menu,menuone,noselect
set foldmethod=expr
set foldexpr=nvim_treesitter#foldexpr()

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
    })
  })

  -- Set configuration for specific filetype.
  cmp.setup.filetype('gitcommit', {
    sources = cmp.config.sources({
      { name = 'cmp_git' }, -- You can specify the `cmp_git` source if you were installed it.
    }, {
      { name = 'buffer' },
    })
  })

  -- Use buffer source for `/` (if you enabled `native_menu`, this won't work anymore).
  cmp.setup.cmdline('/', {
    mapping = cmp.mapping.preset.cmdline(),
    sources = {
      { name = 'buffer' }
    }
  })

  -- Use cmdline & path source for ':' (if you enabled `native_menu`, this won't work anymore).
  cmp.setup.cmdline(':', {
    mapping = cmp.mapping.preset.cmdline(),
    sources = cmp.config.sources({
      { name = 'path' }
    }, {
      { name = 'cmdline' }
    })
  })

  -- Setup lspconfig.
  require("nvim-lsp-installer").setup {}
  require('lspfuzzy').setup {}

  local lsp_mapping_opts = { noremap=true, silent=true }
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev, lsp_mapping_opts)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next, lsp_mapping_opts)
  vim.keymap.set('n', '<Leader>jj', vim.diagnostic.open_float, lsp_mapping_opts)
  vim.keymap.set('n', '<Leader>jqq', vim.diagnostic.setqflist, lsp_mapping_opts)
  vim.keymap.set('n', '<Leader>jql', vim.diagnostic.setloclist, lsp_mapping_opts)

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

  local capabilities = require('cmp_nvim_lsp').update_capabilities(vim.lsp.protocol.make_client_capabilities())
  local lspconfig = require('lspconfig')
  local servers = {
    pyright = {},
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

  -- treesitter
  require'nvim-treesitter.configs'.setup {
    -- A list of parser names, or "all"
    ensure_installed = {'rust', 'python'},

    -- Install parsers synchronously (only applied to `ensure_installed`)
    sync_install = false,

    -- Automatically install missing parsers when entering buffer
    auto_install = false,

    -- List of parsers to ignore installing (for "all")
    ignore_install = {'vim'},

    highlight = {
      enable = true,
      disable = {'vim'},

      -- Setting this to true will run `:h syntax` and tree-sitter at the same time.
      -- Set this to `true` if you depend on 'syntax' being enabled (like for indentation).
      -- Using this option may slow down your editor, and you may see some duplicate highlights.
      -- Instead of true it can also be a list of languages
      additional_vim_regex_highlighting = false,
    },
  }

  require('gitsigns').setup{
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
