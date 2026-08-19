# OnBozaruz - Tez Havola (Quick Reference)

## 🚀 Boshlash (Getting Started)

### 1. O'rnatish
```bash
npm install
npm run dev
```

### 2. Muhit Sozlamasi
```bash
cp .env.example .env.local
```

`.env.local`:
```env
VITE_USE_MOCK_API=true
# Supabase uchun:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
```

### 3. Buyruqlar
| Buyruq | Maqsadi |
|--------|---------|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build |
| `npm run preview` | Build preview |
| `npm run lint` | Code quality check |

---

## 📊 Loyiha Statistikasi

```
Texnologiyalar:
├─ Frontend: React 19 + TypeScript 7 + Vite 8
├─ Styling: TailwindCSS 4
├─ State: Zustand 5
├─ Backend: Supabase 2
└─ UI: Lucide + Framer Motion

Faillar:
├─ Components: 40+
├─ Views: 7
├─ Repositories: 6
└─ Hooks: 10+

Jadvallar:
├─ profiles
├─ posts
├─ products
├─ orders
├─ comments
├─ saved_posts
├─ liked_posts
├─ categories
├─ reports
└─ audit_logs
```

---

## 🎯 Asosiy Features

### Feed
- [x] Instagram-kabi post display
- [x] Like, Save, Comment, Share
- [x] Kategoriya filterlash
- [x] Video Reels viewer
- [x] Stories bar

### Shop
- [x] Mahsulot ro'yxati
- [x] Product detail modal
- [x] Rating va reviews
- [x] Seller profile

### Profile
- [x] Profile tahrirlash
- [x] My listings
- [x] Orders history
- [x] Saved posts
- [x] Settings

### Admin
- [x] Dashboard statistics
- [x] Users management
- [x] Products approval
- [x] Posts moderation
- [x] Categories CRUD
- [x] Reports management
- [x] Audit logs

### Auth
- [x] Email/Password signup
- [x] Email/Password login
- [x] Google OAuth
- [x] OneID OAuth
- [x] Session restore
- [x] Profile management

---

## 🗂️ File Structure

```
src/
├── api/                 # API Layer
│   ├── authClient.ts    # Supabase Auth
│   ├── http.ts          # HTTP Transport
│   ├── mockServer.ts    # Mock API
│   ├── mockDb.ts        # Mock DB
│   ├── types.ts         # Types
│   ├── adminRepository.ts
│   └── repositories/    # Entity CRUD
│
├── components/          # UI Components
│   ├── admin/           # Admin panels
│   ├── create/          # Post creation
│   ├── home/            # Feed components
│   ├── profile/         # Profile components
│   └── ui/              # Primitives
│
├── store/               # Zustand store
├── views/               # Page views
├── data/                # Static data
├── utils/               # Utilities
├── App.tsx              # Root
└── main.jsx             # Entry point
```

---

## 🔗 API Endpoints

### Posts
```
GET  /posts
POST /posts
PUT  /posts/:id
DEL  /posts/:id
GET  /posts/:id/comments
POST /comments
```

### Products
```
GET  /products
POST /products
PUT  /products/:id
DEL  /products/:id
PUT  /products/:id/approve
PUT  /products/:id/reject
```

### Orders
```
GET  /orders
POST /orders
PUT  /orders/:id/status
```

### User Interactions
```
POST /like-post
POST /unlike-post
POST /save-post
POST /unsave-post
GET  /liked-posts
GET  /saved-posts
```

### Admin
```
GET  /admin/stats
PUT  /products/:id/approve
PUT  /posts/:id/approve
GET  /admin/users
GET  /admin/reports
GET  /admin/audit-logs
```

---

## 🏗️ Component Hierarchy

```
App
├── InstagramHeader
├── InstagramBottomNav / DesktopLeftSidebar / DesktopRightSidebar
└── [Views]
    ├── HomeFeedView
    │   ├── StoryBar
    │   ├── CategoryFilter
    │   ├── RegionFilter
    │   └── [FeedCard components]
    │       └── PostActions
    │
    ├── MarketShopView
    │   └── [ProductCard components]
    │
    ├── ProfileView
    │   ├── ProfileHeader
    │   ├── ProfileQuickNav
    │   └── ProfileListingsGrid
    │
    ├── AdminView
    │   ├── AdminSidebar
    │   └── [Admin Tabs]
    │
    └── SearchExploreView

Modals:
├── CreatePostModal
├── ProductDetailModal
├── ContactSellerModal
├── CommentSheetModal
├── ShareModal
├── EditListingModal
├── CategoryExplorerModal
├── SellerProfileModal
└── NotificationsDrawerModal
```

---

## 🔐 Security Checks

### ✅ Implemented
- [x] TypeScript type safety
- [x] Supabase authentication
- [x] Input validation (Zod)
- [x] OAuth integration

### ⚠️ Needs Implementation
- [ ] Row Level Security (RLS) policies
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] CSRF protection
- [ ] File upload validation
- [ ] SQL injection prevention (ORM helps)
- [ ] XSS prevention (React helps)

---

## 📈 Performance Tips

### Build Optimization
```bash
# Check build size
npm run build
# Analyze bundle
npm install -g vite-plugin-visualizer
```

### Runtime Optimization
```
- Use React.lazy for code splitting
- Implement pagination for large lists
- Use virtualization for long lists
- Optimize images (WebP, lazy loading)
- Cache API responses
- Use IndexedDB for offline storage
```

### Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_user ON orders(user_id);
```

---

## 🐛 Common Issues & Solutions

### Issue: Mock API not working
**Solution:** Check `VITE_USE_MOCK_API=true` in .env.local

### Issue: Authentication fails
**Solution:** 
1. Check Supabase credentials
2. Verify OAuth providers configured
3. Check callback URL matches

### Issue: Styling not applied
**Solution:**
1. Rebuild TailwindCSS: `npm run dev`
2. Check class names are correct
3. Verify tailwind.config.js

### Issue: Image not uploading
**Solution:**
1. Check file size
2. Check MIME type
3. Verify Supabase storage bucket
4. Check storage permissions

### Issue: Admin panel not accessible
**Solution:**
1. Check user has `is_admin=true`
2. Verify OAuth provider scope
3. Check database record exists

---

## 📱 Responsive Design

```
Mobile (< 768px):
├─ Bottom navigation (5 tabs)
├─ Full-width feed cards
└─ Touch-optimized buttons

Tablet (768px - 1024px):
├─ Left sidebar (collapsible)
├─ Feed cards 2-column
└─ Right sidebar hidden

Desktop (> 1024px):
├─ Left sidebar (permanent)
├─ Feed cards centered
└─ Right sidebar (ads/suggestions)
```

---

## 🎨 Color Scheme

```
Primary: Instagram-like blue (#3b82f6)
Success: Green (#10b981)
Warning: Yellow (#f59e0b)
Danger: Red (#ef4444)
Dark: Gray (#111827)
Light: White (#ffffff)

TailwindCSS palette used throughout
```

---

## 📞 Contact & Support

### Admin Users
- Access: `/admin` tab
- Default: isAdmin=true in database

### Seller Account Setup
- Role: `seller`
- Verified: true/false
- Can create posts and products

### Buyer Account
- Role: `buyer` (default)
- Can like, save, comment, order

---

## 🚀 Deployment Checklist

### Pre-deployment
```
[ ] npm run build - No errors
[ ] npm run lint - No critical issues
[ ] npm run preview - Works locally
[ ] Environment variables set
[ ] Database schema deployed
[ ] OAuth configured
[ ] Domain configured
```

### Post-deployment
```
[ ] Test login flows
[ ] Test OAuth flows
[ ] Test image upload
[ ] Test admin panel
[ ] Monitor error logs
[ ] Check performance
[ ] Backup database
```

---

## 📚 Learning Resources

### React Documentation
- https://react.dev

### TypeScript
- https://www.typescriptlang.org/docs/

### TailwindCSS
- https://tailwindcss.com/docs

### Supabase
- https://supabase.com/docs

### Zustand
- https://github.com/pmndrs/zustand

### Vite
- https://vitejs.dev/guide/

---

## 💡 Tips & Tricks

### Development
```bash
# Fast refresh (HMR)
npm run dev
# Automatically reloads on save

# Debug in VS Code
# Set breakpoints and press F5

# Console logging
console.log(useAgroStore.getState())
```

### Production Build
```bash
# Minified bundle
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
npx vercel --prod
```

### Database
```sql
-- Check table structure
SELECT * FROM information_schema.tables 
WHERE table_schema='public';

-- Monitor connections
SELECT datname, count(*) FROM pg_stat_activity 
GROUP BY datname;
```

---

## 📞 Support Contacts

- **GitHub Issues:** For bug reports
- **Supabase Support:** For database issues
- **Vercel Support:** For deployment issues
- **React Discord:** For React questions

---

**Last Updated:** 2026-08-18  
**Version:** 1.0.0  
**Status:** ✅ Active Development

