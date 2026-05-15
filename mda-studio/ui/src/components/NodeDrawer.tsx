import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LAYER_LABELS,
  STATUS_LABELS,
  formatCents,
  type SpecNodeDetail,
} from "@mda-studio/shared";
import { IssueMiniList } from "./IssueMiniList";
import { LayerGlyph } from "./LayerGlyph";
import { StatusGlyph } from "./StatusGlyph";
import { TraceBreadcrumb } from "./TraceBreadcrumb";

interface NodeDrawerProps {
  detail: SpecNodeDetail;
  onClose: () => void;
  onSelect: (specId: string) => void;
  /** Called after a successful PATCH so the parent can refetch. */
  onIssueChanged?: (issueId: string) => void;
  /** Deep-link from the Costs tab into the chrome Costs detail page. */
  onOpenCostsScope?: (specId: string) => void;
}

const TABS = [
  "Spec",
  "Issues",
  "Comments",
  "Work products",
  "Costs",
  "Trace",
] as const;
type Tab = (typeof TABS)[number];

export function NodeDrawer({
  detail,
  onClose,
  onSelect,
  onIssueChanged,
  onOpenCostsScope,
}: NodeDrawerProps): JSX.Element {
  const [tab, setTab] = useState<Tab>("Spec");
  const { node, spec, issues, recentComments, workProducts, costsMtd, trace } =
    detail;

  const trail = trace.upward.map((r) => ({
    specId: r.specId,
    layer: r.layer,
    title: r.title,
    // Padding fields the breadcrumb component does not read.
    status: "draft" as const,
    canonicalParentSpecId: null,
    secondaryParentSpecIds: [],
    outgoingRefSpecIds: [],
    activeIssueId: null,
    activeIssueStatus: null,
    assigneeAgentId: null,
    assigneeAgentHandle: null,
    runStatus: null,
    costMtdCents: 0,
    costMtdSubtreeCents: 0,
    warningCount: 0,
  }));

  return (
    <aside
      className="drawer"
      role="dialog"
      aria-modal="false"
      aria-label={`${node.specId} detail`}
    >
      <header className="drawer__head">
        <button
          className="drawer__close"
          type="button"
          onClick={onClose}
          aria-label="Close detail drawer"
        >
          ×
        </button>
        <div className="muted">
          <LayerGlyph layer={node.layer} />{" "}
          {LAYER_LABELS[node.layer]} · {STATUS_LABELS[node.status]}{" "}
          <StatusGlyph status={node.status} />
        </div>
        <h2>
          {node.specId} — {node.title}
        </h2>
        <TraceBreadcrumb trail={trail} current={node} onSelect={onSelect} />
      </header>
      <div className="drawer__tabs" role="tablist" aria-label="Detail tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="drawer__tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="drawer__body" role="tabpanel" aria-label={tab}>
        {tab === "Spec" && (
          <>
            <p className="drawer__sentence muted">
              Source: <code>{spec.path}</code>
            </p>
            <div className="drawer__markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.body}</ReactMarkdown>
            </div>
          </>
        )}
        {tab === "Issues" && (
          <IssueMiniList issues={issues} onStatusChanged={onIssueChanged} />
        )}
        {tab === "Comments" && (
          <CommentsTab comments={recentComments} />
        )}
        {tab === "Work products" && (
          <WorkProductsTab items={workProducts} />
        )}
        {tab === "Costs" && (
          <CostsTab
            costs={costsMtd}
            specId={node.specId}
            onOpenCostsScope={onOpenCostsScope}
          />
        )}
        {tab === "Trace" && (
          <TraceTab detail={detail} />
        )}
      </div>
    </aside>
  );
}

function CommentsTab({
  comments,
}: {
  comments: SpecNodeDetail["recentComments"];
}): JSX.Element {
  if (comments.length === 0) {
    return <p className="drawer__sentence">No recent comments.</p>;
  }
  return (
    <ul className="issue-list">
      {comments.map((c) => (
        <li key={c.id} className="issue-list__row">
          <div className="issue-list__meta">
            <code className="issue-list__id">{c.issueId}</code>
            <span className="assignee-chip">{c.authorHandle}</span>
            <span className="muted">{c.createdAt}</span>
          </div>
          <div className="issue-list__title">{c.body}</div>
        </li>
      ))}
    </ul>
  );
}

function WorkProductsTab({
  items,
}: {
  items: SpecNodeDetail["workProducts"];
}): JSX.Element {
  if (items.length === 0) {
    return <p className="drawer__sentence">No work products yet.</p>;
  }
  return (
    <ul className="issue-list">
      {items.map((wp) => (
        <li key={wp.id} className="issue-list__row">
          <div className="issue-list__meta">
            <code className="issue-list__id">{wp.kind}</code>
            <code className="issue-list__id">{wp.issueId}</code>
            <span className="muted">{wp.createdAt}</span>
          </div>
          <div className="issue-list__title">{wp.label}</div>
        </li>
      ))}
    </ul>
  );
}

function CostsTab({
  costs,
  specId,
  onOpenCostsScope,
}: {
  costs: SpecNodeDetail["costsMtd"];
  specId: string;
  onOpenCostsScope?: (specId: string) => void;
}): JSX.Element {
  return (
    <>
      <ul className="drawer__sentence">
        <li>Own MTD: {formatCents(costs.own)}</li>
        <li>Subtree MTD: {formatCents(costs.subtree)}</li>
        {costs.byBillingCode.length > 0 && (
          <li>
            By billing code:
            <ul>
              {costs.byBillingCode.map((b) => (
                <li key={b.billingCode}>
                  {b.billingCode} — {formatCents(b.cents)}
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
      {onOpenCostsScope && (
        <p className="drawer__sentence">
          <button
            type="button"
            className="lens-chip"
            onClick={() => onOpenCostsScope(specId)}
            aria-label={`Open costs detail scoped to ${specId}`}
          >
            See full breakdown for {specId} →
          </button>
        </p>
      )}
    </>
  );
}

function TraceTab({ detail }: { detail: SpecNodeDetail }): JSX.Element {
  const { node, trace } = detail;
  return (
    <>
      <p className="drawer__sentence">Canonical path from the studio root:</p>
      <ol className="drawer__sentence">
        {trace.upward.map((r) => (
          <li key={r.specId}>
            {r.specId} — {r.title}
          </li>
        ))}
        <li>
          <strong>
            {node.specId} — {node.title}
          </strong>
        </li>
      </ol>
      {trace.secondaryParents.length > 0 && (
        <>
          <p className="drawer__sentence">Also serves:</p>
          <ul className="drawer__sentence">
            {trace.secondaryParents.map((r) => (
              <li key={r.specId}>
                {r.specId} — {r.title}
              </li>
            ))}
          </ul>
        </>
      )}
      {trace.outgoingRefs.length > 0 && (
        <>
          <p className="drawer__sentence">Outgoing references:</p>
          <ul className="drawer__sentence">
            {trace.outgoingRefs.map((r) => (
              <li key={r.specId}>
                {r.specId} — {r.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
