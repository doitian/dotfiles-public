#!/usr/bin/env ruby
require "cgi"
require "fileutils"
require "string-utils"

class Trash
  attr_writer :trash_dir

  def initialize(trash_dir)
    @trash_dir = trash_dir
  end

  def trash_dir
    File.expand_path(@trash_dir)
  end

  def files_dir
    File.join(trash_dir, "files")
  end

  def info_dir
    File.join(trash_dir, "info")
  end

  def lock_file
    File.join(trash_dir, "lock")
  end

  def mktrash
    FileUtils.touch lock_file
    synchronize do
      FileUtils.mkdir_p files_dir
      FileUtils.mkdir_p info_dir
    end
  end

  def empty
    synchronize do
      FileUtils.rm_rf files_dir
      FileUtils.rm_rf info_dir
      FileUtils.mkdir_p files_dir
      FileUtils.mkdir_p info_dir
    end
  end

  def clean(days)
    seconds_in_day = 24 * 60 * 60
    threshold_time = Time.now - days * seconds_in_day

    synchronize do
      Dir.new(info_dir).each do |name|
        unless [".", ".."].include?(name)
          file = File.join(info_dir, name)
          if File.mtime(file) < threshold_time
            FileUtils.rm_rf file
            FileUtils.rm_rf File.join(files_dir, name)
          end
        end
      end

      Dir.new(files_dir).each do |name|
        unless [".", ".."].include?(name)
          unless File.exist?(File.join(info_dir, name + ".trashinfo"))
            FileUtils.rm_rf File.join(files_dir, name)
          end
        end
      end
    end
  end

  def rm(file)
    synchronize do
      dest_name = get_dest_name(file)
      dest_info_name = File.join(info_dir, File.basename(dest_name)) + ".trashinfo"
      stat = get_stat(file)
      begin
        File.open(dest_info_name, 'w') do |info_file|
          info_file.write <<INFO
[Trash Info]
Path=#{stat["Path"]}
DeletionDate=#{stat["DeletionDate"]}
INFO
        end
      rescue
        File.delete(dest_info_name) rescue nil
        raise
      end
      system("/bin/mv #{StringUtils.shell_escape(file)} #{StringUtils.shell_escape(dest_name)}")
    end
  end

  private
  def get_stat(file)
    return {
      "Path" => CGI.escape(File.expand_path(file)),
      "DeletionDate" => Time.now.strftime("%Y-%m-%dT%H:%M:%S")
    }
  end

  def get_dest_name(file)
    basename = File.basename(file)
    stub = File.join(files_dir, basename)
    return stub unless File.symlink?(stub) || File.exists?(stub)
    revisions = Dir["#{stub}$*"].collect { |path| path[(stub.length + 1)..-1].to_i }
    next_available_id = (revisions.max || 0) + 1
    return "#{stub}$#{next_available_id}"
  end

  def synchronize
    File.open(lock_file, 'w+') do |file|
      if file.flock(File::LOCK_EX | File::LOCK_NB)
        begin
          yield
        rescue
          file.flock(File::LOCK_UN)
          raise
        end
        file.flock(File::LOCK_UN)
      else
        raise "Fail to get lock"
      end
    end
  end
end
