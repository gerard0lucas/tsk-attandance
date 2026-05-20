import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded border border-morning bg-white shadow-sm ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Horizontal card: content left, actions right on sm+ */
export function CardRow({
  children,
  actions,
  className = "",
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex w-full shrink-0 gap-2 sm:w-auto [&>button]:min-w-0 sm:[&>button]:min-w-[5rem]">
          {actions}
        </div>
      )}
    </Card>
  );
}
