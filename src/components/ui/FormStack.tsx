import type { ReactNode } from "react";

/** Consistent vertical spacing for modal and page forms */
export function FormStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

/** Extra space above primary submit button in forms */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="pt-2">{children}</div>;
}
