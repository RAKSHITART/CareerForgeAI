/**
 * CareerForge skills catalog.
 *
 * One canonical list of skills, their categories and aliases. Everything that
 * compares skill names (profile entry, JD extraction, matching, resume upload
 * parsing) goes through this file so "ReactJS", "React.js" and "react" are the
 * same skill, and nobody has to type skill names by hand.
 *
 * Entry syntax:  "Canonical|alias|alias"
 *   leading "~"  => ambiguous word (e.g. Go, R, C, Express). Only detected in
 *                   free text when capitalised AND the line looks technical.
 */
import { SKILL_CATEGORIES } from "./types";

type Cat = (typeof SKILL_CATEGORIES)[number];

const RAW: Record<Cat, string[]> = {
  "Programming languages": [
    "JavaScript|JS|ECMAScript|ES6", "TypeScript|TS", "Python|Python3|Python 3", "Java|Core Java", "~C",
    "C++|CPP|Cpp", "C#|CSharp|C Sharp", "~Go|Golang", "~Rust", "Ruby", "PHP", "Kotlin", "~Swift", "Objective-C",
    "Dart", "Scala", "~R|R Programming|R language", "MATLAB", "Perl", "Bash|Shell Scripting|Shell|Bash Scripting",
    "PowerShell", "SQL|Structured Query Language", "PL/SQL|PLSQL", "T-SQL|TSQL", "HTML|HTML5", "CSS|CSS3",
    "SASS|SCSS", "Assembly", "Lua", "Haskell", "Elixir", "Julia", "Groovy", "Solidity", "VBA",
  ],
  Frameworks: [
    "React|React.js|ReactJS|React JS", "React Native", "Next.js|NextJS|Next JS", "Redux|Redux Toolkit", "Vue.js|Vue|VueJS|Vue JS",
    "Nuxt.js|Nuxt|NuxtJS", "Angular|AngularJS|Angular.js", "Svelte|SvelteKit", "jQuery", "Node.js|NodeJS|Node JS|Node",
    "~Express|Express.js|ExpressJS", "NestJS|Nest.js", "Fastify", "Django", "Flask", "FastAPI|Fast API", "~Spring|Spring Framework",
    "Spring Boot|SpringBoot", "Hibernate", "ASP.NET|ASP.NET Core|ASPNET", ".NET|.NET Core|DotNet|dotnet", "Ruby on Rails|Rails|RoR",
    "Laravel", "Symfony", "Flutter", "Ionic", "Electron", "Tailwind CSS|Tailwind|TailwindCSS", "Bootstrap", "Material UI|MUI",
    "GraphQL", "REST API|RESTful API|REST APIs|RESTful APIs|RESTful Services|REST", "gRPC", "WebSockets|WebSocket", "Socket.IO|Socket.io",
    "Prisma", "SQLAlchemy", "Jetpack Compose", "SwiftUI", "Three.js|ThreeJS", "D3.js|D3",
  ],
  Databases: [
    "PostgreSQL|Postgres|Postgre SQL", "MySQL|My SQL", "MariaDB", "MongoDB|Mongo|Mongo DB", "Redis", "SQLite|SQLite3", "Oracle Database|Oracle DB|Oracle",
    "Microsoft SQL Server|SQL Server|MSSQL|MS SQL", "Cassandra|Apache Cassandra", "DynamoDB|Dynamo DB", "Elasticsearch|Elastic Search", "Firebase|Firestore",
    "Supabase", "Neo4j", "Snowflake", "BigQuery|Big Query", "Amazon Redshift|Redshift", "NoSQL", "Database Design|Database Management|DBMS|RDBMS",
  ],
  "AI/ML": [
    "Machine Learning|ML", "Deep Learning|DL", "TensorFlow|Tensorflow", "PyTorch|Pytorch", "Keras", "scikit-learn|sklearn|scikit learn|Scikit-Learn",
    "NLP|Natural Language Processing", "Computer Vision|CV", "OpenCV", "XGBoost", "Reinforcement Learning", "Hugging Face|HuggingFace|Transformers",
    "Time Series Analysis|Time Series", "Statistics|Statistical Analysis", "Feature Engineering", "MLOps",
  ],
  "Generative AI": [
    "Generative AI|GenAI|Gen AI", "LLMs|LLM|Large Language Models", "Prompt Engineering", "LangChain", "RAG|Retrieval Augmented Generation|Retrieval-Augmented Generation",
    "OpenAI API", "Vector Databases|Vector DB|Pinecone|ChromaDB",
  ],
  "Data analytics": [
    "Pandas", "NumPy|Numpy", "Matplotlib", "Seaborn", "Power BI|PowerBI", "Tableau", "~Excel|Microsoft Excel|MS Excel|Advanced Excel", "Data Analysis|Data Analytics",
    "Data Visualization|Data Visualisation", "ETL|ETL Pipelines", "Apache Spark|PySpark|Spark", "Hadoop", "Apache Airflow|Airflow", "Kafka|Apache Kafka",
    "dbt", "Looker", "A/B Testing|AB Testing", "Data Cleaning|Data Wrangling", "Jupyter|Jupyter Notebook|Jupyter Notebooks",
  ],
  "Software testing": [
    "Selenium|Selenium WebDriver", "Cypress", "Playwright", "Jest", "JUnit|Junit", "TestNG", "Pytest|PyTest", "Mocha", "Postman", "API Testing",
    "Manual Testing", "Test Automation|Automation Testing", "Unit Testing", "Integration Testing", "Regression Testing", "Performance Testing", "JMeter|Apache JMeter",
    "Test-Driven Development|TDD", "Behavior-Driven Development|BDD", "Cucumber", "Test Cases|Test Case Design", "Bug Tracking|Defect Tracking", "Appium", "Load Testing",
  ],
  "Developer tools": [
    "Git", "GitHub", "GitLab", "Bitbucket", "VS Code|Visual Studio Code|VSCode", "IntelliJ IDEA|IntelliJ", "Eclipse", "Jira", "Confluence", "npm", "Yarn", "Webpack", "Vite",
    "Figma", "Swagger|OpenAPI", "Maven", "Gradle", "Postman API", "Linux|Ubuntu", "Unix", "Version Control", "Agile|Agile Methodology|Agile Development",
    "~Scrum|Scrum Methodology", "Kanban", "Code Review|Code Reviews", "Debugging", "Android Studio", "Xcode",
  ],
  "Cloud and infrastructure": [
    "AWS|Amazon Web Services", "Microsoft Azure|Azure", "Google Cloud|GCP|Google Cloud Platform", "Docker", "Kubernetes|K8s", "Terraform", "Ansible", "Jenkins",
    "GitHub Actions", "CI/CD|CICD|CI CD|Continuous Integration", "Nginx", "Apache HTTP Server|Apache Server", "Heroku", "Vercel", "Netlify", "DigitalOcean", "AWS Lambda|Lambda|Serverless",
    "AWS EC2|EC2", "AWS S3|S3", "Prometheus", "Grafana", "ELK Stack|ELK", "RabbitMQ", "Microservices|Microservice Architecture", "DevOps", "Helm", "Cloudflare", "Networking",
  ],
  "Core computer science": [
    "Data Structures|DSA|Data Structures and Algorithms", "Algorithms|Algorithm Design", "Object-Oriented Programming|OOP|OOPS|Object Oriented Programming|Object-Oriented Design",
    "System Design|Systems Design|High-Level Design", "Low-Level Design|LLD", "Operating Systems|OS Concepts", "Computer Networks|Computer Networking", "Design Patterns",
    "Multithreading|Concurrency|Multi-threading", "Distributed Systems", "Compiler Design", "Computer Architecture", "Cryptography", "Cybersecurity|Information Security|Application Security",
    "Functional Programming", "Software Architecture", "Authentication|JWT|OAuth|OAuth2", "Web Development", "Mobile App Development|Mobile Development", "Responsive Design|Responsive Web Design",
  ],
  "Soft skills": [
    "Communication|Communication Skills|Verbal Communication|Written Communication|Verbal and Written Communication", "Teamwork|Team Work|Team Player|Collaboration|Team Collaboration",
    "Problem Solving|Problem-Solving|Analytical Skills|Analytical Thinking", "Critical Thinking", "Leadership|Team Leadership", "Time Management", "Adaptability|Flexibility",
    "Creativity", "Presentation Skills|Public Speaking|Presentation", "Mentoring|Mentorship", "Project Management", "Stakeholder Management", "Attention to Detail", "Self-Motivated|Self Motivated|Self-Starter",
    "Conflict Resolution", "Negotiation", "Customer Focus|Customer Service", "Ownership|Accountability",
  ],
  Other: [
    "Technical Writing|Documentation", "UI/UX Design|UI Design|UX Design|User Experience", "SEO", "Digital Marketing", "Business Analysis", "Product Management", "Blockchain", "IoT|Internet of Things",
    "Embedded Systems", "Game Development|Unity", "AR/VR",
  ],
};

export interface CatalogSkill {
  name: string;
  key: string;
  category: Cat;
  aliases: string[];
  ambiguous: boolean;
}

/** lower-case, strip spaces . _ - / so "Node.js" / "node js" / "NodeJS" share a key */
export function keyOf(s: string): string {
  return (s || "").toLowerCase().replace(/[\s._\-\/]+/g, "").trim();
}

function build(): CatalogSkill[] {
  const out: CatalogSkill[] = [];
  const seen = new Set<string>();
  for (const cat of SKILL_CATEGORIES) {
    for (const entry of RAW[cat] || []) {
      const ambiguous = entry.startsWith("~");
      const [name, ...aliases] = (ambiguous ? entry.slice(1) : entry).split("|").map((x) => x.trim()).filter(Boolean);
      const key = keyOf(name);
      if (seen.has(key)) continue; // first definition wins
      seen.add(key);
      out.push({ name, key, category: cat, aliases, ambiguous });
    }
  }
  return out;
}

export const SKILL_CATALOG: CatalogSkill[] = build();

const BY_KEY = new Map<string, CatalogSkill>();
for (const s of SKILL_CATALOG) {
  BY_KEY.set(s.key, s);
  for (const a of s.aliases) {
    const k = keyOf(a);
    if (!BY_KEY.has(k)) BY_KEY.set(k, s);
  }
}

/** Return the catalog skill for any spelling/alias, or null. */
export function findSkill(name: string): CatalogSkill | null {
  return BY_KEY.get(keyOf(name)) || null;
}

/** Canonical display name (catalog spelling when known, otherwise the trimmed input). */
export function canonicalName(name: string): string {
  const hit = findSkill(name);
  return hit ? hit.name : (name || "").trim().replace(/\s+/g, " ");
}

/** Stable comparison key. Known aliases collapse to the canonical key. */
export function canonicalKey(name: string): string {
  const hit = findSkill(name);
  return hit ? hit.key : keyOf(name);
}

export function categoryFor(name: string, fallback = "Other"): string {
  return findSkill(name)?.category || fallback;
}

export function searchCatalog(query: string, limit = 12, exclude: Set<string> = new Set()): CatalogSkill[] {
  const q = keyOf(query);
  if (!q) return [];
  const scored: { s: CatalogSkill; score: number }[] = [];
  for (const s of SKILL_CATALOG) {
    if (exclude.has(s.key)) continue;
    const names = [s.name, ...s.aliases].map(keyOf);
    let score = -1;
    if (names.some((n) => n === q)) score = 100;
    else if (names.some((n) => n.startsWith(q))) score = 60;
    else if (names.some((n) => n.includes(q))) score = 30;
    if (score >= 0) scored.push({ s, score: score - s.name.length * 0.01 });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}

export function skillsByCategory(): Record<string, CatalogSkill[]> {
  const out: Record<string, CatalogSkill[]> = {};
  for (const c of SKILL_CATEGORIES) out[c] = [];
  for (const s of SKILL_CATALOG) out[s.category].push(s);
  return out;
}

/**
 * Skills that a candidate is treated as covering when a JD asks for the parent
 * (an engine-specific DB skill covers a generic "SQL" request; TypeScript
 * covers a "JavaScript" request).
 */
export const IMPLIES: Record<string, string[]> = {
  sql: ["mysql", "postgresql", "sqlite", "oracledatabase", "microsoftsqlserver", "mariadb", "plsql", "tsql"],
  javascript: ["typescript"],
  databasedesign: ["mysql", "postgresql", "mongodb", "sqlite"],
  cicd: ["githubactions", "jenkins"],
  testautomation: ["selenium", "cypress", "playwright", "appium"],
};

// ---------------------------------------------------------------------------
// Detecting skills in free text (JDs, uploaded resumes)
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
const TECH_HINT = /(language|framework|librar|programming|develop|engineer|proficien|experience (with|in)|knowledge of|skills?|stack|tools?|technolog|familiar|expertise|hands-on|working with|using)/i;

interface Pattern { skill: CatalogSkill; term: string; re: RegExp; caseSensitive: boolean }
let PATTERNS: Pattern[] | null = null;

function patterns(): Pattern[] {
  if (PATTERNS) return PATTERNS;
  const list: Pattern[] = [];
  for (const s of SKILL_CATALOG) {
    for (const term of [s.name, ...s.aliases]) {
      // single letters / very short ambiguous aliases are never matched alone
      if (term.length < 2 && !s.ambiguous) continue;
      if (/^(JS|TS|ML|DL|CV|OS|S3|R|C)$/.test(term) && !s.ambiguous && term.length <= 2 && !["JS", "TS", "ML", "DL", "S3"].includes(term)) continue;
      const caseSensitive = s.ambiguous || /^[A-Z]{2,3}$/.test(term) || term.length <= 3;
      const body = esc(term).replace(/\\? /g, "[\\s\\-]+");
      const re = new RegExp(`(?<![A-Za-z0-9_+#.\\-/])${body}(?![A-Za-z0-9_+#])(?!\\.[A-Za-z0-9])`, caseSensitive ? "g" : "gi");
      list.push({ skill: s, term, re, caseSensitive });
    }
  }
  // longest terms first so "Spring Boot" wins over "Spring"
  list.sort((a, b) => b.term.length - a.term.length);
  PATTERNS = list;
  return list;
}

export interface SkillHit { skill: CatalogSkill; index: number; line: number }

/** Find catalog skills mentioned in text. Overlaps resolve to the longest term. */
export function detectSkills(text: string): SkillHit[] {
  const lines = text.split(/\r?\n/);
  const hits: SkillHit[] = [];
  let offset = 0;
  lines.forEach((line, lineNo) => {
    const taken: [number, number][] = [];
    const lineHits: { skill: CatalogSkill; index: number; ambiguous: boolean }[] = [];
    for (const p of patterns()) {
      p.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = p.re.exec(line))) {
        const start = m.index, end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        // "R&D", "R/D"
        if (p.term.length <= 2 && /^[&\/]/.test(line.slice(end))) continue;
        taken.push([start, end]);
        lineHits.push({ skill: p.skill, index: offset + start, ambiguous: p.skill.ambiguous });
      }
    }
    const strong = lineHits.filter((h) => !h.ambiguous).length;
    for (const h of lineHits) {
      if (h.ambiguous && !(strong >= 1 || TECH_HINT.test(line))) continue;
      hits.push({ skill: h.skill, index: h.index, line: lineNo });
    }
    offset += line.length + 1;
  });
  return hits;
}

// ---------------------------------------------------------------------------
// "Did you mean ...?" for custom skills
// ---------------------------------------------------------------------------
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Catalog skills spelled almost like the input (typos such as "Javscript"). */
export function suggestSimilar(input: string, limit = 3): CatalogSkill[] {
  const q = keyOf(input);
  if (q.length < 3 || findSkill(input)) return [];
  const max = q.length <= 5 ? 1 : 2;
  const scored: { s: CatalogSkill; d: number }[] = [];
  for (const s of SKILL_CATALOG) {
    const d = Math.min(...[s.name, ...s.aliases].map((n) => distance(q, keyOf(n))));
    if (d <= max) scored.push({ s, d });
  }
  return scored.sort((a, b) => a.d - b.d).slice(0, limit).map((x) => x.s);
}
