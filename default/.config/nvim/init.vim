if $SSH_HOME != '' | let $HOME = $SSH_HOME | endif
set runtimepath^=$HOME/.vim
let &packpath=&runtimepath

function! LoadNvimPlugs()
  Plug 'hrsh7th/nvim-compe'
  Plug 'neovim/nvim-lspconfig'
  Plug 'nvim-lua/plenary.nvim'
  Plug 'nvim-lua/popup.nvim'
  Plug 'nvim-telescope/telescope.nvim'
  Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
endfunction

augroup nvim_init_au
  autocmd!

  autocmd ColorScheme *
        \ highlight LspDiagnosticsDefaultError guifg=Red ctermfg=DarkRed |
        \ highlight LspDiagnosticsDefaultWarning guifg=Orange ctermfg=LightMagenta |
        \ highlight LspDiagnosticsDefaultInformation guifg=LightBlue ctermfg=LightBlue |
        \ highlight LspDiagnosticsDefaultHint guifg=LightGrey ctermfg=LightGrey
augroup END

source $HOME/.vimrc

command! Reload :source $HOME/.config/nvim/init.vim | :filetype detect | :nohl

set completeopt=menuone,noselect,preview

lua << EOF
require'compe'.setup {
  enabled = true;
  autocomplete = true;
  debug = false;
  min_length = 3;
  preselect = 'enable';
  throttle_time = 80;
  source_timeout = 200;
  resolve_timeout = 800;
  incomplete_delay = 400;
  max_abbr_width = 100;
  max_kind_width = 100;
  max_menu_width = 100;
  documentation = {
    border = { '', '' ,'', ' ', '', '', '', ' ' }, -- the border option is the same as `|help nvim_open_win|`
    winhighlight = "NormalFloat:CompeDocumentation,FloatBorder:CompeDocumentationBorder",
    max_width = 120,
    min_width = 60,
    max_height = math.floor(vim.o.lines * 0.3),
    min_height = 1,
  };

  source = {
    path = true;
    buffer = true;
    calc = true;
    nvim_lsp = true;
    nvim_lua = true;
    vsnip = false;
    ultisnips = true;
    luasnip = false;
  };
}

local nvim_lsp = require('lspconfig')

-- Use an on_attach function to only map the following keys
-- after the language server attaches to the current buffer
local on_attach = function(client, bufnr)
  local function buf_set_keymap(...) vim.api.nvim_buf_set_keymap(bufnr, ...) end
  local function buf_set_option(...) vim.api.nvim_buf_set_option(bufnr, ...) end

  --Enable completion triggered by <c-x><c-o>
  buf_set_option('omnifunc', 'v:lua.vim.lsp.omnifunc')

  -- Mappings.
  local opts = { noremap=true, silent=true }

  -- See `:help vim.lsp.*` for documentation on any of the below functions
  buf_set_keymap('n', 'gD', '<Cmd>lua vim.lsp.buf.declaration()<CR>', opts)
  buf_set_keymap('n', 'gd', '<Cmd>lua vim.lsp.buf.definition()<CR>', opts)
  buf_set_keymap('n', 'K', '<Cmd>lua vim.lsp.buf.hover()<CR>', opts)
  buf_set_keymap('n', 'gi', '<cmd>lua vim.lsp.buf.implementation()<CR>', opts)
  buf_set_keymap('n', '<C-k>', '<cmd>lua vim.lsp.buf.signature_help()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>wa', '<cmd>lua vim.lsp.buf.add_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>wr', '<cmd>lua vim.lsp.buf.remove_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>wl', '<cmd>lua print(vim.inspect(vim.lsp.buf.list_workspace_folders()))<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>D', '<cmd>lua vim.lsp.buf.type_definition()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>rn', '<cmd>lua vim.lsp.buf.rename()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>ca', '<cmd>lua vim.lsp.buf.code_action()<CR>', opts)
  buf_set_keymap('n', 'gr', '<cmd>lua vim.lsp.buf.references()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>e', '<cmd>lua vim.lsp.diagnostic.show_line_diagnostics()<CR>', opts)
  buf_set_keymap('n', '[d', '<cmd>lua vim.lsp.diagnostic.goto_prev()<CR>', opts)
  buf_set_keymap('n', ']d', '<cmd>lua vim.lsp.diagnostic.goto_next()<CR>', opts)
  buf_set_keymap('n', '<LocalLeader>q', '<cmd>lua vim.lsp.diagnostic.set_loclist()<CR>', opts)
  buf_set_keymap("n", "<LocalLeader>f", "<cmd>lua vim.lsp.buf.formatting()<CR>", opts)
  buf_set_keymap("n", "<LocalLeader>i", "<cmd>Telescope lsp_document_symbols<CR>", opts)
  buf_set_keymap("n", "<LocalLeader>I", "<cmd>Telescope lsp_workspace_symbols<CR>", opts)
end

-- Use a loop to conveniently call 'setup' on multiple servers and
-- map buffer local keybindings when the language server attaches
local servers = { "pyright", "rust_analyzer" }
for _, lsp in ipairs(servers) do
  nvim_lsp[lsp].setup {
    on_attach = on_attach,
    flags = {
      debounce_text_changes = 150,
    }
  }
end

vim.lsp.handlers["textDocument/publishDiagnostics"] =
  vim.lsp.with(
    vim.lsp.diagnostic.on_publish_diagnostics,
    {
      underline = false
    }
  )

local actions = require('telescope.actions')
-- Global remapping
------------------------------
require('telescope').setup{
  defaults = {
    mappings = {
      i = {
        ["<C-j>"] = actions.move_selection_next,
        ["<C-k>"] = actions.move_selection_previous,
        ["<C-g>"] = actions.close
      },
      n = {
        ["<C-j>"] = actions.move_selection_next,
        ["<C-k>"] = actions.move_selection_previous,
        ["<C-g>"] = actions.close
      }
    }
  }
}

require'nvim-treesitter.configs'.setup {
  highlight = {
    enable = true,
  }
}
EOF

nnoremap <silent> <Leader><Space> <cmd>Telescope find_files<CR>

nnoremap <silent> <Leader>eV :tabnew $HOME/.config/nvim/init.vim<CR>

nnoremap <silent> <Leader>fb <cmd>Telescope buffers<CR>
nnoremap <silent> <Leader>ff <cmd>Telescope find_files<CR>
nnoremap <silent> <Leader>fo <cmd>Telescope current_buffer_fuzzy_find<CR>
nnoremap <silent> <Leader>fr <cmd>Telescope oldfiles<CR>
nnoremap <silent> <Leader>f: <cmd>Telescope command_history<CR>
nnoremap <silent> <Leader>f/ <cmd>Telescope search_history<CR>
nnoremap <silent> <Leader>fm <cmd>Telescope marks<CR>
nnoremap <silent> <Leader>f? <cmd>Telescope help_tags<CR>
nnoremap <silent> <Leader>fg <cmd>Telescope live_grep<CR>
nnoremap <silent> <Leader>f<CR> <cmd>Telescope<CR>
nnoremap <silent> <Leader>i <cmd>Telescope current_buffer_tags<CR>
nnoremap <silent> <Leader>I <cmd>Telescope tags<CR>

let g:endwise_no_mappings = 1
inoremap <silent><expr> <CR>  compe#confirm('<CR>')
inoremap <silent><expr> <A-/> compe#complete()
inoremap <silent><expr> <C-e> compe#close('<C-e>')

imap <silent><expr> <CR>
      \ (pumvisible() ?
        \ (complete_info()["selected"] == -1 ? "\<C-g>u\<CR>\<Plug>DiscretionaryEnd" : "\<C-y>")
        \ : "\<CR>\<Plug>DiscretionaryEnd" )

