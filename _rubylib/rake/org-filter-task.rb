require 'rake'
require 'rake/tasklib'

require 'org'

module Rake
  class OrgFilter
    def filter(input, org_file)
      input
    end
  end

  class OrgTemplateFilter < OrgFilter
    def initialize(style, header, footer)
      @style = style
      @header = header
      @footer = footer
    end

    def filter(input, org_file)
      output = ''
      
      input.each_line do |l|
        case l
        when %r|^</head>|
            output += @style
          output += l
        when %r|^<body>|
            output += l
          output += @header
        when %r|^</body>|
            output += @footer
          output += l
        else
          output += l
        end
      end

      output
    end
  end

  class OrgBreadCumbFilter < OrgFilter
    attr_accessor :url_prefix
    attr_accessor :add_after_re

    def initialize(prefix='/')
      @url_prefix = prefix
      @add_after_re = /^<div id="content">/
    end

    def define_dependencies(org_files, dest_dir)
      org_files.each do |org|
        dest_html = org.ext('html')
        dest_html = File.join(dest_dir, dest_html) if dest_dir

        parent = get_parent(org)
        if parent && File.file?(parent)
          file dest_html => [parent]
        end
      end
    end

    def filter(input, org_file)
      breadcumbs = []
      until org_file.nil? || org_file == 'index.org'
        parent_file = get_parent(org_file)
        title = get_title(parent_file)

        link = parent_file.ext('html').sub(/(^|\/)index.html/, '')

        breadcumbs << [link, title]

        org_file = parent_file
      end

      if breadcumbs.empty?
        return input
      end

      output = ''
      prefix = url_prefix.sub(/\/?$/, '/')
      input.each_line do |l|
        case l
        when add_after_re
          output += l

          output += "<div id=\"breadcumb\">\n  <ul>\n"
          breadcumbs.reverse_each do |bc|
            output += "    <li><a href=\"#{prefix}#{bc[0]}\">#{bc[1]}</a></li>\n"
          end
          output += "  </ul>\n</div>\n"
        else
          output += l
        end
      end

      output
    end

    def get_parent(org_file)
      if org_file == 'index.org'
        return nil
      end

      org_parser = Org.new(org_file)
      begin
        parent = org_parser['LINK_UP']
        unless parent.nil? || parent.empty?
          Dir.chdir(File.dirname(org_file)) { parent = File.expand_path(parent) }
          parent = parent[Dir.pwd.length..-1]
        end
      rescue
        parent = nil
      end

      if parent && ! parent.empty?
        parent = parent.sub(/^\//, '')
        unless parent =~ /\.org$/
          parent = File.join(parent, 'index.org')
        end
      else
        basename = org_file.pathmap('%f')
        if basename == 'index.org'
          parent = File.join(File.dirname(File.dirname(org_file)), 'index.org')
        elsif basename.include?("-")
          parent = File.join(File.dirname(org_file), basename.sub(/-[^-]*$/, ".org"))
        else
          parent = File.join(File.dirname(org_file), 'index.org')
        end
        parent = parent.sub(/^\.\//, '')
      end

      if parent && !File.exist?(parent)
        parent = get_parent(parent)
      end

      return parent
    end

    def get_title(org_file)
      org_parser = Org.new(org_file)
      org_parser.title
    end
  end

  class OrgStripIndexHmtlFilter < OrgFilter
    def filter(input, org_file)
      
      output = ''
      input.each_line do |l|
        output += l.gsub(/<a href="([^"]*\/)?index.html"/) do
          if $1 && !$1.empty?
            "<a href=\"#{$1}\""
          else
            "<a href=\"./\""
          end
        end
      end
      output
    end
  end

  class OrgSidebarFilter < OrgFilter
    attr_accessor :org_dir
    attr_accessor :add_after_re
    attr_accessor :style
    attr_accessor :extra_sidebar
    
    def initialize(org_dir)
      @org_dir = org_dir
      @add_after_re = /^<div id="content">/
      @style = nil
    end

    def filter(input, org_file)
      sidebar = get_sidebar(org_file)
      return input unless sidebar || extra_sidebar

      if sidebar
        sidebar_html = sidebar.ext('html')
        sidebar_html = File.join(org_dir, sidebar_html) if org_dir
      end
      extra_sidebar_html = []
      [extra_sidebar].flatten.compact.each do |e|
        if e && e != sidebar
          html = e.ext('html')
          html = File.join(org_dir, html) if org_dir
          extra_sidebar_html << html if File.file?(html)
        end
      end

      return input unless (sidebar_html && File.file?(sidebar_html)) || !extra_sidebar_html.empty?

      begin
        output = ''
        style_added = false
        input.each_line do |l|
          case l
          when add_after_re
            output += l

            sidebar_content = ""
            if sidebar_html
              sidebar_content += File.read(sidebar_html) rescue nil
            end
            extra_sidebar_html.each do |html|
              sidebar_content += File.read(html) rescue nil
            end

            unless sidebar_content.empty?
              sidebar_content = sidebar_content.
                gsub(/ class="outline-3"/, ' class="widget"').
                gsub(/ (id|class)="(outline-|outline-text-|outline-container-|container-|sec-|text-)[.0-9]*"/, '')

              output += <<HTML
<div id="sidebar">
#{sidebar_content}
</div>
HTML
            end
          when /^\s*(<\/header>|<link rel="stylesheet")/
            output += l unless $1 == '</header>'
            if style && ! style_added
              style_added = true
              output += style
            end
            output += l if $1 == '</header>'
          else
            output += l
          end
        end
        return output
      rescue
        return input
      end
    end

    def define_dependencies(org_files, dest_dir)
      org_files.each do |org|
        dest_html = org.ext('html')
        dest_html = File.join(dest_dir, dest_html) if dest_dir

        sidebar = get_sidebar(org)
        if sidebar
          sidebar_html = sidebar.ext('html')
          sidebar_html = File.join(org_dir, sidebar_html) if org_dir

          file dest_html => [sidebar_html]
        end

        [extra_sidebar].flatten.compact.each do |e|
          html = e.ext("html")
          html = File.join(org_dir, html) if org_dir
          file dest_html => [html]
        end
      end
    end

    def get_title(org_file)
      org_parser = Org.new(org_file)
      org_parser.title
    end

    def get_sidebar(org_file)
      org_parser = Org.new(org_file)
      sidebar = org_parser['SIDEBAR']

      if sidebar.nil?
        if File.basename(org_file).include?("-")
          sidebar = org_file.sub(/-[^-]*$/, "-sidebar.org")
          until sidebar.nil? || File.exist?(sidebar)
            sidebar.sub!(/-sidebar.org$/, "")
            if sidebar.include?("-")
              sidebar.sub!(/-[^-]*$/, "-sidebar.org")
            else
              sidebar = nil
            end
          end
        end

        if sidebar.nil?
          sidebar = 'sidebar.org'
          dir = File.dirname(org_file)
          if dir != "."
            sidebar = File.join(dir, sidebar)
          end
        end
      end

      return sidebar if sidebar && File.file?(sidebar)
      return nil
    end
  end

  class OrgAddSiteNameInTitleFilter < OrgFilter
    attr_accessor :site_name
    def initialize(name=nil)
      @site_name = name
    end

    def filter(input, org_file)
      return input if site_name.nil?

      output = ''
      input.each_line do |l|
        output += l.gsub(/^<title>(.*)<\/title>/, "<title>\\1 :: #{site_name}</title>")
      end
      output
    end
  end

  class OrgFilterTask < TaskLib
    attr_accessor :name
    attr_accessor :org_dir
    attr_accessor :org_files
    attr_accessor :dest_dir
    attr_accessor :remove_dir
    attr_accessor :filters

    def initialize(name=:orgfilter)
      @name = name
      @org_dir = 'org'
      @org_files = Rake::FileList.new
      @dest_dir = 'html'
      @remove_dir = true
      @filters = []
      yield self if block_given?
      define
    end

    def define
      directory @dest_dir if @dest_dir

      desc "Filter HTML files generated by Org"
      task name => filtered_html_files

      desc "Force an filter of the HTML files generated by Org"
      task "re#{name}" => ["clobber_#{name}", name]

      desc "Remove filtered HTML files"
      task "clobber_#{name}" do
        if remove_dir && dest_dir
          rm_r dest_dir
        else
          filtered_html_files.each do |f|
            rm f if File.exists?(f)
          end
        end
      end

      task :clobber => ["clobber_#{name}"]

      org_files.each do |org|
        source_html = org.ext('html')
        dest_html = source_html
        source_html = File.join(org_dir, source_html) if org_dir
        dest_html = File.join(dest_dir, dest_html) if dest_dir

        file dest_html => [source_html] do
          contents = File.open(source_html).read
          filters.each do |f|
            contents = f.filter(contents, org)
          end
          dest_dir = File.dirname(dest_html)
          mkdir_p dest_dir unless File.exists?(dest_dir)
          dest_file = File.open(dest_html, 'w')
          dest_file.write(contents)
          dest_file.close
        end
      end
    end

    def published_html_files
      org_files.map do |org|
        html = org.ext('html')
        html = File.join(org_dir, html) if org_dir
        html
      end
    end

    def filtered_html_files
      org_files.map do |org|
        html = org.ext('html')
        html = File.join(dest_dir, html) if dest_dir
        html
      end
    end
  end
end
