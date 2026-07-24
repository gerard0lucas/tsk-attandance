export function getDbErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  if (code === "23505" && /roll_number/i.test(message)) {
    return "This roll number is already in use.";
  }
  if (
    code === "23503" ||
    /foreign key|violates foreign key/i.test(message)
  ) {
    return "Cannot remove this account while linked records block it. Prefer deactivating staff (profiles.active).";
  }
  if (message) return message;
  return "Something went wrong.";
}

export function isMissingBranchIdColumn(message: string): boolean {
  return /branch_id/i.test(message);
}
