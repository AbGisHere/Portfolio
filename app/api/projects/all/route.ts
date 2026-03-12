import { NextRequest, NextResponse } from 'next/server';
import { fetchGitHubRepos } from '@/lib/github-api';

export async function GET(request: NextRequest) {
  try {
    // Get ALL repositories without filtering
    const allRepos = await fetchGitHubRepos();
    
    return NextResponse.json({
      success: true,
      projects: allRepos,
      count: allRepos.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Error fetching all projects:', error);
    
    // Return fallback data
    const { mockProjects } = await import('@/lib/data');
    
    return NextResponse.json({
      success: false,
      projects: mockProjects,
      count: mockProjects.length,
      error: 'Failed to fetch all projects, using fallback data',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}
