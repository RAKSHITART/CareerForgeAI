import { canonicalKey } from "@/lib/skills-catalog";

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface GeneratedQuestion {
  questionIndex: number;
  questionText: string;
  category: string;
  difficulty: Difficulty;
  expectedKeyPoints: string[];
}

export interface InterviewContext {
  jdSkills?: string[];
  projects?: { title: string; technologies: string[] }[];
  count?: number;
  /** question texts already asked in this session: never repeated */
  excludeTexts?: string[];
  /** numbering continues from here when adding more questions */
  startIndex?: number;
}

type Q = { text: string; points: string[] };
type Tiered = Record<Difficulty, Q>;

/** Technical bank keyed by catalog key. One question per difficulty tier. */
const TECH: Record<string, { label: string; tiers: Tiered }> = {
  javascript: { label: "JavaScript", tiers: {
    BEGINNER: { text: "What is the difference between var, let and const, and when would you use each?", points: ["var is function-scoped and hoisted", "let and const are block-scoped", "const prevents reassignment, not mutation", "temporal dead zone"] },
    INTERMEDIATE: { text: "Explain closures and the event loop. How does an async function interact with the call stack and the microtask queue?", points: ["closure keeps access to outer scope", "call stack, task queue and microtask queue", "promises run as microtasks before the next task", "await suspends the function without blocking the thread"] },
    ADVANCED: { text: "How would you find and fix a memory leak in a long-running single page application?", points: ["heap snapshots and allocation timeline", "detached DOM nodes and forgotten listeners", "closures holding large objects, uncleared timers", "verify the fix by repeating the measurement"] } } },
  typescript: { label: "TypeScript", tiers: {
    BEGINNER: { text: "What problems does TypeScript solve compared with plain JavaScript?", points: ["static type checking at compile time", "better editor support", "interfaces and type aliases", "types are erased at runtime"] },
    INTERMEDIATE: { text: "Explain generics, union types and type narrowing with an example.", points: ["generics make reusable typed code", "union types and discriminated unions", "narrowing with typeof, in, custom guards", "avoiding any"] },
    ADVANCED: { text: "How do mapped and conditional types work, and when would you reach for them?", points: ["mapped types transform keys", "conditional types with infer", "utility types such as Partial and Pick", "trade-off between type cleverness and readability"] } } },
  react: { label: "React", tiers: {
    BEGINNER: { text: "What are props and state in React, and how do they differ?", points: ["props are inputs passed from the parent", "state is owned by the component", "props are read-only", "changing state triggers re-render"] },
    INTERMEDIATE: { text: "Explain how the virtual DOM and reconciliation work, and why keys matter in lists.", points: ["virtual DOM is an in-memory tree", "diffing finds minimal updates", "keys give items a stable identity", "index as key can cause bugs on reorder"] },
    ADVANCED: { text: "A React page is slow. How do you diagnose it and what would you change?", points: ["React Profiler to find slow renders", "memoisation with memo, useMemo, useCallback", "state colocation, avoid prop drilling re-renders", "code splitting and list virtualisation"] } } },
  nodejs: { label: "Node.js", tiers: {
    BEGINNER: { text: "What is Node.js and why is it described as non-blocking?", points: ["JavaScript runtime built on V8", "event-driven, non-blocking I/O", "single main thread with an event loop", "good for I/O-heavy workloads"] },
    INTERMEDIATE: { text: "How do you structure an Express/Node API with error handling and authentication?", points: ["routes, controllers, services separation", "centralised error middleware", "JWT or session auth with middleware", "input validation"] },
    ADVANCED: { text: "How would you scale a Node.js service that is CPU-bound or handling heavy traffic?", points: ["offload CPU work to worker threads or queues", "cluster / horizontal scaling behind a load balancer", "caching and connection pooling", "observability and backpressure"] } } },
  python: { label: "Python", tiers: {
    BEGINNER: { text: "What is the difference between a list, a tuple, a set and a dictionary?", points: ["lists are ordered and mutable", "tuples are ordered and immutable", "sets hold unique items", "dicts map keys to values"] },
    INTERMEDIATE: { text: "Explain generators, decorators and context managers, with a use for each.", points: ["generators yield lazily, saving memory", "decorators wrap functions", "context managers handle setup and cleanup (with)", "real use cases"] },
    ADVANCED: { text: "How does the GIL affect concurrency in Python and how do you work around it?", points: ["GIL allows one thread to run bytecode at a time", "threads suit I/O-bound work", "multiprocessing for CPU-bound work", "asyncio for many concurrent I/O tasks"] } } },
  java: { label: "Java", tiers: {
    BEGINNER: { text: "Explain the four pillars of object-oriented programming with Java examples.", points: ["encapsulation", "inheritance", "polymorphism", "abstraction"] },
    INTERMEDIATE: { text: "What is the difference between an abstract class and an interface, and how does the collections framework help?", points: ["interface defines a contract, abstract class shares state", "multiple interface implementation", "List, Set, Map and their implementations", "choosing by access pattern"] },
    ADVANCED: { text: "Explain how garbage collection and the Java memory model affect performance and thread safety.", points: ["heap generations and GC types", "happens-before and volatile", "synchronized and concurrent collections", "profiling GC pauses"] } } },
  sql: { label: "SQL", tiers: {
    BEGINNER: { text: "What is the difference between INNER JOIN and LEFT JOIN? Give a short example.", points: ["inner join keeps matching rows only", "left join keeps all left rows with NULLs", "join condition on keys", "example query"] },
    INTERMEDIATE: { text: "Explain indexes: how they speed up queries and what they cost.", points: ["index avoids full table scans", "B-tree structure", "slower writes and extra storage", "choose columns used in WHERE / JOIN"] },
    ADVANCED: { text: "A query on a large table is slow. How do you investigate and optimise it?", points: ["EXPLAIN / query plan", "missing or unused indexes", "rewrite joins and avoid SELECT *", "partitioning, caching, denormalisation trade-offs"] } } },
  mongodb: { label: "MongoDB", tiers: {
    BEGINNER: { text: "When would you choose a document database like MongoDB over a relational database?", points: ["flexible schema", "nested documents", "horizontal scaling", "trade-off: joins and transactions"] },
    INTERMEDIATE: { text: "How do you model one-to-many relationships in MongoDB: embed or reference?", points: ["embed for data read together", "reference for large or shared data", "document size limit", "query patterns drive design"] },
    ADVANCED: { text: "How do indexing and sharding work in MongoDB?", points: ["single, compound and text indexes", "shard key choice", "hot shard risk", "explain() to verify"] } } },
  git: { label: "Git", tiers: {
    BEGINNER: { text: "What is the difference between git merge and git rebase?", points: ["merge keeps history with a merge commit", "rebase rewrites commits onto a new base", "do not rebase shared branches", "when to use each"] },
    INTERMEDIATE: { text: "You pushed a bug to main. How do you undo it safely?", points: ["git revert creates an inverse commit", "reset rewrites history, unsafe on shared branches", "hotfix branch and PR", "communicate with the team"] },
    ADVANCED: { text: "Describe a branching and release strategy for a team of ten and why you would pick it.", points: ["trunk-based vs git-flow", "short-lived branches and code review", "CI checks before merge", "release tags and hotfixes"] } } },
  docker: { label: "Docker", tiers: {
    BEGINNER: { text: "What is the difference between a Docker image and a container?", points: ["image is a read-only template", "container is a running instance", "layers", "Dockerfile builds images"] },
    INTERMEDIATE: { text: "How do volumes, networks and docker-compose help in local development?", points: ["volumes persist data", "networks let containers talk by name", "compose defines multi-service apps", "environment variables"] },
    ADVANCED: { text: "How do you make a Docker image small, fast to build and secure?", points: ["multi-stage builds", "minimal base image", "layer caching order", "non-root user, scan images"] } } },
  restapi: { label: "REST APIs", tiers: {
    BEGINNER: { text: "What makes an API RESTful? Name the main HTTP methods and what they are for.", points: ["resources identified by URLs", "GET, POST, PUT/PATCH, DELETE", "stateless requests", "status codes"] },
    INTERMEDIATE: { text: "How would you design pagination, filtering and error responses for a REST API?", points: ["limit/offset or cursor pagination", "query parameters for filters", "consistent error body and status codes", "versioning"] },
    ADVANCED: { text: "How do you secure a public REST API and keep it reliable under load?", points: ["authentication and authorisation", "rate limiting", "input validation", "idempotency, caching, monitoring"] } } },
  html: { label: "HTML/CSS", tiers: {
    BEGINNER: { text: "What is semantic HTML and why does it matter?", points: ["meaningful tags such as header, nav, main", "accessibility for screen readers", "SEO", "maintainability"] },
    INTERMEDIATE: { text: "Explain the CSS box model and the difference between flexbox and grid.", points: ["content, padding, border, margin", "flexbox is one-dimensional", "grid is two-dimensional", "when to use each"] },
    ADVANCED: { text: "How do you build a responsive, accessible layout that performs well?", points: ["mobile-first and media queries", "ARIA and keyboard navigation", "image optimisation and lazy loading", "Core Web Vitals"] } } },
  selenium: { label: "Selenium", tiers: {
    BEGINNER: { text: "What is Selenium WebDriver and which locator strategies does it support?", points: ["automates browsers", "id, name, CSS, XPath", "prefer stable locators", "waits"] },
    INTERMEDIATE: { text: "How do you handle dynamic elements and flaky tests in Selenium?", points: ["explicit waits instead of sleep", "stable locators", "Page Object Model", "retry and isolation of test data"] },
    ADVANCED: { text: "How would you design a Selenium framework that scales across browsers and CI?", points: ["Page Object / layered design", "parallel execution and Grid", "reporting and screenshots", "CI integration"] } } },
  apitesting: { label: "API testing", tiers: {
    BEGINNER: { text: "What would you check when testing a REST endpoint?", points: ["status codes", "response body and schema", "headers and auth", "negative and boundary cases"] },
    INTERMEDIATE: { text: "How do you automate API tests and chain requests that depend on each other?", points: ["Postman collections or a code framework", "variables from earlier responses", "assertions", "run in CI"] },
    ADVANCED: { text: "How do you test an API for security and performance?", points: ["auth and authorisation checks", "injection and input fuzzing", "load testing and thresholds", "contract testing"] } } },
  testautomation: { label: "Test automation", tiers: {
    BEGINNER: { text: "What should be automated and what should stay manual?", points: ["repetitive regression tests", "stable, high-value flows", "exploratory testing stays manual", "cost versus benefit"] },
    INTERMEDIATE: { text: "Explain the testing pyramid and how you decide the mix of unit, integration and UI tests.", points: ["many unit tests, fewer UI tests", "speed and reliability", "integration at boundaries", "avoid over-testing the UI"] },
    ADVANCED: { text: "How do you measure and improve the value of a test suite?", points: ["flakiness rate", "coverage versus risk", "execution time", "failure triage"] } } },
  cicd: { label: "CI/CD", tiers: {
    BEGINNER: { text: "What are continuous integration and continuous delivery?", points: ["merge and test frequently", "automated build and tests", "automated delivery to environments", "faster feedback"] },
    INTERMEDIATE: { text: "Walk through a CI/CD pipeline you would set up for a web application.", points: ["lint, test, build stages", "artifact and deploy", "environment promotion", "rollback"] },
    ADVANCED: { text: "How do you do zero-downtime deployments and safe rollbacks?", points: ["blue/green or canary", "health checks", "database migration strategy", "feature flags"] } } },
  aws: { label: "AWS", tiers: {
    BEGINNER: { text: "What are EC2, S3 and IAM used for?", points: ["EC2 virtual servers", "S3 object storage", "IAM identities and permissions", "least privilege"] },
    INTERMEDIATE: { text: "How would you host a web app on AWS with a database, and what would you consider for availability?", points: ["compute choice", "managed database", "load balancer and multiple AZs", "backups"] },
    ADVANCED: { text: "How do you control cost and security in a growing AWS environment?", points: ["budgets and tagging", "IAM policies and SCPs", "monitoring and logging", "infrastructure as code"] } } },
  machinelearning: { label: "Machine learning", tiers: {
    BEGINNER: { text: "What is the difference between supervised and unsupervised learning?", points: ["labelled versus unlabelled data", "classification and regression", "clustering", "examples"] },
    INTERMEDIATE: { text: "What is overfitting and how do you detect and reduce it?", points: ["good on train, poor on validation", "train/validation split and cross-validation", "regularisation", "more data or simpler model"] },
    ADVANCED: { text: "How do you choose evaluation metrics for an imbalanced classification problem?", points: ["accuracy is misleading", "precision, recall, F1", "PR-AUC / ROC-AUC", "business cost of errors"] } } },
  datastructures: { label: "Data structures", tiers: {
    BEGINNER: { text: "Compare arrays and linked lists. When is each better?", points: ["array O(1) index access", "linked list O(1) insert at known node", "memory layout", "use cases"] },
    INTERMEDIATE: { text: "How does a hash map work, and what happens on a collision?", points: ["hash function maps key to bucket", "average O(1) lookup", "chaining or open addressing", "resizing"] },
    ADVANCED: { text: "Given a stream of data, how would you find the top K frequent items efficiently?", points: ["hash map for counts", "min-heap of size K", "time and space complexity", "approximate structures for huge streams"] } } },
  objectorientedprogramming: { label: "OOP", tiers: {
    BEGINNER: { text: "Explain encapsulation and polymorphism with a real-world example.", points: ["hide internal state", "same interface, different behaviour", "example", "benefits"] },
    INTERMEDIATE: { text: "Explain the SOLID principles and give one example you have applied.", points: ["single responsibility", "open/closed", "Liskov, interface segregation", "dependency inversion"] },
    ADVANCED: { text: "When would you prefer composition over inheritance?", points: ["tight coupling of inheritance", "flexibility of composition", "design patterns such as strategy", "example"] } } },
};

const ROLE_FAMILIES: { test: RegExp; keys: string[] }[] = [
  { test: /full[\s-]?stack/i, keys: ["javascript", "react", "nodejs", "sql", "restapi"] },
  { test: /front[\s-]?end|ui\b|react|web\s*(dev|design)/i, keys: ["javascript", "react", "html", "typescript"] },
  { test: /back[\s-]?end|server|api|java\b|node|python/i, keys: ["restapi", "sql", "nodejs", "java", "python"] },
  { test: /\bqa\b|test|sdet|quality/i, keys: ["selenium", "apitesting", "testautomation"] },
  { test: /data|ml\b|machine|\bai\b|analyst|scientist/i, keys: ["python", "sql", "machinelearning"] },
  { test: /devops|cloud|sre|infra|platform/i, keys: ["docker", "cicd", "aws", "git"] },
];
const GENERAL_KEYS = ["datastructures", "objectorientedprogramming", "sql", "git"];

const BEHAVIORAL: Q[] = [
  { text: "Tell me about a time you faced a difficult technical problem. How did you approach it, and what was the outcome?", points: ["clear situation and task", "specific actions you took", "result with evidence", "what you learned"] },
  { text: "Describe a time you disagreed with a teammate. How did you handle it?", points: ["listened to the other view", "focused on the goal not the person", "reached a decision", "relationship afterwards"] },
  { text: "Tell me about a time you missed a deadline or made a mistake. What did you do?", points: ["took ownership", "communicated early", "fixed the impact", "changed your process"] },
  { text: "Describe a time you had to learn something new quickly.", points: ["how you structured learning", "resources used", "applied it to real work", "outcome"] },
  { text: "Give an example of when you took the initiative without being asked.", points: ["noticed a problem or gap", "action you took", "impact", "collaboration"] },
  { text: "Tell me about a time you worked in a team under pressure.", points: ["your role", "how the team coordinated", "how you handled stress", "result"] },
];
const HR: Q[] = [
  { text: "Tell me about yourself and why you are interested in this role.", points: ["short relevant background", "key strengths and projects", "specific interest in the role/company", "forward-looking close"] },
  { text: "What are your strengths and one area you are working to improve?", points: ["real strength with example", "honest weakness", "steps taken to improve", "self-awareness"] },
  { text: "Why do you want to work for this company?", points: ["knowledge of the company/product", "alignment with your goals", "specific, not generic", "what you can contribute"] },
  { text: "Where do you see yourself in three to five years?", points: ["growth within the field", "learning goals", "realistic and honest", "link to the role"] },
  { text: "How do you prioritise work when you have several deadlines at once?", points: ["clarify priorities", "break down tasks", "communicate trade-offs", "example"] },
  { text: "Do you have any questions for us?", points: ["about team and expectations", "about growth and mentoring", "about success in the first months", "shows genuine interest"] },
];

function pick<T>(arr: T[], n: number): T[] { return arr.slice(0, Math.max(0, n)); }

export function generateInterviewQuestions(
  targetRole: string,
  targetCompany: string,
  interviewType: string,
  difficulty: Difficulty,
  candidateSkills: string[],
  ctx: InterviewContext = {}
): GeneratedQuestion[] {
  const total = Math.min(Math.max(ctx.count ?? 5, 3), 10);
  const out: Omit<GeneratedQuestion, "questionIndex">[] = [];
  const used = new Set<string>();
  const excluded = new Set(ctx.excludeTexts || []);

  // ---- technical question selection: JD skills, then candidate skills, then role family, then general ----
  const technical = (n: number): Omit<GeneratedQuestion, "questionIndex">[] => {
    const family = ROLE_FAMILIES.find((f) => f.test.test(targetRole))?.keys || [];
    const order = [...(ctx.jdSkills || []).map(canonicalKey), ...candidateSkills.map(canonicalKey), ...family, ...GENERAL_KEYS];
    const res: Omit<GeneratedQuestion, "questionIndex">[] = [];
    // first pass uses the requested difficulty; later passes use the other tiers so a longer interview
    // never repeats a question
    const tiers: Difficulty[] = [difficulty, ...(["INTERMEDIATE", "BEGINNER", "ADVANCED"] as Difficulty[]).filter((d) => d !== difficulty)];
    for (const tier of tiers) {
      for (const k of order) {
        if (res.length >= n) break;
        const key = k === "html" || k === "css" ? "html" : k;
        const item = TECH[key];
        const mark = `${key}:${tier}`;
        if (!item || used.has(mark) || excluded.has(item.tiers[tier].text)) continue;
        used.add(mark);
        const q = item.tiers[tier];
        res.push({ questionText: q.text, category: `Technical: ${item.label}`, difficulty: tier, expectedKeyPoints: q.points });
      }
      if (res.length >= n) break;
    }
    return res;
  };

  const project = (n: number): Omit<GeneratedQuestion, "questionIndex">[] => {
    const projects = ctx.projects || [];
    const res: Omit<GeneratedQuestion, "questionIndex">[] = [];
    const templates = (p: { title: string; technologies: string[] }): Q[] => [
      { text: `Walk me through your project "${p.title}". What problem did it solve and what exactly was your contribution?`, points: ["clear problem statement", "your own specific contribution", "key design decisions", "outcome or result"] },
      { text: `In "${p.title}", why did you choose ${p.technologies.slice(0, 2).join(" and ") || "your technology stack"}? What alternatives did you consider?`, points: ["reasons tied to requirements", "alternatives and trade-offs", "what you would change", "honest limitations"] },
      { text: `What was the hardest bug or challenge in "${p.title}", and how did you solve it?`, points: ["specific problem", "debugging approach", "the fix", "what you learned"] },
    ];
    for (let round = 0; res.length < n && round < 3; round++) {
      for (const p of projects) {
        if (res.length >= n) break;
        const q = templates(p)[round];
        if (excluded.has(q.text)) continue;
        res.push({ questionText: q.text, category: "Project deep-dive", difficulty, expectedKeyPoints: q.points });
      }
    }
    return res;
  };

  const fromBank = (bank: Q[], category: string, n: number) =>
    pick(bank.filter((q) => !excluded.has(q.text)), n).map((q) => ({ questionText: q.text, category, difficulty, expectedKeyPoints: q.points }));

  switch (interviewType) {
    case "BEHAVIORAL": out.push(...fromBank(BEHAVIORAL, "Behavioral (STAR)", total)); break;
    case "HR": out.push(...fromBank(HR, "HR", total)); break;
    case "PROJECT_BASED": {
      out.push(...project(total));
      if (out.length < total) out.push(...technical(total - out.length));
      break;
    }
    case "MIXED": {
      const t = Math.ceil(total * 0.5), p = Math.floor(total * 0.25), h = total - t - p;
      out.push(...technical(t), ...project(p), ...fromBank(HR, "HR", Math.max(1, Math.ceil(h / 2))), ...fromBank(BEHAVIORAL, "Behavioral (STAR)", Math.max(0, h - Math.ceil(h / 2))));
      break;
    }
    default: // TECHNICAL, ROLE_SPECIFIC
      out.push(...technical(total));
  }
  // top up when a pool ran short (e.g. no projects): unused technical, then behavioral, then HR questions
  const have = () => new Set(out.map((q) => q.questionText));
  if (out.length < total) out.push(...technical(total - out.length));
  for (const [bank, cat] of [[BEHAVIORAL, "Behavioral (STAR)"], [HR, "HR"]] as [Q[], string][]) {
    if (out.length >= total) break;
    const h = have();
    out.push(...fromBank(bank.filter((q) => !h.has(q.text)), cat, total - out.length));
  }

  const first = (ctx.startIndex ?? 0) + 1;
  return out.slice(0, total).map((q, i) => ({ ...q, questionIndex: first + i }));
}
