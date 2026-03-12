"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Menu, X } from 'lucide-react';
import { SkyToggle } from './ui/sky-toggle';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'About', href: '#about' },
        { name: 'Projects', href: '#projects' },
        { name: 'Journey', href: '#journey' },
        { name: 'Achievements', href: '#achievements' },
    ];

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}
        >
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className={`flex items-center justify-between rounded-full px-6 py-3 transition-all duration-300 ${scrolled ? 'glass shadow-lg border border-white/10 dark:border-white/5' : 'bg-transparent'}`}>

                    <Link href="/" className="font-bold text-xl tracking-tighter flex items-center gap-2 group">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500 group-hover:to-blue-500 group-hover:from-purple-500 transition-all duration-500">
                            AbG
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <SkyToggle />
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300"
                        >
                            <Github size={20} />
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-4">
                        <SkyToggle />
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 text-neutral-600 dark:text-neutral-300"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-full left-0 right-0 mt-2 px-4 origin-top"
                    >
                        <div className="glass rounded-2xl p-4 flex flex-col gap-4 border border-white/10 shadow-xl overflow-hidden">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-lg font-medium text-neutral-800 dark:text-neutral-200 py-2 border-b border-neutral-200 dark:border-neutral-800 hover:text-blue-500 dark:hover:text-blue-400 transition-colors last:border-0"
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-lg font-medium text-neutral-800 dark:text-neutral-200 py-2 hover:text-blue-500 dark:hover:text-blue-400"
                            >
                                <Github size={20} /> GitHub
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
