"use client";
import React, { useState, useEffect } from 'react';
import ProjectsSection from './projects-section';
import { Github } from 'lucide-react';
import { ProjectData } from '@/lib/github-api';
import { projects as staticProjects } from '@/lib/data';

export default function ProjectsWrapper() {
  const [projects, setProjects] = useState<ProjectData[]>(staticProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt to fetch on client if we have the environment variable
    if (process.env.NEXT_PUBLIC_GITHUB_USERNAME && process.env.NEXT_PUBLIC_GITHUB_USERNAME !== 'your_github_username') {
      setLoading(true);
      setError(null);
      fetch(`/api/projects`)
        .then(response => response.json())
        .then(data => {
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects);
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch(error => {
          console.error('Failed to fetch projects:', error);
          setError('Failed to fetch projects. Please check your GitHub username configuration.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError('GitHub username not configured. Please set NEXT_PUBLIC_GITHUB_USERNAME in your environment variables.');
    }
  }, []);

  if (error) {
    return (
      <section id="projects" className="w-full relative">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
              <Github className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              GitHub Projects Not Available
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
              {error}
            </p>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
              <p className="font-medium mb-2">To fix this:</p>
              <ol className="text-left space-y-1 list-decimal list-inside">
                <li>Add your GitHub username to your <code className="bg-neutral-200 dark:bg-neutral-700 px-1 rounded">.env</code> file</li>
                <li>Restart your development server</li>
                <li>Make sure your GitHub profile is public</li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <ProjectsSection projects={projects} loading={loading} />;
}
