#!/usr/bin/env ruby
# -*- coding: utf-8 -*-
$VERBOSE = true

require "optparse"
require "fileutils"
require "trash"

include FileUtils

TRASH_DIR = File.expand_path("~/.local/share/Trash")
trash = Trash.new(TRASH_DIR)

begin
  trash.mktrash
rescue => e
  puts "Error: #{e}"
end

usage = "Usage: #{$0} [OPTION]... FILE...\n"
usage += "Move the FILE(s). to trash"

options = {
  :force => false,
  :recursive => false,
  :interactive => false,
  :clean => false
}

opts = OptionParser.new do |opts|
  opts.banner = usage
  opts.separator ""
  opts.separator "options:"
  opts.on("-f", "--[no-]force", "Ignore nonexistent files") do |force|
    options[:force] = force
  end
  opts.on("-r", "--[no-]recursive", "Remove directory recursive") do |recursive|
    options[:recursive] = recursive
  end

  opts.on("-i", "prompt before every removal") do
    options[:interactive] = :always
  end
  help_I = "prompt once before removing more than three files, " +
    "or when removing recursively.  Less intrusive than -i, " +
    "while still giving protection against most mistakes"
  opts.on("-I", help_I) do
    options[:interactive] = :once
  end

  help_interactive = "prompt according to WHEN: never, once (-I), " +
    "or always (-i).  Without WHEN, prompt always"

  opts.on("--interactive [WHEN]", [:never, :once, :always],
          help_interactive) do |t|
    options[:interactive] = (t == :never ? false : (t || :always))
  end

  opts.on("--empty-trash", "Empty trash") do
    begin
      trash.empty
      exit 0
    rescue => e
      puts "#{$0}: cannot empty trash: #{e}"
      exit 1
    end
  end

  opts.on("--clean-before [DAYS]", "Clean files deleted specified days ago") do |days|
    begin
      trash.clean(days.to_i)
      exit 0
    rescue => e
      puts "#{$0}: cannot empty trash: #{e}"
      exit 1
    end
  end

  opts.on("-h", "--help", "Show this help") do
    puts opts
    exit 1
  end
end

begin
  opts.parse!
rescue => e
  $stderr.puts "#{$0}: invalid arguments. see `#{$0} --help'."
  exit 1
end

files = ARGV
if files.empty?
  puts opts
  exit 1
end

def rm_fail(file, message)
  $stderr.puts "#{$0}: cannot remove `#{file}': #{message}"
  exit 1
end

def rm_file_type(file)
  case
  when File.symlink?(file)
    "symbolic link"
  when File.directory?(file)
    "directory"
  else
    "file"
  end
end

def rm_get_answer(prompt)
  answer = ""
  while answer.empty?
    print prompt
    answer = String($stdin.gets)
  end

  "yY".include? answer.strip
end

if options[:interactive] == :once &&
    (options[:recursive] || files.length >= 3)
  exit 0 unless rm_get_answer("/bin/rm: remove all arguments? ")
end

files.each do |file|
  begin
    file = File.expand_path(file)

    if options[:interactive] == :always
      prompt = "#{$0}: remove #{rm_file_type(file)} `#{file}'? "
      break unless rm_get_answer(prompt)
    end

    if File.exists?(file) || File.symlink?(file)
      if file.index(TRASH_DIR) == 0
        if options[:recursive]
          FileUtils.rm_r file, :force => true
        else
          FileUtils.rm file, :force => true
        end
        trash.mktrash
      else
        if File.directory?(file) && ! File.symlink?(file)
          if ! options[:recursive]
            rm_fail(file, "Is a directory")
          elsif TRASH_DIR.index(file) == 0
            rm_fail(file, "File is a ancestor of Trash Bin")
          end
        end
        trash.rm file
      end
    elsif ! options[:force]
      rm_fail(file, "No such file or directory")
    end
  rescue => e
    p e.backtrace
    rm_fail(file, e)
  end
end
