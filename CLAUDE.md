# Claude Code — Obsidian Logging Hook

After completing meaningful work in this repo, always write a session note to Obsidian.

## Command

```powershell
& "C:\Users\User\Documents\Obsidian Vault\Narzędzia AI\scripts\append_ai_log.ps1" `
  -Project "kalkulator-obligacji-2026" `
  -Agent "claude" `
  -Summary "<1-2 sentence summary>" `
  -ChangedFiles "<comma-separated files>" `
  -Tests "<tests run + result>" `
  -NextSteps "<optional next steps>" `
  -ApiKey "$env:OBSIDIAN_API_KEY"
```

Provide `OBSIDIAN_API_KEY` from environment (never hardcode token in repo files).

## Requirements

- Run before final user handoff.
- Keep entry concise and factual.
- If REST API is down, ensure fallback note is created in `Inbox/` (script handles this).
