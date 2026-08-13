# OnBozaruz - Comprehensive Application Analysis

**Date:** 2026-08-13  
**Platform:** Uzbekistan's First Instagram/TikTok-style Agro Marketplace

---

## 📋 EXECUTIVE SUMMARY

**OnBozaruz** is a modern, mobile-first web application for agricultural marketplace commerce in Uzbekistan. It combines Instagram/TikTok's social interface paradigm with marketplace functionality, enabling farmers and producers to:
- Create and share agricultural product listings
- Interact with other users (comments, likes, shares)
- Purchase/sell products through an integrated marketplace
- Manage orders and track transactions
- Access admin controls for platform moderation

---

## 🏗️ ARCHITECTURE OVERVIEW

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend Framework** | React | 19.2.8 |
| **Language** | TypeScript | 7.0.2 |
| **Build Tool** | Vite | 8.2.0 |
| **Styling** | TailwindCSS | 4.3.3 |
| **State Management** | Zustand | 5.0.14 |
| **Backend/Database** | Supabase | 2.112.2 |
| **Form Handling** | React Hook Form | 7.84.0 |
| **Validation** | Zod | 4.4.3 |
| **Animations** | Framer Motion | 12.43.0 |
| **Charts** | Recharts | 3.10.1 |
| **UI Icons** | Lucide React | 1.28.0 |

### Application Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Views (pages) + Components (reusable UI elements)           │
│  HomeFeedView, ProfileView, AdminView, MarketShopView       │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                    │
│  Zustand Store (useAgroStore)                               │
│  - User authentication state                                 │
│  - UI state (active tabs, modals)                           │
│  - Domain data (posts, products, users, orders)             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    API LAYER                                 │
│  Repository Pattern + Mock/Real HTTP clients                │
│  - authClient.ts (Supabase Auth)                            │
│  - http.ts (HTTP transport)                                 │
│  - mockServer.ts (Development mock API)                     │
│  - repositories/* (CRUD operations per entity)              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    DATA LAYER                                │
│  Supabase PostgreSQL database                               │
│  (or mock data in development)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

### Directory Hierarchy

```
src/
├── api/                          # API Integration Layer
│   ├── adminRepository.ts        # Admin operations
│   ├── authClient.ts             # Supabase authentication
│   ├── http.ts                   # HTTP client configuration
│   ├── index.ts                  # API exports
│   ├── mockDb.ts                 # Mock database for dev
│   ├── mockServer.ts             # Mock API server
│   ├── types.ts                  # Shared API types
│   └── repositories/             # Entity-specific CRUD
│       ├── categoriesRepository.ts
│       ├── commentsRepository.ts
│       ├── ordersRepository.ts
│       ├── postsRepository.ts
│       ├── productsRepository.ts
│       └── userInteractionsRepository.ts
│
├── components/                   # React Components
│   ├── [Modal Components]        # App modals
│   │   ├── CreatePostModal.tsx
│   │   ├── ProductDetailModal.tsx
│   │   ├── ContactSellerModal.tsx
│   │   ├── CommentSheetModal.tsx
│   │   ├── ShareModal.tsx
│   │   ├── EditListingModal.tsx
│   │   ├── CategoryExplorerModal.tsx
│   │   ├── SellerProfileModal.tsx
│   │   └── NotificationsDrawerModal.tsx
│   │
│   ├── [Navigation/Layout]
│   │   ├── InstagramHeader.tsx
│   │   ├── InstagramBottomNav.tsx
│   │   ├── DesktopLeftSidebar.tsx
│   │   ├── DesktopRightSidebar.tsx
│   │   └── InstallAppPrompt.tsx
│   │
│   ├── VideoReelsViewer.tsx      # Video reels display
│   │
│   ├── admin/                    # Admin Panel Components
│   │   ├── AdminDashboardTab.tsx
│   │   ├── AdminUsersTab.tsx
│   │   ├── AdminProductsTab.tsx
│   │   ├── AdminPostsTab.tsx
│   │   ├── AdminOrdersTab.tsx
│   │   ├── AdminCategoriesTab.tsx
│   │   ├── AdminMediaTab.tsx
│   │   ├── AdminReportsTab.tsx
│   │   ├── AdminAuditLogsTab.tsx
│   │   └── AdminSidebar.tsx
│   │
│   ├── create/                   # Post Creation Helpers
│   │   ├── constants.ts
│   │   ├── createPostDraft.ts
│   │   ├── formatting.ts
│   │   └── useCreatePostForm.ts
│   │
│   ├── home/                     # Home Feed Components
│   │   ├── FeedCard.tsx          # Main feed post card
│   │   ├── PostCard.tsx
│   │   ├── PostHeader.tsx
│   │   ├── PostFooter.tsx
│   │   ├── PostMedia.tsx
│   │   ├── PostActions.tsx
│   │   ├── CategoryCard.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── RegionFilter.tsx
│   │   ├── StoryBar.tsx
│   │   ├── AdvertisementCard.tsx
│   │   ├── TrendingCard.tsx
│   │   ├── QuickTipsCard.tsx
│   │   ├── ContactButtons.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingSkeleton.tsx
│   │
│   ├── profile/                  # User Profile Components
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── ProfileQuickNav.tsx
│   │   ├── ProfileListingsGrid.tsx
│   │   ├── ProfileAdminSubView.tsx
│   │   ├── ProfileSettingsSubView.tsx
│   │   ├── ProfileOrdersSubView.tsx
│   │   └── EditProfileSubView.tsx
│   │
│   └── ui/                       # Reusable UI Components
│       ├── Avatar.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       └── [...other UI primitives]
│
├── data/                         # Static Data
│   └── mockAgroData.ts          # Mock categories, regions, etc.
│
├── store/                        # State Management
│   └── useAgroStore.ts          # Zustand central store
│
├── utils/                        # Utility Functions
│   ├── cacheManager.ts          # Cache utilities
│   └── scrollLock.ts            # Scroll lock utilities
│
├── views/                        # Main Page Views
│   ├── HomeFeedView.tsx         # Main marketplace feed
│   ├── MarketShopView.tsx       # Shop/products view
│   ├── ProfileView.tsx          # User profiles
│   ├── SearchExploreView.tsx    # Search & discovery
│   ├── AdminView.tsx            # Admin dashboard
│   ├── AuthView.tsx             # Login/signup
│   └── AuthCallbackView.tsx     # OAuth callback
│
├── App.tsx                       # Root component
├── main.jsx                      # React DOM entry point
├── index.css                     # Global styles
└── vite-env.d.ts                # TypeScript env types

public/
├── manifest.webmanifest         # PWA manifest
└── sw.js                        # Service worker

.env.local                        # Environment config
package.json                      # Dependencies
tsconfig.json                     # TypeScript config
vite.config.js                    # Vite configuration
```

---

## 🎯 KEY FEATURES

### 1. **Social Feed (Instagram-Style)**
- Infinite scroll feed of agricultural products and posts
- Like/comment/share interactions
- Story bar at top
- Category and region filters
- Real-time notifications

### 2. **User Marketplace**
- Product listings with images/videos
- Seller profiles and ratings
- Order placement and tracking
- Price negotiation (contact seller)
- Search functionality

### 3. **User Profiles**
- Personal profile with stats (followers, listings, orders)
- Listings grid
- Order history
- Settings and preferences
- Admin capabilities (if user is admin)

### 4. **Admin Panel**
- User management (ban/promote)
- Product/Post moderation
- Order management
- Category management
- Media upload controls
- Reports and audit logs
- Dashboard analytics

### 5. **Content Creation**
- Create posts with text and media
- Upload images/videos
- Add product details (price, category, region)
- Draft saving
- Real-time preview

### 6. **Authentication**
- Email/password signup & login
- OAuth integration (via Supabase)
- Session management
- Auto-login from stored tokens

### 7. **Notifications**
- In-app notification drawer
- Toast messages
- Real-time updates

### 8. **Progressive Web App (PWA)**
- Offline capability
- Service worker integration
- Install prompts

---

## 💾 DATA MODEL (Supabase Schema)

Based on repository files, the application manages these entities:

### Core Entities

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   USERS     │◄──────┤   POSTS     │──────►│   COMMENTS   │
│             │       │             │       │              │
│ - id        │       │ - id        │       │ - id         │
│ - email     │       │ - userId    │       │ - postId     │
│ - username  │       │ - title     │       │ - userId     │
│ - avatar    │       │ - content   │       │ - text       │
│ - bio       │       │ - images    │       │ - createdAt  │
│ - region    │       │ - createdAt │       └──────────────┘
│ - isAdmin   │       └────┬────────┘
└─────────────┘            │
      ▲                    │
      │                    │
┌─────┴─────────┐      ┌───▼────────────┐    ┌──────────────┐
│  USER_INTER.  │      │  PRODUCTS      │    │   ORDERS     │
│               │      │                │    │              │
│ - userId      │      │ - id           │    │ - id         │
│ - postId      │      │ - sellerId     │    │ - buyerId    │
│ - type        │      │ - title        │    │ - sellerId   │
│ - createdAt   │      │ - price        │    │ - productId  │
└───────────────┘      │ - category     │    │ - quantity   │
                       │ - region       │    │ - totalPrice │
                       │ - images       │    │ - status     │
                       │ - createdAt    │    │ - createdAt  │
                       └────────────────┘    └──────────────┘

┌──────────────────┐
│  CATEGORIES      │
│                  │
│ - id             │
│ - name           │
│ - icon           │
│ - description    │
└──────────────────┘
```

---

## 🔄 USER FLOWS

### 1. Authentication Flow
```
User (Not Logged In)
  ↓
  Opens App → AuthView
  ↓
  [Email/Password Login] or [OAuth]
  ↓
  Supabase Authentication
  ↓
  Session Stored (Token in localStorage)
  ↓
  Restored Session on App Reload
  ↓
  Navigate to HomeFeedView
```

### 2. Create Post Flow
```
Logged-In User
  ↓
  Click "Create Post" Button
  ↓
  CreatePostModal Opens
  ↓
  [Fill: Title, Content, Select Category, Upload Media]
  ↓
  Submit & Validate (Zod)
  ↓
  API Call → postsRepository.createPost()
  ↓
  Zustand State Updated
  ↓
  New Post Appears in Feed
```

### 3. Browse & Interact Flow
```
User Viewing Feed
  ↓
  [See Posts with Images/Videos]
  ↓
  [Click Like/Comment/Share]
  ↓
  API Call → userInteractionsRepository
  ↓
  Zustand State Updated
  ↓
  UI Reflects Changes (Like count, etc.)
```

### 4. Purchase Product Flow
```
Buyer Viewing Product
  ↓
  Click "Contact Seller" or "Buy Now"
  ↓
  ContactSellerModal Opens
  ↓
  [Message or Order Details]
  ↓
  Submit Order
  ↓
  API Call → ordersRepository.createOrder()
  ↓
  Order Appears in Buyer's Profile
```

---

## 📊 STATE MANAGEMENT (Zustand Store)

### Key Store Slices

```typescript
{
  // Authentication
  isAuthenticated: boolean
  currentUser: User | null
  isAuthPromptOpen: boolean
  
  // Navigation
  activeTab: NavTab ('home' | 'search' | 'shop' | 'profile' | 'admin')
  activeSubView: SubView (profile subviews: settings, orders, etc.)
  
  // Modals & UI
  selectedCategoryModalId: string | null
  isCreatePostOpen: boolean
  isCommentSheetOpen: boolean
  toastMessage: string | null
  
  // Domain Data
  posts: Post[]
  products: Product[]
  users: User[]
  categories: Category[]
  comments: Comment[]
  orders: Order[]
  userInteractions: UserInteraction[]
  
  // Status & Loading
  loadingState: 'idle' | 'loading' | 'error'
  isOffline: boolean
  
  // Actions
  hydrateFromApi()           // Load initial data
  loginUser(email, password) // Login
  createPost(postData)       // Create post
  likePost(postId)           // Like post
  // ... 100+ actions
}
```

---

## 🔌 API Integration

### Development Mode
- **Mock API Server** (`mockServer.ts`)
- Uses mock database (`mockDb.ts`)
- Emulates all real endpoints
- Fast development without backend
- Triggered by `VITE_USE_MOCK_API=true`

### Production Mode
- **Supabase Backend**
  - Real PostgreSQL database
  - REST/Realtime APIs
  - Authentication managed by Supabase
  - File storage for images/videos

### Repository Pattern
Each entity has a dedicated repository:

```typescript
// Example: postsRepository.ts

export const postsRepository = {
  async getAllPosts(): Promise<Post[]>
  async getPostById(id: string): Promise<Post | null>
  async createPost(data: CreatePostInput): Promise<Post>
  async updatePost(id: string, data: UpdatePostInput): Promise<Post>
  async deletePost(id: string): Promise<void>
  async getPostsByUserId(userId: string): Promise<Post[]>
  async getPostsByCategory(categoryId: string): Promise<Post[]>
}
```

---

## 🚀 DEPLOYMENT

### Vercel (Recommended)
```bash
npx vercel --prod
```
Environment variables:
- `VITE_USE_MOCK_API=false`
- `VITE_SUPABASE_URL=https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-public-key`

### Netlify
1. Connect GitHub repo
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variables in Netlify settings

---

## ⚠️ CURRENT ISSUES & STATUS

### ✅ RESOLVED Issues (from ANALIZ_VA_SINTEZ.md)

1. **Video Audio Mixing** - FIXED
   - Inactive videos now have volume set to 0
   - Proper audio cleanup on component unmount
   - Extra safety checks for rapid swiping

2. **Category Management** - FIXED
   - Zustand state updates corrected
   - CRUD operations now working properly

### 🔴 ACTIVE Warnings (24 total, 2 fixed)

#### Unused Imports (13 instances)
- `AdminReportsTab.tsx`: AlertCircle, ExternalLink
- `AdminProductsTab.tsx`: ImageIcon, Sparkles
- `AdminCategoriesTab.tsx`: Search, ChevronLeft, ChevronRight
- `AdminPostsTab.tsx`: Ban, Filter, RefreshCw, AlertCircle
- `AdminMediaTab.tsx`: Unused variable `checkingCount`
- `AdminUsersTab.tsx`, `ProductDetailModal.tsx`, `ProfileView.tsx`

#### Unused Parameters (9 instances)
- Multiple `catch` blocks with unused `err` / `e`
- Unused parameters: `prev`, `adminEmail`, `onUnmute`
- Pattern: Should use `_paramName` convention

### 📋 RECOMMENDED FIXES

```typescript
// Pattern 1: Unused imports
// BEFORE
import { AlertCircle, ExternalLink } from 'lucide-react';
// AFTER (remove unused)
import { /* keep only used */ } from 'lucide-react';

// Pattern 2: Unused parameters
// BEFORE
catch (err) { /* err not used */ }
// AFTER
catch (_err) { /* signal intentional unused */ }

// Pattern 3: Unused catch variable
// BEFORE
catch (e) { }
// AFTER
catch (error) { console.error('Error occurred:', error); }
```

---

## 📈 PERFORMANCE CONSIDERATIONS

### Optimizations In Place
- ✅ Vite for fast dev/build
- ✅ Lazy loading components with React.lazy
- ✅ Zustand for efficient state updates
- ✅ TailwindCSS for minimal CSS bundle
- ✅ Mock API for instant dev feedback

### Potential Improvements
- 🔸 Add image compression/optimization
- 🔸 Implement pagination for large feeds
- 🔸 Add service worker caching strategies
- 🔸 Consider React Query for data fetching
- 🔸 Implement virtual scrolling for very long feeds

---

## 🔐 SECURITY

### Current Practices
✅ Input validation with Zod  
✅ Supabase Row Level Security (RLS)  
✅ Protected authentication tokens  
✅ TypeScript type safety  

### Recommendations
- 🔸 Implement CSRF protection
- 🔸 Add rate limiting on API calls
- 🔸 Sanitize user content before display
- 🔸 Implement image upload validation
- 🔸 Add server-side request validation

---

## 📱 RESPONSIVE DESIGN

- **Mobile-first approach** using TailwindCSS
- **Breakpoints**: sm, md, lg, xl (Tailwind defaults)
- **Navigation**: Bottom nav on mobile, sidebars on desktop
- **PWA Support**: Installable on mobile & desktop
- **Service Worker**: Offline capability via `sw.js`

---

## 🎓 CODE QUALITY

### Build Tools
- **Vite**: Lightning-fast build (HMR in <100ms)
- **TypeScript**: Full type safety
- **Oxlint**: Fast linting

### Commands
```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview built app locally
npm run lint      # Run linter
```

---

## 🔗 INTEGRATION POINTS

### External Services
1. **Supabase**
   - Database: PostgreSQL
   - Auth: Email/OAuth
   - Storage: File uploads

2. **Telegram** (Potential)
   - Notifications
   - Order updates
   - Customer support

3. **Payment Gateway** (Future)
   - Order payments
   - Seller payouts

---

## 🎯 NEXT STEPS / ROADMAP

### High Priority
1. Fix remaining linting warnings (unused imports/params)
2. Add real payment integration
3. Implement image optimization
4. Add comprehensive error boundaries

### Medium Priority
1. Enhanced search with full-text indexing
2. Real-time notifications with Supabase Realtime
3. Seller rating system
4. Advanced admin analytics

### Low Priority
1. Mobile app (React Native)
2. Seller dashboard (separate app)
3. Video transcoding (backend)
4. AI product recommendations

---

## 📞 SUPPORT & DOCUMENTATION

- **TypeScript Docs**: https://www.typescriptlang.org/
- **React Docs**: https://react.dev
- **Vite Guide**: https://vitejs.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Zustand**: https://zustand-demo.vercel.app
- **Supabase**: https://supabase.com/docs

---

**Generated:** 2026-08-13  
**Language:** TypeScript/React  
**Status:** ✅ Development Ready
