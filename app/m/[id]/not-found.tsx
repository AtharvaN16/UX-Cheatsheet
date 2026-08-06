import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[68ch] px-6 py-16">
      <h1 className="text-2xl text-primary">No such method</h1>
      <Link href="/" className="mt-4 inline-block text-secondary underline underline-offset-4">
        Back to the index
      </Link>
    </main>
  );
}
