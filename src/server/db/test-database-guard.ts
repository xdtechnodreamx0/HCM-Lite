import { isTestDatabaseName } from "@/lib/env";
import { AppError } from "@/lib/errors";

export function assertTestDatabase(dbName: string) {
  if (!isTestDatabaseName(dbName)) {
    throw new AppError(
      500,
      "Refusing to run a destructive test against a non-test database name.",
    );
  }
}
