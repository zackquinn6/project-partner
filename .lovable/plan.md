# Sign-in spinner: cause and fix

## What I found

Your app's database/auth service (the external Supabase project `drshvrukkavtpsprfcbc`) is not answering right now.

Evidence from direct tests just run:
- A request without a key is rejected instantly by the edge gateway (fast 401), so DNS/network are fine.
- A real request with your app's public key — login, and a simple data read — hangs and never returns (timed out at 15-20 seconds each).
- The tooling report for this project also says the database connection pooler is unavailable, which usually means the project is paused or stuck waking up.

Matching symptom in the browser log: "Failed to fetch" on data loads.

## Why it shows as an endless spinner

When you press Sign In, the app first calls a login rate-limit check and then the login itself, and neither call has any time limit. If the service never answers, the button's spinner spins forever with no error message. So the outage is the cause, and the missing timeout is why it looks like a hang instead of a clear failure.

## Fix

1. Restore the backend (you or I can check its status in the Supabase dashboard; a paused project needs to be resumed there). Until it answers, no login can succeed.
2. Make the sign-in path fail loudly instead of hanging:
   - Put a time limit (about 8 seconds) around the rate-limit check; if it doesn't answer, skip it and continue to the actual login instead of blocking.
   - Put a time limit around the login request itself; on timeout, stop the spinner and show "We can't reach the server right now. Please try again in a moment."
   - Wrap the two calls so any thrown network error also clears the spinner and shows that message.
   - Do the same for the sign-up submit and the password-reset dialog, which have the identical pattern.

## Technical notes

- `src/contexts/AuthContext.tsx` — `signIn`: `supabase.functions.invoke('auth-rate-limit', ...)` and `signInWithPassword` are awaited with no timeout, and the post-failure logging calls also await network. Add a `withTimeout` helper (Promise.race + AbortController where supported) and treat rate-limit timeouts as "allow".
- `src/pages/Auth.tsx` — `handleSignIn` / `handleSignUp` set `isLoading(false)` only after every await completes; a rejected promise leaves the spinner on. Wrap bodies in try/finally and surface a network-error message.
- The app-init spinner already has a 5 second guard in `AuthContext`, so this change targets the submit path.
