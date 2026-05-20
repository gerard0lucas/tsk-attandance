import type { ReactNode } from "react";

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1">{children}</div>;
}

export const tableHeadCell = "px-3 py-3 align-middle font-medium text-mist";
export const tableCell = "px-3 py-3 align-middle text-cerulean";
export const tableCellMuted = "px-3 py-3 align-middle text-mist";
export const tableActionsCell = "px-3 py-3 align-middle text-right whitespace-nowrap";
