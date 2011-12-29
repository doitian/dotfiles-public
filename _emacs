(let ((time (current-time)))
  (push (expand-file-name "~/.emacs.d/lisp") load-path)
  (require 'iy-init)
  (setq time (time-since time))
  (message "Started in %s.%06s seconds"
           (+ (* (car time) 65536) (cadr time))
           (caddr time)))
