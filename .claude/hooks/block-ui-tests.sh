#!/bin/bash
# Blocks only the Bash commands a UI/E2E test can't happen without:
# installing a browser-testing tool, running its CLI, or running a package script that does.
# Reading, grepping, git, docs etc. that merely mention these tools are allowed.
INPUT=$(cat)
MSG="Blocked: UI/E2E test is the user's task. Skip this process."

REASON=$(printf '%s' "$INPUT" | node -e '
const fs = require("fs");
const path = require("path");

const RUNNERS = new Set(["npx", "pnpx", "bunx", "pnpm", "yarn", "npm", "bun"]);
const READ_ONLY = new Set(["why", "ls", "list", "info", "view", "show", "outdated", "explain", "search", "remove", "rm", "uninstall", "un"]);
const BINS = new Set(["playwright", "cypress", "wdio"]);
const PKGS = /^(playwright(-core)?|@playwright\/test|cypress|puppeteer(-core)?|@puppeteer\/browsers|selenium-webdriver|webdriverio|@wdio\/cli|@vitest\/browser)(@.*)?$/;
const PREFIXES = new Set(["sudo", "env", "time", "exec", "command"]);

// Package scripts in the workspace, so `pnpm <script>` is blocked when the script runs a UI tool.
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const scripts = new Map();
const pkgFiles = [path.join(root, "package.json")];
try {
  for (const d of fs.readdirSync(path.join(root, "apps"))) pkgFiles.push(path.join(root, "apps", d, "package.json"));
} catch {}
for (const f of pkgFiles) {
  try {
    for (const [name, body] of Object.entries(JSON.parse(fs.readFileSync(f, "utf8")).scripts || {})) {
      scripts.set(name, [...(scripts.get(name) || []), body]);
    }
  } catch {}
}

function check(cmd, depth = 0) {
  for (const seg of cmd.split(/&&|\|\||\$\(|[;|&\n()`]/)) {
    const t = seg.trim().split(/\s+/).filter(Boolean).map(x => x.replace(/^["\x27]|["\x27]$/g, ""));
    while (t.length && (/^[A-Za-z_]\w*=/.test(t[0]) || PREFIXES.has(t[0]))) t.shift();
    if (!t.length) continue;

    const head = t[0].split("/").pop();
    const args = t.slice(1);
    const words = args.filter(x => !x.startsWith("-"));
    const browserFlag = args.some(x => x.startsWith("--browser"));

    if (BINS.has(head)) return `runs ${head}`;
    if (head === "vitest" && browserFlag) return "runs vitest in browser mode";
    if (!RUNNERS.has(head) && head !== "turbo") continue;
    if (words.slice(0, 2).some(w => READ_ONLY.has(w))) continue;

    const hit = words.find(w => BINS.has(w) || PKGS.test(w));
    if (hit) return `runs/installs ${hit}`;
    if (words.includes("vitest") && browserFlag) return "runs vitest in browser mode";

    if (depth < 3) {
      const names = [words[0], ...words.filter((w, i) => words[i - 1] === "run")];
      for (const name of names) {
        for (const body of scripts.get(name) || []) {
          const r = check(body, depth + 1);
          if (r) return `script "${name}" ${r}`;
        }
      }
    }
  }
  return "";
}

let s = "";
process.stdin.on("data", d => (s += d)).on("end", () => {
  process.stdout.write(check(JSON.parse(s).tool_input?.command || ""));
});
')
STATUS=$?

# node missing or crashed: coarse check on the raw JSON instead of letting everything through.
if [[ $STATUS -ne 0 ]]; then
  if printf '%s' "$INPUT" | grep -qiE '(npx|pnpx|bunx|pnpm|yarn|npm)[^"]{0,60}(playwright|cypress|puppeteer|selenium-webdriver|webdriverio|wdio)|vitest[^"]*--browser'; then
    echo "$MSG" >&2
    exit 2
  fi
  exit 0
fi

if [[ -n "$REASON" ]]; then
  echo "$MSG ($REASON)" >&2
  exit 2
fi

exit 0
