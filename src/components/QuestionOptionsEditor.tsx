"use client";

interface Props {
  options: string[];
  onChange: (options: string[]) => void;
}

export default function QuestionOptionsEditor({ options, onChange }: Props) {
  function update(index: number, value: string) {
    onChange(options.map((option, current) => (current === index ? value : option)));
  }

  function add() {
    onChange([...options, ""]);
  }

  function remove(index: number) {
    onChange(options.filter((_, current) => current !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-900">Opções permitidas</p>
          <p className="text-[11px] text-blue-700">
            O usuário escolherá uma única opção no dropdown.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
        >
          + Adicionar opção
        </button>
      </div>

      {options.length === 0 && (
        <p className="rounded border border-dashed border-blue-200 bg-white px-3 py-2 text-xs text-blue-700">
          Nenhuma opção adicionada.
        </p>
      )}

      {options.map((option, index) => (
        <div key={`option-${index}`} className="flex items-center gap-2">
          <span className="w-5 text-center text-xs text-blue-700">{index + 1}</span>
          <input
            value={option}
            onChange={(event) => update(index, event.target.value)}
            placeholder={`Opção ${index + 1}`}
            className="min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            className="rounded border border-blue-200 bg-white px-2 py-1 text-xs disabled:opacity-40"
            aria-label="Mover opção para cima"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => move(index, 1)}
            disabled={index === options.length - 1}
            className="rounded border border-blue-200 bg-white px-2 py-1 text-xs disabled:opacity-40"
            aria-label="Mover opção para baixo"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => remove(index)}
            className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            aria-label="Remover opção"
          >
            Remover
          </button>
        </div>
      ))}
    </div>
  );
}
