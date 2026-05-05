# RentVerse Frontend User Manual

## Document Control

- Product: RentVerse Web Application
- Scope: Frontend usage manual for regular users and admin staff
- Version: 1.0
- Last Updated: April 24, 2026

## 1. Purpose

This manual explains how to use RentVerse from the web interface. It covers:

- User workflows (buyers, renters, sellers)
- Admin workflows (moderation and operations)
- Common issues and recovery steps

This document does not cover developer setup or backend deployment.

## 2. Intended Audience

- Marketplace users who want to browse, list, book, message, save listings, and manage profile settings
- Admin workers who manage users, listings, KYC, disputes, reports, and contact inbox

## 3. Access and Prerequisites

### User Portal

- Open the web app home page
- A verified email is required for protected actions such as creating listings, bookings, saved items, and chat

### Admin Portal

- Open `/admin/login`
- Admin account credentials are required
- MFA (authenticator app OTP) is required
- First-time admin login may require QR scan setup before OTP verification

## 4. User Navigation Map

### Public Pages

- Home: `/`
- Browse marketplace: `/browse`
- Listing details: `/listing/:id`
- Categories: `/categories`
- How it works: `/how-it-works`
- About: `/about`
- Contact: `/contact`
- Public user profile: `/user/:userId`

### Authenticated User Pages

- Dashboard: `/dashboard`
- My listings: `/my-listings`
- My bookings: `/my-bookings`
- Create listing: `/create-listing`
- Saved listings: `/saved`
- Messages: `/messages`
- Profile settings: `/profile-settings`

## 5. User Workflows

### 5.1 Register and Sign In

1. Open the home page.
2. Choose sign up or sign in from the auth modal.
3. Verify email if prompted.
4. After verification, access dashboard and protected pages.

### 5.2 Browse and Filter Listings

1. Go to `/browse`.
2. Use search (query mode is active for search text with at least 2 characters).
3. Use filters:
   - Price range
   - Category
   - Condition
   - Seller verified
   - Minimum rating
4. Switch between grid/list view.
5. Use sort options: relevant, newest, price low/high, rating, trust.

Notes:

- Instant-booking and radius controls are present in UI; filtering accuracy depends on available server data.

### 5.3 View Listing Details

1. Open any listing card to enter `/listing/:id`.
2. Review photos, pricing, availability, condition, seller profile summary, and specifications.
3. Use tabs for details, specifications, reviews, and delivery/returns.

### 5.4 Save and Unsave Listings

1. On a listing card or detail page, click the heart icon.
2. Open `/saved` to manage saved items.
3. Remove from saved list by toggling heart again.

### 5.5 Contact Seller (Chat)

1. Open a listing and start a chat with seller.
2. You are redirected to `/messages`.
3. Inbox supports:
   - Conversation search
   - Unread/online filtering
   - Real-time polling refresh
   - Message read-state updates

### 5.6 Create a New Listing

1. Open `/create-listing`.
2. Complete the 4-step listing flow:
   - Step 1: Listing basics
   - Step 2: Details and photos
   - Step 3: Price and availability
   - Step 4: Review and publish
3. Provide required values:
   - Title and description
   - Category (AI suggestion or manual taxonomy search)
   - Location (address, city, country)
   - At least one image
   - Valid buy/rent pricing depending on listing type
4. Publish listing.

Validation highlights:

- Buy listings require a valid sale price
- Rent listings require daily, weekly, and monthly rates
- Max rental days cannot be less than min rental days

### 5.7 Manage Existing Listings

1. Open `/my-listings`.
2. Search and filter by status/type.
3. Review listing performance indicators (views/saves).
4. Delete listing when needed (confirmation required).

### 5.8 Manage Bookings and Rental Lifecycle

1. Open `/my-bookings`.
2. Switch view:
   - Incoming (as seller)
   - Outgoing (as buyer/renter)
3. Use order actions where available:
   - Approve or reject request (seller)
   - Cancel order
   - Request handover OTP
   - Verify handover OTP
   - Request return OTP
   - Verify return OTP
4. Track order states such as pending approval, approved, in use, return pending, completed, rejected, cancelled.

### 5.9 Open and Manage Disputes (User Side)

1. In `/my-bookings`, open dispute panel for eligible orders.
2. Create dispute with reason, title, and requested resolution.
3. Upload evidence attachments.
4. Post follow-up messages in dispute thread.
5. Track dispute status updates.

### 5.10 Profile and Account Settings

Open `/profile-settings` to manage:

- Name, city, description, avatar
- Email change request
- Phone update
- Password reset email
- Email verification resend
- KYC submission (document type/number, front and back ID images)
- Account deletion (confirmation flow)

## 6. Admin Navigation Map

- Login: `/admin/login`
- Dashboard: `/admin`
- Users: `/admin/users`
- Verified sellers: `/admin/verified-sellers`
- Workers: `/admin/workers`
- Listings moderation: `/admin/listings`
- Orders and disputes: `/admin/orders`
- KYC review: `/admin/kyc`
- Audit logs: `/admin/audit`
- Contact messages: `/admin/contact-messages`
- Reported users: `/admin/reported-users`
- Reported listings: `/admin/reported-listings`

## 7. Admin Workflows

### 7.1 Admin Login and MFA

1. Open `/admin/login`.
2. Enter admin email and password.
3. If prompted for first-time MFA setup, scan QR in authenticator app.
4. Enter 6-digit OTP and continue.

### 7.2 Dashboard Monitoring

Use `/admin` for:

- Total users, listings, orders
- Pending KYC count
- Open dispute count
- Latest KYC queue snapshot
- Recent audit actions

### 7.3 User Oversight

In `/admin/users`, review:

- User identity and contact information
- KYC status
- Whether account is a normal user or admin worker

### 7.4 Worker Account Management

In `/admin/workers`:

1. Create worker account (name, email, temporary password, role).
2. Assign role from allowed hierarchy.
3. Activate or suspend existing workers.

### 7.5 Listing Moderation

In `/admin/listings`:

1. Search listing rows by scanning title/owner/type/status.
2. Update listing status (draft, active, paused, archived, pending, sold, rented).
3. Permanently delete violating listings when required.

### 7.6 Dispute Resolution

In `/admin/orders`:

1. Filter queue by status and priority.
2. Open dispute details with evidence and conversation.
3. Assign dispute to yourself.
4. Post participant-facing replies or internal notes.
5. Issue verdict and status update (resolved, closed, awaiting parties, under review).
6. Review participant history where needed.

### 7.7 KYC Review

In `/admin/kyc`:

1. Filter by KYC status.
2. Inspect AI verdict and confidence score.
3. Open front/back identity images.
4. Re-run AI scan when needed.
5. Approve or reject with reason.

### 7.8 Contact Inbox Operations

In `/admin/contact-messages`:

1. Filter/search incoming contact submissions.
2. Open inquiry details.
3. Update status (new, in_progress, resolved, closed).
4. Add internal admin notes.

### 7.9 Reported Users Moderation

In `/admin/reported-users`:

1. Review grouped reports by target user.
2. Inspect reporter statements and user profile context.
3. Apply moderation actions:
   - Warn user
   - Restrict listings/messaging/orders/all activity
   - Suspend user
   - Clear restrictions
   - Dismiss reports
   - Mark investigating

### 7.10 Reported Listings Moderation

In `/admin/reported-listings`:

1. Review grouped reports by listing.
2. Inspect listing details and reporter statements.
3. Apply actions:
   - Mark investigating
   - Pause listing
   - Activate listing
   - Dismiss reports
   - Delete listing

### 7.11 Verified Seller Program

In `/admin/verified-sellers`:

1. Switch between candidate and verified tabs.
2. Search and sort sellers by performance signals.
3. Open full seller profile and stats.
4. Add decision note.
5. Grant or remove verified seller status.

### 7.12 Audit Review

In `/admin/audit`, inspect immutable logs for:

- Actor role and user
- Action type
- Target entity and metadata
- Timestamped traceability

## 8. Error Handling and Troubleshooting

### User-Side Common Issues

- Cannot access protected pages:
  - Confirm login and email verification status
- Listing publish fails:
  - Check required fields and image upload requirements
- Booking action fails:
  - Refresh page and verify order state before retrying
- Chat not updating:
  - Check internet connection and reload inbox

### Admin-Side Common Issues

- Admin login fails:
  - Verify credentials and OTP accuracy
- Missing data in queue pages:
  - Re-apply filters or refresh page
- Action button errors:
  - Confirm role permission and try again

## 9. Security and Operational Practices

- Keep user and admin credentials private
- Do not share MFA OTP codes
- Admin actions should include clear notes where supported
- Use least privilege role access for workers
- Review audit logs after sensitive moderation actions

## 10. Support Escalation

- For account access issues: use profile reset and verification actions first
- For unresolved disputes: escalate through admin dispute workflow
- For abuse/safety concerns: use report flows and apply moderation actions with documented notes
