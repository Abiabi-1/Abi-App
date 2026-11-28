// An isolated page: the old page's own stylesheet inside a shadow root, so it looks exactly as before and its styles
// cannot leak into the rest of the app (used by Day End Report and Won Deals).
import { createPortal } from 'preact/compat';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { theme, PALETTES } from './state';

export function Shadow({ css, children, onRoot }: { css: string; children: ComponentChildren; onRoot?: (r: ShadowRoot) => void }) {
  const ref = useRef<HTMLDivElement>(null); const [mount, setMount] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const host = ref.current!; const sr = host.shadowRoot || host.attachShadow({ mode: 'open' }); onRoot?.(sr); import('../features/smart').then(m => m.smartRoot(sr));
    if (!sr.querySelector('style')) { const st = document.createElement('style'); st.textContent = css; sr.appendChild(st); }
    let m = sr.querySelector('.de-body') as HTMLElement | null; if (!m) { m = document.createElement('div'); m.className = 'de-body'; sr.appendChild(m); }
    setMount(m);
  }, []);
  const th = theme.value, p = PALETTES.find(x => x.id === th.pal) || PALETTES[0];
  const cs = getComputedStyle(document.documentElement), vars: Record<string, string> = {};
  for (let i = 0; i < 5; i++) { const v = cs.getPropertyValue('--t' + i).trim(); const m = v.match(/\d+/g); if (m) { vars['--t' + i] = v; vars['--t' + i + '-rgb'] = m.slice(0, 3).join(','); } }
  if (vars['--t1-rgb']) { vars['--accent-rgb'] = vars['--t1-rgb']; vars['--on-t'] = p.on || '#fff'; }
  return <div ref={ref} class="de-host" data-theme={th.mode} data-calm={th.calm ? '' : undefined} style={vars}>{mount && createPortal(children, mount)}</div>;
}
export function svgHtml(s: string) { return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: s || '' }} />; }
