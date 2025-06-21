import { readFileSync } from "fs"
import { join } from "path"

interface PackageJson {
  version: string
}

function generateTags(
  version: string,
  runtime: "bun" | "node",
  isBeta = false
): string[] {
  const tags: string[] = []
  const baseImage = "ghcr.io/dcodesdev/letterspace"

  // Add -beta suffix if this is a beta build
  const finalVersion = isBeta ? `${version}-beta` : version

  // Parse version (e.g., "0.9.2")
  const [major, minor] = version.split(".")
  const isPrerelease = version.includes("-") || isBeta

  if (runtime === "bun") {
    // Bun tags
    tags.push(`${baseImage}:${finalVersion}`)
    if (!isBeta) {
      tags.push(`${baseImage}:${major}.${minor}`)
      tags.push(`${baseImage}:${major}`)
    }

    if (!isPrerelease) {
      tags.push(`${baseImage}:latest`)
      tags.push(`${baseImage}:bun`)
    }
  } else {
    // Node tags
    tags.push(`${baseImage}:${finalVersion}-node`)
    if (!isBeta) {
      tags.push(`${baseImage}:${major}.${minor}-node`)
      tags.push(`${baseImage}:${major}-node`)
    }

    if (!isPrerelease) {
      tags.push(`${baseImage}:latest-node`)
      tags.push(`${baseImage}:node`)
    }
  }

  return tags
}

function main() {
  const runtime = process.argv[2] as "bun" | "node"
  const isBeta = process.argv[3] === "--beta"

  if (!runtime || !["bun", "node"].includes(runtime)) {
    console.error("Usage: bun gen-container-img-tags.ts <bun|node> [--beta]")
    process.exit(1)
  }

  try {
    const packageJsonPath = join(process.cwd(), "package.json")
    const packageJson: PackageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf-8")
    )

    const tags = generateTags(packageJson.version, runtime, isBeta)
    console.log(tags.join(","))
  } catch (error) {
    console.error("Error reading package.json:", error)
    process.exit(1)
  }
}

main()
