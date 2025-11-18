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
   - Location: Authentication → URL Configuration → Redirect URLs

### Code Configuration

The code has been updated to use the production URL for email redirects:
- `src/contexts/AuthContext.tsx`: `emailRedirectTo` is set to `https://projectpartner.toolio.us/`

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

