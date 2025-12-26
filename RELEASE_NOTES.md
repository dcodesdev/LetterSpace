### ✨ Features

- **Migration Scripts** - Added `migrate:dev` and `migrate:deploy` scripts for easier database migration management
- **Release Script** - Added automated release script (`scripts/release.sh`) for version bumping and tag creation

### 🐛 Bug Fixes

- Fixed dashboard subscriber growth calculation to properly handle baseline subscriber count
- Improved seed data distribution - subscribers now distributed over 2 years instead of 12 days for better testing
