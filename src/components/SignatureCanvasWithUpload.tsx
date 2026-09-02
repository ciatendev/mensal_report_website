"use client";

import { useRef, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import clsx from "clsx";

type Tab = "draw" | "upload";

interface Props {
  /** chamado sempre que a assinatura final . Null = assinatura removida. */
  onChange: (base64: string | null, source: "DRAWN" | "UPLOADED" | null) => void;
}

export default function SignatureCanvasWithUpload({ onChange }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("draw");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const handleClear = useCallback(() => {
    sigCanvasRef.current?.clear();
    setPreview(null);
    onChange(null, null);
  }, [onChange]);

  const handleEndDrawing = useCallback(() => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setPreview(null);
      onChange(null, null);
      return;
    }
    const base64 = sigCanvasRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");
    setPreview(base64);
    setError(null);
    onChange(base64, "DRAWN");
  }, [onChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        setError("Formato inválido. Envie um arquivo .png ou .jpg.");
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setError("Arquivo muito grande. Limite de 3MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setError(null);
        onChange(base64, "UPLOADED");
      };
      reader.onerror = () => setError("Não foi possível ler o arquivo.");
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setPreview(null);
    setError(null);
    sigCanvasRef.current?.clear();
    onChange(null, null);
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => switchTab("draw")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-md transition",
            activeTab === "draw"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          ✍️ Desenhar
        </button>
        <button
          type="button"
          onClick={() => switchTab("upload")}
          className={clsx(
            "px-4 py-2 text-sm font-medium rounded-md transition",
            activeTab === "upload"
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          📁 Upload de Imagem
        </button>
      </div>

      {activeTab === "draw" && (
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-md">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                className: "w-full h-48 touch-none",
              }}
              onEnd={handleEndDrawing}
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Limpar assinatura
          </button>
        </div>
      )}

      {activeTab === "upload" && (
        <div>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-white hover:file:bg-primary-dark"
          />
          {preview && (
            <div className="mt-3">
              <img
                src={preview}
                alt="Preview da assinatura"
                className="max-h-32 border rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
