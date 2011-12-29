module StringUtils

  class << self
    def shell_escape(str)
      if str.empty?
        %q|''|
      elsif %r|\A[[:alnum:]+,./:=@_-]*\z| =~ str
        str.dup
      else
        str.gsub(/('+)|[^']+/) do
          if $1
            %q|\'| * $1.length
          else
            "'#{$&}'"
          end
        end
      end
    end

    def quote(str)
      str.inspect
    end

  end
end
