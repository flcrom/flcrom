// Builds assets/stats.svg and assets/projects.svg from the GitHub search API.
// Counts pull requests authored by USER in repositories USER does not own.
// Run: node scripts/stats.ts  (Node 22.18+ runs TypeScript directly)

import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.PROFILE_USER ?? "flcrom";
const TOKEN = process.env.GITHUB_TOKEN;

type PR = { repo: string; merged: boolean; open: boolean };

const NAMES: Record<string, string> = {
  "PostHog/posthog": "PostHog",
  "apache/superset": "Apache Superset",
  "superset-sh/superset": "superset.sh",
  "reflex-dev/reflex": "Reflex",
  "payloadcms/payload": "Payload",
  "appwrite/appwrite": "Appwrite",
  "directus/directus": "Directus",
  "Infisical/infisical": "Infisical",
  "openmeterio/openmeter": "OpenMeter",
  "medplum/medplum": "Medplum",
  "wasp-lang/wasp": "Wasp",
};

async function search(q: string): Promise<PR[]> {
  const out: PR[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": `${USER}-profile`,
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub search ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as {
      total_count: number;
      incomplete_results: boolean;
      items: { repository_url: string; state: string; pull_request?: { merged_at: string | null } }[];
    };
    if (body.incomplete_results) throw new Error("GitHub search returned incomplete results");
    for (const it of body.items) {
      out.push({
        repo: it.repository_url.replace("https://api.github.com/repos/", ""),
        merged: Boolean(it.pull_request?.merged_at),
        open: it.state === "open",
      });
    }
    if (out.length >= body.total_count || body.items.length < 100) break;
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SANS = "Helvetica, Arial, sans-serif";

const ICON = {
  merge: [
    "M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 21Zm12.5-6a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z",
    "M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z",
    "M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z",
  ],
  pr: [
    "M16 19.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-14.5 0a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM4.75 3a1.75 1.75 0 1 0 .001 3.501A1.75 1.75 0 0 0 4.75 3Zm0 14.5a1.75 1.75 0 1 0 .001 3.501A1.75 1.75 0 0 0 4.75 17.5Zm14.5 0a1.75 1.75 0 1 0 .001 3.501 1.75 1.75 0 0 0-.001-3.501Z",
    "M13.405 1.72a.75.75 0 0 1 0 1.06L12.185 4h4.065A3.75 3.75 0 0 1 20 7.75v8.75a.75.75 0 0 1-1.5 0V7.75a2.25 2.25 0 0 0-2.25-2.25h-4.064l1.22 1.22a.75.75 0 0 1-1.061 1.06l-2.5-2.5a.75.75 0 0 1 0-1.06l2.5-2.5a.75.75 0 0 1 1.06 0ZM4.75 7.25A.75.75 0 0 1 5.5 8v8A.75.75 0 0 1 4 16V8a.75.75 0 0 1 .75-.75Z",
  ],
  repo: [
    "M3 2.75A2.75 2.75 0 0 1 5.75 0h14.5a.75.75 0 0 1 .75.75v20.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1 0-1.5h5.25v-4H6A1.5 1.5 0 0 0 4.5 18v.75c0 .716.43 1.334 1.05 1.605a.75.75 0 0 1-.6 1.374A3.251 3.251 0 0 1 3 18.75ZM19.5 1.5H5.75c-.69 0-1.25.56-1.25 1.25v12.651A2.989 2.989 0 0 1 6 15h13.5Z",
    "M7 18.25a.25.25 0 0 1 .25-.25h5a.25.25 0 0 1 .25.25v5.01a.25.25 0 0 1-.397.201l-2.206-1.604a.25.25 0 0 0-.294 0L7.397 23.46a.25.25 0 0 1-.397-.2v-5.01Z",
  ],
};

const icon = (paths: string[], x: number, y: number, size: number, fill = "#fff") =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="${fill}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;

function statsSvg(merged: number, open: number, total: number, projects: number): string {
  const W = 1200, H = 210;
  const tiles: [string[], number, string][] = [
    [ICON.merge, merged, "merged"],
    [ICON.pr, open, "in review"],
    [ICON.pr, total, "pull requests"],
    [ICON.repo, projects, "projects"],
  ];
  const tw = W / tiles.length;
  const body = tiles
    .map(([paths, n, label], i) => {
      const x = i * tw + 64;
      const sep = i > 0 ? `<rect x="${i * tw}" y="48" width="1" height="${H - 96}" fill="#333"/>` : "";
      return `${sep}${icon(paths, x, 50, 30)}
  <text x="${x}" y="150" font-family="${SANS}" font-size="76" font-weight="800" letter-spacing="-2" fill="#fff">${n}</text>
  <text x="${x + 42}" y="72" font-family="${SANS}" font-size="20" fill="#9a9a9a">${esc(label)}</text>`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${merged} merged, ${open} in review, ${total} pull requests, ${projects} projects">
  <rect width="${W}" height="${H}" fill="#000"/>
  ${body}
</svg>
`;
}

type Row = { name: string; merged: number; open: number };

function projectsSvg(rows: Row[]): string {
  const W = 1200, top = 112, rowH = 52, left = 64, labelW = 250, right = 140;
  const H = top + rows.length * rowH + 44;
  const max = Math.max(1, ...rows.map((r) => r.merged + r.open));
  const barMax = W - left - labelW - right;
  const unit = barMax / max;
  const lines = rows
    .map((r, i) => {
      const y = top + i * rowH;
      const mw = r.merged * unit;
      const ow = r.open * unit;
      const bx = left + labelW;
      const merged = r.merged ? `<rect x="${bx}" y="${y}" width="${mw - 3}" height="24" fill="#fff"/>` : "";
      const open = r.open
        ? `<rect x="${bx + mw + 1}" y="${y + 1}" width="${ow - 5}" height="22" fill="none" stroke="#fff" stroke-width="2"/>`
        : "";
      const nums = `<text x="${W - left}" y="${y + 19}" text-anchor="end" font-family="${SANS}" font-size="22" font-weight="700" fill="#fff">${r.merged}<tspan fill="#666" font-weight="400"> / </tspan><tspan fill="#9a9a9a">${r.open}</tspan></text>`;
      return `<text x="${left}" y="${y + 19}" font-family="${SANS}" font-size="22" fill="#fff">${esc(r.name)}</text>
  ${merged}${open}
  ${nums}`;
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="merged and in-review pull requests per project">
  <rect width="${W}" height="${H}" fill="#000"/>
  <rect x="${left}" y="44" width="20" height="20" fill="#fff"/>
  <text x="${left + 32}" y="61" font-family="${SANS}" font-size="20" fill="#9a9a9a">merged</text>
  <rect x="${left + 150}" y="45" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"/>
  <text x="${left + 182}" y="61" font-family="${SANS}" font-size="20" fill="#9a9a9a">in review</text>
  ${lines}
</svg>
`;
}

const prs = await search(`type:pr author:${USER} -user:${USER}`);
const merged = prs.filter((p) => p.merged).length;
const open = prs.filter((p) => p.open).length;
const repos = new Set(prs.map((p) => p.repo));

const byRepo = new Map<string, Row>();
for (const p of prs) {
  if (!p.merged && !p.open) continue;
  const row = byRepo.get(p.repo) ?? { name: NAMES[p.repo] ?? p.repo.split("/")[1], merged: 0, open: 0 };
  if (p.merged) row.merged++;
  if (p.open) row.open++;
  byRepo.set(p.repo, row);
}
const rows = [...byRepo.values()].sort(
  (a, b) => b.merged - a.merged || b.open - a.open || a.name.localeCompare(b.name),
);

mkdirSync("assets", { recursive: true });
writeFileSync("assets/stats.svg", statsSvg(merged, open, prs.length, repos.size));
writeFileSync("assets/projects.svg", projectsSvg(rows));
console.log(JSON.stringify({ total: prs.length, merged, open, projects: repos.size, rows }));
