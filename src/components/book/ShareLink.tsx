import { useState } from 'react';
import { encodeScenario } from '../../engine/scenario';
import type { VarId } from '../../engine/types';

/** A link to exactly what is on screen. No server involved; the state rides in the URL. */
export function ShareLink({
  chapterId,
  modelId,
  overrides,
}: {
  chapterId: string;
  modelId: string;
  overrides: Record<VarId, number>;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const encoded = encodeScenario({ modelId, params: overrides, shocks: [] });
  const url = `${window.location.origin}${window.location.pathname}#/${chapterId}?s=${encodeURIComponent(encoded)}`;

  return (
    <button
      type="button"
      className="share"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }}
    >
      {copied ? 'link copied' : 'copy a link to this'}
    </button>
  );
}
