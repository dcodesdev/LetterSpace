import { readFileSync } from "fs"
import { join } from "path"

interface PackageJson {
  version: string
}

function generateTags(version: string, runtime: "bun" | "node"): string[] {
  const tags: string[] = []
  const baseImage = "ghcr.io/dcodesdev/letterspace"

  // Parse version (e.g., "0.9.2" or "0.9.2-beta")
  const versionParts = version.split(".")
  const major = versionParts[0].split("-")[0]
  const minor = versionParts[1]?.split("-")[0]
  const isPrerelease = version.includes("-")

  if (runtime === "bun") {
    // Bun tags (default runtime - gets clean tags)
    tags.push(`${baseImage}:${version}`)
    if (!isPrerelease) {
      tags.push(`${baseImage}:${major}.${minor}`)
      tags.push(`${baseImage}:${major}`)
      tags.push(`${baseImage}:latest`)
      tags.push(`${baseImage}:bun`)
    }
  } else {
    // Node tags (always suffixed with -node, never gets latest)
    tags.push(`${baseImage}:${version}-node`)
    if (!isPrerelease) {
      tags.push(`${baseImage}:${major}.${minor}-node`)
      tags.push(`${baseImage}:${major}-node`)
      tags.push(`${baseImage}:node`)
    }
  }

  return tags
}

function main() {
  const runtime = process.argv[2] as "bun" | "node"

  if (!runtime || !["bun", "node"].includes(runtime)) {
    console.error("Usage: bun gen-container-img-tags.ts <bun|node>")
    process.exit(1)
  }

  try {
    const packageJsonPath = join(process.cwd(), "package.json")
    const packageJson: PackageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf-8")
    )

    const tags = generateTags(packageJson.version, runtime)
    console.log(tags.join(","))
  } catch (error) {
    console.error("Error reading package.json:", error)
    process.exit(1)
  }
}

main()
