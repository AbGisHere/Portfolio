"use client";
import React from 'react';
import { Timeline } from './ui/timeline';
import { timelineData } from '@/lib/data';

export default function JourneySection() {
    return (
        <section id="journey" className="w-full relative">
            <Timeline data={timelineData} />
        </section>
    );
}
