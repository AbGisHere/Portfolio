"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { achievements } from '@/lib/data';

export default function AchievementsSection() {
    return (
        <section id="achievements" className="py-24 px-4 max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
            >
                <span className="text-blue-400 text-sm font-mono tracking-widest uppercase mb-4 block">
          // wins & recognition
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
                    Achievements & <span className="gradient-text">Highlights</span>
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
                    A collection of moments where hard work paid off — hackathon wins, fellowships, open source, and more.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {achievements.map((ach, index) => (
                    <motion.div
                        key={ach.title}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.02 }}
                        className="group glass rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/40 transition-all"
                    >
                        <div className="text-3xl mb-3">{ach.icon}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-500 font-mono mb-2">{ach.date}</div>
                        <h3 className="font-bold text-neutral-900 dark:text-white mb-2 group-hover:text-blue-400 transition-colors">
                            {ach.title}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {ach.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
