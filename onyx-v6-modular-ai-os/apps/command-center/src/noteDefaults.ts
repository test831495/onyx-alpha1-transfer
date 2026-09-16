// Curated, deterministic starter categories and tags. No AI or generated content.
export interface NoteCategoryGroup { readonly group: string; readonly categories: readonly string[]; }

export const DEFAULT_CATEGORY_GROUPS: readonly NoteCategoryGroup[] = [
  { group: "Work", categories: ["Architecture", "Design", "Development", "Testing", "Research", "Documentation", "Meetings", "Projects", "Operations", "Infrastructure", "Security", "Governance", "Roadmap", "Release Planning"] },
  { group: "Personal", categories: ["Personal", "Family", "Health", "Finance", "Travel", "Learning", "Shopping", "Home", "Ideas", "Journal"] },
  { group: "ONYX/NOVA", categories: ["Track A", "Track B", "Track C", "Track D", "Files", "Notes", "Memory", "Automation", "Character", "Council", "Voice", "Workspace", "Calendar", "Tasks", "Executive"] },
  { group: "Knowledge", categories: ["Reference", "Bookmark", "How-To", "Checklist", "Decision", "Lesson Learned", "Issue", "Risk", "Improvement", "Observation"] },
];

export const DEFAULT_CATEGORIES: readonly string[] = DEFAULT_CATEGORY_GROUPS.flatMap((entry) => entry.categories);

export const DEFAULT_TAGS: readonly string[] = ["important", "followup", "blocked", "approved", "review", "meeting", "research", "todo", "decision", "idea", "architecture", "bug", "fix", "enhancement", "release", "alpha", "beta", "production", "onyx", "nova"];

export const CREATE_NEW_CATEGORY_VALUE = "__create_new_category__";
