import { Button } from '@astryxdesign/core/Button';

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-secondary">
        Theme check
      </p>
      <h1 className="mt-2 text-4xl tracking-[-0.025em] text-primary">
        Cream on warm gray
      </h1>
      <div className="mt-6">
        <Button label="Astryx button" variant="primary" />
      </div>
    </main>
  );
}
