import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL("../../../netlify/database/migrations/001_credential_session_foundation.sql", import.meta.url);
const legacyMigrationPath = new URL("../migrations/001_credential_session_foundation.sql", import.meta.url);

describe("Netlify migration discovery", () => {
  it("has one canonical ordered migration with the required schema", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(existsSync(legacyMigrationPath)).toBe(false);
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS credential_records/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS credential_tombstones/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS oauth_pending_transactions/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS credential_audit_events/);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS server_sessions/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS credential_records_one_active/);
    expect(sql).not.toMatch(/access_token|refresh_token|event_subject|event_description|mail_content|drive_content|calendar_body/i);
  });
});