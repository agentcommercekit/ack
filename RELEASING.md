# Releasing

Releases are driven by [changesets](https://github.com/changesets/changesets)
and run in CI. There are two buttons, in order.

The `linked` group in `.changeset/config.json` gives every package in a release
the same version. It does not release every package every time. A package with
no changeset, and no changed dependency, keeps its current version — at 0.10.1,
`caip` stayed on 0.1.0 and `jwt`/`keys` stayed on 0.9.0. Use `fixed` instead of
`linked` if you ever want all eight to move together.

## 1. Land a changeset with your change

Every PR that changes published behavior needs a changeset:

```bash
pnpm exec changeset
```

Pick the affected packages and a bump type, write the entry as user-facing
release notes, and commit the generated file in `.changeset/`.

Because the packages are on `0.x`, a breaking change is a **minor** bump, not a
major. Reserve `major` for the deliberate `1.0.0` release.

## 2. Merge the version PR

The [Release workflow](.github/workflows/release.yaml) runs on every push to
`main` and keeps a version-bump PR open on the `changeset-release/main` branch.
It applies `changeset version`, which consumes the changeset files, bumps every
`package.json`, and writes the `CHANGELOG.md` entries.

Review the changelogs and merge. Nothing is published at this point.

You can also refresh the PR on demand from the Actions tab: **Release** → **Run
workflow**.

## 3. Press Publish

From the Actions tab: **Publish** → **Run workflow**, dispatched from `main`.

The workflow:

1. Refuses to run off `main`.
2. Works out which package versions are missing from npm, and refuses to
   continue if there are none (the usual cause is an unmerged version PR).
3. Runs the full `pnpm run check` suite and `pnpm audit signatures`.
4. Waits for an approval on the `npm-publish` environment.
5. Runs `changeset publish`, creates the git tags through the GitHub API, and
   opens a GitHub release for the version.

## How the workflow authenticates

npm **trusted publishing**. There is no npm token in this repository. The publish
job asks GitHub for an OIDC id token, and pnpm exchanges that for a registry
token that lives for a few minutes. Nothing long-lived exists to leak or rotate,
and the account's `auth-and-writes` 2FA does not apply, because there is no token
for it to protect.

pnpm does this itself — it does not call the npm CLI. It exchanges the id token
in `releasing/commands/lib/publish/oidc/` and attaches a provenance attestation
automatically, so this works through `changeset publish`, which runs
`pnpm publish` for each package.

## One-time setup

- **Trusted publisher on npmjs.com, for each of the eight published packages.**
  On the package's Settings → Publishing access, add a trusted publisher:

  | Field       | Value                  |
  | ----------- | ---------------------- |
  | Repository  | `agentcommercekit/ack` |
  | Workflow    | `publish.yaml`         |
  | Environment | `npm-publish`          |

  All three have to match the workflow exactly, or the exchange returns 401.
  Renaming the workflow file breaks publishing until you update all eight.

- **`npm-publish` environment** — required reviewers, and deployment branches
  limited to `main`. It stores no secrets; it only gates the registry write.
- **GitHub App** — `ACTIONS_APP_ID` (variable) and `ACTIONS_APP_PRIVATE_KEY`
  (secret) already exist for `audit-fix.yaml`. The Release workflow reuses them
  to open the version PR under the app identity, so the PR triggers the check
  workflow.

### If publishing fails on auth

pnpm treats a missing id token as a soft failure: it logs `Skipped OIDC` and
falls back to a configured token. Because no token is configured, the run then
fails on a 401 that says nothing about the cause. Read the log:

- `Refusing: no OIDC id token` — the job lost `id-token: write`.
- `Skipped OIDC` followed by a 401 — GitHub issued the token but npm rejected the
  exchange. The trusted publisher does not match the repository, the workflow
  filename, or the environment.
- A 401 with no `Skipped OIDC` line — the package has no trusted publisher
  configured at all.

## Manual fallback

`./bin/release` cleans, builds, and publishes from a local checkout. Trusted
publishing does not apply off a runner, so this path still needs an npm session
with publish rights and a one-time password, because of account-level 2FA:

```bash
./bin/release --otp=123456
```

Prefer CI, and treat this as a last resort. It skips the approval gate and the
verification steps, and it publishes with no trust evidence — a downgrade from
the trusted-publisher level that CI produces. pnpm's `trust-policy` is off by
default, so this does not break installs today, but anyone running
`trust-policy=no-downgrade` would refuse the version.

It also leaves the release record incomplete: `changeset publish` writes the tags
to your local clone only, and it creates no GitHub release. Finish by hand:

```bash
git push --follow-tags
gh release create "agentcommercekit@<version>" \
  --target "$(git rev-parse HEAD)" \
  --title "v<version>" --generate-notes
```

## Repairing a half-finished release

The publish workflow pushes the tags of every package that reached npm, even when
a later package fails, so a re-dispatch normally finishes the release. Re-dispatch
before you merge anything else: the workflow always publishes and tags from the
current `main`, so a `main` that moved in between would ship the remaining
packages from a newer tree under the same version numbers. If `main` has already
moved, repair by hand instead of re-dispatching.

Three states still need a hand.

**npm has every version, but tags or the GitHub release are missing.** The
workflow refuses to run again, because it sees nothing left to publish. The lost
tags lived in the runner's clone, so nothing in your own clone can push them —
recreate each one first, at the commit that was published, then push them by
name:

```bash
version="0.12.0"
sha=$(git rev-parse "<release-commit>")
for pkg in agentcommercekit @agentcommercekit/vc; do   # the missing ones
  git tag -a "$pkg@$version" "$sha" -m "$pkg@$version"
  git push origin "$pkg@$version"
done
gh release create "agentcommercekit@$version" \
  --target "$sha" --title "v$version" --generate-notes
```

**The run was cancelled part way.** This is the worst state, so let a publish
finish red rather than cancel it. `changeset publish` writes its tags only after
the whole publish loop returns, so a cancelled process leaves packages on npm
with no tags at all. Re-dispatch to publish the rest, then recreate the missing
tags with the commands above.

**One package sits on a different version from the rest.** The pre-flight script
refuses the dispatch, because the packages to publish no longer share one
version. Either a failed publish stranded a package, or a new package joined the
workspace without a changeset. Publish a stranded package by hand with
`pnpm --filter "<pkg>" publish`, or add a changeset for a new one and merge the
version PR. Then dispatch the workflow again.
