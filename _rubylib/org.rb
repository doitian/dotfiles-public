class Org
  attr_accessor :file
  attr_accessor :contents

  def initialize(file)
    @file = file
    @options = {}
  end

  def contents
    parse_file
  end

  def option(name)
    parse_file
    @options[name]
  end

  def title
    result = option('TITLE')
    return result if result && ! result.empty?

    return 'Home' if @file == 'index.org'
    basename = File.basename(@file)
    if basename == 'index.org'
      return File.basename(File.dirname(File.expand_path(@file))).capitalize
    else
      return basename.chomp(File.extname(basename)).capitalize
    end
  end

  def [](name)
    option(name)
  end

  private
  def parse_file
    begin
      unless @contents
        @contents = ''
        @options = {}
        File.foreach(@file) do |line|
          match = /^#\+([-\w]*):\s*(.*)$/.match(line)
          if match
            @options[match[1]] = match[2]
          end
          @contents += line
        end
        opened_file.close
      end
    rescue
    end

    @contents
  end
end
