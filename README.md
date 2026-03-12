# Portfolio

A modern, responsive portfolio website built with Next.js 15, featuring authentic GitHub project integration, dynamic timeline with DisplayCards, animated Three.js shader background, smooth dark/light mode transitions, and a beautiful glassmorphism design.

## Features

- Authentic GitHub Projects: Real-time integration with your GitHub repositories
- Dynamic Timeline: Interactive timeline with DisplayCards showing project starts, updates, and achievements
- Smart Grouping: Intelligent time-based grouping (Today, This Week, This Month, etc.)
- Modern Design: Glassmorphism UI with smooth animations and transitions
- Dark/Light Mode: Seamless theme switching with animated toggle
- Animated Shader Background: Dynamic Three.js aurora/comet effects that respond to theme changes
- Responsive Design: Fully responsive across all devices
- Performance: Optimized with Next.js 15 and TypeScript
- Smooth Animations: Framer Motion powered micro-interactions
- Deployment Ready: Works on Vercel, Netlify, Railway, and more

## Tech Stack

### Core Framework
- Next.js 15.1.7 - React framework with App Router
- React 19.0.0 - UI library
- TypeScript 5.7.3 - Type safety

### Styling & UI
- Tailwind CSS 4.0.9 - Utility-first CSS framework
- Framer Motion 12.4.7 - Animation library
- Lucide React 0.475.0 - Icon library
- Styled Components 6.1.15 - Component styling

### 3D Graphics & Effects
- Three.js 0.174.0 - 3D graphics library
- Next Themes 0.4.4 - Theme management

### Development Tools
- ESLint 9.21.0 - Code linting
- PostCSS - CSS processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd portfolio
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure Environment Variables
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your GitHub username (IMPORTANT: Use username only, not full URL)
   GITHUB_USERNAME=your_github_username
   NEXT_PUBLIC_GITHUB_USERNAME=your_github_username
   NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open your browser
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
portfolio/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Main homepage
│   ├── layout.tsx               # Root layout
│   ├── api/projects/            # GitHub API endpoint
│   └── projects/                # Projects page
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   │   ├── sky-toggle.tsx       # Animated theme toggle
│   │   ├── sky-toggle.css       # Toggle styles
│   │   ├── animated-shader-background.tsx  # Three.js shader
│   │   ├── display-cards.tsx    # Dynamic timeline cards
│   │   └── timeline.tsx         # Timeline component
│   ├── navbar.tsx               # Navigation bar
│   ├── projects-section.tsx     # Projects showcase
│   ├── projects-wrapper.tsx     # Projects data wrapper
│   ├── journey-section.tsx      # Dynamic career journey
│   ├── achievements-section.tsx # Achievements display
│   └── theme-provider.tsx       # Theme context provider
├── lib/                         # Utility libraries
│   ├── github-api.ts            # GitHub API integration
│   ├── project-config.ts        # Project customizations
│   ├── projects-server.ts       # Server-side project handling
│   ├── timeline-generator.ts    # Dynamic timeline generation
│   ├── timeline-data.tsx        # Timeline data fetching
│   └── data.tsx                 # Project data and fallbacks
├── public/                      # Static assets
│   └── screenshots/             # Project screenshots
├── .env.example                 # Environment variables template
├── SETUP_GUIDE.md               # Setup instructions
├── DEPLOYMENT.md                # Deployment guide
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Components Overview

### Dynamic Timeline (`/components/journey-section.tsx`)
Interactive timeline featuring:
- Smart Time Grouping: Today, This Week, This Month, etc.
- DisplayCards Integration: Beautiful stacked cards for events
- Project Lifecycle: Shows repo starts and last pushes
- Achievement Integration: Mixed with project events
- Dynamic Content: Real-time GitHub data fetching

### DisplayCards (`/components/ui/display-cards.tsx`)
Modern card component with:
- Skewed Design: `-skew-y-[8deg]` for visual interest
- Hover Effects: Smooth transitions and grayscale to color
- Stacked Layout: Multiple cards with offset positioning
- Color Coding: Green for starts, blue for updates, yellow for achievements

### Sky Toggle (`/components/ui/sky-toggle.tsx`)
An animated theme switcher featuring:
- Sun/moon transition with stars and clouds
- Smooth cubic-bezier animations
- Theme-aware color schemes
- Responsive sizing

### Animated Shader Background (`/components/ui/animated-shader-background.tsx`)
Dynamic Three.js background with:
- Aurora/comet effects
- Theme-responsive colors
- Real-time animation loop
- Performance optimized

## Key Features Deep Dive

### Timeline System
- Event Types: Project starts, last pushes, and achievements
- Smart Grouping: Intelligent time-based categorization
- Real-time Data: Live GitHub API integration
- Visual Design: DisplayCards with hover animations
- Responsive Layout: Works across all screen sizes

### Theme System
- Context Provider: Uses `next-themes` for seamless theme management
- Shader Integration: Background colors and effects respond to theme changes
- Smooth Transitions: CSS custom properties for consistent animations
- SSR Safe: Proper hydration handling prevents layout shifts

### GitHub Integration
- Live Data: Real-time repository fetching
- Error Handling: User-friendly error messages
- Rate Limiting: Proper API usage management
- Security: Environment variable protection

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

## Design System

### Color Palette
- Primary: Blue to Purple gradients
- Background: Adapts to theme (light/dark)
- Accent: Glassmorphism effects

### Typography
- Headings: Custom font weights and tracking
- Body: System fonts for performance
- Code: Monospace for technical content

### Spacing
- Base: 4px grid system
- Components: Consistent padding/margins
- Sections: Responsive spacing units

## Customization

### Setting Up GitHub Projects

1. Configure Environment Variables
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your GitHub username (USERNAME ONLY, not URL)
   GITHUB_USERNAME=your_github_username
   NEXT_PUBLIC_GITHUB_USERNAME=your_github_username
   NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
   ```

2. Access Admin Dashboard
   - Navigate to `/admin` in your browser
   - Login with your admin password
   - Visually manage your projects

3. Customize Projects
   Use the admin dashboard to:
   - Toggle project visibility
   - Edit titles and descriptions
   - Add live demo URLs
   - Upload screenshots
   - Set technology tags

4. Alternative: Manual Configuration
   Edit `lib/project-config.ts` to personalize your projects:
   ```typescript
   export const projectCustomizations = {
     'your-repo-name': {
       customDescription: 'Your custom project description',
       customImage: '/screenshots/your-project.png',
       customLiveUrl: 'https://your-project.vercel.app',
       featured: true,
       tags: ['React', 'TypeScript', 'Node.js']
     }
   };
   ```

5. Add Screenshots
   ```bash
   mkdir public/screenshots
   # Add your project screenshots as PNG/JPG files
   ```

### Timeline Customization
- Event Types: Modify `lib/timeline-generator.ts` for custom event handling
- Time Periods: Adjust `getSmartTimePeriod()` function for custom grouping
- Card Styling: Update `components/ui/display-cards.tsx` for visual changes

### Adding New Sections
1. Create component in `/components/`
2. Import in `app/page.tsx`
3. Add navigation link in `navbar.tsx`

### Modifying Theme Colors
Update CSS custom properties in `components/ui/sky-toggle.css`:
```css
:root {
  --container-light-bg: #3D7EAE;
  --container-night-bg: #1D1F2C;
  /* ... */
}
```

### Shader Customization
Modify fragment shader in `components/ui/animated-shader-background.tsx`:
- Color uniforms
- Animation parameters
- Noise functions

## Deployment

This portfolio is deployment-ready with multiple options:

### Quick Deploy (Recommended)

**Vercel**
1. Connect your repository to [Vercel](https://vercel.com)
2. Add environment variables:
   - `GITHUB_USERNAME=your_github_username` (USERNAME ONLY)
   - `GITHUB_TOKEN=ghp_your_token` (optional)
3. Deploy - Vercel handles everything automatically

**Netlify**
1. Connect repository to [Netlify](https://netlify.com)
2. Add same environment variables
3. Build command: `npm run build`
4. Publish directory: `.next`

**Railway**
1. Connect repository to [Railway](https://railway.app)
2. Add environment variables
3. Railway auto-detects Next.js

### Manual Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables Required
```bash
GITHUB_USERNAME=your_github_username          # Required (USERNAME ONLY)
GITHUB_TOKEN=ghp_your_personal_access_token   # Optional (for higher rate limits)
```

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.**

## Performance

- Lighthouse Score: 95+ (Performance, Accessibility, Best Practices, SEO)
- Bundle Size: Optimized with code splitting
- Web Vitals: Core Web Vitals compliant
- Image Optimization: Next.js Image component usage

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js for 3D graphics capabilities
- Framer Motion for smooth animations
- Tailwind CSS for utility-first styling
- Lucide for beautiful icons
- Next.js for the excellent React framework

## Contact

- Email: hello@example.com
- GitHub: [github.com/username](https://github.com/username)
- Portfolio: [your-portfolio-url](https://your-portfolio-url)

---

Built with using Next.js, TypeScript, and modern web technologies.