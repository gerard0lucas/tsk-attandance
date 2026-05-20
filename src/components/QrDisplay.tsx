import { QRCodeSVG } from "qrcode.react";
import { buildQrPayload } from "../lib/qr";
import { formatGender } from "../lib/student";
import type { Student } from "../types";
import { Button } from "./ui/Button";

interface QrDisplayProps {
  student: Student;
  templeName?: string;
  size?: number;
}

export function QrDisplay({ student, templeName, size }: QrDisplayProps) {
  const qrSize = size ?? Math.min(220, typeof window !== "undefined" ? window.innerWidth - 96 : 220);
  const value = buildQrPayload(student);

  const download = () => {
    const svg = document.getElementById(`qr-${student.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml" }));
    img.onload = () => {
      canvas.width = qrSize * 2;
      canvas.height = qrSize * 2;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `${student.rollNumber}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full justify-center">
        <div className="inline-flex rounded border border-morning bg-white p-3">
          <QRCodeSVG
            id={`qr-${student.id}`}
            value={value}
            size={qrSize}
            level="H"
            includeMargin
            className="h-auto max-w-full"
          />
        </div>
      </div>
      <div className="w-full space-y-0.5 text-center text-sm text-mist">
        <p className="font-medium text-cerulean">{student.name}</p>
        <p>Roll: {student.rollNumber}</p>
        <p>Class: {student.class}</p>
        <p>Gender: {formatGender(student.gender)}</p>
        {templeName && <p>Temple: {templeName}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={download} className="w-full max-w-xs">
        Download QR
      </Button>
    </div>
  );
}
