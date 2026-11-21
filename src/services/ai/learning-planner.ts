import { StructuredRoadmapStage } from "@/lib/types";
import { canonicalKey, canonicalName, findSkill } from "@/lib/skills-catalog";

interface SkillKnowledgeBase {
  whyItMatters: string;
  beginnerTopics: string[];
  intermediateTopics: string[];
  advancedTopics: string[];
  exercises: {
    beginner: { title: string; description: string; minutes: number }[];
    intermediate: { title: string; description: string; minutes: number }[];
    advanced: { title: string; description: string; minutes: number }[];
  };
  miniProjects: {
    beginner: { title: string; problemStatement: string; requirements: string[] };
    intermediate: { title: string; problemStatement: string; requirements: string[] };
    advanced: { title: string; problemStatement: string; requirements: string[] };
  };
  resources: {
    title: string;
    provider: string;
    url: string;
    isFree: boolean;
  }[];
}

const CURATED_ROADMAPS: Record<string, SkillKnowledgeBase> = {
  selenium: {
    whyItMatters: "Selenium is the standard browser automation framework for QA, test engineering, and end-to-end regression testing across web applications.",
    beginnerTopics: ["WebDriver Architecture", "Locators (CSS, XPath, ID)", "Browser Navigation", "Basic Assertions"],
    intermediateTopics: ["Page Object Model (POM)", "Explicit vs Fluent Waits", "Handling Frames & Alerts", "Data-Driven Testing with JUnit/TestNG"],
    advancedTopics: ["Selenium Grid Distributed Execution", "Headless CI/CD Integration", "Performance Logging", "Dynamic Shadow DOM Automation"],
    exercises: {
      beginner: [
        { title: "Automate Login Flow", description: "Write a script to open a demo site, enter credentials, submit form, and assert successful navigation.", minutes: 45 },
        { title: "Dynamic Locator Practice", description: "Locate elements without hardcoded IDs using robust CSS selectors and XPath sibling axes.", minutes: 40 },
      ],
      intermediate: [
        { title: "Refactor to Page Object Model", description: "Restructure your test suite into separate page objects and test classes.", minutes: 90 },
        { title: "Implement Explicit Waits", description: "Replace all thread sleeps with WebDriverWait conditions for element visibility and clickability.", minutes: 60 },
      ],
      advanced: [
        { title: "Headless GitHub Actions Pipeline", description: "Execute your test suite headlessly on push using GitHub Actions with screenshot artifacts on failure.", minutes: 120 },
      ],
    },
    miniProjects: {
      beginner: {
        title: "E-Commerce Checkout Flow Test",
        problemStatement: "Automate adding an item to the shopping cart and validating subtotal and shipping calculations.",
        requirements: ["Use CSS selectors", "Assert cart quantity", "Verify final total text"],
      },
      intermediate: {
        title: "POM-based Multi-browser Regression Suite",
        problemStatement: "Build an end-to-end test framework using Page Object Model supporting Chrome and Firefox execution.",
        requirements: ["Clean separation of page models", "Cross-browser config", "HTML test report generation"],
      },
      advanced: {
        title: "Distributed Grid Pipeline with Failure Self-Healing",
        problemStatement: "Configure Selenium Grid with Docker containers and automatic retry mechanisms for flakiness.",
        requirements: ["Selenium Grid runner", "Automatic screenshot on fail", "CI/CD execution badge"],
      },
    },
    resources: [
      { title: "Official Selenium Documentation", provider: "SeleniumHQ", url: "https://www.selenium.dev/documentation/", isFree: true },
      { title: "Automated Software Testing", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/news/tag/automation-testing/", isFree: true },
      { title: "NPTEL Software Testing Course", provider: "NPTEL / IIT", url: "https://nptel.ac.in/courses/106105150", isFree: true },
    ],
  },
  docker: {
    whyItMatters: "Docker containerizes applications for consistent local development, automated CI/CD builds, and production deployment across cloud platforms.",
    beginnerTopics: ["Containers vs VMs", "Docker CLI basics", "Images & Dockerfile syntax", "Port mapping and volume mounts"],
    intermediateTopics: ["Multi-stage Dockerfiles", "Docker Compose for multi-container apps", "Network modes", "Layer caching optimization"],
    advancedTopics: ["Container Security & non-root users", "Healthchecks & restart policies", "Registry pipelines", "Kubernetes pod readiness"],
    exercises: {
      beginner: [
        { title: "Containerize a Node/Python app", description: "Write a clean Dockerfile, build image, and run it locally with mapped port 3000.", minutes: 30 },
      ],
      intermediate: [
        { title: "Multi-stage Production Build", description: "Create a 2-stage Dockerfile that builds frontend assets in stage 1 and serves via alpine nginx.", minutes: 60 },
        { title: "Compose App + DB", description: "Wire your application container to a Postgres container with persistent volume storage.", minutes: 60 },
      ],
      advanced: [
        { title: "Image Vulnerability Scan", description: "Scan your production image using Trivy/Docker Scout and eliminate critical CVEs.", minutes: 45 },
      ],
    },
    miniProjects: {
      beginner: {
        title: "Lightweight Web Service Container",
        problemStatement: "Package a lightweight API service with minimal image footprint (< 100MB).",
        requirements: ["Alpine base image", "Exposed port", "Environment variable injection"],
      },
      intermediate: {
        title: "Full-Stack Microservices Compose Environment",
        problemStatement: "Spin up Frontend, Backend API, Redis cache, and Postgres DB with a single `docker compose up`.",
        requirements: ["Healthcheck dependencies", "Custom bridge network", "Named volumes"],
      },
      advanced: {
        title: "Hardened Production Deployment Setup",
        problemStatement: "Build an enterprise-grade container running as a non-privileged user with read-only root filesystem.",
        requirements: ["Non-root user (UID 10001)", "Read-only filesystem with tmpfs", "Zero high-severity CVEs"],
      },
    },
    resources: [
      { title: "Official Docker Get Started Guide", provider: "Docker Docs", url: "https://docs.docker.com/get-started/", isFree: true },
      { title: "Docker Tutorial for Beginners", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/news/docker-training-course-for-beginners/", isFree: true },
    ],
  },
};


type Kind = "language" | "framework" | "database" | "cloud" | "testing" | "data" | "soft" | "tool" | "concept";
const KIND_BY_CATEGORY: Record<string, Kind> = {
  "Programming languages": "language", Frameworks: "framework", Databases: "database", "Cloud and infrastructure": "cloud",
  "Software testing": "testing", "AI/ML": "data", "Generative AI": "data", "Data analytics": "data", "Soft skills": "soft",
  "Developer tools": "tool", "Core computer science": "concept", Other: "concept",
};

/** Official documentation entry points. Suggested starting points, not an endorsement of any course. */
const DOCS: Record<string, { title: string; url: string }> = {
  javascript: { title: "MDN: JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
  typescript: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/" },
  react: { title: "React: Learn", url: "https://react.dev/learn" },
  nextjs: { title: "Next.js: Learn", url: "https://nextjs.org/learn" },
  nodejs: { title: "Node.js: Learn", url: "https://nodejs.org/en/learn" },
  python: { title: "The Python Tutorial", url: "https://docs.python.org/3/tutorial/" },
  java: { title: "Dev.java: Learn", url: "https://dev.java/learn/" },
  html: { title: "MDN: Learn HTML", url: "https://developer.mozilla.org/en-US/docs/Learn/HTML" },
  css: { title: "MDN: Learn CSS", url: "https://developer.mozilla.org/en-US/docs/Learn/CSS" },
  sql: { title: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" },
  postgresql: { title: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" },
  mongodb: { title: "MongoDB Manual", url: "https://www.mongodb.com/docs/manual/tutorial/" },
  redis: { title: "Redis: Get started", url: "https://redis.io/docs/latest/get-started/" },
  git: { title: "Pro Git (free book)", url: "https://git-scm.com/book/en/v2" },
  kubernetes: { title: "Kubernetes Tutorials", url: "https://kubernetes.io/docs/tutorials/" },
  aws: { title: "AWS: Getting started", url: "https://aws.amazon.com/getting-started/" },
  terraform: { title: "Terraform Tutorials", url: "https://developer.hashicorp.com/terraform/tutorials" },
  githubactions: { title: "GitHub Actions Quickstart", url: "https://docs.github.com/en/actions/quickstart" },
  pytest: { title: "pytest: Getting started", url: "https://docs.pytest.org/en/stable/getting-started.html" },
  jest: { title: "Jest: Getting started", url: "https://jestjs.io/docs/getting-started" },
  cypress: { title: "Cypress Docs", url: "https://docs.cypress.io/app/get-started/why-cypress" },
  playwright: { title: "Playwright: Introduction", url: "https://playwright.dev/docs/intro" },
  django: { title: "Django Tutorial", url: "https://docs.djangoproject.com/en/stable/intro/tutorial01/" },
  flask: { title: "Flask Quickstart", url: "https://flask.palletsprojects.com/en/stable/quickstart/" },
  fastapi: { title: "FastAPI Tutorial", url: "https://fastapi.tiangolo.com/tutorial/" },
  springboot: { title: "Spring Guides", url: "https://spring.io/guides" },
  tailwindcss: { title: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs" },
  redux: { title: "Redux Essentials", url: "https://redux.js.org/tutorials/essentials/part-1-overview-concepts" },
  graphql: { title: "Introduction to GraphQL", url: "https://graphql.org/learn/" },
  pandas: { title: "pandas: Getting started", url: "https://pandas.pydata.org/docs/getting_started/index.html" },
  numpy: { title: "NumPy: Absolute beginners", url: "https://numpy.org/doc/stable/user/absolute_beginners.html" },
  tensorflow: { title: "TensorFlow Tutorials", url: "https://www.tensorflow.org/tutorials" },
  pytorch: { title: "PyTorch Tutorials", url: "https://pytorch.org/tutorials/" },
  scikitlearn: { title: "scikit-learn: Getting started", url: "https://scikit-learn.org/stable/getting_started.html" },
  postman: { title: "Postman Learning Center", url: "https://learning.postman.com/docs/getting-started/overview/" },
  kafka: { title: "Apache Kafka Quickstart", url: "https://kafka.apache.org/quickstart" },
  datastructures: { title: "VisuAlgo: visualise data structures", url: "https://visualgo.net/en" },
};

const GENERAL_RESOURCES: Record<Kind, { title: string; provider: string; url: string; isFree: boolean }[]> = {
  language: [{ title: "freeCodeCamp curriculum", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn", isFree: true }, { title: "CS50: Introduction to Computer Science", provider: "Harvard", url: "https://cs50.harvard.edu/x/", isFree: true }],
  framework: [{ title: "freeCodeCamp curriculum", provider: "freeCodeCamp", url: "https://www.freecodecamp.org/learn", isFree: true }, { title: "Developer roadmaps", provider: "roadmap.sh", url: "https://roadmap.sh/", isFree: true }],
  database: [{ title: "SQLBolt interactive lessons", provider: "SQLBolt", url: "https://sqlbolt.com/", isFree: true }],
  cloud: [{ title: "Developer roadmaps", provider: "roadmap.sh", url: "https://roadmap.sh/", isFree: true }],
  testing: [{ title: "Developer roadmaps", provider: "roadmap.sh", url: "https://roadmap.sh/", isFree: true }],
  data: [{ title: "Kaggle Learn", provider: "Kaggle", url: "https://www.kaggle.com/learn", isFree: true }],
  tool: [{ title: "Developer roadmaps", provider: "roadmap.sh", url: "https://roadmap.sh/", isFree: true }],
  concept: [{ title: "CS50: Introduction to Computer Science", provider: "Harvard", url: "https://cs50.harvard.edu/x/", isFree: true }],
  soft: [],
};

interface Tier { topics: string[]; objectives: string[]; exercises: { t: string; d: string; m: number }[]; project: { t: string; p: string; r: string[] }; weeks: number }
type KindPlan = { why: string; beginner: Tier; intermediate: Tier; advanced: Tier };

function plan(kind: Kind, S: string): KindPlan {
  switch (kind) {
    case "soft": return {
      why: `${S} is consistently asked about in interviews and shows up in nearly every job description. Employers look for specific examples, not adjectives.`,
      beginner: { weeks: 2, topics: [`What good ${S} looks like at work`, "Self-assessment", "Collecting real examples"], objectives: [`Describe where you already show ${S}, with two real examples.`], exercises: [{ t: "Write two real examples", d: `Write two short stories (Situation, Action, Result) where you showed ${S}. Use real events only.`, m: 40 }, { t: "Ask for feedback", d: `Ask a friend, teammate or mentor where your ${S} is strong and where it can improve. Note their exact words.`, m: 30 }], project: { t: `${S} journal`, p: `Keep a one-week log of situations that needed ${S} and what you did.`, r: ["5 entries", "One lesson per entry"] } },
      intermediate: { weeks: 3, topics: ["Deliberate practice", "Structured stories (STAR)", "Handling difficult situations"], objectives: [`Practise ${S} in a real team setting.`], exercises: [{ t: "Practise in a real setting", d: `Pick one project, club or study group and deliberately practise ${S} for two weeks.`, m: 120 }, { t: "Record a mock answer", d: `Record yourself answering an interview question about ${S} in under two minutes and review it.`, m: 40 }], project: { t: `${S} case study`, p: `Write a one-page case study of a situation where you improved an outcome through ${S}.`, r: ["Real situation", "Measurable or observable result", "What you learned"] } },
      advanced: { weeks: 4, topics: ["Coaching others", "Adapting to different people", "Measuring impact"], objectives: [`Help others improve at ${S} and show impact.`], exercises: [{ t: "Mentor someone", d: `Help a junior or peer with something where ${S} matters, and reflect on what worked.`, m: 120 }], project: { t: `${S} portfolio story`, p: `Prepare a polished two-minute story about ${S} for interviews and your resume.`, r: ["Concrete numbers where real", "Honest scope of your role"] } },
    };
    case "database": return {
      why: `${S} is a core part of most backend and data roles. Interviewers test both the concepts and practical querying.`,
      beginner: { weeks: 2, topics: [`${S} installation and tools`, "Creating schemas / collections", "CRUD operations", "Filtering and sorting"], objectives: [`Install ${S} locally and perform CRUD operations.`], exercises: [{ t: `Set up ${S} and create a sample dataset`, d: `Install ${S}, model a small domain (for example a library or store) and insert at least 20 records.`, m: 60 }, { t: "Write 10 queries", d: "Write ten queries covering filter, sort, limit, update and delete. Explain each result.", m: 60 }], project: { t: `${S}-backed contact manager`, p: `Build a small app or script that stores and queries data in ${S}.`, r: ["Schema design", "CRUD", "README with example queries"] } },
      intermediate: { weeks: 3, topics: ["Relationships / joins or references", "Indexes", "Transactions", "Migrations"], objectives: [`Model relationships and speed up queries in ${S}.`], exercises: [{ t: "Add relationships", d: "Extend your model with at least two related entities and query across them.", m: 90 }, { t: "Measure an index", d: "Create a table with 100k rows, time a query, add an index and time it again.", m: 90 }], project: { t: "Reporting queries", p: `Write a set of reporting queries over a realistic dataset in ${S}.`, r: ["Joins or aggregations", "At least one index with evidence it helps"] } },
      advanced: { weeks: 4, topics: ["Query plans", "Backup and restore", "Replication concepts", "Data modelling trade-offs"], objectives: [`Diagnose slow queries and explain trade-offs in ${S}.`], exercises: [{ t: "Tune a slow query", d: "Take a slow query, read its plan, and improve it. Document before and after.", m: 120 }], project: { t: "Performance case study", p: `Write up a before/after optimisation on a ${S} workload.`, r: ["Measurements", "Explanation of the fix"] } },
    };
    case "cloud": case "tool": return {
      why: `${S} appears in many engineering job descriptions. Hands-on familiarity with deployment and automation sets candidates apart.`,
      beginner: { weeks: 2, topics: [`What ${S} is for`, "Core terminology", "Install, CLI and first deployment"], objectives: [`Complete a first working setup with ${S}.`], exercises: [{ t: `First hands-on with ${S}`, d: `Follow the official quickstart for ${S} end to end and note each step you did.`, m: 60 }, { t: "Explain it back", d: `Write a half-page explanation of ${S} for a beginner, in your own words.`, m: 30 }], project: { t: `Deploy a sample app with ${S}`, p: `Use ${S} to deploy or automate a small sample application.`, r: ["Working result", "README of steps"] } },
      intermediate: { weeks: 3, topics: ["Configuration as code", "Environments", "Monitoring and logs", "Troubleshooting"], objectives: [`Use ${S} in a repeatable, configurable way.`], exercises: [{ t: "Make it repeatable", d: `Capture your ${S} setup as configuration files in a repository so someone else can reproduce it.`, m: 90 }, { t: "Break and fix", d: "Deliberately break something, find it through logs, fix it.", m: 60 }], project: { t: `Automated ${S} workflow`, p: `Automate build, test and deploy of a project using ${S}.`, r: ["Config in version control", "At least one automated check"] } },
      advanced: { weeks: 4, topics: ["Security", "Cost and scaling", "High availability", "Best practices"], objectives: [`Apply security and reliability practices with ${S}.`], exercises: [{ t: "Harden your setup", d: `Review your ${S} setup against a security checklist and fix three issues.`, m: 90 }], project: { t: `Production-style ${S} setup`, p: `Document a production-style ${S} design with security, rollback and monitoring.`, r: ["Diagram", "Rollback plan"] } },
    };
    case "testing": return {
      why: `${S} is directly asked about in QA and engineering roles. Interviewers look for practical examples of tests you wrote.`,
      beginner: { weeks: 2, topics: ["Test types", "Writing a first test", "Assertions", "Reading failures"], objectives: [`Write and run your first tests with ${S}.`], exercises: [{ t: `Your first ${S} tests`, d: `Write five passing and two intentionally failing tests with ${S}. Explain each failure.`, m: 60 }], project: { t: `Test a small app with ${S}`, p: `Choose a small open-source or demo app and write a basic test suite using ${S}.`, r: ["At least 10 tests", "README to run them"] } },
      intermediate: { weeks: 3, topics: ["Fixtures / setup", "Mocks and test data", "Reporting", "CI integration"], objectives: [`Structure maintainable suites in ${S} and run them in CI.`], exercises: [{ t: "Refactor for reuse", d: "Remove duplication with fixtures or helpers.", m: 90 }, { t: "Run in CI", d: "Run your suite automatically on every push.", m: 60 }], project: { t: `${S} regression suite`, p: `Build a regression suite for one complete user flow with ${S}.`, r: ["Reusable helpers", "CI run"] } },
      advanced: { weeks: 4, topics: ["Flaky tests", "Parallel runs", "Coverage vs risk", "Framework design"], objectives: [`Make a ${S} suite fast and trustworthy.`], exercises: [{ t: "Fix flakiness", d: "Find and fix the flakiest test in your suite. Document the cause.", m: 90 }], project: { t: "Quality report", p: `Write a short report on your suite's coverage, speed and flakiness using ${S}.`, r: ["Metrics", "Improvement actions"] } },
    };
    case "data": return {
      why: `${S} is common in data, analytics and AI roles. Showing a small end-to-end analysis beats listing the tool.`,
      beginner: { weeks: 2, topics: ["Loading data", "Cleaning and missing values", "Basic statistics", "First visualisations"], objectives: [`Load, clean and describe a dataset with ${S}.`], exercises: [{ t: "Explore a public dataset", d: `Pick a small public dataset (for example from Kaggle) and describe it using ${S}.`, m: 90 }], project: { t: `First ${S} analysis`, p: `Answer three questions about a dataset using ${S}.`, r: ["Notebook or script", "Three charts or tables", "Short written findings"] } },
      intermediate: { weeks: 3, topics: ["Feature preparation", "Modelling or aggregation", "Evaluation", "Reproducibility"], objectives: [`Build and evaluate something meaningful with ${S}.`], exercises: [{ t: "Train and evaluate", d: `Use ${S} to build a simple model or pipeline and evaluate it with proper metrics.`, m: 120 }], project: { t: `End-to-end ${S} project`, p: `Take a dataset from raw to results using ${S} and document your choices.`, r: ["Train/validation split", "Metric explanation"] } },
      advanced: { weeks: 4, topics: ["Pipelines", "Deployment", "Monitoring", "Ethics and bias"], objectives: [`Productionise or scale work using ${S}.`], exercises: [{ t: "Package your work", d: `Turn your ${S} project into a reusable pipeline or small API.`, m: 150 }], project: { t: "Deployed data project", p: `Deploy a small ${S}-based service or dashboard.`, r: ["Reproducible environment", "README"] } },
    };
    default: {
      const k = kind;
      return {
        why: `${S} appears in many job descriptions for the roles you are targeting. A small real project is the most convincing proof.`,
        beginner: { weeks: 2, topics: k === "concept" ? [`Core ideas of ${S}`, "Worked examples", "Common interview questions"] : [`${S} basics and setup`, "Core syntax and concepts", "Build and run something small", "Debugging basics"], objectives: [`Understand the fundamentals of ${S} and build something small.`], exercises: [{ t: `Hello ${S}`, d: `Follow the official guide for ${S} and build the smallest working example.`, m: 45 }, { t: "Handle errors", d: `Add input validation and clear error handling to your ${S} example.`, m: 60 }], project: { t: `${S} starter project`, p: `Build a small tool that solves a real everyday task using ${S}.`, r: ["Clean structure", "Input validation", "README with run steps"] } },
        intermediate: { weeks: 3, topics: [`Project structure with ${S}`, "State and data handling", "Testing", "Working with external services or APIs"], objectives: [`Use ${S} in a multi-part project with tests.`], exercises: [{ t: "Refactor into modules", d: `Split your ${S} starter into reusable modules and add tests.`, m: 90 }, { t: "Integrate an API", d: `Connect your ${S} project to a public API and handle failures gracefully.`, m: 90 }], project: { t: `${S} feature project`, p: `Add persistence and tests to a ${S} project.`, r: ["Storage", "Error handling", "Tests"] } },
        advanced: { weeks: 4, topics: ["Performance", "Security basics", "Design trade-offs", "Deployment"], objectives: [`Make a ${S} project robust, secure and deployed.`], exercises: [{ t: "Profile and improve", d: `Measure the slowest part of your ${S} project and improve it. Record before/after.`, m: 120 }], project: { t: `Deployed ${S} project`, p: `Deploy your project publicly and write a short design-decision record.`, r: ["Live link", "Design notes"] } },
      };
    }
  }
}

const LEVEL_ORDER = ["Not familiar", "Just started", "Beginner", "Basic working knowledge", "Intermediate", "Advanced", "Expert"];
/** index 0..2 of the stage a learner at this level should START at */
const startStage = (lvl: string) => { const r = LEVEL_ORDER.indexOf(lvl); return r <= 1 ? 0 : r <= 3 ? 1 : 2; };
/** index 0..2 of the last stage needed to reach the target level */
const endStage = (lvl: string) => { const r = LEVEL_ORDER.indexOf(lvl); return r <= 2 ? 0 : r <= 4 ? 1 : 2; };

export function generateSkillRoadmap(
  skillName: string,
  targetRole: string,
  currentProficiency: string,
  targetProficiency: string
): { whyItMatters: string; stages: StructuredRoadmapStage[] } {
  const key = canonicalKey(skillName);
  const name = canonicalName(skillName);
  const cat = findSkill(skillName)?.category;
  const kind: Kind = (cat && KIND_BY_CATEGORY[cat]) || "concept";
  const roleNote = targetRole ? ` It is relevant to the ${targetRole} role you are targeting.` : "";

  const stageNames = ["Beginner", "Intermediate", "Advanced"] as const;
  const short = ["beg", "int", "adv"];
  const first = startStage(currentProficiency);
  const last = Math.max(first, endStage(targetProficiency || "Intermediate"));

  const curated = CURATED_ROADMAPS[key];
  const docs = DOCS[key];
  const resources = [
    ...(docs ? [{ title: docs.title, provider: "Official documentation", url: docs.url, isFree: true }] : []),
    ...GENERAL_RESOURCES[kind],
  ];

  let why: string;
  const stages: StructuredRoadmapStage[] = [];

  if (curated) {
    why = curated.whyItMatters + roleNote;
    const pools = [curated.exercises.beginner, curated.exercises.intermediate, curated.exercises.advanced];
    const topics = [curated.beginnerTopics, curated.intermediateTopics, curated.advancedTopics];
    const projects = [curated.miniProjects.beginner, curated.miniProjects.intermediate, curated.miniProjects.advanced];
    const weeks = [2, 3, 4];
    for (let i = first; i <= last; i++) {
      stages.push({
        stage: stageNames[i], estimatedWeeks: weeks[i],
        learningObjectives: [`Work through the ${stageNames[i].toLowerCase()} topics of ${name} with hands-on practice.`],
        keyTopics: topics[i],
        practicalExercises: pools[i].map((ex, j) => ({ id: `ex-${short[i]}-${j}`, title: ex.title, description: ex.description, estimatedMinutes: ex.minutes, isCompleted: false })),
        miniProject: projects[i],
        verifiedResources: curated.resources,
      });
    }
  } else {
    const p = plan(kind, name);
    why = p.why + roleNote;
    const tiers = [p.beginner, p.intermediate, p.advanced];
    for (let i = first; i <= last; i++) {
      const t = tiers[i];
      stages.push({
        stage: stageNames[i], estimatedWeeks: t.weeks, learningObjectives: t.objectives, keyTopics: t.topics,
        practicalExercises: t.exercises.map((ex, j) => ({ id: `ex-${short[i]}-${j}`, title: ex.t, description: ex.d, estimatedMinutes: ex.m, isCompleted: false })),
        miniProject: { title: t.project.t, problemStatement: t.project.p, requirements: t.project.r },
        verifiedResources: resources,
      });
    }
  }
  return { whyItMatters: why, stages };
}
