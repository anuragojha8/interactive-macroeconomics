import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { BookShell } from './components/book/BookShell';
import { chapterById } from './book';
import { Chapter0 } from './content/Chapter0';
import { Chapter1 } from './content/Chapter1';
import { Chapter2 } from './content/Chapter2';
import { Chapter3 } from './content/Chapter3';
import { Contents } from './content/Contents';
import './app.css';

/** Chapters that run several models get the full width; no single stage fits. */
const WIDE = new Set(['ch0-kernel']);

const PAGES: Record<string, () => JSX.Element> = {
  'ch0-kernel': Chapter0,
  'ch1-measurement': Chapter1,
  'ch2-production': Chapter2,
  'ch3-solow': Chapter3,
};

function ChapterRoute(): JSX.Element {
  const { chapterId } = useParams();
  const Page = chapterId ? PAGES[chapterId] : undefined;
  if (!chapterId || !Page || !chapterById.has(chapterId)) return <Navigate to="/" replace />;
  return (
    <BookShell chapterId={chapterId} wide={WIDE.has(chapterId)}>
      <Page />
    </BookShell>
  );
}

export function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Contents />} />
        <Route path="/:chapterId" element={<ChapterRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
