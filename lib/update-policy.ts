export type Release = {
  repository: string;
  version: string;
  tag: string;
  sha: string;
  url: string;
  name: string;
  checkedAt: number;
};
export type UpdateRun = Release & {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  githubRunId?: string;
  createdAt: number;
  updatedAt: number;
  reason?: string;
};
export type UpdateState = {
  repository: string;
  automatic: boolean;
  candidate: Release | null;
  checkedAt: number | null;
  error: string | null;
  active: UpdateRun | null;
  history: UpdateRun[];
  runnerSeenAt: number | null;
};
export const emptyUpdateState = (): UpdateState => ({
  repository: '',
  automatic: false,
  candidate: null,
  checkedAt: null,
  error: null,
  active: null,
  history: [],
  runnerSeenAt: null,
});
export function repositoryName(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 240) return null;
  const name = value
    .trim()
    .replace(/^https:\/\/github\.com\//i, '')
    .replace(/\/$/, '')
    .replace(/\.git$/, '');
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(
    name,
  ) && !name.endsWith('/..')
    ? name.toLowerCase()
    : null;
}
export function releaseVersion(tag: unknown): string | null {
  if (
    typeof tag !== 'string' ||
    tag !== tag.trim() ||
    !/^v?(0|[1-9]\d{0,6})\.(0|[1-9]\d{0,6})\.(0|[1-9]\d{0,6})$/.test(tag)
  )
    return null;
  return tag.replace(/^v/, '');
}
export function compareVersions(a: string, b: string) {
  const av = releaseVersion(a),
    bv = releaseVersion(b);
  if (!av || !bv) throw new Error('Invalid release version');
  const left = av.split('.').map(Number),
    right = bv.split('.').map(Number);
  for (let i = 0; i < 3; i++)
    if (left[i] !== right[i]) return Math.sign(left[i] - right[i]);
  return 0;
}
export function automaticEligible(
  release: Release,
  installed: { version: string; repository: string; sha: string },
  history: UpdateRun[],
) {
  return (
    compareVersions(release.version, installed.version) > 0 &&
    release.version.split('.')[0] === installed.version.split('.')[0] &&
    !history.some(
      (run) =>
        run.repository === release.repository &&
        run.sha === release.sha &&
        run.status === 'failed',
    )
  );
}
export async function githubRelease(
  repository: string,
  token?: string,
  request: typeof fetch = fetch,
): Promise<Release | null> {
  const repo = repositoryName(repository);
  if (!repo) throw new Error('Некорректный GitHub-репозиторий');
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'Northstar-Engine-Updater',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const get = (path: string) =>
    request(`https://api.github.com/repos/${repo}/${path}`, {
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
  const response = await get('releases/latest');
  if (response.status === 404)
    throw new Error('Репозиторий недоступен или у него нет стабильных релизов');
  if (!response.ok)
    throw new Error(
      `GitHub недоступен или ограничил запросы (${response.status})`,
    );
  const release = (await response.json()) as {
    tag_name?: unknown;
    draft?: boolean;
    prerelease?: boolean;
    name?: unknown;
  };
  const version = releaseVersion(release.tag_name);
  if (release.draft || release.prerelease || !version)
    throw new Error('Нужен стабильный релиз с тегом vMAJOR.MINOR.PATCH');
  const tag = release.tag_name as string;
  const commit = await get(`commits/${encodeURIComponent(tag)}`);
  if (!commit.ok) throw new Error('Не удалось определить commit релиза');
  const data = (await commit.json()) as { sha?: unknown };
  if (
    typeof data.sha !== 'string' ||
    data.sha.length !== 40 ||
    !/^[a-f0-9]{40}$/.test(data.sha)
  )
    throw new Error('GitHub вернул некорректный commit');
  return {
    repository: repo,
    tag,
    version,
    sha: data.sha,
    url: `https://github.com/${repo}/releases/tag/${encodeURIComponent(tag)}`,
    name: typeof release.name === 'string' ? release.name.slice(0, 180) : tag,
    checkedAt: Date.now(),
  };
}
