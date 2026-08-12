'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type ToolInvocation = {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: 'call' | 'result';
};

function ToolCall({ inv }: { inv: ToolInvocation }) {
  const [open, setOpen] = useState(false);
  const names: Record<string, string> = {
    figma_get_board: 'FigJam',
    ado_list_work_items: 'ADO — listar',
    ado_create_work_item: 'ADO — criar',
    ado_get_work_item: 'ADO — ver',
    ado_update_work_item: 'ADO — atualizar',
    ado_add_comment: 'ADO — comentar',
    ado_search_work_items: 'ADO — buscar',
  };
  const label = names[inv.toolName] ?? inv.toolName;
  const done = inv.state === 'result';

  return (
    <div className="my-1.5 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 transition-colors"
      >
        <span className={clsx(
          'inline-block w-1.5 h-1.5 rounded-full flex-shrink-0',
          done ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
        )} />
        <span className="font-medium text-gray-600">{label}</span>
        {!done && <span className="text-gray-400 ml-auto">executando…</span>}
        {done && <span className="text-gray-400 ml-auto">{open ? '▲' : '▼'}</span>}
      </button>
      {open && done && (
        <pre className="px-3 py-2 border-t border-gray-200 text-gray-500 overflow-auto max-h-48 text-[11px] leading-relaxed">
          {JSON.stringify(inv.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Message({ message }: { message: any }) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5',
        isUser ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-900 text-white'
      )}>
        {isUser ? 'V' : 'A'}
      </div>

      {/* Bubble */}
      <div className={clsx('max-w-[75%] space-y-1', isUser && 'items-end flex flex-col')}>
        {/* Tool calls */}
        {message.toolInvocations?.map((inv: ToolInvocation, i: number) => (
          <ToolCall key={i} inv={inv} />
        ))}

        {/* Text */}
        {message.content && (
          <div className={clsx(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          )}>
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Quais são as prioridades do Q3?',
  'O que está no parking lot?',
  'Lista os itens ativos no ADO',
  'Abre o FigJam de documentação',
];

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <span className="text-white font-bold text-sm">U</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-gray-900 leading-tight">UserX Agent</h1>
          <p className="text-xs text-gray-400 leading-tight">Agente de produto</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400">online</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {empty ? (
            <div className="text-center pt-16 pb-8">
              <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">U</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">UserX Agent</h2>
              <p className="text-sm text-gray-500 mb-8">
                Contexto de produto, parking lot, FigJam e Azure DevOps — tudo em um lugar.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      handleInputChange({ target: { value: s } } as any);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    className="text-left px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-xs text-gray-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(m => <Message key={m.id} message={m} />)
          )}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-semibold">A</span>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <span className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 text-center">
              Erro ao conectar. Verifique a configuração.
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKey}
              placeholder="Pergunte sobre o produto, backlog, FigJam…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 max-h-32 overflow-y-auto"
              style={{ height: 'auto', minHeight: '42px' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 128) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
}
