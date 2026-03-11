import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

export function IconGuitar({ title = 'Guitar', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14.5 5.5c1.2-1.2 3.1-1.2 4.3 0 1.2 1.2 1.2 3.1 0 4.3l-2 2" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10.7 9.3l4 4" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9.4 10.6l-4.6 4.6c-1.3 1.3-1.3 3.4 0 4.7 1.3 1.3 3.4 1.3 4.7 0l4.6-4.6c1.3-1.3 1.3-3.4 0-4.7-1.3-1.3-3.4-1.3-4.7 0Z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M15.8 8.2l1.2 1.2" />
    </svg>
  );
}

export function IconTarget({ title = 'Target', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" strokeWidth="1.5" />
    </svg>
  );
}

export function IconBook({ title = 'Book', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8.5A3.5 3.5 0 0 0 5 24" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M5 4.5v16A3.5 3.5 0 0 1 8.5 17H19" />
    </svg>
  );
}

export function IconMusic({ title = 'Music', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14 3v12.2a3.5 3.5 0 1 1-1.5-2.9V6l8-2v10.2a3.5 3.5 0 1 1-1.5-2.9V3.7L14 3Z" />
    </svg>
  );
}

export function IconRhythm({ title = 'Rhythm', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 4v11a3 3 0 1 0 1.5-2.6V6h8V4H7Z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v9a3 3 0 1 1-1.5-2.6" />
    </svg>
  );
}

export function IconCheck({ title = 'Check', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconPencil({ title = 'Edit', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}

export function IconTrash({ title = 'Trash', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10 11v7" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14 11v7" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 14h10l1-14" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 7V4h6v3" />
    </svg>
  );
}

export function IconSpark({ title = 'Level', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 2l1.2 6.1L20 10l-6.8 1.9L12 18l-1.2-6.1L4 10l6.8-1.9L12 2Z" />
    </svg>
  );
}

export function IconFlame({ title = 'Flame', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 22c4.4 0 8-3.1 8-7.6 0-3.3-2.2-5.8-4.6-7.8.2 2.4-1 4-2.6 5.1-.2-2.3-1.5-4.5-3.8-6.7C6.5 7.3 4 10.2 4 14.4 4 18.9 7.6 22 12 22Z" />
    </svg>
  );
}

export function IconLink({ title = 'Link', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
    </svg>
  );
}

export function IconDocument({ title = 'Document', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-label={title} {...props}>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l3 3v15H7V3Z" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M14 3v4h4" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M9 11h6M9 15h6" />
    </svg>
  );
}

export function IconPlay({ title = 'Play', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-label={title} {...props}>
      <path d="M9 7.5v9l8-4.5-8-4.5Z" />
    </svg>
  );
}

export function IconPause({ title = 'Pause', ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-label={title} {...props}>
      <path d="M7.5 6.5h3v11h-3v-11Zm6 0h3v11h-3v-11Z" />
    </svg>
  );
}
