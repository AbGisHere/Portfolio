import { getProjects } from './data';

// Server-side function for static generation
export async function getStaticProjects() {
  try {
    // Attempt to fetch real projects
    const projects = await getProjects();
    return projects;
  } catch (error) {
    console.error('Error fetching projects for static generation:', error);
    // Return fallback data
    const { mockProjects } = await import('./data');
    return mockProjects;
  }
}

// Client-side function with fallback
export async function getClientProjects() {
  try {
    // Only fetch on client if we have GitHub username
    if (typeof window !== 'undefined' && process.env.GITHUB_USERNAME) {
      const projects = await getProjects();
      return projects;
    }
    // Fall back to static data
    const { projects } = await import('./data');
    return projects;
  } catch (error) {
    console.error('Error fetching projects on client:', error);
    const { projects } = await import('./data');
    return projects;
  }
}
