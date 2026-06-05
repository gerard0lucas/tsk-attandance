export function getDbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export function isMissingBranchIdColumn(message: string): boolean {
  return /branch_id/i.test(message);
}
