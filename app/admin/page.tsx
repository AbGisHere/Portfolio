'use client';

import React, { useState, useEffect } from 'react';
import { Github, Eye, EyeOff, Edit2, Save, X, LogOut, Settings, ExternalLink } from 'lucide-react';
import { ProjectData } from '@/lib/github-api';

interface AdminProject extends ProjectData {
  showInPortfolio: boolean;
  customTitle?: string;
  customDescription?: string;
  customImage?: string;
  customLiveUrl?: string;
  customTags?: string[];
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Simple password authentication (in production, use proper auth)
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      
      // Load customizations from API
      const configResponse = await fetch('/api/admin/config');
      let config: { excludedProjects: string[]; projectCustomizations: Record<string, any> } = { 
        excludedProjects: [], 
        projectCustomizations: {} 
      };
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        config = configData.config || config;
      }
      
      // Get all projects (including hidden ones for admin)
      const allProjectsResponse = await fetch('/api/projects/all');
      let allProjects = data.projects;
      
      if (allProjectsResponse.ok) {
        const allData = await allProjectsResponse.json();
        allProjects = allData.projects;
      }
      
      const adminProjects = allProjects.map((project: ProjectData) => ({
        ...project,
        showInPortfolio: !config.excludedProjects.includes(project.name),
        customTitle: config.projectCustomizations[project.name]?.customTitle,
        customDescription: config.projectCustomizations[project.name]?.customDescription,
        customImage: config.projectCustomizations[project.name]?.customImage,
        customLiveUrl: config.projectCustomizations[project.name]?.customLiveUrl,
        customTags: config.projectCustomizations[project.name]?.tags || project.tags || [],
        tags: project.tags || [], // Ensure tags array exists
        // Also store GitHub language and topics for reference
        language: project.language,
        languages: project.languages || [],
        allLanguages: project.allLanguages || {},
        topics: project.topics || [],
      }));
      
      setProjects(adminProjects);
    } catch (error) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setProjects([]);
  };

  const toggleProjectVisibility = (projectName: string) => {
    setProjects(prev => prev.map(project => 
      project.name === projectName 
        ? { ...project, showInPortfolio: !project.showInPortfolio }
        : project
    ));
  };

  const updateProject = (projectName: string, updates: Partial<AdminProject>) => {
    setProjects(prev => prev.map(project => 
      project.name === projectName 
        ? { ...project, ...updates }
        : project
    ));
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Build configuration object
      const excludedProjects = projects
        .filter(p => !p.showInPortfolio)
        .map(p => p.name);
      
      const projectCustomizations = projects
        .filter(p => p.showInPortfolio)
        .reduce((acc, project) => {
          if (project.customTitle || project.customDescription || project.customImage || 
              project.customLiveUrl || project.customTags) {
            acc[project.name] = {
              ...(project.customTitle && { customTitle: project.customTitle }),
              ...(project.customDescription && { customDescription: project.customDescription }),
              ...(project.customImage && { customImage: project.customImage }),
              ...(project.customLiveUrl && { customLiveUrl: project.customLiveUrl }),
              ...(project.customTags && { tags: project.customTags }),
              featured: project.featured,
            };
          }
          return acc;
        }, {} as Record<string, any>);

      const config = { excludedProjects, projectCustomizations };
      
      // Save to API endpoint
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Configuration saved:', result);
        
        setSaving(false);
        setError('');
        alert('Configuration saved successfully! Refresh your portfolio to see changes.');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      setSaving(false);
      setError('Failed to save configuration');
      console.error('Save error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8 border border-neutral-200 dark:border-white/10">
            <div className="flex items-center gap-3 mb-8">
              <Github className="w-8 h-8 text-neutral-900 dark:text-white" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Portfolio Admin</h1>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter password"
                  required
                />
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-6 h-6 text-neutral-900 dark:text-white" />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Portfolio Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={saveConfiguration}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading projects...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/10 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Project Management</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                Toggle visibility and customize project information that appears in your portfolio.
              </p>
            </div>

            {projects.map((project) => (
              <div key={project.name} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/10 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {editingProject === project.name ? (
                            <input
                              type="text"
                              value={project.customTitle || project.name}
                              onChange={(e) => updateProject(project.name, { customTitle: e.target.value })}
                              className="px-3 py-1 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          ) : (
                            project.customTitle || project.name
                          )}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.showInPortfolio 
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          {project.showInPortfolio ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        <span>⭐ {project.stargazers_count} stars</span>
                        <span>🔧 {project.language}</span>
                        <span>📅 {new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>

                      {editingProject === project.name ? (
                        <textarea
                          value={project.customDescription || project.description || ''}
                          onChange={(e) => updateProject(project.name, { customDescription: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          rows={3}
                          placeholder="Project description..."
                        />
                      ) : (
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                          {project.customDescription || project.description || 'No description available'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleProjectVisibility(project.name)}
                        className={`p-2 rounded-lg transition-colors ${
                          project.showInPortfolio
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                        title={project.showInPortfolio ? 'Hide from portfolio' : 'Show in portfolio'}
                      >
                        {project.showInPortfolio ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => setEditingProject(editingProject === project.name ? null : project.name)}
                        className={`p-2 rounded-lg transition-colors ${
                          editingProject === project.name
                            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                        title={editingProject === project.name ? 'Done editing' : 'Edit project'}
                      >
                        {editingProject === project.name ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                      
                      <a
                        href={project.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="View on GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {editingProject === project.name && (
                    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Live Demo URL
                          </label>
                          <input
                            type="url"
                            value={project.customLiveUrl || project.live || project.homepage || ''}
                            onChange={(e) => updateProject(project.name, { customLiveUrl: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="https://your-project.vercel.app"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Screenshot Path
                          </label>
                          <input
                            type="text"
                            value={project.customImage || project.image || ''}
                            onChange={(e) => updateProject(project.name, { customImage: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="/screenshots/project-name.png"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Technology Tags (comma-separated)
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                            Auto-pulled: {project.languages?.length ? project.languages.join(', ') : project.language || 'No languages'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={project.customTags?.join(', ') || 
                                (project.tags && project.tags.length > 0 ? project.tags.join(', ') : 
                                 project.languages?.join(', ') || project.language || '')}
                          onChange={(e) => updateProject(project.name, { 
                            customTags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="React, TypeScript, Node.js"
                        />
                        <div className="mt-2 space-y-1">
                          {project.languages && project.languages.length > 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              <strong>All detected languages:</strong> {project.languages.join(', ')}
                            </p>
                          )}
                          {project.topics && project.topics.length > 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              <strong>GitHub topics:</strong> {project.topics.slice(0, 5).join(', ')}
                              {project.topics.length > 5 && ` +${project.topics.length - 5} more`}
                            </p>
                          )}
                          {project.allLanguages && Object.keys(project.allLanguages).length > 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              <strong>Language breakdown:</strong> {Object.entries(project.allLanguages)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 3)
                                .map(([lang, bytes]) => `${lang} (${Math.round(bytes/1024)}KB)`)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
