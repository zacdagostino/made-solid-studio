# Codex Cloud setup for Made Solid Studio

Codex Cloud is the background coding workspace for this repository. It is accessed from ChatGPT,
uses ChatGPT subscription authentication, and continues after the browser or phone is closed. It is
not an API endpoint for the embedded Studio chat and it does not host the Studio application.

## Create the environment

In ChatGPT Codex settings, create an environment connected to the GitHub repository that contains
Made Solid Studio. Use this setup script:

```bash
npm ci
npm ci --prefix worker/builder-template
```

Do not add `OPENAI_API_KEY`, Supabase service-role keys, deployment tokens, or production handoff
secrets merely to let Codex edit and test the repository. Add a task-specific secret only when a
reviewed task genuinely needs that external system. Keep agent internet access off after setup
unless the task needs an approved external source.

Codex reads the repository `AGENTS.md`, so Cloud tasks inherit the same safety, package-version,
responsive, accessibility, and verification requirements as local work.

## Use it

- Start Studio code changes from this environment and ask Codex to run the relevant checks.
- Let the Cloud task continue in the background; return from ChatGPT on any device to review it.
- Review the diff and checks, then create or update the Studio pull request.
- Use the separate Made Solid website environment for website and Clientspace code. A Cloud task
  receives one repository checkout, so a coordinated two-repository change uses one task and pull
  request per repository.

## Billing and runtime boundary

- Codex Cloud and this repository's Codex Workspace Agent, Website Builder, and Test Builder use
  ChatGPT subscription authentication.
- `forced_login_method="chatgpt"` and startup checks make the repo-owned Codex runtimes fail closed
  instead of using an API key.
- OpenAI Analysis Workers remain a separate, API-metered feature and are disabled by default.
- An always-on Studio still needs a permanent web host plus a private, persistent worker host. That
  deployment is separate from Codex Cloud and must be selected and configured deliberately. See
  the [permanent runtime boundary](permanent-studio-runtime.md).

Official references: [Codex Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment)
and [Codex authentication](https://learn.chatgpt.com/docs/auth).
