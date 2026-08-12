import Link from 'next/link';

export function BackButton({
  href = '/',
  label = 'Back to Cheatsheet',
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-secondary transition-colors hover:text-primary"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
