"use client";

interface Props {
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  onChange: (patch: Partial<Pick<Props, "fontSize" | "isBold" | "isItalic">>) => void;
}

export default function QuestionStyleControls({
  fontSize,
  isBold,
  isItalic,
  onChange,
}: Props) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold text-gray-700">Formatação no PDF</p>
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
        <label className="flex items-center gap-2">
          <span className="text-xs">Fonte</span>
          <input
            type="number"
            min={8}
            max={32}
            step={1}
            value={fontSize}
            onChange={(event) =>
              onChange({ fontSize: Math.min(32, Math.max(8, Number(event.target.value) || 11)) })
            }
            className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          />
          <span className="text-xs text-gray-500">pt</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isBold}
            onChange={(event) => onChange({ isBold: event.target.checked })}
          />
          <strong>Negrito</strong>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isItalic}
            onChange={(event) => onChange({ isItalic: event.target.checked })}
          />
          <em>Itálico</em>
        </label>
      </div>
    </div>
  );
}
