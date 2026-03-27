export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly exposeDetails: boolean;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: unknown; exposeDetails?: boolean },
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
    this.exposeDetails = options?.exposeDetails ?? (status < 500);
  }
}
