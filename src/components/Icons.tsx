import type { LucideProps } from 'lucide-react';
import {
  BookOpen,
  Check,
  Drum,
  FileText,
  Flame,
  Guitar,
  Link2,
  Music,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Sprout,
  Target,
  Trash2,
} from 'lucide-react';

type IconProps = LucideProps & { title?: string };

export function IconGuitar({ title = 'Guitar', ...props }: IconProps) {
  return <Guitar aria-label={title} {...props} />;
}

export function IconTarget({ title = 'Target', ...props }: IconProps) {
  return <Target aria-label={title} {...props} />;
}

export function IconBook({ title = 'Book', ...props }: IconProps) {
  return <BookOpen aria-label={title} {...props} />;
}

export function IconMusic({ title = 'Music', ...props }: IconProps) {
  return <Music aria-label={title} {...props} />;
}

export function IconRhythm({ title = 'Rhythm', ...props }: IconProps) {
  return <Drum aria-label={title} {...props} />;
}

export function IconCheck({ title = 'Check', ...props }: IconProps) {
  return <Check aria-label={title} {...props} />;
}

export function IconPencil({ title = 'Edit', ...props }: IconProps) {
  return <Pencil aria-label={title} {...props} />;
}

export function IconTrash({ title = 'Trash', ...props }: IconProps) {
  return <Trash2 aria-label={title} {...props} />;
}

export function IconSpark({ title = 'Level', ...props }: IconProps) {
  return <Sprout aria-label={title} {...props} />;
}

export function IconFlame({ title = 'Flame', ...props }: IconProps) {
  return <Flame aria-label={title} {...props} />;
}

export function IconLink({ title = 'Link', ...props }: IconProps) {
  return <Link2 aria-label={title} {...props} />;
}

export function IconDocument({ title = 'Document', ...props }: IconProps) {
  return <FileText aria-label={title} {...props} />;
}

export function IconPlay({ title = 'Play', ...props }: IconProps) {
  return <Play aria-label={title} {...props} />;
}

export function IconPause({ title = 'Pause', ...props }: IconProps) {
  return <Pause aria-label={title} {...props} />;
}

export function IconRefresh({ title = 'Refresh', ...props }: IconProps) {
  return <RefreshCw aria-label={title} {...props} />;
}
