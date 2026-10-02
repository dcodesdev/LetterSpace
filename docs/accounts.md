# Accounts and organizations

Covers signup, login, sessions, and the organization each piece of data belongs to.

## Create the first account

LetterSpace is single-tenant by deployment: only one user can sign up.

```
POST /trpc/user.signup   { name, email, password }
```

`user.signup` throws `BAD_REQUEST` if any user already exists (`apps/backend/src/user/mutation.ts`). Call `user.isFirstUser` to check whether the signup screen should be shown; the web app does this at `/`.

Passwords are hashed with bcrypt (cost 10).

## Log in

```
POST /trpc/user.login    { email, password }
```

Returns a JWT signed with `JWT_SECRET`, valid for 30 days. Send it on every authenticated call:

```
Authorization: Bearer <token>
```

The token payload is `{ id, version }`. `version` must match the user's `pwdVersion` column, so changing a password invalidates every existing token.

## Profile

| Procedure | What it does |
| --- | --- |
| `user.me` | Current user with their organizations |
| `user.updateProfile` | Change name and email (email must be unused) |
| `user.changePassword` | Requires the current password; bumps `pwdVersion` and returns a fresh token |

## Organizations

Every list, subscriber, template, campaign, webhook, API key and settings row hangs off an `Organization`. Users are attached through `UserOrganization`, and every authenticated procedure re-checks that link before touching data.

```
POST /trpc/organization.create   { name, description? }
```

Creating an organization also seeds:

- a `Newsletter` template read from `apps/backend/templates/newsletter.html`
- `GeneralSettings` with defaults
- `EmailDeliverySettings` with defaults

`organization.update` and `organization.getById` require membership.

The web app runs the create step at `/onboarding` right after signup.
