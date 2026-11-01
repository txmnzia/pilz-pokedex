---
name: release-checklist
description: Checklist before merging pilz-pokedex changes to main and confirming the deploy.
---
1. `npm run lint && npm test && npm run check-data && npm run build`
2. Bump `version` in package.json if anything user-visible changed; put it in the commit subject `(... v0.x.y)`.
3. README / CLAUDE.md updated if behaviour or layout changed.
4. `git diff main --stat`; grep the diff for `ghp_`, `sk-`, `service_role`, `eyJ` and real personal data.
5. Merge to main and push: `git checkout main && git pull --ff-only && git merge --no-edit <branch> && git push origin main && git checkout <branch>`
6. Deploy green: `gh api repos/txmnzia/pilz-pokedex/actions/runs?per_page=1 --jq '.workflow_runs[0] | .status, .conclusion'`
7. Live page https://txmnzia.github.io/pilz-pokedex/ shows the new version in the header.
