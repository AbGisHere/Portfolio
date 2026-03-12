"use client";
import React, { useState, useEffect } from 'react';
import { Timeline } from './ui/timeline';
import DisplayCards from './ui/display-cards';
import { Github, ExternalLink, Star, Code, Rocket, RefreshCw } from 'lucide-react';
import { timelineData } from '@/lib/timeline-data';
import { TimelineEvent } from '@/lib/timeline-generator';

export default function JourneySection() {
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(timelineData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Use the same API endpoint as projects section
        const fetchTimelineData = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/projects');
                const data = await response.json();
                
                if (data.projects && data.projects.length > 0) {
                    // Generate timeline from the fetched projects
                    const { generateTimelineWithAchievements } = await import('@/lib/timeline-generator');
                    const dynamicTimeline = generateTimelineWithAchievements(data.projects);
                    
                    if (dynamicTimeline.length > 0) {
                        setTimelineEvents(dynamicTimeline);
                    }
                }
            } catch (error) {
                console.log('Using static timeline data');
            } finally {
                setLoading(false);
            }
        };

        fetchTimelineData();
    }, []);

    // Convert timeline events to timeline format with DisplayCards
    const formattedData = timelineEvents.map((event) => {
        // Check if this is a grouped event
        const isGroupedEvent = event.content.includes('events for');
        
        if (isGroupedEvent) {
            // Handle grouped events - create multiple cards
            const eventSections = event.content.split('---');
            const cards = eventSections.map((section, index) => {
                // Extract title (first bold text)
                const titleMatch = section.match(/\*\*(.*?)\*\*/);
                const title = titleMatch ? titleMatch[1] : '';
                
                // Extract description (remove markdown and icons)
                let description = section
                    .replace(/\*\*(.*?)\*\*/g, '')
                    .replace(/🚀|🔄|⭐|📝|📊|🔧|🔗|Live|GitHub|\[.*?\]\(.*?\)|Last major update to the project.|on \w+ \d+/g, '')
                    .replace(/\n\n/g, ' ')
                    .trim();
                
                // Limit description length
                if (description.length > 50) {
                    description = description.substring(0, 47) + '...';
                }

                // Determine event type from section
                const isStartEvent = section.includes('🚀') && section.includes('Started');
                const isUpdateEvent = section.includes('🔄') && section.includes('Updated');
                const isAchievement = section.includes('🏆') || section.includes('🌟');
                
                // Determine icon and colors based on event type
                let icon, iconClassName, titleClassName;
                
                if (isStartEvent) {
                    icon = <Rocket className="size-4 text-green-300" />;
                    iconClassName = "text-green-500";
                    titleClassName = "text-green-500";
                } else if (isUpdateEvent) {
                    icon = <RefreshCw className="size-4 text-blue-300" />;
                    iconClassName = "text-blue-500";
                    titleClassName = "text-blue-500";
                } else if (isAchievement) {
                    icon = <Star className="size-4 text-yellow-300" />;
                    iconClassName = "text-yellow-500";
                    titleClassName = "text-yellow-500";
                } else {
                    icon = <Code className="size-4 text-purple-300" />;
                    iconClassName = "text-purple-500";
                    titleClassName = "text-purple-500";
                }

                // Generate card positions for stacking
                const positions = [
                    "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
                    "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
                    "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10"
                ];

                return {
                    icon,
                    title: title,
                    description: description || "Project milestone",
                    date: getRelativeTime(event.title),
                    iconClassName,
                    titleClassName,
                    className: positions[index % positions.length]
                };
            });

            return {
                title: event.title,
                content: (
                    <div className="space-y-6">
                        <div className="flex min-h-[300px] w-full items-center justify-center overflow-visible">
                            <div className="relative w-full max-w-3xl overflow-visible">
                                <DisplayCards cards={cards} />
                            </div>
                        </div>
                    </div>
                )
            };
        } else {
            // Handle single events (original logic)
            const titleMatch = event.content.match(/\*\*(.*?)\*\*/);
            const projectName = titleMatch ? titleMatch[1] : '';
            
            // Extract description (remove markdown and icons)
            let description = event.content
                .replace(/\*\*(.*?)\*\*/g, '')
                .replace(/🚀|🔄|⭐|📝|📊|🔧|🔗|Live|GitHub|\[.*?\]\(.*?\)|Last major update to the project./g, '')
                .replace(/\n\n/g, ' ')
                .trim();
            
            // Limit description length
            if (description.length > 50) {
                description = description.substring(0, 47) + '...';
            }

            // Determine event type
            const isStartEvent = event.content.includes('🚀') && event.content.includes('Started');
            const isUpdateEvent = event.content.includes('🔄') && event.content.includes('Updated');
            const isAchievement = event.content.includes('🏆') || event.content.includes('🌟');
            
            // Determine icon and colors based on event type
            let icon, iconClassName, titleClassName;
            
            if (isStartEvent) {
                icon = <Rocket className="size-4 text-green-300" />;
                iconClassName = "text-green-500";
                titleClassName = "text-green-500";
            } else if (isUpdateEvent) {
                icon = <RefreshCw className="size-4 text-blue-300" />;
                iconClassName = "text-blue-500";
                titleClassName = "text-blue-500";
            } else if (isAchievement) {
                icon = <Star className="size-4 text-yellow-300" />;
                iconClassName = "text-yellow-500";
                titleClassName = "text-yellow-500";
            } else {
                icon = <Code className="size-4 text-purple-300" />;
                iconClassName = "text-purple-500";
                titleClassName = "text-purple-500";
            }

            // Generate card positions for stacking (matching original design)
            const positions = [
                "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
                "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
                "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10"
            ];

            const card = {
                icon,
                title: projectName,
                description: description || "Project milestone",
                date: getRelativeTime(event.title),
                iconClassName,
                titleClassName,
                className: positions[0] // Use first position for single card
            };

            return {
                title: event.title,
                content: (
                    <div className="space-y-6">
                        <div className="flex min-h-[300px] w-full items-center justify-center overflow-visible">
                            <div className="relative w-full max-w-3xl overflow-visible">
                                <DisplayCards cards={[card]} />
                            </div>
                        </div>
                    </div>
                )
            };
        }
    });

    return (
        <section id="journey" className="w-full relative">
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading journey...</p>
                </div>
            ) : timelineEvents.length > 0 ? (
                <Timeline data={formattedData} />
            ) : (
                <div className="text-center py-12">
                    <p className="text-neutral-600 dark:text-neutral-400">
                        No projects found. Configure your GitHub username in the environment variables to see your project journey.
                    </p>
                </div>
            )}
        </section>
    );
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}
