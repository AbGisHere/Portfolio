export interface GitHubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  homepage: string | null;
  language: string;
  languages?: string[]; // Multiple languages detected
  allLanguages?: Record<string, number>; // Language bytes for sorting
  topics: string[];
  stargazers_count: number;
  updated_at: string;
  created_at: string;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

export interface ProjectData extends GitHubRepo {
  customDescription?: string;
  customImage?: string;
  customLiveUrl?: string;
  featured: boolean;
  tags: string[];
  title?: string; // For backward compatibility
  image?: string; // For backward compatibility
  github?: string; // For backward compatibility
  live?: string; // For backward compatibility
}

// GitHub API configuration
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Optional: for higher rate limits

export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  try {
    // Check if GitHub username is configured
    if (!GITHUB_USERNAME || GITHUB_USERNAME === 'your_github_username' || GITHUB_USERNAME === 'YOUR_GITHUB_USERNAME') {
      throw new Error('GitHub username not configured. Please set GITHUB_USERNAME in your environment variables.');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    console.log(`Fetching repos for GitHub user: ${GITHUB_USERNAME}`);

    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USERNAME}/repos?type=owner&sort=updated&per_page=100`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const repos: GitHubRepo[] = await response.json();
    
    console.log(`Found ${repos.length} repositories for ${GITHUB_USERNAME}`);
    
    // Filter out forks and archived repos
    const filteredRepos = repos.filter(repo => !repo.fork && !repo.archived);
    
    console.log(`After filtering: ${filteredRepos.length} active repositories`);
    
    // Fetch languages for each repository
    const reposWithLanguages = await Promise.all(
      filteredRepos.map(async (repo) => {
        try {
          const languagesResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/languages`,
            { headers }
          );
          
          if (languagesResponse.ok) {
            const languages = await languagesResponse.json();
            // Convert languages object to array and sort by bytes (most used first)
            const languageArray = Object.keys(languages).sort((a, b) => 
              (languages[b] || 0) - (languages[a] || 0)
            );
            return { ...repo, languages: languageArray, allLanguages: languages };
          }
        } catch (error) {
          console.log(`Failed to fetch languages for ${repo.name}`);
        }
        return { ...repo, languages: repo.language ? [repo.language] : [], allLanguages: {} };
      })
    );
    
    return reposWithLanguages;
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    throw error;
  }
}

export function transformRepoToProject(repo: GitHubRepo, customData?: Partial<ProjectData>): ProjectData {
  // Combine multiple languages with topics for comprehensive tags
  const autoTags = [
    ...(repo.languages || []),
    ...repo.topics.slice(0, 3) // Limit topics to avoid too many tags
  ].filter(Boolean);

  return {
    ...repo,
    customDescription: customData?.customDescription || repo.description || `A ${repo.language || 'software'} project`,
    customImage: customData?.customImage || `https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800`,
    customLiveUrl: customData?.customLiveUrl || repo.homepage || '',
    featured: customData?.featured || false,
    tags: customData?.tags || autoTags.length > 0 ? autoTags : [repo.language].filter(Boolean),
    title: customData?.title || repo.name,
    image: customData?.image || `https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800`,
    github: customData?.github || repo.html_url,
    live: customData?.live || repo.homepage || '',
  };
}
