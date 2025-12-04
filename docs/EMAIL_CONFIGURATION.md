# Email Configuration

## Production Email Settings

### Supabase Dashboard Configuration

**IMPORTANT**: The following settings must be configured in your Supabase Dashboard (not in config.toml):

1. **Site URL**: Set to `https://projectpartner.toolio.us`
   - Location: Authentication → URL Configuration → Site URL
   - This is used to construct confirmation email links

2. **Redirect URLs**: Add the following to allowed redirect URLs:
   - `https://projectpartner.toolio.us`
   - `https://projectpartner.toolio.us/`
   - `https://projectpartner.toolio.us/auth`
   - `https://projectpartner.toolio.us/projects`
   - Location: Authentication → URL Configuration → Redirect URLs

3. **Email Confirmation Settings**:
   - Location: Authentication → Email Auth
   - Enable "Confirm email" option
   - Set "Double confirm email changes" if desired for additional security

### Code Configuration

The code has been updated to use the production URL for email redirects:
- `src/contexts/AuthContext.tsx`: `emailRedirectTo` is set to `https://projectpartner.toolio.us/auth`
- After email confirmation, users are automatically signed in and redirected to home/projects

### Email Templates

Custom email templates have been created for better formatting:
- `supabase/templates/confirmation.html` - Email confirmation template
- `supabase/templates/magic_link.html` - Magic link sign-in template

These templates:
- Use responsive design that works on mobile and desktop
- Include proper styling and formatting
- Display the confirmation link as both a button and fallback text
- Use the production URL in footer links

### Local Development

For local development, the `config.toml` file uses `http://127.0.0.1:3000` which is correct for local testing.

### Applying Email Templates

The email templates are configured in `supabase/config.toml`. To apply them to your production Supabase instance:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. For "Confirm signup" template:
   - Copy the content from `supabase/templates/confirmation.html`
   - Update the subject to "Confirm Your Email - Project Partner"
3. For "Magic Link" template:
   - Copy the content from `supabase/templates/magic_link.html`
   - Update the subject to "Sign In to Project Partner"

Alternatively, if you're using Supabase CLI and have the templates in your project, they should be automatically used when configured in `config.toml`.

## Email Confirmation Flow

### User Journey After Signup:

1. **User Signs Up**
   - Enters email and password on `/auth` page
   - System sends confirmation email via Supabase

2. **User Receives Email**
   - Email contains confirmation link with format: `https://projectpartner.toolio.us/auth#access_token=...`
   - Link includes access token and other auth parameters

3. **User Clicks Confirmation Link**
   - Browser opens `https://projectpartner.toolio.us/auth`
   - Supabase automatically processes the auth tokens from URL hash
   - `AuthContext.tsx` detects `SIGNED_IN` event
   - User session is established

4. **Automatic Redirect**
   - After confirmation, user is automatically signed in
   - `Auth.tsx` page detects authenticated user
   - Redirects to `/projects` (Project Catalog)
   - User can start browsing and creating projects

### Troubleshooting

#### Problem: Confirmation Link Shows "Invalid Link" or 404

**Solution:**
1. Verify Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://projectpartner.toolio.us`
   - Add all redirect URLs listed above

2. Check that email confirmation is enabled:
   - Supabase Dashboard → Authentication → Email Auth
   - "Confirm email" should be enabled

#### Problem: User Not Redirected After Confirmation

**Solution:**
1. Clear browser cache and cookies
2. Try confirmation link in incognito/private window
3. Verify that `/auth` route exists and is accessible
4. Check browser console for errors

#### Problem: Email Not Received

**Solution:**
1. Check spam/junk folder
2. Verify email provider settings in Supabase Dashboard → Project Settings → Email
3. For production, ensure custom SMTP is configured (Supabase's default email may have delivery limits)

## Testing Email Confirmation Locally

For local development:
1. Start local Supabase: `supabase start`
2. Check Inbucket (email testing): `http://localhost:54324`
3. Sign up with test email
4. View confirmation email in Inbucket
5. Click confirmation link (will redirect to `http://127.0.0.1:3000`)

