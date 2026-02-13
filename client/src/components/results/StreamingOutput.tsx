import type { StreamStatus } from '../../hooks/useStream';

interface Props {
  text: string;
  status: StreamStatus;
  error: string | null;
}

export function StreamingOutput({ text, status, error }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-400">Output</label>
        {status === 'streaming' && (
          <span className="flex items-center gap-2 text-xs text-indigo-400">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Streaming...
          </span>
        )}
        {status === 'done' && text && (
          <span className="text-xs text-green-400">Complete</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-400">Error</span>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 min-h-[200px] max-h-[500px] overflow-y-auto">
        {text ? (
          <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">{text}</pre>
        ) : status === 'idle' ? (
          <p className="text-sm text-gray-500 italic">Run a test to see output here...</p>
        ) : status === 'streaming' ? (
          <span className="text-sm text-gray-500 animate-pulse">Waiting for response...</span>
        ) : null}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
