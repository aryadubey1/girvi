# Accounts

The app uses real login accounts now, not a shared password.

## Creating a new account

```bash
cd backend
node createUser.js <username> <password>
```

The account can log in immediately.

## Changing a password — from the app

Log in, go to **Change password** in the header. Requires the current password.

## Changing a password — from the terminal

Use this if someone's locked out or you need to reset it directly:

```bash
cd backend
node resetPassword.js <username> <newPassword>
```

No current password needed — this is a direct database update, so only run it on a trusted machine/server.

## Test accounts

Some accounts point to a separate sandbox database instead of real data — used for testing without touching real customers/loans. This is set per-account in the database (`db_target` column on `users`, either `'prod'` or `'sandbox'`).

## Notes

- No signup page — accounts are only created via `createUser.js`, on purpose.
- No self-service password recovery — use `resetPassword.js` from the terminal instead.