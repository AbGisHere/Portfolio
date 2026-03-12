# Portfolio

A modern, responsive portfolio website built with Next.js 15, featuring an animated Three.js shader background, smooth dark/light mode transitions, and a beautiful glassmorphism design.

## ✨ Features

- **🎨 Modern Design**: Glassmorphism UI with smooth animations and transitions
- **🌓 Dark/Light Mode**: Seamless theme switching with animated toggle
- **🌌 Animated Shader Background**: Dynamic Three.js aurora/comet effects that respond to theme changes
- **📱 Responsive Design**: Fully responsive across all devices
- **⚡ Performance**: Optimized with Next.js 15 and TypeScript
- **🎭 Smooth Animations**: Framer Motion powered micro-interactions

## 🛠️ Tech Stack

### Core Framework
- **[Next.js](https://nextjs.org/)** 15.1.7 - React framework with App Router
- **[React](https://reactjs.org/)** 19.0.0 - UI library
- **[TypeScript](https://www.typescriptlang.org/)** 5.7.3 - Type safety

### Styling & UI
- **[Tailwind CSS](https://tailwindcss.com/)** 4.0.9 - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** 12.4.7 - Animation library
- **[Lucide React](https://lucide.dev/)** 0.475.0 - Icon library
- **[Styled Components](https://styled-components.com/)** 6.1.15 - Component styling

### 3D Graphics & Effects
- **[Three.js](https://threejs.org/)** 0.174.0 - 3D graphics library
- **[Next Themes](https://github.com/pacocoursey/next-themes)** 0.4.4 - Theme management

### Development Tools
- **[ESLint](https://eslint.org/)** 9.21.0 - Code linting
- **[PostCSS](https://postcss.org/)** - CSS processing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
portfolio/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # Main homepage
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   │   ├── sky-toggle.tsx       # Animated theme toggle
│   │   ├── sky-toggle.css       # Toggle styles
│   │   └── animated-shader-background.tsx  # Three.js shader
│   ├── navbar.tsx               # Navigation bar
│   ├── projects-section.tsx     # Projects showcase
│   ├── journey-section.tsx      # Career journey
│   ├── achievements-section.tsx # Achievements display
│   └── theme-provider.tsx       # Theme context provider
├── lib/                         # Utility libraries
├── public/                      # Static assets
├── styles/                      # Global styles
├── next.config.ts              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## 🎨 Components Overview

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

### Navigation Bar (`/components/navbar.tsx`)
Fixed header with:
- Glassmorphism design
- Sticky scroll behavior
- Mobile-responsive menu
- Theme toggle integration

## 🎯 Key Features Deep Dive

### Theme System
- **Context Provider**: Uses `next-themes` for seamless theme management
- **Shader Integration**: Background colors and effects respond to theme changes
- **Smooth Transitions**: CSS custom properties for consistent animations
- **SSR Safe**: Proper hydration handling prevents layout shifts

### Shader Effects
The animated background features:
- **Procedural Generation**: Mathematical noise functions for organic movement
- **Theme Colors**: Dynamic color interpolation based on current theme
- **Performance**: Optimized WebGL rendering with proper cleanup
- **Responsive**: Adapts to window resizing

### Animations
- **Micro-interactions**: Hover states and transitions throughout
- **Page Transitions**: Smooth entrance animations
- **Loading States**: Proper skeleton screens and placeholders
- **Mobile Optimized**: Touch-friendly interactions

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🎨 Design System

### Color Palette
- **Primary**: Blue to Purple gradients
- **Background**: Adapts to theme (light/dark)
- **Accent**: Glassmorphism effects

### Typography
- **Headings**: Custom font weights and tracking
- **Body**: System fonts for performance
- **Code**: Monospace for technical content

### Spacing
- **Base**: 4px grid system
- **Components**: Consistent padding/margins
- **Sections**: Responsive spacing units

## 🔧 Customization

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

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload .next folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Bundle Size**: Optimized with code splitting
- **Web Vitals**: Core Web Vitals compliant
- **Image Optimization**: Next.js Image component usage

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Three.js](https://threejs.org/) for 3D graphics capabilities
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Lucide](https://lucide.dev/) for beautiful icons
- [Next.js](https://nextjs.org/) for the excellent React framework

## 📞 Contact

- **Email**: hello@example.com
- **GitHub**: [github.com/username](https://github.com/username)
- **Portfolio**: [your-portfolio-url](https://your-portfolio-url)

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.