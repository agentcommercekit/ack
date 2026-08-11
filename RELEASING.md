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

## One-time setup

- **`NPM_TOKEN`** — a granular npm access token, stored as an **environment**
  secret on `npm-publish` (not a repository secret, so no other workflow can
  reach it). Scope it to read+write on `agentcommercekit` and the
  `@agentcommercekit` scope. It must be an automation-class token: the account
  has 2FA set to `auth-and-writes`, and a token that prompts for a one-time
  password cannot work unattended.
- **`npm-publish` environment** — required reviewers, and deployment branches
  limited to `main`.
- **GitHub App** — `ACTIONS_APP_ID` (variable) and `ACTIONS_APP_PRIVATE_KEY`
  (secret) already exist for `audit-fix.yaml`. The Release workflow reuses them
  to open the version PR under the app identity, so the PR triggers the check
  workflow.

## Why not OIDC trusted publishing

`changeset publish` shells out to `pnpm publish` in a pnpm workspace, and pnpm 11
supports neither npm trusted publishing nor `--provenance` — only `--otp`.
Adopting OIDC would mean packing tarballs and publishing them with `npm`
directly, bypassing changesets' publish path.

## Manual fallback

`./bin/release` cleans, builds, and publishes from a local checkout. It needs an
npm session with publish rights, and a one-time password because of
account-level 2FA:

```bash
./bin/release --otp=123456
```

Prefer CI. This path skips the approval gate and the verification steps. It also
leaves the release record incomplete: `changeset publish` writes the tags to your
local clone only, and it creates no GitHub release. Finish by hand:

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
