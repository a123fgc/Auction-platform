import { useState } from 'react';

export default function ImageGallery({ images = [] }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        No image
      </div>
    );
  }
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-xl bg-slate-100">
        <img
          src={images[active]}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`h-16 w-16 overflow-hidden rounded border-2 ${
                i === active ? 'border-brand-500' : 'border-transparent'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}