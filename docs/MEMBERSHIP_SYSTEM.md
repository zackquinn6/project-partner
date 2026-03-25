# Membership System Documentation

## Overview
The Toolio membership system provides a flexible tiered access model with a 7-day free trial and annual subscription at $25/year.

## Membership Tiers

### 1. **Admin**
- **Access**: Full access to all features (no subscription needed)
- **Role**: Determined by `public.is_admin(user_id)` (backed by user profile role data in `user_profiles`)
- **Features**: All free + paid features, plus admin panel

### 2. **Member** (Paid Annual Subscription)
- **Access**: Full access to paid features
- **Role**: Determined by server-side membership logic (stored on the user profile / membership tables)
- **Cost**: $25/year ($2.08/month)
- **Features**:
  - Everything in Free Tier
  - Project Catalog Access
  - Step-by-Step Workflows
  - Materials & Tools Lists
  - Project Scheduling

### 3. **Non-Member** (Free Tier)
- **Access**: Free features only
- **Role**: Determined by server-side membership logic (stored on the user profile / membership tables)
- **Features**:
  - Home Maintenance Tracking
  - Task Manager
  - My Tools Library
  - Profile Management

### 4. **Trial** (7-Day Free Trial)
- **Access**: Full access to paid features during trial
- **Duration**: 7 days from signup
- **No Credit Card**: Required for trial
- **After Trial**: Reverts to Free Tier unless subscribed

## Database Tables

### `trial_tracking`
Tracks user trial periods and notifications
- `user_id`: User reference
- `trial_start_date`: When trial began
- `trial_end_date`: When trial expires
- `trial_extended_days`: Days added via coupons
- `email_sent_1day_before`: Email notification flag
- `email_sent_on_expiry`: Email notification flag

### `coupon_codes`
Admin-created codes to extend trials
- `code`: Unique coupon code
- `trial_extension_days`: Days to add
- `max_uses`: Usage limit (optional)
- `times_used`: Current usage count
- `active`: Enable/disable coupon
- `expires_at`: Expiration date (optional)

### `stripe_subscriptions`
Tracks active Stripe subscriptions
- `user_id`: User reference
- `stripe_subscription_id`: Stripe subscription ID
- `status`: Subscription status
- `current_period_end`: Renewal date

## Edge Functions

### `create-checkout`
Creates Stripe checkout session for new subscriptions
- **Auth**: Required
- **Returns**: Checkout URL
- **Opens**: In new tab

### `check-subscription`
Verifies user's subscription status and updates roles
- **Auth**: Required
- **Called**: On login, every 5 minutes
- **Updates**: User roles based on subscription

### `customer-portal`
Opens Stripe customer portal for subscription management
- **Auth**: Required
- **Allows**: Cancel, update payment, view history

### `redeem-coupon`
Redeems coupon code to extend trial
- **Auth**: Required
- **Input**: Coupon code
- **Action**: Extends trial period

### `send-trial-email`
Cron job to send trial expiration emails
- **Schedule**: Run daily
- **Sends**: 1-day warning and expiry notifications

## Admin Features

### Membership Management Tab
Located in User Management window:
1. **Coupon Creation**
   - Generate trial extension codes
   - Set usage limits and expiration
   - Track redemptions

2. **Coupon Management**
   - View all coupons
   - Activate/deactivate codes
   - Monitor usage statistics

### Manual Role Management
Admins can manually:
- Grant `member` role (bypass payment)
- Extend trials for specific users
- View subscription status

## Access Control

### Protected Features
Features requiring membership/trial/admin:
- Project Catalog
- Project Workflows
- All project-related operations

### Implementation
```typescript
const { canAccessPaidFeatures } = useMembership();

// Check before navigation
if (!canAccessPaidFeatures) {
  // Show upgrade prompt
  setShowUpgradePrompt(true);
  return;
}
```

### Upgrade Prompt
Automatically shown when non-members try to access:
- Project Catalog button
- Project Dashboard navigation
- Any project workflow

## User Experience

### New User Flow
1. Sign up (auto-creates trial)
2. 7-day free trial starts
3. Access all paid features
4. Email at 1 day remaining
5. Email on trial expiry
6. Revert to free tier
7. Can subscribe anytime

### Subscription Flow
1. Click "Subscribe Now"
2. Stripe checkout (new tab)
3. Complete payment
4. Auto-redirected
5. Role updated to `member`
6. Full access restored

### Trial Extension Flow
1. Enter coupon code
2. Validation checks
3. Days added to trial
4. Confirmation shown

## Email Notifications

### Trial Expiring (1 Day Before)
- **Subject**: "Your Toolio Trial Ends Tomorrow"
- **Content**: Reminder with subscribe CTA

### Trial Expired
- **Subject**: "Your Toolio Trial Has Ended"
- **Content**: Free features list + subscribe CTA

### Configuration
Emails sent via Resend API:
- **From**: "Toolio <onboarding@resend.dev>"
- **Secret**: `RESEND_API_KEY` in Supabase

## Stripe Configuration

### Product Setup
- **Product**: "Annual Membership"
- **Price**: $25/year
- **ID**: `price_1SNXHn14EDv5udF1hIqnEbaf`
- **Billing**: Yearly recurring

### Customer Portal
Enable at: https://dashboard.stripe.com/settings/billing/portal
Features:
- Cancel subscription
- Update payment method
- View payment history
- Download invoices

## Security Considerations

### RLS Policies
All membership tables protected by RLS:
- Users can only see their own data
- Admins have full access
- Security definer functions prevent escalation

### Role Checks
Client-side checks are for UI only:
```typescript
// ✅ Good: UI display logic
if (canAccessPaidFeatures) {
  <ProjectButton />
}

// ❌ Bad: Authorization
// Never trust client-side for data access
```

Server-side validation required for:
- Database queries
- Edge function calls
- Sensitive operations

## Testing

### Test Scenarios
1. **New User**: Verify trial auto-creation
2. **Trial Access**: Confirm paid feature access
3. **Trial Expiry**: Check email + role downgrade
4. **Subscription**: Test checkout + role upgrade
5. **Cancellation**: Verify access after period end
6. **Coupon**: Test extension + validation

### Test Coupons
Create test coupons in admin panel:
- Code: `TEST14` (14 days)
- Limit: 100 uses
- No expiration

## Monitoring

### Key Metrics
- Active trials
- Conversion rate (trial → paid)
- Churn rate
- Coupon redemption
- Failed payments

### Admin Dashboard
View in User Management → Membership tab:
- Total subscriptions
- Active trials
- Revenue tracking
- User distribution

## Troubleshooting

### Common Issues

**Trial not starting**
- Check `handle_new_user_trial()` trigger
- Verify `trial_tracking` insert

**Subscription not activating**
- Confirm webhook received
- Check `check-subscription` logs
- Verify Stripe customer email

**Email not sending**
- Verify `RESEND_API_KEY` secret
- Check edge function logs
- Confirm email validated in Resend

**Access denied despite subscription**
- Run `check-subscription` manually
- Verify user profile role data in `user_profiles` and server-side checks (e.g. `public.is_admin(user_id)`)
- Check subscription status in Stripe

### Edge Function Logs
View at: Supabase Dashboard → Edge Functions → Logs
- Filter by function name
- Check for errors
- Verify API calls

## Future Enhancements

### Planned Features
- Monthly billing option
- Multi-tier subscriptions
- Team/family plans
- Lifetime membership
- Referral program
- Usage-based pricing

### Configuration
All features designed for easy expansion:
- Add new tiers in `user_profiles` role data and server-side membership logic
- Create new Stripe products
- Update access control logic
- Add tier-specific features
