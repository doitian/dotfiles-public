;; Turn off mouse interface early in startup to avoid momentary display
(if (fboundp 'menu-bar-mode) (menu-bar-mode -1))
(if (fboundp 'tool-bar-mode) (tool-bar-mode -1))
(if (fboundp 'scroll-bar-mode) (scroll-bar-mode -1))
(setq inhibit-startup-message t)

(let ((time (current-time)))
  (push (expand-file-name "~/.emacs.d/lisp") load-path)
  (require 'iy-init)
  (setq time (time-since time))
  (message "Started in %s.%06s seconds"
           (+ (* (car time) 65536) (cadr time))
           (car (cdr (cdr time)))))
