import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // In a real app, you'd fetch from a database
    // For now, we'll read from a JSON file
    const configPath = join(process.cwd(), 'data', 'project-config.json');
    
    try {
      const fs = require('fs');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      return NextResponse.json({
        success: true,
        config
      });
    } catch (error) {
      // Return default config if file doesn't exist
      const defaultConfig = {
        excludedProjects: [],
        projectCustomizations: {}
      };
      
      return NextResponse.json({
        success: true,
        config: defaultConfig
      });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to load configuration'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();
    
    // Validate config structure
    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration format'
      }, { status: 400 });
    }
    
    // Ensure required fields exist
    const validatedConfig = {
      excludedProjects: Array.isArray(config.excludedProjects) ? config.excludedProjects : [],
      projectCustomizations: config.projectCustomizations || {}
    };
    
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data');
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save configuration to file
    const configPath = join(dataDir, 'project-config.json');
    await writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    
    // Update the actual project-config.ts file
    const projectConfigPath = join(process.cwd(), 'lib', 'project-config.ts');
    const configContent = `import { ProjectData } from './github-api';

// Auto-generated configuration from admin dashboard
export const projectCustomizations: Record<string, Partial<ProjectData>> = ${JSON.stringify(validatedConfig.projectCustomizations, null, 2)};

// Auto-generated from admin dashboard
export const featuredProjects: string[] = [
  // Add featured project names here
];

// Auto-generated from admin dashboard  
export const excludedProjects: string[] = ${JSON.stringify(validatedConfig.excludedProjects, null, 2)};
`;
    
    await writeFile(projectConfigPath, configContent);
    
    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: validatedConfig
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save configuration'
    }, { status: 500 });
  }
}
