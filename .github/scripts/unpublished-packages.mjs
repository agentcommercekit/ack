#!/usr/bin/env node

// Lists workspace packages whose current version is not yet on the npm
// registry, i.e. exactly what `changeset publish` would push.
//
// Used by the publish workflow as a pre-flight gate: dispatching Publish with
// nothing to publish should fail loudly and early rather than end in a green
// run that shipped nothing. Queries the registry directly over HTTPS instead of
// shelling out to `npm view` 8 times -- these are public packages, so no auth is
// involved, and one fetch per package keeps the failure mode obvious.
//
// Writes `count`, `packages`, `released` and `version` to $GITHUB_OUTPUT when
// running under Actions; always prints a human-readable table to stdout.
// `packages` is what this run still has to publish; `released` is every package
// at the release version, which is what the release notes should name.

import { appendFileSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const PACKAGES_DIR = "packages"
const REGISTRY = "https://registry.npmjs.org"

function readWorkspacePackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_DIR, entry.name, "package.json"))
    .map((path) => JSON.parse(readFileSync(path, "utf8")))
    .filter((pkg) => !pkg.private && typeof pkg.name === "string")
}

async function publishedVersions(name) {
  const response = await fetch(`${REGISTRY}/${name.replace("/", "%2f")}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  })

  // A package that has never been published 404s. Anything else is a registry
  // problem, and guessing "not published" there would let the workflow publish
  // over a version that already exists.
  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(
      `Registry lookup for ${name} failed: ${response.status} ${response.statusText}`,
    )
  }

  const body = await response.json()
  return Object.keys(body.versions ?? {})
}

const packages = readWorkspacePackages()

const results = await Promise.all(
  packages.map(async (pkg) => ({
    name: pkg.name,
    version: pkg.version,
    published: (await publishedVersions(pkg.name)).includes(pkg.version),
  })),
)

const unpublished = results.filter((result) => !result.published)

for (const result of results) {
  const status = result.published ? "already on npm" : "TO PUBLISH"
  console.log(
    `${result.name.padEnd(32)} ${result.version.padEnd(12)} ${status}`,
  )
}

// Name the release after the packages that actually ship, not after the
// umbrella manifest. The `linked` group in .changeset/config.json aligns the
// versions of the packages in a given release, but it does not release every
// member every time -- at 0.10.1, caip stayed on 0.1.0 and jwt/keys on 0.9.0.
// So one run must publish exactly one version; more than one means the working
// tree is inconsistent, and picking either would mislabel the tag and release.
const versions = [...new Set(unpublished.map((result) => result.version))]

if (versions.length > 1) {
  throw new Error(
    `Refusing: the packages to publish carry ${versions.length} different versions (${versions.join(", ")}). Expected one. Either a failed publish stranded a package on an older version, or a new package joined the workspace without a changeset. Fix that package's version, or publish it by hand (see RELEASING.md), then dispatch again.`,
  )
}

const version = versions[0] ?? ""

// The release notes name every package at the release version, not just the
// ones this run still has to publish. After a partial failure, a second
// dispatch sees a shorter `unpublished` list, and notes built from it would
// omit the packages that the first run already shipped.
const released = results.filter((result) => result.version === version)

// The workflow names the tag and the GitHub release `agentcommercekit@<version>`,
// so the umbrella package has to be part of this release for that name to mean
// anything. It depends on all seven scoped packages, so any release cascades to
// it -- if it is missing here, the version came from somewhere unexpected.
if (version !== "" && !released.some((r) => r.name === "agentcommercekit")) {
  throw new Error(
    `Refusing: the release version is ${version}, but agentcommercekit is not at that version. The release tag would name a version the umbrella package never published.`,
  )
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `count=${unpublished.length}`,
      `packages=${unpublished.map((result) => result.name).join(" ")}`,
      `released=${released.map((result) => result.name).join(" ")}`,
      `version=${version}`,
      "",
    ].join("\n"),
  )
}
