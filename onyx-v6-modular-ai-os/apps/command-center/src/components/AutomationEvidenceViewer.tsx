import type { CSSProperties } from "react";
import type { UiJob } from "../automationDashboardContracts";
import { toEvidenceReview } from "../automationEvidenceModel";

const card: CSSProperties = {
  border: "1px solid rgba(148,197,218,.24)",
  background: "rgba(5,23,42,.78)",
  borderRadius: 14,
  padding: 15,
};

const badge = (ok: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  minWidth: 76,
  minHeight: 32,
  boxSizing: "border-box",
  padding: "6px 14px",
  border: ok
    ? "1px solid rgba(114,237,190,.28)"
    : "1px solid rgba(255,170,170,.28)",
  borderRadius: 999,
  background: ok
    ? "rgba(70,210,165,.16)"
    : "rgba(255,143,143,.16)",
  color: ok ? "#72edbe" : "#ffaaaa",
  fontWeight: 800,
  lineHeight: 1,
  textAlign: "center",
  whiteSpace: "nowrap",
});

function Items({
  items,
  empty = "None recorded",
}: {
  items: string[];
  empty?: string;
}) {
  return items.length ? (
    <ul style={{ margin: "8px 0", paddingLeft: 22 }}>
      {items.map((item) => (
        <li
          key={item}
          style={{
            marginBottom: 7,
            overflowWrap: "anywhere",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p style={{ color: "#9bc8d5" }}>{empty}</p>
  );
}

export function AutomationEvidenceViewer({
  job,
}: {
  job: UiJob;
}) {
  const evidence = toEvidenceReview(job);

  return (
    <div
      aria-label="Automation evidence review package"
      style={{
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <small style={{ color: "#65d9ef" }}>
            ENGINEERING EVIDENCE PACKAGE
          </small>

          <h3 style={{ margin: "4px 0" }}>
            Issue #{evidence.issueNumber} · {evidence.state}
          </h3>
        </div>

        <span
          style={badge(
            evidence.completeness.score === 100,
          )}
        >
          Completeness {evidence.completeness.score}%
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(270px,1fr))",
          gap: 12,
        }}
      >
        <article style={card}>
          <h4>Provenance</h4>

          <p style={{ overflowWrap: "anywhere" }}>
            Repository: {evidence.repository}
            <br />
            Plan: {evidence.planId}
            <br />
            Scope: {evidence.scopeHash}
            <br />
            Base: {evidence.baseCommit}
            <br />
            Branch: {evidence.branch}
            <br />
            Risk: {evidence.risk.toUpperCase()}
          </p>
        </article>

        <article style={card}>
          <h4>Governance</h4>

          <p>
            <span
              style={badge(
                evidence.governance.draftOnly,
              )}
            >
              DRAFT ONLY
            </span>
          </p>

          <p>
            Scope bound: YES
            <br />
            Merge allowed: NO
            <br />
            Production deployment allowed: NO
          </p>
        </article>

        <article style={card}>
          <h4>Changed files</h4>
          <Items items={evidence.changedFiles} />
        </article>

        <article style={card}>
          <h4>Repair history</h4>
          <p>Attempts: {evidence.repairs.count}</p>
          <Items items={evidence.repairs.summary} />
        </article>
      </div>

      <article style={card}>
        <h4>Validation results</h4>

        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {evidence.validation.map((validation) => (
            <div
              key={validation.key}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "120px minmax(180px,1fr)",
                gap: 10,
                borderTop:
                  "1px solid rgba(148,197,218,.16)",
                paddingTop: 8,
              }}
            >
              <span
                style={badge(
                  validation.status === "PASS",
                )}
              >
                {validation.status}
              </span>

              <div>
                <b>{validation.label}</b>

                <p
                  style={{
                    margin: "4px 0",
                    color: "#afd5df",
                  }}
                >
                  {validation.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(300px,1fr))",
          gap: 12,
        }}
      >
        <article style={card}>
          <h4>Known issues and limitations</h4>
          <Items items={evidence.knownIssues} />
        </article>

        <article style={card}>
          <h4>Rollback plan</h4>
          <Items items={evidence.rollback} />
        </article>
      </div>

      <article style={card}>
        <h4>Audit timeline</h4>

        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {evidence.audit.map((auditItem) => (
            <div
              key={`${auditItem.at}-${auditItem.label}`}
              style={{
                display: "grid",
                gridTemplateColumns: "170px 1fr",
                gap: 10,
              }}
            >
              <time style={{ color: "#82cada" }}>
                {auditItem.at}
              </time>

              <div>
                <b>{auditItem.label}</b>

                <div style={{ color: "#afd5df" }}>
                  {auditItem.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

      {evidence.completeness.missing.length > 0 && (
        <article
          style={{
            ...card,
            borderColor: "#d8a950",
          }}
        >
          <h4>Evidence gaps</h4>

          <Items
            items={evidence.completeness.missing}
          />
        </article>
      )}
    </div>
  );
}
