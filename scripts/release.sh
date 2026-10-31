#!/usr/bin/env bash
# Stages the current package.json version on npm and creates its git tag and GitHub release.
#
# Run by CI after the changesets "Version Packages" PR is merged. Prereleases (x.y.z-rc.n) go to
# the `next` dist-tag, everything else to `latest`. Nothing goes live until a maintainer approves
# the staged version with 2FA (`npm stage approve <stage-id>` or on npmjs.com).
#
# Idempotent: a version whose tag already exists is skipped, and the tag is only created after
# staging succeeds, so a failed run can simply be re-run.
set -euo pipefail

version="$(node -p "require('./package.json').version")"
tag="v${version}"

if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null; then
  echo "Tag ${tag} already exists; nothing to release."
  exit 0
fi

dist_tag="latest"
release_flags=(--latest)
if [[ "${version}" == *-* ]]; then
  dist_tag="next"
  release_flags=(--prerelease --latest=false)
fi

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "Dry run: would stage ${version} with dist-tag ${dist_tag} and create ${tag}."
  npm stage publish --provenance --tag "${dist_tag}" --dry-run
  exit 0
fi

pnpm run build
npm stage publish --provenance --tag "${dist_tag}"

git tag "${tag}"
git push origin "${tag}"

# Release notes: the CHANGELOG section for this version.
notes="$(awk -v heading="## ${version}" '
  $0 == heading { found = 1; next }
  found && /^## / { exit }
  found { print }
' CHANGELOG.md)"

gh release create "${tag}" --title "${tag}" --notes "${notes:-See CHANGELOG.md.}" "${release_flags[@]}"
