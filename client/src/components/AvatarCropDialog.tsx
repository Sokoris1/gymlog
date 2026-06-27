import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Lang = "ru" | "en";

type Props = {
  file: File | null;
  onCancel: () => void;
  onCrop: (dataUrl: string) => void;
  lang: Lang;
  busy?: boolean;
};

const OUT_SIZE = 512;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("image_load_failed"));
    im.src = src;
  });
}

async function getCroppedDataUrl(imageSrc: string, area: Area): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUT_SIZE;
  canvas.height = OUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unsupported");
  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, OUT_SIZE, OUT_SIZE,
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarCropDialog({ file, onCancel, onCrop, lang, busy }: Props) {
  const ru = lang === "ru";
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setLoadError(false);
    readFileAsDataUrl(file)
      .then(url => { if (!cancelled) setImageSrc(url); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedArea) return;
    setProcessing(true);
    try {
      const dataUrl = await getCroppedDataUrl(imageSrc, croppedArea);
      onCrop(dataUrl);
    } catch {
      setLoadError(true);
    } finally {
      setProcessing(false);
    }
  };

  const open = !!file;
  const working = processing || !!busy;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !working) onCancel(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{ru ? "Кадрирование" : "Crop avatar"}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full aspect-square bg-black">
          {imageSrc && !loadError && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              minZoom={1}
              maxZoom={4}
              zoomSpeed={0.5}
              objectFit="contain"
            />
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-4 text-center">
              {ru ? "Не удалось загрузить изображение" : "Failed to load image"}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-muted-foreground flex-shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.01}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
              disabled={!imageSrc || loadError}
              aria-label={ru ? "Зум" : "Zoom"}
            />
            <ZoomIn size={16} className="text-muted-foreground flex-shrink-0" />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={working}
            >
              {ru ? "Отмена" : "Cancel"}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={!imageSrc || !croppedArea || loadError || working}
            >
              {working
                ? (ru ? "Сохранение..." : "Saving...")
                : (ru ? "Сохранить" : "Save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
