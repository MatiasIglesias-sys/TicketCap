"use client";

interface EscudoImgProps {
  src: string;
  alt: string;
  className?: string;
}

export default function EscudoImg({ src, alt, className = "w-10 h-10 object-contain" }: EscudoImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
