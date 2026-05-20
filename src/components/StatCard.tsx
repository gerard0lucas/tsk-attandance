import { Card } from "./ui/Card";

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="flex h-full flex-col justify-center">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-cerulean">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </Card>
  );
}
