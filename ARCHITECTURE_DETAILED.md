# OnBozaruz - Arxitektura Tafsiliy Hisobot

## 🏛️ Imaratlı Arxitektura (Layered Architecture)

### Qatlama 1: Presentation Layer (UI)
```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                     │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │              React Components                     │   │
│  │  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │   │
│  │  │    Views    │  │  Modals  │  │  Sidebars  │  │   │
│  │  │             │  │          │  │            │  │   │
│  │  │ • Home      │  │• Create  │  │• Desktop   │  │   │
│  │  │ • Market    │  │• Detail  │  │  Left      │  │   │
│  │  │ • Profile   │  │• Contact │  │• Desktop   │  │   │
│  │  │ • Admin     │  │• Comment │  │  Right     │  │   │
│  │  │ • Search    │  │• Share   │  │            │  │   │
│  │  │ • Auth      │  │• Category│  │            │  │   │
│  │  └─────────────┘  └──────────┘  └────────────┘  │   │
│  │                                                   │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │         Reusable Components              │   │   │
│  │  │  Button │ Modal │ Badge │ Avatar │ Card │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Qatlama 2: State Management
```
┌─────────────────────────────────────────────────────────┐
│            STATE MANAGEMENT LAYER (Zustand)             │
│                                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │          useAgroStore (Central Store)             │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ UI State:                                    │  │  │
│  │  │ • activeTab (home|search|market|profile)  │  │  │
│  │  │ • activeSubView                            │  │  │
│  │  │ • Modals state (open/closed)              │  │  │
│  │  │ • Toast messages                          │  │  │
│  │  │ • Loading states                          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ Domain State:                               │  │  │
│  │  │ • posts []                                 │  │  │
│  │  │ • products []                              │  │  │
│  │  │ • orders []                                │  │  │
│  │  │ • categories []                            │  │  │
│  │  │ • cart {}                                  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ User State:                                 │  │  │
│  │  │ • currentUser (AuthUser | null)           │  │  │
│  │  │ • isAuthenticated                          │  │  │
│  │  │ • isAdminUser                              │  │  │
│  │  │ • likedPostIds []                          │  │  │
│  │  │ • savedPostIds []                          │  │  │
│  │  │ • followedSellerIds []                     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ Persistence:                               │  │  │
│  │  │ • LocalStorage (persist middleware)        │  │  │
│  │  │ • Cache Manager (IndexedDB ready)          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  Actions: CRUD operations, UI toggles,           │  │
│  │           Authentication, Cart management        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Qatlama 3: API/Logic Layer
```
┌─────────────────────────────────────────────────────────┐
│              API/BUSINESS LOGIC LAYER                    │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │            HTTP Transport Layer (http.ts)        │   │
│  │                                                   │   │
│  │  request<T>(method, url, body, options)         │   │
│  │  │                                               │   │
│  │  ├─ Production Mode:                            │   │
│  │  │  └─ Real HTTP requests to Supabase           │   │
│  │  │                                               │   │
│  │  └─ Development Mode:                           │   │
│  │     └─ Mock Server (mockServer.ts)             │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Repository Pattern (Entity CRUD)         │   │
│  │                                                   │   │
│  │  ┌─────────────┐  ┌──────────────┐             │   │
│  │  │ Posts       │  │ Products     │  ...        │   │
│  │  │ Repository  │  │ Repository   │             │   │
│  │  │             │  │              │             │   │
│  │  │ getAll()    │  │ getAll()     │             │   │
│  │  │ getById()   │  │ getById()    │             │   │
│  │  │ create()    │  │ create()     │             │   │
│  │  │ update()    │  │ update()     │             │   │
│  │  │ delete()    │  │ delete()     │             │   │
│  │  └─────────────┘  └──────────────┘             │   │
│  │                                                   │   │
│  │  Categories │ Comments │ Orders │ User        │   │
│  │  Interactions │ Admin Repository                │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │        Authentication Client (authClient.ts)     │   │
│  │                                                   │   │
│  │  Supabase Auth:                                 │   │
│  │  • signUpWithEmail()                            │   │
│  │  • loginWithEmail()                             │   │
│  │  • signInWithOAuth (Google, OneID)              │   │
│  │  • subscribeToAuthState()                       │   │
│  │                                                   │   │
│  │  Media Management:                              │   │
│  │  • uploadListingMedia()                         │   │
│  │  • uploadProfileMedia()                         │   │
│  │  • deleteListingMedia()                         │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Qatlama 4: Data Layer
```
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER                              │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Production (Supabase)                    │   │
│  │                                                   │   │
│  │  PostgreSQL Database:                           │   │
│  │  • Tables (10)                                  │   │
│  │  • Authentication (JWT)                         │   │
│  │  • Storage (Files/Images)                       │   │
│  │  • Realtime (Subscriptions)                     │   │
│  │  • Row Level Security (RLS)                     │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │      Development (Mock Database)                 │   │
│  │                                                   │   │
│  │  In-Memory Collections:                         │   │
│  │  • MockCollection<Post>                         │   │
│  │  • MockCollection<Product>                      │   │
│  │  • MockCollection<Order>                        │   │
│  │  • MockCollection<Category>                     │   │
│  │                                                   │   │
│  │  Methods:                                       │   │
│  │  • getAll()  → all items                        │   │
│  │  • findById() → single item                     │   │
│  │  • insert()  → add new                          │   │
│  │  • update()  → modify                           │   │
│  │  • deleteById() → remove                        │   │
│  │                                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagramm

### User Action → Component Update Flow

```
┌─────────────────┐
│  User Action    │
│  (Click, Type)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  React Component Event Handler      │
│  (onClick, onChange, etc.)          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Call Zustand Store Action          │
│  store.addPost(), store.likePost()  │
└────────┬────────────────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────┐            ┌──────────────────┐
    │  Update     │            │ Call Repository  │
    │  UI State   │            │ postsRepo.create │
    │             │            │                  │
    │ (instantly) │            └────────┬─────────┘
    └─────────────┘                     │
                                        ▼
                            ┌──────────────────────┐
                            │  HTTP Transport      │
                            │  request(POST, ...)  │
                            └────────┬─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
            ┌──────────────┐                  ┌──────────────┐
            │ Mock Server  │                  │ Supabase     │
            │ (DEV)        │                  │ (PROD)       │
            │              │                  │              │
            │ Process and  │                  │ Database     │
            │ Return JSON  │                  │ Operations   │
            └──────┬───────┘                  └──────┬───────┘
                   │                                 │
                   └─────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │  API Response        │
                    │  (Success/Error)     │
                    └────────┬─────────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │  Update Store        │
                    │  State               │
                    └────────┬─────────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │  Component           │
                    │  Re-renders          │
                    │  (useAgroStore())    │
                    └────────┬─────────────┘
                             │
                             ▼
                    ┌──────────────────────┐
                    │  UI Updated          │
                    │  for User            │
                    └──────────────────────┘
```

---

## 🔄 Component Lifecycle

### View Initialization

```
App.tsx
  │
  ├─ useEffect (mount)
  │  └─ hydrateFromApi()
  │      └─ Fetch data from store
  │          └─ Load posts, products, orders, categories
  │              └─ Update UI
  │
  ├─ useEffect (hash route parsing)
  │  └─ Parse URL hash
  │      └─ setActiveTab
  │          └─ Navigate to view
  │
  ├─ useEffect (online/offline)
  │  └─ Listen to connectivity
  │      └─ Retry on online
  │
  └─ Render active view
     │
     ├─ HomeFeedView
     │  ├─ Load posts from store
     │  ├─ Render feed components
     │  └─ Setup event listeners
     │
     ├─ ProfileView
     │  ├─ Load currentUser
     │  ├─ Load user's posts/orders
     │  └─ Show sub-views (orders, saved, etc.)
     │
     ├─ AdminView
     │  ├─ Check isAdminUser
     │  ├─ Load admin stats
     │  └─ Render admin panels
     │
     └─ [Other views...]
```

---

## 🔐 Authentication Flow

### OAuth (Google/OneID) Flow

```
1. User clicks "Sign in with Google"
   │
   ├─ App redirect to:
   │  https://accounts.google.com/o/oauth2/v2/auth?...params...
   │
2. Google shows login screen
   │
3. User enters credentials
   │
4. Google asks for permissions
   │
5. User authorizes
   │
6. Google redirects to callback URL:
   │  http://localhost:5173/auth/callback?code=xxx&state=yyy
   │
7. AuthCallbackView.tsx renders
   │
8. completeAuthCallback() called
   │  └─ Exchange code for session
   │      └─ Call Supabase
   │          └─ Get JWT token
   │              └─ Create user record
   │
9. Update Zustand store
   │  └─ currentUser
   │  └─ isAuthenticated = true
   │  └─ isAdminUser = false (default)
   │
10. Navigate to home
    │
11. User can now create posts, orders, etc.
```

### Email/Password Flow

```
Sign Up:
  User enters email + password
    │
    ├─ Validate with Zod schema
    │  └─ Check password strength
    │
    └─ authClient.signUpWithEmail(email, password)
        └─ Supabase creates auth user
            └─ Create profiles record
                └─ Send verification email
                    └─ Store JWT in localStorage
                        └─ Update store
                            └─ Show home

Sign In:
  User enters email + password
    │
    ├─ Validate
    │
    └─ authClient.loginWithEmail(email, password)
        └─ Supabase authenticates
            └─ Return JWT
                └─ Load profile data
                    └─ Update store
                        └─ Show home

Session Restore:
  Page reload
    │
    ├─ Check localStorage for token
    │
    └─ subscribeToAuthState() listener
        └─ If valid token found
            └─ Load user profile
                └─ Update store
                    └─ Render logged-in UI
```

---

## 📱 Component Communication Patterns

### Pattern 1: Props Drilling (Simple)
```typescript
Parent Component
  │
  ├─ Post data fetched
  ├─ Pass as prop
  │  │
  │  └─ PostCard (props)
  │      │
  │      ├─ Pass user data
  │      │  │
  │      │  └─ PostHeader (props)
  │      │      │
  │      │      └─ Render seller avatar
  │      │
  │      └─ Pass actions
  │         │
  │         └─ PostActions (props)
  │             │
  │             ├─ Like button
  │             ├─ Save button
  │             └─ Comment button
```

### Pattern 2: Context/Store (Complex)
```typescript
Component A
  │
  ├─ useAgroStore()
  │  └─ Read posts, cart, auth
  │
Modals
  │
  ├─ useAgroStore()
  │  └─ Show/hide, update state
  │
Sidebars
  │
  ├─ useAgroStore()
  │  └─ Navigation, user info
  │
All communicate through Zustand store
(No prop drilling needed)
```

### Pattern 3: URL-based Navigation
```
User clicks category
  │
  ├─ setActiveTab('home')
  ├─ setSelectedCategoryModalId(catId)
  │
Location hash changes
  │
  └─ Other components read hash
      └─ Update accordingly
```

---

## 🎯 Module Dependencies

### Dependency Graph

```
App.tsx
  ├─ views/
  │  ├─ HomeFeedView
  │  │  ├─ components/home/*
  │  │  ├─ store/useAgroStore
  │  │  └─ api/repositories/*
  │  │
  │  ├─ ProfileView
  │  │  ├─ components/profile/*
  │  │  ├─ store/useAgroStore
  │  │  └─ api/authClient
  │  │
  │  ├─ AdminView
  │  │  ├─ components/admin/*
  │  │  ├─ store/useAgroStore
  │  │  └─ api/adminRepository
  │  │
  │  └─ [Other views...]
  │
  ├─ components/
  │  ├─ Modals
  │  │  ├─ store/useAgroStore
  │  │  ├─ api/authClient
  │  │  └─ components/ui/*
  │  │
  │  ├─ Sidebars
  │  │  ├─ store/useAgroStore
  │  │  └─ components/ui/*
  │  │
  │  └─ [Other components...]
  │
  ├─ store/
  │  ├─ useAgroStore
  │  │  ├─ api/*
  │  │  ├─ data/mockAgroData
  │  │  ├─ utils/cacheManager
  │  │  └─ zustand/persist
  │  │
  │  └─ External: localStorage, IndexedDB
  │
  └─ api/
     ├─ http.ts
     │  ├─ mockServer.ts
     │  └─ fetch (browser API)
     │
     ├─ authClient.ts
     │  └─ @supabase/supabase-js
     │
     ├─ repositories/*
     │  └─ http.ts
     │
     └─ mockDb.ts
        └─ data/mockAgroData
```

---

## 🔌 Integration Points

### Frontend ↔ Backend Integration

```
Development Mode (VITE_USE_MOCK_API=true):
┌─────────────────────────────────────────────┐
│ React Components                             │
│         ↓                                    │
│ Zustand Store                               │
│         ↓                                    │
│ Repository Functions (postsRepository, etc) │
│         ↓                                    │
│ HTTP Transport (http.ts)                    │
│         ↓                                    │
│ Mock Server (mockServer.ts)                 │
│         ↓                                    │
│ Mock Database (mockDb.ts)                   │
│         ↓                                    │
│ Static Mock Data (data/mockAgroData.ts)    │
└─────────────────────────────────────────────┘

Production Mode (VITE_USE_MOCK_API=false):
┌─────────────────────────────────────────────┐
│ React Components                             │
│         ↓                                    │
│ Zustand Store                               │
│         ↓                                    │
│ Repository Functions                       │
│         ↓                                    │
│ HTTP Transport (http.ts)                    │
│         ↓                                    │
│ Supabase API (supabase.co/rest/v1)         │
│         ↓                                    │
│ PostgreSQL Database + Storage               │
│         ↓                                    │
│ Auth System (JWT, OAuth)                    │
└─────────────────────────────────────────────┘
```

---

## 🏃 Performance Optimization Paths

### Current Implementation
```
User Action
  → Zustand Store
  → Repository
  → HTTP (120ms delay in mock mode)
  → Response
  → Store Update
  → Component Re-render
Total: ~150-200ms
```

### Optimized Implementation (Recommended)
```
User Action
  → Update UI Optimistically
  → Zustand Store (instant)
  → Background: Repository + HTTP
  → Response validation
  → Confirm or Revert
Total Perceived: ~0ms (instant feedback)
```

### Caching Strategy
```
Cache Tiers:
  L1: Component state (React.useState) - Fastest
  L2: Zustand store (RAM) - Fast
  L3: IndexedDB (persistent) - Medium
  L4: Service Worker cache - For offline
  L5: Server cache (Supabase) - Shared
```

---

## 📋 Deployment Architecture

### Local Development
```
npm run dev
  ↓
Vite Dev Server (http://localhost:5173)
  ├─ HMR (Hot Module Replacement)
  ├─ Mock API (mockServer.ts)
  ├─ Mock DB (mockDb.ts)
  └─ TypeScript compilation on-the-fly
```

### Production Build
```
npm run build
  ↓
Vite Build
  ├─ TypeScript → JavaScript
  ├─ Minification & Tree-shaking
  ├─ Code splitting (Route-based)
  ├─ Asset optimization
  └─ Output: dist/

dist/
  ├─ index.html
  ├─ assets/
  │  ├─ main.xxx.js (main bundle)
  │  ├─ vendor.xxx.js (dependencies)
  │  └─ styles.xxx.css
  ├─ manifest.webmanifest (PWA)
  └─ sw.js (Service Worker)
```

### Deployment Targets
```
Vercel (Recommended)
  ├─ Auto-deploy on git push
  ├─ Built-in optimization
  ├─ Global CDN
  └─ Environment variables support

Netlify
  ├─ Similar to Vercel
  ├─ Good performance
  └─ Cost-effective

Self-hosted
  ├─ Docker container
  ├─ Nginx reverse proxy
  ├─ SSL certificate (Let's Encrypt)
  └─ Manual maintenance required
```

---

**Architecture Document Version:** 1.0  
**Last Updated:** 2026-08-18  
**Status:** ✅ Complete

