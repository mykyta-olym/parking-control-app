# 🚗 ParkMe - Smart Parking App for Košice

<div align="center">

![ParkMe Logo](./assets/images/icon.png)

**Intelligent parking solution for the city of Košice** 🇸🇰

[![Expo](https://img.shields.io/badge/Expo-54.0.22-black?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?logo=react&logoColor=white)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[Features](#-features) • [Admin Panel](#-admin-panel) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Development](#-development) • [Deployment](#-deployment)

</div>

---

## 📱 Overview

**ParkMe** is a modern, intelligent parking application designed specifically for the city of Košice. It helps users find available parking spots in real-time, navigate to their destination, and manage their favorite parking locations—all with a beautiful, smooth, and intuitive user interface.

### ✨ Key Highlights

- 🎯 **Real-time parking availability** with WebSocket updates
- 🗺️ **Interactive maps** with Google Maps integration
- ⭐ **Smart favorites system** with smooth animations
- 🔍 **Advanced search & filtering** with instant results
- 📍 **Geolocation support** with permission handling
- 🎨 **Beautiful UI/UX** with shimmer skeleton loaders and smooth animations
- 🌐 **Offline support** with intelligent caching
- ⚡ **Lightning-fast performance** with optimized rendering
- 🔐 **Admin Panel** for parking zone management and analytics

---

## 🚀 Features

### 🏠 Home Screen
- **Welcome banner** with personalized statistics
- **Parking areas overview** with color-coded availability
- **Favorite parkings** quick access (top 3)
- **Pull-to-refresh** functionality
- **Shimmer skeleton loaders** during data loading

### 🔍 Search & Filter
- **Instant search** with client-side filtering for fast results
- **Real-time API search** for comprehensive queries (3+ characters)
- **Area filters**: Západ, Stred, Mesto, Sever, Juh
- **Price filters**: Maximum price per hour with slider
- **Free parking filter**: Show only available spots
- **Smart filter management**: Prevents unwanted filter restoration
- **URL parameter support** for deep linking
- **Price display**: Properly formatted prices with currency (€/h)

### 🗺️ Map View
- **Interactive map** with Google Maps integration
- **Color-coded markers** based on availability:
  - 🟢 Green: >50% available
  - 🟠 Orange: 20-50% available
  - 🔴 Red: <20% available
- **Traffic layer toggle**
- **My location** button with geolocation support
- **Marker tap** shows parking details in bottom sheet
- **Fullscreen map mode** for immersive experience

### ⭐ Favorites
- **One-tap favorite** with smooth fly-in animations
- **Persistent storage** using AsyncStorage
- **Quick access** from home screen
- **Beautiful animations** when adding/removing favorites
- **Empty state** with helpful messaging

### 📍 Parking Details
- **Comprehensive information**: address, availability, pricing
- **Live updates** badge for real-time data
- **Interactive map** with parking location
- **Features list**: EV charging, disabled parking, etc.
- **Opening hours** information
- **Direct navigation** to parking location
- **Favorite toggle** from detail screen

### 🎨 User Experience
- **Smooth animations** powered by React Native Reanimated
- **Shimmer skeleton loaders** for all sections (modern loading effect)
- **Toast notifications** with debouncing to prevent UI lag
- **Offline banner** when network is unavailable
- **Stale data warnings** when cache is outdated
- **Loading screen** with animated splash
- **Rounded navigation bar** with system UI synchronization

### 🔧 Technical Features
- **Real-time updates** via WebSocket connection
- **Intelligent caching** with stale-while-revalidate pattern
- **Security validations** for all user inputs
- **Modal state management** to prevent conflicts
- **Safe area handling** for all device types
- **Edge-to-edge support** with proper system UI handling

---

## 🔐 Admin Panel

A comprehensive admin interface for managing parking zones and viewing analytics.

### 📊 Dashboard
- **Real-time statistics**: Total zones, spots, occupancy rate
- **Revenue tracking**: Daily revenue estimates
- **Districts overview**: Color-coded district cards with occupancy indicators
- **Quick navigation**: Most occupied / Most available zones
- **Clickable district cards**: Navigate to district analytics

### 🏢 District Analytics
- **Gradient headers** with district color theming
- **Statistics grid**: Total spots, free spots, occupancy rate
- **Peak hours visualization**: Badge display of busiest times
- **Daily/Hourly charts**: Occupancy patterns and revenue trends
- **Zone list**: All zones in the district with quick access

### 🅿️ Zone Management
- **Full CRUD operations**: Create, Read, Update, Delete zones
- **Advanced filtering**: By district, type, status
- **Sorting options**: Name, occupancy rate, free spots, total spots, price
- **Search**: Find zones by name or address
- **Bulk actions**: Enable/disable zones

### ➕ Create/Edit Zone
- **Comprehensive form**: Name, type, district, address, coordinates
- **Map picker**: Select GPS location visually with tap-to-select
- **Reverse geocoding**: Auto-fill address from selected map location
- **Pricing configuration**: Price per hour with currency selection
- **Opening hours**: Presets and custom input
- **Features selection**: EV charging, 24/7, disabled parking, etc.
- **Capacity management**: Total and occupied spots
- **Live preview**: See changes in real-time

### 📈 Analytics Screen
- **Occupancy trends**: Historical data visualization
- **Revenue reports**: Daily/weekly/monthly summaries
- **Zone performance**: Comparison charts
- **Export capabilities**: Data export options

### 🔑 Authentication
- **API Key**: `X-API-Key` header authentication
- **Secure endpoints**: All admin routes protected
- **Default dev key**: `dev-admin-key-a2f4e7c9d13b48e0b97f65c1a3d920ef`

---

## 🛠️ Tech Stack

### Core Technologies
- **[Expo SDK 54](https://docs.expo.dev/)** - Development platform
- **[React Native 0.81.5](https://reactnative.dev/)** - Mobile framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Expo Router](https://docs.expo.dev/router/introduction/)** - File-based routing
- **[React 19](https://react.dev/)** - UI library with React Compiler

### Key Libraries
- **[react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)** - Performant animations
- **[react-native-maps](https://github.com/react-native-maps/react-native-maps)** - Google Maps integration
- **[@gorhom/bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/)** - Bottom sheet modals
- **[zustand](https://zustand-demo.pmnd.rs/)** - State management
- **[expo-location](https://docs.expo.dev/versions/latest/sdk/location/)** - Geolocation & reverse geocoding
- **[react-native-toast-message](https://github.com/calintamas/react-native-toast-message)** - Toast notifications
- **[expo-navigation-bar](https://docs.expo.dev/versions/latest/sdk/navigation-bar/)** - System UI styling
- **[expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)** - Gradient backgrounds

### Development Tools
- **EAS Build** - Cloud builds
- **EAS Workflows** - CI/CD automation
- **Expo Updates** - OTA updates
- **ESLint** - Code linting

---

## 📦 Installation

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Expo CLI** (optional, included with npm scripts)
- **iOS Simulator** (for iOS development) or **Android Emulator** (for Android development)
- **EAS CLI** (for building and deployment)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ParkApp/Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (if needed)
   ```bash
   # Create .env file with necessary API keys
   EXPO_PUBLIC_API_URL=your_api_url
   EXPO_PUBLIC_WS_URL=your_websocket_url
   ```

4. **Start the development server**
   ```bash
   npm run start
   ```

---

## 💻 Development

### Available Scripts

```bash
# Start Expo development server
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web

# Lint code
npm run lint

# Publish preview update (workflow)
npm run draft

# Create development builds (workflow)
npm run development-builds

# Deploy to production (workflow)
npm run deploy
```

### Project Structure

```
Frontend/
├── app/                    # Expo Router file-based routing
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen
│   │   ├── search.tsx     # Search & filter screen
│   │   ├── map.tsx        # Map screen
│   │   ├── favorites.tsx  # Favorites screen
│   │   └── admin.tsx      # Admin dashboard
│   ├── admin/             # Admin panel screens
│   │   ├── _layout.tsx    # Admin layout
│   │   ├── analytics.tsx  # Analytics dashboard
│   │   ├── zones/         # Zone management
│   │   │   ├── index.tsx  # Zone list
│   │   │   ├── create.tsx # Create zone
│   │   │   └── [id].tsx   # Edit zone
│   │   └── districts/     # District management
│   │       ├── index.tsx  # District list
│   │       └── [id].tsx   # District analytics
│   ├── parking/
│   │   └── [id].tsx       # Parking detail screen
│   ├── map-fullscreen.tsx # Fullscreen map
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ParkingCard.tsx    # Parking card component
│   ├── AreaCard.tsx       # Area card component
│   ├── Header.tsx         # Header component
│   ├── Shimmer.tsx        # Shimmer animation component
│   ├── PriceFilterSheet.tsx
│   ├── ParkingPeekSheet.tsx
│   ├── SkeletonCard.tsx          # Shimmer skeleton for cards
│   ├── SkeletonAreaCard.tsx      # Shimmer skeleton for areas
│   ├── SkeletonMap.tsx           # Shimmer skeleton for map
│   ├── SkeletonParkingDetail.tsx # Shimmer skeleton for details
│   ├── SkeletonAdminDashboard.tsx# Shimmer skeleton for admin
│   └── ...
├── lib/                   # Utilities and APIs
│   ├── api.ts            # Public API client
│   ├── adminApi.ts       # Admin API client
│   ├── adminTypes.ts     # Admin TypeScript types
│   ├── cache.ts          # Caching utilities
│   ├── network.ts        # Network status
│   ├── toast.tsx         # Toast notifications
│   ├── security.ts       # Input validation
│   ├── types.ts          # TypeScript types
│   └── websocket.ts      # WebSocket service
├── store/                # State management (Zustand)
│   ├── favoritesStore.ts
│   └── modalStore.ts
├── constants/            # Constants
│   └── colors.ts         # Color palette
├── .eas/                 # EAS configuration
│   └── workflows/        # CI/CD workflows
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies
```

### Development Guidelines

- **TypeScript First**: All code is written in TypeScript with strict type checking
- **Component Patterns**: Use functional components with hooks
- **Animations**: Use `react-native-reanimated` for performant animations
- **State Management**: Use Zustand for global state, local state for component-specific state
- **Navigation**: Use Expo Router's file-based routing
- **Error Handling**: Implement proper error boundaries and validation
- **Performance**: Optimize with `useMemo`, `useCallback`, and proper dependency arrays
- **Skeleton Loaders**: Use Shimmer component for loading states

---

## 🚢 Deployment

### EAS Workflows

This project uses **EAS Workflows** for automated CI/CD:

#### Preview Deployment
```bash
npm run draft
```
Publishes a preview update that can be viewed in Expo Go or development builds.

#### Development Builds
```bash
npm run development-builds
```
Creates development builds for testing native modules.

#### Production Deployment
```bash
npm run deploy
```
Builds and submits to App Store and Google Play Store (requires store credentials).

### Build Profiles

Configured in `eas.json`:
- **development**: Development builds with dev client
- **preview**: Internal distribution preview builds
- **production**: Production builds with auto-increment

### Manual Builds

```bash
# Build for Android
npx eas-cli@latest build --platform android --profile preview

# Build for iOS
npx eas-cli@latest build --platform ios --profile preview
```

---

## 🎨 Design System

### Colors
- **Primary Gradient**: Purple (#7C6BE8) to Blue (#5B8DF4)
- **Status Colors**:
  - Green (#5BC8A4): High availability
  - Orange (#FFB366): Medium availability
  - Red (#FF8A80): Low availability
- **Background**: Light gray (#F8F9FA)
- **Text**: Dark (#1A1A1A)

### Animations
- **Entrance**: FadeInDown with spring easing
- **Exit**: FadeOutUp with timing
- **Layout**: Smooth layout transitions
- **Interactions**: Scale and opacity changes on press
- **Shimmer**: Animated loading skeleton effect

---

## 🔒 Security

- **Input Validation**: All user inputs are validated using security utilities
- **ID Validation**: Parking IDs are validated before API calls
- **XSS Prevention**: Sanitized display of user-generated content
- **Secure Storage**: Sensitive data stored securely with AsyncStorage
- **API Key Authentication**: Admin endpoints protected with API keys

---

## 📊 Performance Optimizations

- **Client-side filtering** for instant UI updates
- **Debounced API calls** to reduce server load
- **Shimmer skeleton loaders** to prevent UI freezing
- **Memoized components** to reduce re-renders
- **Optimized FlatList** rendering with proper key extraction
- **Image optimization** with expo-image
- **WebSocket connection** management with auto-reconnect

---

## 🐛 Troubleshooting

### Common Issues

**App not starting:**
- Clear cache: `npm run start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Maps not showing:**
- Verify Google Maps API key in `app.json`
- Check internet connection

**Build failures:**
- Check EAS CLI version: `npm install -g eas-cli@latest`
- Verify `eas.json` configuration

**Permission issues:**
- iOS: Check `Info.plist` for location permissions
- Android: Check `AndroidManifest.xml`

**Admin panel not loading:**
- Verify backend is running on correct port
- Check API key configuration

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Expo Team** for the amazing development platform
- **React Native Community** for excellent libraries
- **City of Košice** for providing parking data
- All contributors and testers

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

---

<div align="center">

**Made with ❤️ for the city of Košice**

[⬆ Back to Top](#-parkme---smart-parking-app-for-košice)

</div>
