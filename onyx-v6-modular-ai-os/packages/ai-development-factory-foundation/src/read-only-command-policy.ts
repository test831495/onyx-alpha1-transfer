import { cloneFreeze, isSafeRecord } from "./factory-constitution";
export const READ_ONLY_COMMAND_CLASSES = ["GIT_STATUS", "GIT_BRANCH_SHOW_CURRENT", "GIT_REV_PARSE", "GIT_MERGE_BASE", "GIT_LOG", "GIT_SHOW", "GIT_DIFF_READ_ONLY", "GIT_LS_TREE", "GIT_LS_FILES", "GIT_FOR_EACH_REF", "GIT_TAG_LIST", "GIT_REMOTE_LIST", "FILE_FIND", "TEXT_GREP", "TEXT_SED_DISPLAY", "TEXT_HEAD", "TEXT_TAIL", "TEXT_SORT", "TEXT_UNIQ", "TEXT_WC", "FILE_CAT_APPROVED", "PACKAGE_TYPECHECK_PLAN", "PACKAGE_TEST_PLAN", "GITHUB_READ_ONLY_QUERY"] as const;
export type ReadOnlyCommandClass = (typeof READ_ONLY_COMMAND_CLASSES)[number];
const FORBIDDEN = /[;&|<>`$(){}\n\r\u0000-\u001f\u007f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\u2000-\u200a\u202f\u205f\u3000]|[\u2215\u2044\u29f8\u29f9]|%(?:2f|5c|2e)/iu;
const OPTIONS: Readonly<Record<ReadOnlyCommandClass, readonly string[]>> = {
  GIT_STATUS: ["--short", "--porcelain"], GIT_BRANCH_SHOW_CURRENT: [], GIT_REV_PARSE: ["HEAD", "--show-toplevel"], GIT_MERGE_BASE: [], GIT_LOG: ["--oneline", "--format"], GIT_SHOW: ["--stat", "--oneline"], GIT_DIFF_READ_ONLY: ["--stat", "--name-only", "--check"], GIT_LS_TREE: ["--name-only"], GIT_LS_FILES: ["--cached", "--others"], GIT_FOR_EACH_REF: [], GIT_TAG_LIST: [], GIT_REMOTE_LIST: [], FILE_FIND: [], TEXT_GREP: ["-n", "-i", "-E"], TEXT_SED_DISPLAY: ["-n"], TEXT_HEAD: ["-n"], TEXT_TAIL: ["-n"], TEXT_SORT: [], TEXT_UNIQ: [], TEXT_WC: ["-l", "-c"], FILE_CAT_APPROVED: [], PACKAGE_TYPECHECK_PLAN: [], PACKAGE_TEST_PLAN: [], GITHUB_READ_ONLY_QUERY: []
};
const POSITIONALS: Readonly<Record<ReadOnlyCommandClass, readonly string[]>> = {
  GIT_STATUS: [], GIT_BRANCH_SHOW_CURRENT: [], GIT_REV_PARSE: ["HEAD"], GIT_MERGE_BASE: [], GIT_LOG: [], GIT_SHOW: [], GIT_DIFF_READ_ONLY: [], GIT_LS_TREE: [], GIT_LS_FILES: [], GIT_FOR_EACH_REF: [], GIT_TAG_LIST: [], GIT_REMOTE_LIST: [], FILE_FIND: [], TEXT_GREP: [], TEXT_SED_DISPLAY: [], TEXT_HEAD: [], TEXT_TAIL: [], TEXT_SORT: [], TEXT_UNIQ: [], TEXT_WC: [], FILE_CAT_APPROVED: [], PACKAGE_TYPECHECK_PLAN: [], PACKAGE_TEST_PLAN: [], GITHUB_READ_ONLY_QUERY: []
};
const safeToken = (token: unknown): token is string => typeof token === "string" && token.length > 0 && token.length <= 256 && !FORBIDDEN.test(token) && !/[\uFF01-\uFF5E]/u.test(token) && token.normalize("NFC") === token && !/[\uFF1A-\uFF65]/u.test(token);
const safePath = (path: unknown): path is string => safeToken(path) && !path.startsWith("/") && !path.startsWith("//") && !/^[A-Za-z]:/.test(path) && path.split("/").every((part) => part !== "" && part !== "." && part !== ".." && !/[ .]$/.test(part));
export type CommandPolicy = Readonly<{ commandClass: ReadOnlyCommandClass; args: readonly string[]; paths: readonly string[]; allowedOptions?: readonly string[]; forbiddenOptions?: readonly string[]; networkAllowed: false; mutationAllowed: false; executes: false }>;
export const freezeCommandPolicy = (policy: CommandPolicy): CommandPolicy => cloneFreeze(policy);
export const isValidCommandPolicy = (input: unknown): boolean => {
  if (!isSafeRecord(input)) return false;
  const value = input as Partial<CommandPolicy>;
  if (Object.keys(value).some((key) => !["commandClass", "args", "paths", "allowedOptions", "forbiddenOptions", "networkAllowed", "mutationAllowed", "executes"].includes(key)) || typeof value.commandClass !== "string" || !(READ_ONLY_COMMAND_CLASSES as readonly string[]).includes(value.commandClass)) return false;
  if (!Array.isArray(value.args) || value.args.length > 32 || !value.args.every(safeToken) || !Array.isArray(value.paths) || !value.paths.every(safePath) || new Set(value.paths).size !== value.paths.length) return false;
  const allowed = OPTIONS[value.commandClass as ReadOnlyCommandClass];
  if (value.allowedOptions !== undefined && (!Array.isArray(value.allowedOptions) || !value.allowedOptions.every((option) => safeToken(option) && allowed.includes(option)))) return false;
  if (value.forbiddenOptions !== undefined && (!Array.isArray(value.forbiddenOptions) || !value.forbiddenOptions.every(safeToken))) return false;
  const positionals = POSITIONALS[value.commandClass as ReadOnlyCommandClass];
  if (value.args.some((arg) => arg.startsWith("-") ? !allowed.includes(arg) : !positionals.includes(arg))) return false;
  return value.networkAllowed === false && value.mutationAllowed === false && value.executes === false;
};
