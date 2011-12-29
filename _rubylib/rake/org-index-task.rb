require 'rake'
require 'rake/tasklib'
require 'pathname'

module Rake
  class OrgIndexTask < TaskLib
    attr_accessor :name
    attr_accessor :title
    attr_accessor :org_files
    attr_accessor :level

    def initialize(name='sitemap.org')
      @name = name
      @title = 'Index'
      @org_files = Rake::FileList.new
      @level = 0
      yield self if block_given?
      define
    end

    def define
      files = org_files.dup
      files.exclude {|fn| fn == name}

      desc "Create index for org files"
      file name => files do
        tree = {}
        files.sort.each do |org|
          compoents = split_all org
          basename = compoents.pop

          tree_node = tree

          compoents.each_index do |i|
            dir = compoents[i]
            index_org = File.join(compoents[0..i], 'index.org')
            if File.exists?(index_org)
              title = get_title(index_org) || dir
              key = [title, index_org]
            else
              key = [dir]
            end

            unless tree_node.key?(key)
              tree_node[key] = {}
            end
            tree_node = tree_node[key]
          end

          if basename.include?("-")
            filename_seen_so_far = ""
            basename.split("-")[0...-1].each do |part|
              filename_seen_so_far += "-" unless filename_seen_so_far.empty?
              filename_seen_so_far += part
              if File.exist?(filename_seen_so_far + ".org")
                title = get_title(filename_seen_so_far + ".org") || part
                key = [title, filename_seen_so_far + ".org"]
              else
                key = [part]
              end

              puts key.inspect
              tree_node[key] ||= {}
              tree_node = tree_node[key]
            end

            title = get_title(org) || basename.split("-").last.sub(/\.org$/, "")
            tree_node[[title, org]] ||= {}
          elsif compoents.empty? || basename != 'index.org'
            title = get_title(org) || org.pathmap('%n')
            tree_node[[title, org]] ||= {}
          end
        end

        File.open(name, 'w') do |out_file|
          out_file.write("#+TITLE: #{title}\n")
          write_tree(tree, out_file)
        end
      end

      task :clobber do
        rm name if File.exists?(name)
      end
    end

    def write_tree(tree, out, current_level=0)
      tree.keys.sort { |x, y| x.first <=> y.first }.each do |k|
        if current_level >= level
          out.write(' ' * 2 * (current_level - level))
          title, link = k
          title = title.gsub(/_/, " ")

          if link && org_files.include?(link)
            dirname = Pathname.new(name).dirname
            link = Pathname.new(link).relative_path_from(dirname).to_s

            out.write("+ [[file:#{link}][#{title}]]\n")
          else
            out.write("+ #{title}\n")
          end
        end
        write_tree(tree[k], out, current_level + 1)
      end
    end

    def get_title(org)
      value = nil
      begin
        lines = File.open(org).readlines.grep(/^#\+TITLE:/)
        line = lines.last
        if line
          value = line.gsub(/^#\+TITLE:\s*/, '').chomp
        end
      rescue
      end
    end

  end
end
