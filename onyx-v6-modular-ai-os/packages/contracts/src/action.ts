export type ActionResult =
  | { status: "success"; message: string; data?: unknown }
  | { status: "unsupported"; code: string; message: string }
  | { status: "rejected"; code: string; message: string; issues?: unknown }
  | { status: "cancelled"; message: string }
  | { status: "failed"; code: string; message: string; recoverable: boolean };
