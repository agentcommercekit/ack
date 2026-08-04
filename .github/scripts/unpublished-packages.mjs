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
// Writes `count`, `packages` and `version` to $GITHUB_OUTPUT when running under
// Actions; always prints a human-readable table to stdout.

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

// Every package is version-locked by the `linked` group in
// .changeset/config.json, so the umbrella package's version names the release.
const umbrella = results.find((result) => result.name === "agentcommercekit")

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `count=${unpublished.length}`,
      `packages=${unpublished.map((result) => result.name).join(" ")}`,
      `version=${umbrella?.version ?? ""}`,
      "",
    ].join("\n"),
  )
}
