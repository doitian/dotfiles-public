require 'rake'
require 'rake/tasklib'

module Rake
  class FilesCopyTask < TaskLib
    attr_accessor :name
    attr_accessor :files
    attr_accessor :dest_dir

    def initialize(dest_dir='static', name=nil)
      @name = name || dest_dir
      @dest_dir = dest_dir
      @files = Rake::FileList.new
      yield self if block_given?
      define
    end

    def define
      desc "Copy files to destination directory"
      task name

      files.each do |f|
        dest_file = File.join(dest_dir, f)
        sub_dest_dir = File.dirname(dest_file)

        file dest_file => [f] do
          mkdir_p sub_dest_dir unless File.exists?(sub_dest_dir)
          cp f, dest_file
        end
        task name => [dest_file]
      end
    end

  end
end
