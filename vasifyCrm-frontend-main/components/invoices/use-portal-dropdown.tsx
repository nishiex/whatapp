'use client';

import { useState, useRef, useLayoutEffect, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';


interface Position {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
}

export function usePortalDropdown<T extends HTMLElement = HTMLButtonElement>() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, width: 0, openUpward: false });

  const calculatePosition = useCallback((estimatedMenuHeight = 240) => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Flip upward if not enough room below but enough room above.
    const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    setPosition({
      top: openUpward ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      openUpward,
    });

    // Clamp horizontally so menu never renders off-screen on narrow viewports.
    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;
      const menuRect = menu.getBoundingClientRect();
      let left = rect.left;

      if (left + menuRect.width > viewportWidth - 8) {
        left = Math.max(8, rect.right - menuRect.width);
      }
      if (left < 8) left = 8;

      setPosition((p) => ({ ...p, left }));
    });
  }, []);

  const toggle = useCallback(
    (estimatedMenuHeight?: number) => {
      setOpen((wasOpen) => {
        const next = !wasOpen;
        if (next) calculatePosition(estimatedMenuHeight);
        return next;
      });
    },
    [calculatePosition]
  );

  const close = useCallback(() => setOpen(false), []);

  // Reposition on scroll (any ancestor, e.g. the table's overflow-x-auto wrapper)
  // and on resize, while open.
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => calculatePosition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, calculatePosition]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return { open, toggle, close, triggerRef, menuRef, position };
}

// ─────────────────────────────────────────────────────────────────────────────
// PortalMenu — wraps children in a fixed-position, body-portaled container
// plus a full-viewport invisible backdrop (click-outside-to-close).
// ─────────────────────────────────────────────────────────────────────────────

export function PortalMenu({
  open,
  position,
  menuRef,
  onClose,
  className = '',
  children,
}: {
  open: boolean;
  position: Position;
  menuRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop: closes menu on outside click/tap, sits above all page content */}
      <div
        className="fixed inset-0 z-[1000]"
        onClick={onClose}
        onTouchStart={onClose}
      />
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: position.openUpward ? undefined : position.top + 4,
          bottom: position.openUpward ? window.innerHeight - position.top + 4 : undefined,
          left: position.left,
          minWidth: position.width,
        }}
        className={`z-[1001] bg-white border border-gray-200 rounded-xl shadow-xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}