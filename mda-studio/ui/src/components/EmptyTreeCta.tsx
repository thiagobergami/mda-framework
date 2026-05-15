/**
 * Inline CTA shown when a game has only a concept doc — no AES/DYN/MEC/AST/TUNE/LEVEL
 * spec has been authored yet (plan §3 decision D9).
 *
 * Authoring still happens on the CLI / through an agent. The UI shows the
 * exact command the operator should run rather than offering an in-UI
 * authoring form (NG-4).
 */

interface EmptyTreeCtaProps {
  conceptTitle: string;
}

export function EmptyTreeCta({ conceptTitle }: EmptyTreeCtaProps): JSX.Element {
  return (
    <div className="empty-tree" role="status" aria-label="No specs yet">
      <h2 className="empty-tree__title">No specs yet for {conceptTitle}.</h2>
      <p className="empty-tree__lede">
        The concept document is in place. Author your first aesthetic to seed
        the M → D → A causal chain.
      </p>
      <pre className="empty-tree__cmd">
        <code>npx mda new aes &lt;your-aesthetic&gt;</code>
      </pre>
      <p className="empty-tree__hint muted">
        Or run <code>npm run spec</code> for the guided wizard. The tree
        updates automatically once the validator picks up the new file.
      </p>
    </div>
  );
}
