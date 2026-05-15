import PromptForm from '@/components/PromptForm';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Describe the interface you want to build and we&apos;ll generate it for you.
          </p>
        </div>

        <PromptForm />
      </div>
    </div>
  );
}
