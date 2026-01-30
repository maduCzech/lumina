# Lumina Gallery - PRD

## Original Problem Statement
Build a photo gallery website where I can post my photos and art. It should be sorted by themes like nature, city etc. Also make it modern with a liquid glass-like design.

## User Choices
- Admin-only authentication (no public registration)
- Local file storage for photos
- IP-based likes to prevent spam
- Dark mode with liquid glass aesthetic

## Architecture

### Backend (FastAPI)
- **Database**: MongoDB
- **Authentication**: JWT-based admin auth
- **File Storage**: Local uploads directory
- **API Prefix**: `/api`

### Frontend (React)
- **Styling**: Tailwind CSS + Custom Glass Morphism
- **Animations**: Framer Motion
- **State**: React hooks
- **Routing**: React Router

### Database Collections
- `admins` - Admin credentials
- `themes` - Photo categories
- `photos` - Photo metadata
- `likes` - IP-based likes tracking

## What's Been Implemented ✅

### Core Features (Jan 2026)
- [x] Public photo gallery with theme filtering
- [x] Floating glass navigation with theme pills
- [x] Photo grid with hover animations
- [x] Full-screen lightbox with keyboard navigation
- [x] IP-based like system (spam prevention)
- [x] Admin authentication (JWT)
- [x] Admin dashboard with stats
- [x] Photo upload with file validation
- [x] Photo deletion
- [x] Dark liquid glass aesthetic
- [x] Responsive design
- [x] Framer Motion animations

### Design System
- Font: Space Grotesk (headings), Manrope (body)
- Colors: Dark void (#050505) with glass overlays
- Effects: Backdrop blur, subtle borders, hover glow
- Animations: Slide up, fade in, scale transitions

## User Personas

### Gallery Visitors
- Browse photos by theme
- View full-screen images
- Like favorite photos
- No registration required

### Admin (You)
- Login at `/admin`
- Upload new photos
- Manage photo collection
- View engagement stats

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/photos | Get all photos |
| GET | /api/photos/:id | Get single photo |
| POST | /api/photos | Upload photo (admin) |
| DELETE | /api/photos/:id | Delete photo (admin) |
| POST | /api/photos/:id/like | Like photo |
| GET | /api/themes | Get all themes |
| POST | /api/admin/setup | Initial admin setup |
| POST | /api/admin/login | Admin login |

## Prioritized Backlog

### P0 - Done ✅
- Gallery display
- Theme filtering
- Admin auth
- Photo CRUD
- Like system

### P1 - Future Enhancements
- [ ] Drag-and-drop photo ordering
- [ ] Bulk photo upload
- [ ] Photo editing (crop, rotate)
- [ ] Social sharing buttons

### P2 - Nice to Have
- [ ] Photo EXIF data display
- [ ] Collections/Albums feature
- [ ] Watermark option
- [ ] Analytics dashboard

## Next Action Items
1. Upload your first photos via the admin dashboard
2. Consider adding custom themes for your art categories
3. Optional: Add social sharing to increase visibility
