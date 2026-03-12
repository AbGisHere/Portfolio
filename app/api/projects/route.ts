import { NextRequest, NextResponse } from 'next/server';
import { getProjects } from '@/lib/data';
import { projectCustomizations, excludedProjects } from '@/lib/project-config';

export async function GET(request: NextRequest) {
  try {
    // Check if we have saved configuration
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), 'data', 'project-config.json');
    
    let customConfig: { excludedProjects: string[]; projectCustomizations: Record<string, any> } = { 
      excludedProjects: [], 
      projectCustomizations: {} 
    };
    
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        customConfig = JSON.parse(configData);
      }
    } catch (error) {
      console.log('No custom config found, using defaults');
    }
    
    // Get projects with customizations applied
    const projects = await getProjects();
    
    // Apply custom configuration
    const filteredProjects = projects
      .filter((project: any) => !customConfig.excludedProjects.includes(project.name))
      .map((project: any) => {
        const customization = customConfig.projectCustomizations[project.name];
        if (customization) {
          return {
            ...project,
            title: customization.customTitle || project.title || project.name,
            description: customization.customDescription || project.description,
            image: customization.customImage || project.image,
            live: customization.customLiveUrl || project.live || project.homepage,
            tags: customization.tags || project.tags,
            featured: customization.featured || project.featured,
          };
        }
        return project;
      });
    
    return NextResponse.json({
      success: true,
      projects: filteredProjects,
      count: filteredProjects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error fetching projects:', error);
    
    // Return fallback data
    const { mockProjects } = await import('@/lib/data');
    
    return NextResponse.json({
      success: false,
      projects: mockProjects,
      count: mockProjects.length,
      error: 'Failed to fetch GitHub projects, using fallback data',
      timestamp: new Date().toISOString()
    }, { status: 200 }); // Still return 200 so the UI can work
  }
}

export const revalidate = 3600; // Cache for 1 hour
