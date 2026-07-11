export function getDbErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
    const message =
      error instanceof Error
        ? error.message
        : "message" in error
          ? String((error as { message: unknown }).message)
          : "";
    if (/roll_number/i.test(message)) {
      return "This roll number is already in use.";
    }
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export function isMissingBranchIdColumn(message: string): boolean {
  return /branch_id/i.test(message);
}
