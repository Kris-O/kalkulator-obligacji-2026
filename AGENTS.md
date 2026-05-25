# AI Session Logging Policy (Obsidian)

This repository requires automatic session notes in Obsidian for every substantial coding session.

## Required at handoff

Before final user handoff, append a short session entry to:

- `Dziennik/YYYY-MM-DD.md` in vault `C:\Users\User\Documents\Obsidian Vault`

Use this command (PowerShell):

```powershell
& "C:\Users\User\Documents\Obsidian Vault\Narzędzia AI\scripts\append_ai_log.ps1" `
  -Project "kalkulator-obligacji-2026" `
  -Agent "codex" `
  -Summary "<1-2 sentence summary>" `
  -ChangedFiles "<comma-separated files>" `
  -Tests "<tests run + result>" `
  -NextSteps "<optional next steps>" `
  -ApiKey "$env:OBSIDIAN_API_KEY"
```

`OBSIDIAN_API_KEY` must be provided via environment variable (do not hardcode secrets).

## Fallback rule

If Obsidian REST API is unavailable, the script must save a pending note to:

- `Inbox/pending-ai-log-*.md`

Do not skip logging; use fallback.
