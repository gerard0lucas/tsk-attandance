import { Input } from "./ui/Input";
import { todayKey } from "../lib/dates";

type DateRangeFieldsProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  max?: string;
  className?: string;
};

/** Shared From / To date inputs for reports, dashboard, and attendance. */
export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  max = todayKey(),
  className = "",
}: DateRangeFieldsProps) {
  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <Input
        label="From"
        type="date"
        value={from}
        max={max}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <Input
        label="To"
        type="date"
        value={to}
        max={max}
        onChange={(e) => onToChange(e.target.value)}
      />
    </div>
  );
}
