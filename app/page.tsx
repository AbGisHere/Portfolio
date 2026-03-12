'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/navbar';
import ProjectsSection from '@/components/projects-section';
import JourneySection from '@/components/journey-section';
import AchievementsSection from '@/components/achievements-section';
import { ArrowDown, Terminal, Code2, Cpu } from 'lucide-react';

// Dynamically import the Three.js heavy component to avoid SSR issues
const AnimatedShaderBackground = dynamic(
    () => import('@/components/ui/animated-shader-background'),
    { ssr: false }
);

export default function Home() {
    return (
        <main className="min-h-screen bg-neutral-50 dark:bg-[#030303] selection:bg-purple-500/30 overflow-hidden relative">
            <Navbar />

            {/* Hero Section */}
            <section className="relative min-h-[100svh] flex items-center justify-center pt-20 overflow-hidden">
                {/* Render Shader only in dark mode or globally depending on preference, we will render it globally but style it to fit */}
                <div className="absolute inset-0 z-0 opacity-40 dark:opacity-100 transition-opacity duration-1000">
                    <AnimatedShaderBackground />
                </div>

                {/* Light mode alternate gradient fallback (mostly obscured by shader in dark mode, visible beautifully in light mode) */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:hidden" />

                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass mb-8 animate-float">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium font-mono text-neutral-600 dark:text-neutral-300">Available for new opportunities</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-neutral-900 dark:text-white">
                        Transforming ideas into <br className="hidden md:block" />
                        <span className="gradient-text italic pr-4">digital realities.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto font-medium">
                        Full-stack engineer and designer obsessing over beautiful interfaces, scalable architectures, and seamless user experiences.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="#projects" className="w-full sm:w-auto px-8 py-4 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black font-bold text-sm tracking-wide hover:scale-105 transition-transform">
                            View My Work
                        </a>
                        <a href="#contact" className="w-full sm:w-auto px-8 py-4 rounded-full glass font-bold text-sm tracking-wide text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                            Contact Me
                        </a>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50 dark:opacity-70">
                    <span className="text-xs font-mono uppercase tracking-widest text-neutral-600 dark:text-neutral-400">Scroll</span>
                    <ArrowDown size={16} className="text-neutral-600 dark:text-neutral-400" />
                </div>
            </section>

            {/* About Section snippet */}
            <section id="about" className="py-24 px-4 w-full bg-white dark:bg-black/50 relative z-10 border-y border-neutral-200 dark:border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-8 text-neutral-900 dark:text-white">The Tech Arsenal</h2>
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-80">
                        <div className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300">
                            <Terminal size={32} className="text-neutral-800 dark:text-neutral-200" />
                            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">System Arc</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300">
                            <Code2 size={32} className="text-blue-500" />
                            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">Frontend UI</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300">
                            <Cpu size={32} className="text-purple-500" />
                            <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">AI Integration</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="relative z-10 bg-neutral-50 dark:bg-transparent">
                <ProjectsSection />
                <JourneySection />
                <AchievementsSection />
            </div>

            {/* Footer / Contact */}
            <footer id="contact" className="py-12 border-t border-neutral-200 dark:border-white/10 relative z-10 bg-white dark:bg-black">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-6 text-neutral-900 dark:text-white">Let&apos;s build something <span className="gradient-text">together</span>.</h2>
                    <a href="mailto:hello@example.com" className="inline-block text-xl font-mono text-blue-500 hover:text-purple-500 transition-colors mb-12">
                        hello@example.com
                    </a>
                    <p className="text-sm text-neutral-500">
                        © {new Date().getFullYear()} — Designed & Built with Next.js & Tailwind
                    </p>
                </div>
            </footer>
        </main>
    );
}
