// Update the profile's merged upstream PR count and per-project chart.
// The workflow runs on the repository schedule and can also be started manually.
import { mkdirSync, writeFileSync } from "node:fs";

const USER = process.env.PROFILE_USER ?? "flcrom";
const TOKEN = process.env.GITHUB_TOKEN;
const NAMES: Record<string, string> = {
  "PostHog/posthog": "PostHog",
  "apache/superset": "Apache Superset",
  "superset-sh/superset": "superset.sh",
  "reflex-dev/reflex": "Reflex",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Item = { repository_url: string };
async function mergedPRs(): Promise<Item[]> {
  const items: Item[] = [];
  const query = `type:pr author:${USER} is:merged -user:${USER}`;
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": `${USER}-profile`,
        ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub search ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { total_count: number; incomplete_results: boolean; items: Item[] };
    if (body.incomplete_results) throw new Error("GitHub search returned incomplete results");
    items.push(...body.items);
    if (items.length >= body.total_count || body.items.length < 100) return items;
  }
  throw new Error("More than 1,000 merged PRs: split the search into date ranges");
}

const prs = await mergedPRs();
const counts = new Map<string, number>();
for (const pr of prs) {
  const repo = pr.repository_url.replace("https://api.github.com/repos/", "");
  counts.set(repo, (counts.get(repo) ?? 0) + 1);
}
const rows = [...counts].map(([repo, count]) => ({ name: NAMES[repo] ?? repo.split("/")[1], count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const icon = '<g transform="translate(64 50) scale(1.25)" fill="#fff"><path d="M15 13.25a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm-12.5 6a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0Zm0-14.5a3.25 3.25 0 1 1 6.5 0 3.25 3.25 0 0 1-6.5 0ZM5.75 6.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 5.75 6.5Zm0 14.5a1.75 1.75 0 1 0-.001-3.501A1.75 1.75 0 0 0 18.25 15Z"/><path d="M6.5 7.25c0 2.9 2.35 5.25 5.25 5.25h4.5V14h-4.5A6.75 6.75 0 0 1 5 7.25Z"/><path d="M5.75 16.75A.75.75 0 0 1 5 16V8a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-.75.75Z"/></g>';
const stats = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="210" viewBox="0 0 1200 210" role="img" aria-label="${prs.length} merged upstream pull requests">
  <rect width="1200" height="210" fill="#000"/>
  ${icon}
  <text x="64" y="150" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#fff">${prs.length}</text>
  <text x="64" y="185" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#aaa">merged upstream pull requests</text>
</svg>\n`;
const W = 1200, left = 64, top = 112, rowH = 52;
const H = top + rows.length * rowH + 44;
const max = Math.max(1, ...rows.map((r) => r.count));
const lines = rows.map((r, i) => {
  const y = top + i * rowH;
  const width = (r.count / max) * 720;
  return `<text x="${left}" y="${y + 19}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#fff">${esc(r.name)}</text>
  <rect x="314" y="${y}" width="${width}" height="24" fill="#fff"/>
  <text x="1136" y="${y + 19}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#fff">${r.count}</text>`;
}).join("\n  ");
const projects = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="merged upstream pull requests per project">
  <rect width="${W}" height="${H}" fill="#000"/>
  <text x="64" y="61" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#aaa">merged by project</text>
  ${lines}
</svg>\n`;
mkdirSync("assets", { recursive: true });
writeFileSync("assets/stats.svg", stats);
writeFileSync("assets/projects.svg", projects);
console.log(JSON.stringify({ merged: prs.length, rows }));
