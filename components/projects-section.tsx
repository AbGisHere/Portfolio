"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { projects } from '@/lib/data';
import { ExternalLink, Github, Star } from 'lucide-react';
import Image from 'next/image';
import { ProjectData } from '@/lib/github-api';

interface ProjectsSectionProps {
  projects?: ProjectData[];
  loading?: boolean;
}

export default function ProjectsSection({ projects: propProjects = projects, loading = false }: ProjectsSectionProps) {
    return (
        <section id="projects" className="py-24 px-4 max-w-7xl mx-auto relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="mb-16 md:flex justify-between items-end"
            >
                <div>
                    <span className="text-purple-400 text-sm font-mono tracking-widest uppercase mb-4 block">
            // public works
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
                        Featured <span className="gradient-text">Projects</span>
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 max-w-xl">
                        A selection of my recent work, focusing on beautiful interfaces, robust architectures, and AI integrations.
                    </p>
                </div>
                <motion.a
                    whileHover={{ x: 5 }}
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden md:flex items-center gap-2 text-neutral-900 dark:text-white font-medium group"
                >
                    View all on GitHub <ExternalLink size={16} className="text-neutral-400 group-hover:text-white transition-colors" />
                </motion.a>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {propProjects.map((project, index) => (
                    <motion.div
                        key={project.name || project.title}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -10 }}
                        className="group relative flex flex-col glass rounded-3xl overflow-hidden border border-neutral-200 dark:border-white/10"
                    >
                        {project.featured && (
                            <div className="absolute top-4 right-4 z-10 glass px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold text-yellow-500 dark:text-yellow-400">
                                <Star size={12} className="fill-yellow-500 dark:fill-yellow-400" /> Featured
                            </div>
                        )}

                        <div className="relative h-56 w-full overflow-hidden">
                            <div className="absolute inset-0 bg-neutral-900/20 group-hover:bg-transparent transition-colors z-10" />
                            <Image
                                src={project.customImage || project.image || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"}
                                alt={project.title || project.name}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        </div>

                        <div className="p-6 md:p-8 flex flex-col flex-grow">
                            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                                {project.title || project.name}
                            </h3>
                            <p className="text-neutral-600 dark:text-neutral-400 mb-6 flex-grow text-sm leading-relaxed">
                                {project.customDescription || project.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {project.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 text-xs font-mono rounded-full bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-white/5">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 mt-auto">
                                <a
                                    href={project.customLiveUrl || project.live || project.homepage || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 text-center py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold text-sm hover:scale-105 transition-transform"
                                >
                                    Visit Site
                                </a>
                                <a
                                    href={project.github || project.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2.5 rounded-xl bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    <Github size={20} />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.a
                whileHover={{ x: 5 }}
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="mt-8 md:hidden flex items-center justify-center gap-2 text-neutral-900 dark:text-white font-medium group"
            >
                View all on GitHub <ExternalLink size={16} className="text-neutral-400 group-hover:text-white transition-colors" />
            </motion.a>
        </section>
    );
}
