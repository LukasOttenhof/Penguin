#!/usr/bin/env bash
# Runs inside the Codespace on every start (postStartCommand). Points Claude Code
# (CLI and VS Code extension) at CLAUDE_API_KEY so participants never have to
# log in. The key is looked up on each request, so editing .env takes effect
# without rebuilding the container.
set -euo pipefail

WORKSPACE="$(pwd)"
HELPER="$HOME/.claude/aida-api-key.sh"
mkdir -p "$HOME/.claude"

# A Codespaces secret / container env var wins; otherwise read the repo's .env.
cat > "$HELPER" <<EOF
#!/usr/bin/env bash
if [ -n "\${CLAUDE_API_KEY:-}" ]; then
  printf '%s' "\$CLAUDE_API_KEY"
  exit 0
fi
sed -n 's/^[[:space:]]*CLAUDE_API_KEY[[:space:]]*=[[:space:]]*//p' "$WORKSPACE/.env" 2>/dev/null \
  | tail -n 1 | tr -d '\r' | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
EOF
chmod +x "$HELPER"

# Env var wins; otherwise the last matching line in .env (quotes stripped).
read_setting() {
  local name="$1"
  if [ -n "${!name:-}" ]; then
    printf '%s' "${!name}"
    return
  fi
  sed -n "s/^[[:space:]]*$name[[:space:]]*=[[:space:]]*//p" "$WORKSPACE/.env" 2>/dev/null \
    | tail -n 1 | tr -d '\r' | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

# Model (e.g. opus, sonnet, claude-opus-5-5) and thinking effort (low, medium,
# high, xhigh, max). Unlike the key, these are applied at container start.
export AIDA_CLAUDE_MODEL="$(read_setting CLAUDE_MODEL)"
export AIDA_CLAUDE_EFFORT="$(read_setting CLAUDE_EFFORT)"

# Merge into the container's Claude config rather than overwriting it.
node - "$HELPER" <<'EOF'
const fs = require("fs");
const path = require("path");
const os = require("os");

// Blank values are removed so Claude Code falls back to its own default.
function merge(file, patch) {
  let current = {};
  try { current = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  const next = { ...current, ...patch };
  for (const [key, value] of Object.entries(patch)) if (value === "") delete next[key];
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
}

merge(path.join(os.homedir(), ".claude", "settings.json"), {
  apiKeyHelper: process.argv[2],
  model: process.env.AIDA_CLAUDE_MODEL,
  effortLevel: process.env.AIDA_CLAUDE_EFFORT,
});
merge(path.join(os.homedir(), ".claude.json"), { hasCompletedOnboarding: true });
EOF

echo "setupClaude: model=${AIDA_CLAUDE_MODEL:-(default)} effort=${AIDA_CLAUDE_EFFORT:-(default)}"

if [ -z "$("$HELPER")" ]; then
  echo "setupClaude: CLAUDE_API_KEY is not set in the environment or .env; Claude Code will ask you to log in."
else
  echo "setupClaude: Claude Code configured to use CLAUDE_API_KEY."
fi
