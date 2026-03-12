import React from 'react';
import { Rocket, Shield, Brain, Terminal, Github, ExternalLink } from 'lucide-react';

export const projects = [
    {
        title: "Project Alpha",
        description: "An AI-powered fullstack platform redefining user experiences. Built with Next.js, OpenAI, and Tailwind CSS.",
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
        tags: ["Next.js", "TypeScript", "AI", "Tailwind"],
        github: "https://github.com",
        live: "https://example.com",
        featured: true,
    },
    {
        title: "SecureVault",
        description: "A secure, end-to-end encrypted file sharing application ensuring absolute data privacy and integrity.",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
        tags: ["React", "Node.js", "Cryptography", "PostgreSQL"],
        github: "https://github.com",
        live: "https://example.com",
        featured: true,
    },
    {
        title: "NeuroFlow",
        description: "An elegant productivity dashboard with predictive analytics to optimize developer workflows seamlessly.",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
        tags: ["Vue", "Python", "D3.js"],
        github: "https://github.com",
        live: "https://example.com",
        featured: false,
    }
];

export const achievements = [
    {
        title: "1st Place - Global Hackathon",
        date: "Aug 2023",
        description: "Won first place among 500+ teams by building an innovative accessibility tool.",
        icon: "🏆"
    },
    {
        title: "Top Open Source Contributor",
        date: "2023 - Present",
        description: "Recognized as a leading contributor to major React ecosystem libraries.",
        icon: "🌟"
    },
    {
        title: "Google Developer Fellowship",
        date: "Jan 2024",
        description: "Selected for an elite fellowship program focusing on advanced cloud architectures.",
        icon: "🚀"
    }
];

export const timelineData = [
    {
        title: "2024",
        content: (
            <div>
            <p className= "text-neutral-800 dark:text-neutral-200 text-sm md:text-md font-normal mb-8" >
            Launched several successful open- source projects and led a team of 5 engineers to deliver a massive B2B SaaS platform used by Fortune 500s.
        </p>
    < div className = "grid grid-cols-2 gap-4" >
    <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=500"
            alt = "startup template"
            className = "rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-md"
    />
    <img
            src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=500"
            alt = "startup template"
            className = "rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-md"
    />
    </div>
    </div>
    ),
  },
{
    title: "2023",
        content: (
            <div>
            <p className= "text-neutral-800 dark:text-neutral-200 text-sm md:text-md font-normal mb-8" >
            Graduated with honors and immediately jumped into the startup world.Built MVP products that secured seed funding.
        </p>
                < div className = "grid grid-cols-2 gap-4" >
                    <img
            src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=500"
    alt = "startup template"
    className = "rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-md"
        />
        </div>
        </div>
    ),
},
{
    title: "2022",
        content: (
            <div>
            <p className= "text-neutral-800 dark:text-neutral-200 text-sm md:text-md font-normal mb-8" >
            Discovered my passion for frontend design and won my first hackathon.The addiction to building beautiful UI began here.
        </p>
                < div className = "grid grid-cols-2 gap-4" >
                    <img
            src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=500"
    alt = "startup template"
    className = "rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-md"
        />
        </div>
        </div>
    ),
},
];
