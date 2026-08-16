export type ActionStatus =
  | "success"
  | "unsupported"
  | "rejected"
  | "cancelled"
  | "failed";

export interface SuccessfulActionResult {
  status: "success";
  message: string;
  data?: unknown;
}

export interface UnsupportedActionResult {
  status: "unsupported";
  code: string;
  message: string;
}

export interface RejectedActionResult {
  status: "rejected";
  code: string;
  message: string;
  issues?: unknown;
}

export interface CancelledActionResult {
  status: "cancelled";
  message: string;
}

export interface FailedActionResult {
  status: "failed";
  code: string;
  message: string;
  recoverable: boolean;
}

export type ActionResult =
  | SuccessfulActionResult
  | UnsupportedActionResult
  | RejectedActionResult
  | CancelledActionResult
  | FailedActionResult;