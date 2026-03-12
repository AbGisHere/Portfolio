# Authentic Projects Setup Guide

This guide shows you how to configure your portfolio to display authentic GitHub projects with manual customizations.

## Quick Setup

### 1. Configure GitHub API

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and replace:
   - `your_github_username` with your actual GitHub username
   - Optional: Add a GitHub Personal Access Token for higher API rate limits

### 2. Customize Your Projects

Edit `lib/project-config.ts` to customize your projects:

```typescript
export const projectCustomizations = {
  'my-repo-name': {
    customDescription: 'Your custom project description',
    customImage: '/screenshots/my-project.png',
    customLiveUrl: 'https://my-project.vercel.app',
    featured: true,
    tags: ['React', 'TypeScript', 'Node.js']
  }
};

export const featuredProjects = [
  'my-repo-name',
  'another-cool-repo'
];

export const excludedProjects = [
  'old-test-repo',
  'project-dont-show'
];
```

### 3. Add Project Screenshots

1. Create a `public/screenshots/` directory
2. Add your project screenshots as PNG/JPG files
3. Reference them in `project-config.ts` using `/screenshots/filename.png`

### 4. Test Your Setup

Run your development server:
```bash
npm run dev
```

Your portfolio will now show:
- Real GitHub repositories (name, description, stars, etc.)
- Your custom descriptions, screenshots, and live URLs
- Featured projects highlighted with stars
- Proper GitHub links to your actual repositories

## Manual Data Entry (Alternative)

If you prefer not to use the GitHub API, you can manually edit `lib/data.tsx`:

1. Update the `mockProjects` array with your actual projects
2. Replace placeholder data with real project information
3. Add real GitHub URLs and live demo links
4. Use your own project screenshots

## Features

- **Real GitHub Data**: Repository names, descriptions, languages, stars
- **Manual Override**: Custom descriptions, screenshots, live URLs
- **Featured Projects**: Highlight your best work
- **Exclusion List**: Hide certain repositories
- **Fallback**: Shows mock data if GitHub API fails
- **Responsive**: Works on all screen sizes

## Troubleshooting

### GitHub API Rate Limits
- Without token: 60 requests/hour
- With token: 5,000 requests/hour
- Solution: Add `GITHUB_TOKEN` to `.env.local`

### Projects Not Showing
- Check GitHub username in `.env.local`
- Verify repository names in `project-config.ts`
- Check browser console for errors

### Screenshots Not Loading
- Ensure files are in `public/screenshots/`
- Check file paths in `project-config.ts`
- Verify file names are correct

## Next Steps

1. Add your GitHub username to `.env.local`
2. Customize `project-config.ts` with your repositories
3. Add project screenshots to `public/screenshots/`
4. Test the portfolio
5. Deploy to your preferred hosting platform
