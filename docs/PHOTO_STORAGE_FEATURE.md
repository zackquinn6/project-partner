# Project Photo Storage Feature

## Overview
Comprehensive photo storage system allowing users to document their project progress with proper security, privacy controls, and admin oversight capabilities.

## Features

### 1. Photo Upload
- **Location**: Available on every workflow step, next to "Mark Complete" button
- **File Restrictions**: 
  - Max size: 5MB
  - Formats: JPG, PNG, WEBP, GIF
  - Validation enforced both client-side and server-side

### 2. Photo Metadata
Each photo is tagged with:
- User ID (owner)
- Project Run ID (specific project instance)
- Template ID (project type)
- Step ID (workflow step)
- Timestamp (automatic)
- Caption (optional)
- Privacy Level (required)

### 3. Privacy Levels

#### Personal (🔒)
- **Access**: Only the user who uploaded
- **Storage**: Encrypted at rest (AES-256)
- **Use Case**: Private documentation, sensitive work areas
- **Admin Access**: NO - Completely private
- **Security**: RLS policies + storage policies enforce user-only access

#### Project Partner (👥) - RECOMMENDED
- **Access**: User + Project Partner admins
- **Storage**: Standard encrypted storage
- **Use Case**: Quality control, troubleshooting, support
- **Admin Access**: YES - For helping users with issues
- **Security**: RLS policies allow admin access

#### Public (🌍)
- **Access**: All authenticated users
- **Storage**: Standard encrypted storage
- **Use Case**: Community sharing, inspiration, showcasing work
- **Admin Access**: YES - Same as all users
- **Security**: RLS policies allow all authenticated users

## User Access Points

### 1. During Workflow
- **Button**: "Add Photo" next to "Mark Complete"
- **Available**: On every step
- **Action**: Opens upload dialog with privacy settings

### 2. Celebration Step (Close Project Phase)
- **Card**: "Project Photos" card appears automatically
- **Button**: "View Project Photos"
- **Shows**: All photos for current project run

### 3. Project Performance Window
- **Coming Soon**: Photo gallery integration
- **Access**: From Project Performance app

## Admin Access Points

### 1. Project Analytics - Photos Tab
- **Location**: Admin Panel → Project Analytics → Photos Tab
- **View**: Photos aggregated by project template
- **Stats Shown**:
  - Total photos per project type
  - Public photo count
  - Project Partner photo count
  - Personal photo count (not accessible, just count)
- **Action**: Click project to view accessible photos

### 2. Photo Aggregation View
- **Displays**: Photo counts across all project types
- **Filters**: View by template
- **Limitations**: Cannot view personal photos (respects privacy)

## Database Schema

### Table: `project_photos`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- project_run_id: UUID (foreign key to project_runs)
- template_id: UUID (foreign key to projects)
- step_id: TEXT
- storage_path: TEXT
- file_name: TEXT
- file_size: INTEGER
- privacy_level: TEXT (personal | project_partner | public)
- caption: TEXT (optional)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Storage Bucket: `project-photos`
- **Path Structure**: `{user_id}/{project_run_id}/{filename}`
- **Size Limit**: 5MB per file
- **Allowed Types**: image/jpeg, image/png, image/webp, image/gif
- **Public Access**: NO (controlled via policies)

## Security Implementation

### Row Level Security (RLS) Policies

#### Database Policies (project_photos table)
1. **User View Own**: Users can view all their own photos
2. **User Insert**: Users can upload to their own projects
3. **User Update**: Users can update their own photo metadata
4. **User Delete**: Users can delete their own photos
5. **Admin View PP/Public**: Admins can view project_partner and public photos (NOT personal)
6. **Public View**: All users can view public photos

#### Storage Policies (project-photos bucket)
1. **User Upload**: Users can upload to their own folder (user_id)
2. **User View**: Users can view their own photos
3. **Admin View PP**: Admins can view project_partner and public photos
4. **Public View**: All users can view public photos
5. **User Delete**: Users can delete their own photos

### Encryption
- **At Rest**: Supabase Storage uses AES-256 encryption for all files
- **In Transit**: HTTPS/TLS for all transfers
- **Personal Photos**: Additional isolation via RLS - no admin access possible
- **Signed URLs**: Temporary access tokens (1 hour expiry) for viewing

## Database Functions

### `get_photos_by_project_type()`
- **Purpose**: Admin analytics - aggregate photo counts by project template
- **Returns**: Template ID, name, and photo counts by privacy level
- **Security**: SECURITY DEFINER - runs with elevated privileges to count photos
- **Note**: Counts personal photos but doesn't allow access to them

## User Experience

### Upload Flow
1. User clicks "Add Photo" button on any step
2. Dialog opens with upload area
3. User selects photo (validated for size/type)
4. Preview shown
5. User adds optional caption
6. User selects privacy level (defaults to "Project Partner")
7. User uploads - stored with metadata
8. Success toast shown

### View Flow
1. User navigates to celebration step OR clicks photo gallery
2. Photo grid displays with thumbnails
3. Privacy level badges shown
4. Click photo to view full size
5. Options: Download, Delete (own photos only)

### Admin Flow
1. Admin opens Project Analytics
2. Switches to "Photos" tab
3. Sees aggregation by project type
4. Clicks project to view accessible photos
5. Can view public and project_partner photos
6. Personal photos not accessible (count shown, but viewing blocked)

## Privacy Compliance

### User Rights
- Full control over own photos
- Can delete at any time
- Can change privacy level (update metadata)
- Personal photos guaranteed private from admin access

### Admin Rights
- Can view project_partner photos for support
- Can view public photos (same as all users)
- CANNOT view personal photos (hard restriction)
- Can see counts but not content of personal photos

### Data Protection
- Photos stored with user namespace isolation
- Database + storage RLS enforcement
- Encryption at rest for all photos
- Signed URLs prevent unauthorized direct access
- No backdoor admin access to personal photos

## Technical Notes

### File Storage Path
`{user_id}/{project_run_id}/{timestamp}-{random}.{ext}`

Example: `123e4567-e89b-12d3-a456-426614174000/789e0123-e45b-67c8-d901-234567890abc/1699999999999-a1b2c3d4.jpg`

### Validation
- **Client-side**: File type and size checked before upload
- **Server-side**: Supabase Storage enforces type and size limits
- **Database**: CHECK constraint on privacy_level enum

### Performance
- Thumbnails: Consider adding in future for faster gallery loading
- Pagination: Implement if photo counts grow large
- Caching: Signed URLs cached for 1 hour

## Future Enhancements
1. Photo thumbnails for faster gallery loading
2. Bulk upload capability
3. Photo tagging/labeling beyond caption
4. Before/after photo pairing
5. Photo editing (crop, rotate, filters)
6. Photo sharing via public links
7. Integration with social media sharing
8. AI-powered photo organization/suggestions

