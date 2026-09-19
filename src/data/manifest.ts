/**
 * Data provenance.
 *
 * Every figure drawn from the world, rather than produced by a model, carries a
 * manifest entry naming where it came from and what was done to it. A reader
 * who distrusts a number can find out exactly what it is.
 *
 * No dataset ships yet. The plumbing and its gate exist first, deliberately: a
 * number typed in by hand and labelled "US GDP" is worse than no chart, and
 * §5.7 of the spec exists because that mistake has already been made once here.
 */
export interface DatasetManifest {
  id: string;
  title: string;
  /** The publishing body, e.g. "U.S. Bureau of Economic Analysis". */
  source: string;
  /** The series identifier at that source, so the figures can be re-fetched. */
  seriesId: string;
  /** ISO date the snapshot was taken. */
  retrieved: string;
  units: string;
  /** Anything done to the raw series: deflating, re-basing, per-capita, none. */
  transformation: string;
  license: string;
  /** Declared, so a gap in the data is never mistaken for a fall in the data. */
  gaps?: string[];
}

export interface Dataset {
  manifest: DatasetManifest;
  observations: Array<{ period: string; value: number }>;
}

/** Every bundled dataset. Populated by `scripts/fetch-data.ts`, never by hand. */
export const datasets: Dataset[] = [];

export const datasetById = new Map(datasets.map((d) => [d.manifest.id, d]));

export function getDataset(id: string): Dataset {
  const found = datasetById.get(id);
  if (!found) throw new Error(`No dataset "${id}". Datasets must be fetched, not typed.`);
  return found;
}
