# To start the extension
Press F5 — this opens a new (blank) VS Code window with the extension active.
`.env` is picked up even there: the extension also looks for it next to its own
install path (`<repo>/apps/extension` → `<repo>`), so `TOKEN` and `USER_NAME`
apply without any extra step. Use File → Open Folder (or
Ctrl+K Ctrl+O) to open this repo's root in that window when you want the
*workspace-dependent* parts too — the file/editor watchers have nothing to
watch until a folder is open, and events are tagged with no workspace folder.
A participant who just opens this repo normally (clone + open folder, or a
Codespace) never sees a blank window in the first place.

# Zero-setup config via `.env` (recommended for participants)

There's a real (not example) [`.env`](../../.env) tracked at the **repo
root** — the extension reads it on activation and configures itself
automatically, no commands or settings needed:

```
USER_NAME=1
SERVER_URL=http://localhost:3001
TOKEN=paste-this-participant-api-key-here
```

This file is meant to be edited and committed per participant: generate their
API key with the server's `ADMIN/user_management.ipynb` notebook, fill in
`TOKEN`/`USER_NAME`/`SERVER_URL` here, commit, and whatever gets cloned/sent
to that participant already has it — opening the repo is the entire setup.

`SERVER_URL`/`TOKEN` loaded this way are scoped to that workspace, so opening
a different project without its own `.env` won't carry a stale participant's
config over. Missing keys just fall back to whatever's already set manually
(see below) — the `.env` doesn't have to specify all three.

# Manual setup (fallback, e.g. for local testing without a `.env`)

## To set the API key

Press Ctrl+Shift+P
Type "Aida: Set Server API Key" and select it
An input box appears — paste in the key (it'll be masked as you type, like a password field)
Press Enter — you should get a confirmation toast: "Aida: API key saved."

## To set the server address

Press Ctrl + , to open Settings.

Search "aida" — you'll see "Aida Instrumentation: Server Url" as a text field.
Type in your server's address, e.g. http://localhost:3001 (match the port in the server's `.env`).
Or via settings.json directly (Command Palette → "Preferences: Open User Settings (JSON)"):

```json
"aida.serverUrl": "http://localhost:3001"
```