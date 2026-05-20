import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
}

export function Select({
  label,
  options,
  className = "",
  wrapperClassName = "",
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <label className={`flex w-full flex-col gap-2 text-left ${wrapperClassName}`}>
      {label && <span className="text-sm font-medium text-cerulean">{label}</span>}
      <select
        id={selectId}
        className={`block w-full min-h-[44px] rounded border border-mist/40 bg-white px-3 py-2 text-cerulean outline-none focus:border-cerulean focus:ring-1 focus:ring-cerulean/40 ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
