import { X } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type Props = {
  open: boolean;
  onClose: () => void;
  avatar?: string | null;
  name?: string | null;
  lang: "ru" | "en";
};

export function AvatarViewerDialog({ open, onClose, avatar, name, lang }: Props) {
  if (!open) return null;
  const ru = lang === "ru";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={ru ? "Просмотр аватара" : "Avatar viewer"}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={ru ? "Закрыть" : "Close"}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
      >
        <X size={20} />
      </button>

      {/* Tap-outside-to-close backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label={ru ? "Закрыть" : "Close"}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <div className="relative w-full h-full flex items-center justify-center p-6" style={{ touchAction: "none" }}>
        {avatar ? (
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={5}
            centerOnInit
            doubleClick={{ mode: "toggle", step: 2 }}
            wheel={{ step: 0.2 }}
            pinch={{ step: 5 }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <img
                src={avatar}
                alt=""
                className="w-full h-full object-contain select-none pointer-events-none"
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <div className="relative w-64 h-64 max-w-[80vw] max-h-[80vw] rounded-3xl bg-primary/20 flex items-center justify-center text-white text-8xl font-bold">
            {name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
    </div>
  );
}
