import { ProjectData } from './github-api';
import { achievements } from './data';

export interface TimelineEvent {
  title: string;
  content: string;
  date?: string;
}

export function generateTimelineFromProjects(projects: ProjectData[]): TimelineEvent[] {
  if (!projects || projects.length === 0) {
    return [];
  }

  // Create events for both creation and last push
  const allEvents: Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }> = [];

  projects.forEach((project) => {
    // Add creation date event
    if (project.created_at) {
      const createdDate = new Date(project.created_at);
      
      let createdContent = `**Started ${project.title || project.name}** 🚀\n\n`;
      
      // Add description
      if (project.customDescription || project.description) {
        createdContent += `${project.customDescription || project.description}\n\n`;
      }

      // Add technologies
      if (project.tags && project.tags.length > 0) {
        createdContent += `🔧 ${project.tags.join(', ')}\n\n`;
      }

      // Add links
      const links = [];
      if (project.html_url) {
        links.push(`[🔗 GitHub](${project.html_url})`);
      }
      if (project.customLiveUrl || project.live || project.homepage) {
        const liveUrl = project.customLiveUrl || project.live || project.homepage;
        links.push(`[🚀 Live](${liveUrl})`);
      }
      if (links.length > 0) {
        createdContent += `${links.join(' • ')}`;
      }

      allEvents.push({
        title: '', // Will be set by grouping
        content: createdContent,
        actualDate: createdDate,
        projectName: project.title || project.name,
        eventType: 'start'
      });
    }

    // Add last push date event (always show the most recent push)
    if (project.pushed_at && project.created_at) {
      const pushedDate = new Date(project.pushed_at);
      const createdDate = new Date(project.created_at);
      
      // Always show push if it's different from creation date
      const daysDiff = Math.floor((pushedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0) { // Show push if it's on or after creation (including same day)
        let pushedContent = `**Updated ${project.title || project.name}** 🔄\n\n`;
        
        // Add stats
        const stats = [];
        if (project.stargazers_count && project.stargazers_count > 0) {
          stats.push(`⭐ ${project.stargazers_count}`);
        }
        if (project.language) {
          stats.push(`📝 ${project.language}`);
        }
        if (stats.length > 0) {
          pushedContent += `📊 ${stats.join(' • ')}\n\n`;
        }

        pushedContent += `Last major update to the project.`;

        allEvents.push({
          title: '', // Will be set by grouping
          content: pushedContent,
          actualDate: pushedDate,
          projectName: project.title || project.name,
          eventType: 'push'
        });
      }
    }
  });

  // Sort all events by actual date (most recent first)
  allEvents.sort((a, b) => {
    return b.actualDate.getTime() - a.actualDate.getTime();
  });

  // Group events into smart time periods
  const groupedEvents = groupIntoTimePeriods(allEvents);

  // Remove the extra properties before returning
  return groupedEvents.map(({ actualDate, projectName, eventType, ...event }) => event);
}

function groupIntoTimePeriods(events: Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }>): Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }> {
  const groupedEvents: Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }> = [];
  const now = new Date();
  
  // Group events by smart time periods
  const timePeriods = new Map<string, Array<typeof events[0]>>();
  
  events.forEach(event => {
    const eventDate = new Date(event.actualDate);
    const periodLabel = getSmartTimePeriod(eventDate, now);
    
    if (!timePeriods.has(periodLabel)) {
      timePeriods.set(periodLabel, []);
    }
    timePeriods.get(periodLabel)!.push(event);
  });

  // Create grouped events for each time period
  timePeriods.forEach((periodEvents, periodLabel) => {
    if (periodEvents.length === 1) {
      // Single event - just set the period title
      const event = periodEvents[0];
      groupedEvents.push({
        ...event,
        title: periodLabel
      });
    } else {
      // Multiple events - create grouped content
      let groupedContent = `**${periodEvents.length} events**\n\n`;
      
      periodEvents.forEach((event, index) => {
        const eventTypeIcon = event.eventType === 'start' ? '🚀' : '🔄';
        const eventTypeText = event.eventType === 'start' ? 'Started' : 'Updated';
        
        groupedContent += `${eventTypeIcon} **${eventTypeText} ${event.projectName}**\n\n`;
        
        // Add brief description (first 100 chars)
        const briefDesc = event.content.replace(/\*\*(.*?)\*\*/g, '').replace(/🚀|🔄|⭐|📝|📊|🔧|🔗|Live|GitHub|\[.*?\]\(.*?\)|Last major update to the project./g, '').replace(/\n\n/g, ' ').trim();
        if (briefDesc.length > 0) {
          groupedContent += `${briefDesc.substring(0, 100)}${briefDesc.length > 100 ? '...' : ''}\n\n`;
        }
        
        if (index < periodEvents.length - 1) {
          groupedContent += `---\n\n`;
        }
      });

      // Use the most recent date for the group
      const latestDate = new Date(Math.max(...periodEvents.map(e => e.actualDate.getTime())));
      
      groupedEvents.push({
        title: periodLabel,
        content: groupedContent,
        actualDate: latestDate,
        projectName: 'Multiple Projects',
        eventType: 'grouped'
      });
    }
  });

  return groupedEvents;
}

function getSmartTimePeriod(eventDate: Date, now: Date): string {
  const diffTime = now.getTime() - eventDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Today
  if (diffDays === 0) {
    return 'Today';
  }
  
  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }
  
  // This week (within last 7 days)
  if (diffDays <= 7) {
    return 'This Week';
  }
  
  // Last week (8-14 days ago)
  if (diffDays <= 14) {
    return 'Last Week';
  }
  
  // This month (within current month)
  if (eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()) {
    return 'This Month';
  }
  
  // Last month (previous month)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  if (eventDate.getMonth() === lastMonth.getMonth() && eventDate.getFullYear() === lastMonth.getFullYear()) {
    return 'Last Month';
  }
  
  // This year (but different months)
  if (eventDate.getFullYear() === now.getFullYear()) {
    return eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  // Different years
  return eventDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupEventsDynamically(events: Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }>): Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }> {
  const groupedEvents: Array<TimelineEvent & { actualDate: Date; projectName: string; eventType: 'start' | 'push' | 'grouped' }> = [];
  const processedEvents = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i];
    const eventKey = `${currentEvent.projectName}-${currentEvent.actualDate.toDateString()}`;
    
    if (processedEvents.has(eventKey)) {
      continue;
    }

    // Look for related events to group
    const relatedEvents = [currentEvent];
    processedEvents.add(eventKey);

    // Check for events of the same project within 3 days
    for (let j = i + 1; j < events.length; j++) {
      const nextEvent = events[j];
      const nextEventKey = `${nextEvent.projectName}-${nextEvent.actualDate.toDateString()}`;
      
      if (processedEvents.has(nextEventKey)) {
        continue;
      }

      // If same project and within 3 days, group together
      if (nextEvent.projectName === currentEvent.projectName) {
        const daysDiff = Math.abs(currentEvent.actualDate.getTime() - nextEvent.actualDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDiff <= 3) {
          relatedEvents.push(nextEvent);
          processedEvents.add(nextEventKey);
        }
      }
    }

    // Create grouped event or individual event
    if (relatedEvents.length > 1) {
      // Create grouped event
      const latestDate = new Date(Math.max(...relatedEvents.map(e => e.actualDate.getTime())));
      const formattedDate = latestDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });

      let groupedContent = `**${relatedEvents.length} events for ${currentEvent.projectName}**\n\n`;
      
      relatedEvents.forEach((event, index) => {
        const eventTypeIcon = event.eventType === 'start' ? '🚀' : '🔄';
        const eventTypeText = event.eventType === 'start' ? 'Started' : 'Updated';
        
        // Only show date if it's different from the group date
        const eventDate = event.actualDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const groupDate = latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const showDate = eventDate !== groupDate;
        
        groupedContent += `${eventTypeIcon} **${eventTypeText}**${showDate ? ` on ${eventDate}` : ''}\n\n`;
        
        // Add brief description (first 100 chars)
        const briefDesc = event.content.replace(/\*\*(.*?)\*\*/g, '').replace(/🚀|🔄|⭐|📝|📊|🔧|🔗|Live|GitHub|\[.*?\]\(.*?\)|Last major update to the project./g, '').replace(/\n\n/g, ' ').trim();
        if (briefDesc.length > 0) {
          groupedContent += `${briefDesc.substring(0, 100)}${briefDesc.length > 100 ? '...' : ''}\n\n`;
        }
        
        if (index < relatedEvents.length - 1) {
          groupedContent += `---\n\n`;
        }
      });

      groupedEvents.push({
        title: formattedDate,
        content: groupedContent,
        actualDate: latestDate,
        projectName: currentEvent.projectName,
        eventType: 'grouped'
      });
    } else {
      // Single event, add as-is
      groupedEvents.push(currentEvent);
    }
  }

  return groupedEvents;
}

function groupProjectsIntoTimePeriods(projects: ProjectData[]): Array<{label: string, projects: ProjectData[]}> {
  if (projects.length === 0) return [];

  const periods: Array<{label: string, projects: ProjectData[]}> = [];
  const now = new Date();
  
  // Group by month first
  const projectsByMonth = new Map<string, ProjectData[]>();
  
  projects.forEach(project => {
    const date = new Date(project.pushed_at);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!projectsByMonth.has(monthKey)) {
      projectsByMonth.set(monthKey, []);
    }
    projectsByMonth.get(monthKey)!.push(project);
  });

  // Convert month map to sorted array
  const sortedMonths = Array.from(projectsByMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Sort descending
    .map(([monthKey, monthProjects]) => {
      const [year, month] = monthKey.split('-').map(Number);
      return {
        year,
        month,
        projects: monthProjects,
        date: new Date(year, month, 1)
      };
    });

  // Create dynamic time periods
  let currentPeriod: {label: string, projects: ProjectData[]} | null = null;
  
  for (let i = 0; i < sortedMonths.length; i++) {
    const monthData = sortedMonths[i];
    const monthName = monthData.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!currentPeriod) {
      // Start new period
      currentPeriod = {
        label: monthName,
        projects: [...monthData.projects]
      };
    } else {
      const currentProjectsCount = currentPeriod.projects.length;
      const newProjectsCount = monthData.projects.length;
      const totalProjects = currentProjectsCount + newProjectsCount;
      
      // If current period has 1-2 projects and adding this month makes it 3 or less, group together
      if (currentProjectsCount <= 2 && totalProjects <= 3) {
        // Check if months are consecutive
        const lastMonthDate = new Date(sortedMonths[i - 1].year, sortedMonths[i - 1].month, 1);
        const currentMonthDate = monthData.date;
        const monthsDiff = (lastMonthDate.getFullYear() - currentMonthDate.getFullYear()) * 12 + 
                           (lastMonthDate.getMonth() - currentMonthDate.getMonth());
        
        if (monthsDiff <= 2) { // Within 2 months
          // Update label to show range
          if (currentPeriod.projects.length === sortedMonths[i - 1].projects.length) {
            // First month in this group
            currentPeriod.label = monthName;
          } else {
            // Multiple months, create range
            const firstMonth = sortedMonths.find(m => 
              currentPeriod!.projects.some(p => 
                new Date(p.pushed_at).getFullYear() === m.year && 
                new Date(p.pushed_at).getMonth() === m.month
              )
            );
            if (firstMonth) {
              const firstMonthName = firstMonth.date.toLocaleDateString('en-US', { month: 'short' });
              const currentMonthName = monthData.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              currentPeriod.label = `${firstMonthName}-${currentMonthName}`;
            }
          }
          
          currentPeriod.projects.push(...monthData.projects);
        } else {
          // Too far apart, start new period
          periods.push(currentPeriod);
          currentPeriod = {
            label: monthName,
            projects: [...monthData.projects]
          };
        }
      } else if (currentProjectsCount >= 3) {
        // Current period has enough projects, close it and start new one
        periods.push(currentPeriod);
        currentPeriod = {
          label: monthName,
          projects: [...monthData.projects]
        };
      } else {
        // Add to current period
        currentPeriod.projects.push(...monthData.projects);
      }
    }
  }
  
  // Add the last period
  if (currentPeriod) {
    periods.push(currentPeriod);
  }

  return periods;
}

export function generateTimelineWithAchievements(projects: ProjectData[]): TimelineEvent[] {
  const projectTimeline = generateTimelineFromProjects(projects);
  
  // Add achievements to timeline
  const achievementEvents = achievements.map(achievement => ({
    title: achievement.date,
    content: `${achievement.icon} ${achievement.title}\n${achievement.description}`
  }));

  // Combine and sort by date
  const allEvents = [...projectTimeline, ...achievementEvents];
  
  return allEvents.sort((a, b) => {
    // Extract year from date string
    const getYear = (dateStr: string) => {
      const match = dateStr.match(/\d{4}/);
      return match ? parseInt(match[0]) : 0;
    };
    
    return getYear(b.title) - getYear(a.title);
  });
}
