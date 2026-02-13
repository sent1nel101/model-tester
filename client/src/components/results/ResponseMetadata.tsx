interface Props {
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number };
  status: string;
}

export function ResponseMetadata({ latencyMs, usage, status }: Props) {
  if (status === 'idle') return null;

  return (
    <div className="flex flex-wrap gap-4 text-xs">
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <span className="text-gray-500">Latency</span>
        <span className="ml-2 text-white font-mono">
          {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(2)}s` : '...'}
        </span>
      </div>
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <span className="text-gray-500">Input</span>
        <span className="ml-2 text-white font-mono">{usage.inputTokens || '...'} tokens</span>
      </div>
      <div className="bg-gray-800 rounded-lg px-3 py-2">
        <span className="text-gray-500">Output</span>
        <span className="ml-2 text-white font-mono">{usage.outputTokens || '...'} tokens</span>
      </div>
    </div>
  );
}
