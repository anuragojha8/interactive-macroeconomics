import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CHAPTERS } from '../../book';
import { markVisited, storageAvailable } from '../../state/progress';
import { SymbolSheet } from './SymbolSheet';
import './book.css';

/**
 * The hash already carries the route, so a fragment link cannot also carry an
 * anchor. Scrolling directly is both simpler and the only thing that works.
 */
function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

export function BookShell({
  chapterId,
  children,
  wide = false,
}: {
  chapterId: string;
  children: React.ReactNode;
  /** For a chapter with several models and therefore no single sticky stage. */
  wide?: boolean;
}): JSX.Element {
  useEffect(() => {
    markVisited(chapterId);
    window.scrollTo(0, 0);
  }, [chapterId]);

  const current = CHAPTERS.find((c) => c.id === chapterId);
  const index = CHAPTERS.findIndex((c) => c.id === chapterId);
  const previous = index > 0 ? CHAPTERS[index - 1] : undefined;
  const next = index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : undefined;

  return (
    <div className="book">
      <header className="topbar">
        <div className="topbar__brand">
          <Link to="/" className="mono topbar__title">
            Interactive Macroeconomics
          </Link>
          <span className="mono topbar__tag">one economy, five primitives</span>
        </div>
        <span className="mono topbar__note">
          {current ? `${current.readingMinutes} min · ${current.sources[0]}` : ''}
        </span>
      </header>

      <div className={wide ? 'shell shell--wide' : 'shell'}>
        <nav className="rail" aria-label="Contents">
          <section className="rail__block">
            <span className="eyebrow">Contents</span>
            <ul className="chapters">
              {CHAPTERS.map((c) => {
                const active = c.id === chapterId;
                return (
                  <li key={c.id} className={active ? 'chapters--active' : ''}>
                    <Link to={`/${c.id}`}>
                      <span className="mono chapters__num">{c.number}</span>
                      <span className="chapters__title">{c.title}</span>
                    </Link>
                    {active ? (
                      <ul className="sections">
                        {c.sections.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              className="mono sections__link"
                              onClick={() => scrollToSection(s.id)}
                            >
                              {s.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
                  <SymbolSheet chapterId={chapterId} />
          {!storageAvailable() ? (
            <p className="rail__notice">
              Storage is unavailable here, so progress lasts only for this visit.
            </p>
          ) : null}
        </nav>

        {current ? (
          <nav className="railmini" aria-label="In this chapter">
            <span className="eyebrow">In this chapter</span>
            <ul>
              {current.sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="mono sections__link"
                    onClick={() => scrollToSection(s.id)}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {children}
      </div>

      <footer className="chapternav">
        {previous ? (
          <Link to={`/${previous.id}`} className="chapternav__link">
            <span className="eyebrow">Previous</span>
            <span className="chapternav__title">
              {previous.number} · {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/${next.id}`} className="chapternav__link chapternav__link--next">
            <span className="eyebrow">Next</span>
            <span className="chapternav__title">
              {next.number} · {next.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </div>
  );
}
