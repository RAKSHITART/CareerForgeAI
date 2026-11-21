const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CareerForge AI database...");

  // Clean existing seed user if exists
  await prisma.user.deleteMany({
    where: { email: "alex@careerforge.ai" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.create({
    data: {
      email: "alex@careerforge.ai",
      name: "Alex Rivera",
      passwordHash,
      isVerified: true,
      profile: {
        create: {
          fullName: "Alex Rivera",
          email: "alex@careerforge.ai",
          phone: "+1 (555) 349-2810",
          location: "San Francisco, CA",
          linkedInUrl: "https://linkedin.com/in/alexrivera-dev",
          gitHubUrl: "https://github.com/alexrivera-dev",
          portfolioUrl: "https://alexrivera.dev",
          professionalSummary:
            "Full Stack Software Engineer with hands-on experience developing responsive web applications, robust REST APIs, and relational database architectures. Passionate about clean code, test-driven development, and scalable system design.",
          preferredResumeFormat: "modern-minimal",
          preferredPageCount: 1,
          preferredTemplate: "modern-minimal",
          includePhoto: false,
        },
      },
      notifications: {
        create: [
          {
            title: "Welcome to CareerForge AI",
            message: "Your truthful career profile is pre-configured with verified skills and projects. Try analyzing a JD!",
            type: "SYSTEM",
          },
          {
            title: "Mock Interview Practice Ready",
            message: "Practice for Full Stack and Frontend Engineering roles in the AI Interview Studio.",
            type: "PRACTICE_REMINDER",
            link: "/dashboard/interviews",
          },
        ],
      },
    },
    include: {
      profile: true,
    },
  });

  const profileId = user.profile.id;

  // Add Education
  await prisma.education.create({
    data: {
      profileId,
      institution: "State University of Science & Technology",
      degree: "Bachelor of Science",
      specialization: "Computer Science & Engineering",
      startYear: 2020,
      graduationYear: 2024,
      cgpaOrPercentage: "3.85 / 4.0",
      relevantCoursework: "Data Structures & Algorithms, Database Management Systems (DBMS), Operating Systems, Computer Networks, Software Engineering",
    },
  });

  // Add Technical Skills
  const skillsData = [
    {
      name: "JavaScript",
      category: "Programming languages",
      proficiencyLevel: "Advanced",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: true,
      practicalExperienceNotes: "Primary language for 3+ years in enterprise frontend and backend microservices.",
    },
    {
      name: "TypeScript",
      category: "Programming languages",
      proficiencyLevel: "Advanced",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: false,
      practicalExperienceNotes: "Strict type modeling, generics, and API contract enforcement.",
    },
    {
      name: "React",
      category: "Frameworks",
      proficiencyLevel: "Advanced",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: false,
      practicalExperienceNotes: "Custom hooks, performance profiling, component libraries, and state management.",
    },
    {
      name: "Next.js",
      category: "Frameworks",
      proficiencyLevel: "Intermediate",
      usedInProject: true,
      usedProfessionally: false,
      usedAcademically: false,
      practicalExperienceNotes: "App Router, Server Actions, Route Handlers, and SSR optimization.",
    },
    {
      name: "Java",
      category: "Programming languages",
      proficiencyLevel: "Intermediate",
      usedInProject: true,
      usedProfessionally: false,
      usedAcademically: true,
      practicalExperienceNotes: "Object-oriented design, Collections framework, and multi-threaded university project.",
    },
    {
      name: "SQL",
      category: "Databases",
      proficiencyLevel: "Beginner",
      usedInProject: true,
      usedProfessionally: false,
      usedAcademically: true,
      practicalExperienceNotes: "SELECT, JOINs, GROUP BY, aggregations, and basic index design.",
    },
    {
      name: "PostgreSQL",
      category: "Databases",
      proficiencyLevel: "Basic working knowledge",
      usedInProject: true,
      usedProfessionally: false,
      usedAcademically: false,
      practicalExperienceNotes: "Schema migrations with Prisma and relational constraints.",
    },
    {
      name: "Node.js",
      category: "Frameworks",
      proficiencyLevel: "Intermediate",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: false,
      practicalExperienceNotes: "Express REST endpoints, middleware, authentication tokens, and stream handling.",
    },
    {
      name: "Git",
      category: "Developer tools",
      proficiencyLevel: "Advanced",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: true,
      practicalExperienceNotes: "Branching strategies, rebase workflows, and pull request reviews.",
    },
    {
      name: "Communication",
      category: "Soft skills",
      proficiencyLevel: "Advanced",
      usedInProject: true,
      usedProfessionally: true,
      usedAcademically: true,
      practicalExperienceNotes: "Technical presentations, sprint demos, and documentation authoring.",
    },
    {
      name: "Selenium",
      category: "Software testing",
      proficiencyLevel: "Not familiar",
      usedInProject: false,
      usedProfessionally: false,
      usedAcademically: false,
      practicalExperienceNotes: "Never used; candidate has zero experience with Selenium.",
    },
    {
      name: "Docker",
      category: "Cloud and infrastructure",
      proficiencyLevel: "Just started",
      usedInProject: false,
      usedProfessionally: false,
      usedAcademically: false,
      practicalExperienceNotes: "Recently completed introductory containerization tutorial.",
    },
  ];

  for (const s of skillsData) {
    await prisma.candidateSkill.create({
      data: {
        profileId,
        ...s,
      },
    });
  }

  // Add Projects
  await prisma.project.create({
    data: {
      profileId,
      title: "TaskFlow Pro — Collaborative Project Engine",
      description: "Engineered a high-performance Kanban and sprint management web application with real-time optimistic state updates.",
      problemStatement: "Distributed software teams suffered from stale UI state and delayed task status synchronization during sprint planning.",
      technologies: JSON.stringify(["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"]),
      candidateContribution: "Architected modular React component hierarchy, configured Prisma database schema, and implemented JWT authentication middleware.",
      keyFeatures: JSON.stringify([
        "Drag-and-drop task boards with optimistic UI updates",
        "Role-based access control for team leads and contributors",
        "Audit trail tracking state mutations across project deliverables",
      ]),
      measurableResults: JSON.stringify([
        "Decreased average API response latency by 35% through indexed database queries",
        "Achieved 99.2% uptime across 500+ active mock test users",
      ]),
      githubUrl: "https://github.com/alexrivera-dev/taskflow-pro",
      liveDemoUrl: "https://taskflow-pro.demo.dev",
      category: "Full Stack",
      status: "Completed",
    },
  });

  await prisma.project.create({
    data: {
      profileId,
      title: "QueryEdge AI — Relational Query Assistant",
      description: "Developed an intelligent query drafting and schema verification tool connecting natural language prompts to sanitized SQL queries.",
      problemStatement: "Junior developers struggled to construct multi-table JOINs and window functions safely against complex schemas.",
      technologies: JSON.stringify(["Next.js", "TypeScript", "SQL", "PostgreSQL"]),
      candidateContribution: "Implemented automated SQL syntax parser and query sandbox validator executing against sanitized test schemas.",
      keyFeatures: JSON.stringify([
        "Schema visualization and relationship mapping",
        "Automatic query explain plan generator",
        "Syntax highlighting with error pinpointing",
      ]),
      measurableResults: JSON.stringify([
        "Successfully validated 200+ distinct relational query patterns without production crashes",
      ]),
      githubUrl: "https://github.com/alexrivera-dev/queryedge-ai",
      liveDemoUrl: "https://queryedge.demo.dev",
      category: "Data & Full Stack",
      status: "Completed",
    },
  });

  // Add Work Experience
  await prisma.workExperience.create({
    data: {
      profileId,
      company: "CloudSphere Labs",
      position: "Software Engineering Intern",
      employmentType: "Internship",
      startDate: "2023-06",
      endDate: "2023-12",
      isCurrent: false,
      responsibilities: JSON.stringify([
        "Built responsive customer dashboard components in React and TypeScript.",
        "Integrated REST APIs and resolved client-side state caching inconsistencies.",
        "Authored automated unit tests with Vitest achieving 85% component test coverage.",
      ]),
      achievements: JSON.stringify([
        "Identified and eliminated 12 critical UI memory leaks in long-running dashboard sessions.",
      ]),
      technologies: JSON.stringify(["React", "TypeScript", "JavaScript", "Git"]),
    },
  });

  // Add Certification
  await prisma.certification.create({
    data: {
      profileId,
      name: "Meta Front-End Developer Professional Certificate",
      issuingOrganization: "Coursera / Meta",
      issueDate: "2023-09",
      credentialUrl: "https://coursera.org/verify/example-credential",
      credentialId: "CERT-META-2023-998",
      type: "CERTIFICATION",
    },
  });

  // Add a sample Job Application
  await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company: "Vercel",
      role: "Frontend Engineer",
      appliedDate: "2026-10-25",
      status: "INTERVIEW",
      interviewDate: "2026-11-08",
      notes: "First technical round focused on React Server Components and performance profiling.",
    },
  });

  console.log("Seeding complete! User created: alex@careerforge.ai / password123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
