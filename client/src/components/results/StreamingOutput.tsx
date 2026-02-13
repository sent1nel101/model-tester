import type { StreamStatus } from '../../hooks/useStream';

interface Props {
  text: string;
  status: StreamStatus;
  error: string | null;
  usedFallback?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
}

export function StreamingOutput({ text, status, error, usedFallback, onRetry, onCancel }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-400">Output</label>
        <div className="flex items-center gap-3">
          {status === 'streaming' && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Cancel
            </button>
          )}
          {status === 'streaming' && (
            <span className="flex items-center gap-2 text-xs text-indigo-400">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              Streaming...
            </span>
          )}
          {status === 'done' && text && !usedFallback && (
            <span className="text-xs text-green-400">Complete</span>
          )}
          {status === 'done' && text && usedFallback && (
            <span className="text-xs text-yellow-400">Complete (non-streaming fallback)</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">Error</span>
          )}
        </div>
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
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start justify-between gap-3">
          <div className="text-sm text-red-400 min-w-0">
            <p className="font-medium">Request failed</p>
            <p className="text-red-400/80 text-xs mt-1 wrap-break-word">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 px-3 py-1.5 bg-red-900/30 text-red-300 border border-red-800 rounded-md text-xs hover:bg-red-900/50 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
