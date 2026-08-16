import type {
  ActionResult,
} from "@onyx/contracts";

export function unsupportedResult(
  code: string,
  message: string,
): ActionResult {
  return {
    status: "unsupported",
    code,
    message,
  };
}

export function failedResult(
  code: string,
  message: string,
  recoverable = true,
): ActionResult {
  return {
    status: "failed",
    code,
    message,
    recoverable,
  };
}

export function cancelledResult(
  message = "Action cancelled.",
): ActionResult {
  return {
    status: "cancelled",
    message,
  };
}