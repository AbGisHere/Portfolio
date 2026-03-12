import React from 'react';
import { Rocket, Shield, Brain, Terminal, Github, ExternalLink } from 'lucide-react';
import { fetchGitHubRepos, transformRepoToProject, ProjectData } from './github-api';
import { projectCustomizations, featuredProjects, excludedProjects } from './project-config';

// Fallback mock data for development or when GitHub API fails
// Fallback projects - empty since we'll use real GitHub projects
export const mockProjects: ProjectData[] = [];

// Function to get projects (combines GitHub API with manual customizations)
export async function getProjects(): Promise<ProjectData[]> {
  try {
    // Fetch repositories from GitHub
    const repos = await fetchGitHubRepos();
    
    // Transform repos to projects with customizations
    const projects = repos
      .filter(repo => !excludedProjects.includes(repo.name))
      .map(repo => {
        const customization = projectCustomizations[repo.name];
        const project = transformRepoToProject(repo, customization);
        
        // Set featured status
        project.featured = featuredProjects.includes(repo.name) || customization?.featured || false;
        
        return project;
      })
      .sort((a, b) => {
        // Sort featured projects first, then by last updated
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
      });
    
    return projects.length > 0 ? projects : mockProjects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    // Don't return mock projects, propagate the error so UI can show proper error message
    throw error;
  }
}

// Static projects for initial load - will be replaced with GitHub data
export const projects = [];

export const achievements = [
    {
        title: "1st Place - Global Hackathon",
        date: "Aug 2023",
        description: "Won first place among 500+ teams by building an innovative accessibility tool.",
        icon: "🏆"
    },
    {
        title: "Top Open Source Contributor",
        date: "2023 - Present",
        description: "Recognized as a leading contributor to major React ecosystem libraries.",
        icon: "🌟"
    },
    {
        title: "Google Developer Fellowship",
        date: "Jan 2024",
        description: "Selected for an elite fellowship program focusing on advanced cloud architectures.",
        icon: "🚀"
    }
];

export const timelineData = []; // Will be replaced with dynamic GitHub project timeline
