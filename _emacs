(let ((time (current-time)))
  (if nil
      (progn
        (push (expand-file-name "~/CodeBase/emacs-for-railscasts/") load-path)
        (load "init.el"))
    (push (expand-file-name "~/.emacs.d/lisp") load-path)
    (require 'iy-init))
  (setq time (time-since time))
  (message "Started in %s.%06s seconds"
           (+ (* (car time) 65536) (cadr time))
           (car (cdr (cdr (cdr time))))))
