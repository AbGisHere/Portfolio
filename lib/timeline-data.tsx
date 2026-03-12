import { getProjects } from './data';
import { generateTimelineWithAchievements } from './timeline-generator';
import { TimelineEvent } from './timeline-generator';

export async function getTimelineData(): Promise<TimelineEvent[]> {
  try {
    const projects = await getProjects();
    return generateTimelineWithAchievements(projects);
  } catch (error) {
    console.error('Error generating timeline:', error);
    // Return empty array - no synthetic data
    return [];
  }
}

// For static builds - empty, will be populated dynamically
export const timelineData: TimelineEvent[] = [];
