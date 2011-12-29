require 'rake'
require 'rake/tasklib'

require 'string-utils'

module Rake
  class ImageThumbTask < TaskLib
    attr_accessor :name
    attr_accessor :files
    attr_accessor :thumb_dir
    attr_accessor :convert

    def initialize(name=:thumb)
      @name = name
      @files = Rake::FileList.new
      @thumb_dir = 'thumb'
      @convert = '/usr/bin/convert'
      yield self if block_given?
      define
    end

    def define
      desc "Generate thumb for image files"
      task name

      desc "Clean thumb image files"
      task "clobber_#{name}"

      dirs = []
      files.each do |f|
        dir = File.join(File.dirname(f), thumb_dir)
        dirs << dir
        thumb = File.join(dir, File.basename(f))

        file thumb => [f] do
          mkdir_p dir unless File.exists?(dir)
          sh "#{escape(convert)} #{escape(f)} -resize 500x #{escape(thumb)}"
        end
        task name => [thumb]
      end

      dirs.unique!

      task "clobber_#{name}" do
        dirs.each do |dir|
          rm_r dir if File.exists?(dir)
        end
      end
    end

    def escape(str)
      StringUtils.shell_escape(str)
    end

  end
end
