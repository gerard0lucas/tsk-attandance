import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toastError, toastSuccess } from "../lib/toast";
import { useStore } from "../store/useStore";
import { downloadStudentQrPng, downloadStudentsQrZip } from "../lib/qrExport";
import { filterStudents, sortStudentsByRollNumber } from "../lib/student";
import { validateQrDownload } from "../lib/validation";
import { useFormValidation } from "../hooks/useFormValidation";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import type { Student, UserRole } from "../types";

type DownloadMode = "individual" | "branch" | "class" | "all";

const MODE_OPTIONS: { value: DownloadMode; label: string; hint: string }[] = [
  { value: "individual", label: "Individual", hint: "One student" },
  { value: "branch", label: "Branch", hint: "All students in a branch" },
  { value: "class", label: "Class", hint: "All students in a class" },
  { value: "all", label: "All", hint: "Every active student in scope" },
];

export function DownloadQrPage({ role }: { role: UserRole }) {
  const session = useStore((s) => s.session);
  const students = useStore((s) => s.students);
  const branches = useStore((s) => s.branches);
  const getBranch = useStore((s) => s.getBranch);

  const isAdmin = role === "admin";
  const scopedBranchId =
    role === "manager" || role === "user" ? session?.branchId : undefined;

  const [mode, setMode] = useState<DownloadMode>("individual");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [branchFilter, setBranchFilter] = useState(
    () => scopedBranchId ?? branches[0]?.id ?? "all",
  );
  const [classFilter, setClassFilter] = useState("");
  const [downloading, setDownloading] = useState(false);
  const { errors, clearField, clearAll, validate } = useFormValidation<
    "student" | "branch" | "class"
  >();

  const scopedStudents = useMemo(() => {
    let list = students.filter((s) => s.active);
    if (scopedBranchId) {
      list = list.filter((s) => s.branchId === scopedBranchId);
    }
    return sortStudentsByRollNumber(list);
  }, [students, scopedBranchId]);

  const classOptions = useMemo(() => {
    const source =
      mode === "branch" && branchFilter !== "all"
        ? scopedStudents.filter((s) => s.branchId === branchFilter)
        : scopedStudents;
    return [...new Set(source.map((s) => s.class.trim()).filter(Boolean))].sort();
  }, [scopedStudents, mode, branchFilter]);

  const studentPickerList = useMemo(() => {
    let list = scopedStudents;
    if (isAdmin && branchFilter !== "all") {
      list = list.filter((s) => s.branchId === branchFilter);
    }
    return filterStudents(list, studentSearch);
  }, [scopedStudents, isAdmin, branchFilter, studentSearch]);

  const targetStudents = useMemo((): Student[] => {
    if (mode === "individual") {
      const student = scopedStudents.find((s) => s.id === selectedStudentId);
      return student ? [student] : [];
    }
    if (mode === "branch") {
      if (branchFilter === "all") return [];
      return scopedStudents.filter((s) => s.branchId === branchFilter);
    }
    if (mode === "class") {
      if (!classFilter) return [];
      let list = scopedStudents.filter((s) => s.class === classFilter);
      if (isAdmin && branchFilter !== "all") {
        list = list.filter((s) => s.branchId === branchFilter);
      }
      return list;
    }
    return scopedStudents;
  }, [
    mode,
    selectedStudentId,
    branchFilter,
    classFilter,
    scopedStudents,
    isAdmin,
  ]);

  const canDownload = targetStudents.length > 0 && !downloading;

  const downloadLabel =
    mode === "individual"
      ? "Download QR"
      : `Download ${targetStudents.length} QR${targetStudents.length === 1 ? "" : "s"} (ZIP)`;

  const handleDownload = async () => {
    if (
      !validate(() =>
        validateQrDownload(mode, {
          selectedStudentId,
          branchFilter,
          classFilter,
        }),
      )
    ) {
      return;
    }
    if (targetStudents.length === 0) return;

    setDownloading(true);
    try {
      const getBranchName = (id: string) => getBranch(id)?.name;

      if (mode === "individual" && targetStudents[0]) {
        await downloadStudentQrPng(targetStudents[0], getBranchName(targetStudents[0].branchId));
      } else {
        const branchPart =
          mode === "branch" && branchFilter !== "all"
            ? getBranch(branchFilter)?.name?.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
            : mode === "class" && classFilter
              ? `class-${classFilter.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
              : "all-students";
        await downloadStudentsQrZip(
          targetStudents,
          getBranchName,
          `student-qrs-${branchPart ?? "export"}`,
        );
      }

      toastSuccess(
        mode === "individual"
          ? `${targetStudents[0]?.name} QR saved.`
          : `${targetStudents.length} QR codes saved in ZIP.`,
        "Download started",
      );
    } catch {
      toastError("Could not create QR files. Try again.", "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (!isAdmin && !scopedBranchId) {
    return (
      <p className="text-sm text-mist">
        No branch assigned to your account. Ask admin to assign your branch.
      </p>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Download QR"
        subtitle="Save student attendance QR codes as PNG or ZIP"
      />

      <Card>
        <p className="mb-3 text-sm font-medium text-cerulean">Download by</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODE_OPTIONS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                clearAll();
              }}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                mode === value
                  ? "border-cerulean bg-cerulean text-white"
                  : "border-morning bg-white text-cerulean hover:bg-morning/30"
              }`}
            >
              <span className="block text-sm font-medium">{label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  mode === value ? "text-morning" : "text-mist"
                }`}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        {mode === "individual" && (
          <>
            {isAdmin && (
              <Select
                label="Branch (optional filter)"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setSelectedStudentId("");
                  clearField("branch");
                }}
                options={[
                  { value: "all", label: "All branches" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            )}
            <Input
              label="Search student"
              placeholder="Name, roll number, or phone"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <Select
              label="Student"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                clearField("student");
              }}
              error={errors.student}
              options={[
                { value: "", label: "Select a student" },
                ...studentPickerList.map((s) => ({
                  value: s.id,
                  label: `${s.name} · Roll ${s.rollNumber} · ${s.class}`,
                })),
              ]}
            />
          </>
        )}

        {mode === "branch" && (
          <Select
            label="Branch"
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              clearField("branch");
            }}
            error={errors.branch}
            options={
              isAdmin
                ? branches.map((b) => ({ value: b.id, label: b.name }))
                : [
                    {
                      value: scopedBranchId!,
                      label: getBranch(scopedBranchId!)?.name ?? "Your branch",
                    },
                  ]
            }
          />
        )}

        {mode === "class" && (
          <>
            {isAdmin && (
              <Select
                label="Branch (optional)"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setClassFilter("");
                }}
                options={[
                  { value: "all", label: "All branches" },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            )}
            <Select
              label="Class"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                clearField("class");
              }}
              error={errors.class}
              options={[
                { value: "", label: "Select a class" },
                ...classOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          </>
        )}

        {mode === "all" && (
          <p className="text-sm text-mist">
            {isAdmin
              ? `Downloads QR codes for all ${scopedStudents.length} active students across every branch.`
              : `Downloads QR codes for all ${scopedStudents.length} active students in your branch.`}
          </p>
        )}

        <div className="rounded-lg border border-morning bg-morning/20 px-4 py-3 text-sm text-cerulean">
          {targetStudents.length === 0 ? (
            <span className="text-mist">Select filters above to preview how many QR codes will download.</span>
          ) : (
            <span>
              <strong>{targetStudents.length}</strong> student
              {targetStudents.length === 1 ? "" : "s"} ready
              {mode !== "individual" ? " · ZIP file" : " · PNG file"}
            </span>
          )}
        </div>

        <Button
          className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
          disabled={!canDownload}
          onClick={() => void handleDownload()}
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? "Preparing…" : downloadLabel}
        </Button>
      </Card>
    </div>
  );
}
