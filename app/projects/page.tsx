import { getStaticProjects } from '@/lib/projects-server';
import ProjectsSection from '@/components/projects-section';

export const revalidate = 3600; // Revalidate every hour

export default async function ProjectsPage() {
  const projects = await getStaticProjects();
  
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <ProjectsSection projects={projects} />
    </div>
  );
}
