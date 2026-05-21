import { QRCodeSVG } from "qrcode.react";
import { buildQrPayload } from "../lib/qr";
import { formatGender } from "../lib/student";
import type { Student } from "../types";
import { Button } from "./ui/Button";
import { StudentPhoto } from "./StudentPhoto";

const QR_SIZE_DEFAULT = 168;
const QR_SIZE_PAGE = 220;

interface QrDisplayProps {
  student: Student;
  branchName?: string;
  variant?: "default" | "page";
}

export function QrDisplay({ student, branchName, variant = "default" }: QrDisplayProps) {
  const isPage = variant === "page";
  const qrSize = isPage ? QR_SIZE_PAGE : QR_SIZE_DEFAULT;
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
    <div className={isPage ? "space-y-6" : "space-y-5"}>
      <div className="flex items-start gap-4 rounded-lg border border-morning bg-page/60 p-4">
        <StudentPhoto student={student} size={isPage ? "lg" : "md"} />
        <dl className="min-w-0 flex-1 text-sm">
          <dt className="sr-only">Name</dt>
          <dd className={`font-semibold text-cerulean ${isPage ? "text-lg" : "text-base"}`}>
            {student.name}
          </dd>
          <div className="mt-3 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1.5 text-mist">
            <dt>Roll</dt>
            <dd className="text-cerulean">{student.rollNumber}</dd>
            <dt>Class</dt>
            <dd className="text-cerulean">{student.class}</dd>
            <dt>Gender</dt>
            <dd className="text-cerulean">{formatGender(student.gender)}</dd>
            {branchName && (
              <>
                <dt>Branch</dt>
                <dd className="text-cerulean">{branchName}</dd>
              </>
            )}
          </div>
        </dl>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-mist">Attendance QR</p>
        <div className="rounded-lg border border-morning bg-white p-4 shadow-sm">
          <QRCodeSVG
            id={`qr-${student.id}`}
            value={value}
            size={qrSize}
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="max-w-sm text-center text-sm text-mist">
          Print or download for the student. Managers scan this at check-in.
        </p>
        <Button
          variant={isPage ? "primary" : "outline"}
          size={isPage ? "lg" : "md"}
          onClick={download}
          className="w-full max-w-md"
        >
          Download QR
        </Button>
      </div>
    </div>
  );
}
