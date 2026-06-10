import { format } from "date-fns";
import { Building2, CalendarCheck, GraduationCap, Users } from "lucide-react";
import { useStore } from "../../store/useStore";
import { StatCard } from "../../components/StatCard";
import { BranchAttendanceSection } from "../../components/BranchAttendanceSection";
import { PageHeader } from "../../components/ui/PageHeader";
import { todayKey } from "../../lib/dates";

export function AdminOverview() {
  const branches = useStore((s) => s.branches);
  const students = useStore((s) => s.students);
  const attendance = useStore((s) => s.attendance);

  const today = todayKey();
  const todayLabel = format(new Date(), "MMM d, yyyy");
  const todayRecords = attendance.filter((a) => a.date === today);
  const maleCount = students.filter((s) => s.gender === "male").length;
  const femaleCount = students.filter((s) => s.gender === "female").length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Dashboard" subtitle="All branches" />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total no of Branch"
          value={branches.length}
          icon={Building2}
          featured
        />
        <StatCard label="Total No Of Students" value={students.length} icon={GraduationCap} />
        <StatCard
          label="Total of Male and Female"
          value={`${maleCount} | ${femaleCount}`}
          icon={Users}
        />
        <StatCard
          label="Present today"
          detail={todayLabel}
          value={todayRecords.length}
          icon={CalendarCheck}
        />
      </div>

      <BranchAttendanceSection />
    </div>
  );
}
