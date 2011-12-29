require 'rake'
require 'rake/tasklib'

require 'string-utils'

module Rake

  # Create a task that will export org files as HTML files
  #
  # The OrgTask will create the following targets:
  # [<b><em>org</em></b>]
  #   Main task for this org task
  # [<b>:clobber_<em>org</em></b>]
  #   Delete all generated HTML files. This target is automatically added to the
  #   main clobber target.
  # [<b>:re<em>org</em></b>]
  #   Rebuild all HTML files from scratch, even if they are not out of date.
  #
  # Simple Example:
  #
  #   Rake::OrgTask.new do |t|
  #     t.org_dir = '/srv/http'
  #     t.org_files.include("**/*.org")
  #     t.emacs = '/usr/bin/emacs'
  #     t.lisp_load_path << '/opt/share/emacs/site-lisp'
  #   end
  #
  class OrgTask < TaskLib
    # Name of the top level task. (default is :org)
    attr_accessor :name

    # Name of directory to receive HTML output files. (default is "org")
    attr_accessor :org_dir

    # List of files to be included. (default is [])
    attr_accessor :org_files

    # Path to Emacs executable. (default is '/usr/bin/emacs')
    attr_accessor :emacs

    # Array of extra Emacs load_path. (default is [])
    attr_accessor :lisp_load_path

    # Export only body of HTML. (default is false)
    attr_accessor :body_only

    # Remove the whole org_dir. If not, just remove all generated
    # HTML files. (default is true)
    attr_accessor :remove_dir

    # Extra lisp code to be evaluated. (default is nil)
    attr_accessor :extra_init_el

    def initialize(name=:org)
      @name = name
      @org_dir = 'org'
      @org_files = Rake::FileList.new
      @emacs = '/usr/bin/emacs'
      @lisp_load_path = []
      @body_only = false
      @remove_dir = true
      @extra_init_el = nil
      yield self if block_given?
      define
    end

    # Create the tasks defined by this task lib
    def define
      directory @org_dir if @org_dir

      if name.to_s != "org"
        desc "Export the Org files as HTML"
      end

      desc "Export the #{name} Org files as HTML"
      task name => html_files

      desc "Force an export of the Org files"
      task "re#{name}" => ["clobber_#{name}", name]

      desc "Remove exported html files" 
      task "clobber_#{name}" do
        if remove_dir && org_dir
          rm_r org_dir if File.exists?(org_dir)
        else
          html_files.each do |f|
            rm f if File.exists?(f)
            ltxpng = File.join(File.dirname(f), 'ltxpng')
            rm_r ltxpng if File.exists?(ltxpng)
          end
        end
      end

      task :clobber => ["clobber_#{name}"]

      org_files.each do |org|
        html = org.ext('html')
        html = File.join(org_dir, html) if org_dir
        out_dir = (org_dir ? File.dirname(html) : nil)

        deps = []
        File.read(org).grep(/#\+INCLUDE:\s*(.*\.org)/) do
          dep = $1.ext("html")
          dep = File.join(org_dir, dep) if org_dir
          deps << dep
        end

        file html => deps + [org] do
          mkdir_p out_dir if out_dir && !File.exists?(out_dir)
          publish org, out_dir
        end
      end
    end

    def html_files
      org_files.map do |org|
        html = org.ext('html')
        html = File.join(org_dir, html) if org_dir
        html
      end
    end

    private
    def publish(org, out_dir=nil)
      out_dir = (out_dir.nil? ? 'nil' : out_dir.to_s.inspect)

      sh <<SH
#{escape(emacs)} --batch -Q \\
#{lisp_load_path_shell_options} \\
--eval #{escape(eval_el(out_dir))} \\
--file #{escape(org)} \\
-f org-task-export
SH
    end

    def eval_el(dir)
      body_only_str = body_only ? 't' : 'nil'

      <<LISP
(progn
  (setq make-backup-files nil)
  (require 'org)
  (require 'org-exp)
  (require 'org-src)
  #{extra_init_el}
  (defun org-task-export ()
    (org-export-as-html
      org-export-headline-levels 'hidden
      nil nil #{body_only_str} #{dir})))
LISP
end

    def lisp_load_path_shell_options
      lisp_load_path.map {|p| "-L #{escape(p)}"}.join(' ')
    end

    def escape(str)
      StringUtils.shell_escape(str)
    end
  end
end
