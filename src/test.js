/**
 * Test Script - Run with: npm test
 */

const { parseResume }      = require("./parsers/resumeParser");
const { parseJD }          = require("./parsers/jdParser");
const { matchResumeToJDs } = require("./matchers/matchingEngine");
const fs                   = require("fs");
const path                 = require("path");

const SAMPLE_RESUME = `
John Doe
john.doe@email.com | +1 (555) 123-4567

SUMMARY
Full-stack software engineer with 5 years of professional experience.

SKILLS
JavaScript, TypeScript, Python, Java, C++, React, Angular, Node.js,
Express, Spring Boot, REST API, Microservices, MySQL, PostgreSQL,
Docker, Kubernetes, Jenkins, Git, CI/CD, AWS, Linux, Unit Testing,
Agile, Scrum

EXPERIENCE
Senior Software Engineer | TechCorp Inc | Jan 2022 - Present
Software Engineer | StartupXYZ | Jun 2019 - Dec 2021

EDUCATION
Bachelor of Science in Computer Science, State University, 2019
`;

const SAMPLE_JDS = [
  {
    jobId: "JD001",
    text: `
    Capgemini - Backend Developer
    7 years hands-on Core Java Spring Boot. 4 years React or Angular.
    Microsoft SQL Server or NoSQL required.
    Microservices Kafka REST API Docker Kubernetes.
    Good to have: Python CI/CD Jenkins Azure.
    Salary: $61,087 - $104,364
    `,
  },
  {
    jobId: "JD002",
    text: `
    Adobe - Software Engineer
    5-7+ years of relevant experience.
    Python, Java, C++. React, Angular, jQuery.
    DevOps in a SaaS environment. AI/ML a plus.
    Pay range $139,000 -- $257,550 annually.
    `,
  },
  {
    jobId: "JD003",
    text: `
    Astra - Software Engineer
    3+ years Python development.
    AWS, Kubernetes, Docker, REST API, JSON, YAML.
    TypeScript, Go desired.
    Pay range: $130,000 - $160,000 per year.
    `,
  },
  {
    jobId: "JD004",
    text: `
    SpaceX - Full Stack Software Engineer
    5+ years web development experience.
    C#, .NET, SQL, HTML, CSS, AngularJS, TypeScript.
    Python, PostgreSQL. Unit testing, CI/CD.
    $120,000 - $145,000 per year.
    `,
  },
  {
    jobId: "JD005",
    text: `
    Riverside Research - Scientific Programmer
    Bachelor with 5+ years or Master with 3+ years.
    C, C++, Fortran, Python, Unix shell scripting.
    Version control Git. MPI, OpenMP desired.
    Salary $180,000 - $220,000.
    `,
  },
];

function runTest() {
  console.log("\n" + "=".repeat(55));
  console.log("  Resume Parsing & Job Matching System - Test");
  console.log("=".repeat(55));

  // 1. Parse Resume
  console.log("\n📄 Step 1: Parsing Resume...");
  const parsedResume = parseResume(SAMPLE_RESUME);
  console.log(`   Name             : ${parsedResume.name}`);
  console.log(`   Email            : ${parsedResume.email}`);
  console.log(`   Phone            : ${parsedResume.phone}`);
  console.log(`   Years Experience : ${parsedResume.yearOfExperience}`);
  console.log(`   Skills Found (${parsedResume.resumeSkills.length})  : ${parsedResume.resumeSkills.slice(0, 6).join(", ")}...`);

  // 2. Parse JDs
  console.log("\n📋 Step 2: Parsing Job Descriptions...");
  const parsedJDs = SAMPLE_JDS.map(jd => {
    const parsed = parseJD(jd.text, jd.jobId);
    console.log(`   ${jd.jobId}: ${parsed.role}`);
    console.log(`     Salary   : ${parsed.salary || "Not specified"}`);
    console.log(`     Exp (yrs): ${parsed.yearOfExperience || "Not specified"}`);
    console.log(`     Skills   : ${parsed.allSkills.slice(0, 5).join(", ")}...`);
    return parsed;
  });

  // 3. Match
  console.log("\n🎯 Step 3: Matching Resume to JDs...");
  const result = matchResumeToJDs(parsedResume, parsedJDs);

  // 4. Results
  console.log("\n📊 Step 4: Results");
  console.log("-".repeat(55));
  result.matchingJobs.forEach(job => {
    const matched = job.skillsAnalysis.filter(s => s.presentInResume).length;
    const total   = job.skillsAnalysis.length;
    console.log(`\n  ${job.jobId} — ${job.role}`);
    console.log(`  Salary         : ${job.salary}`);
    console.log(`  Matching Score : ${job.matchingScore}%  (${matched}/${total} skills)`);
    const missing = job.skillsAnalysis
      .filter(s => !s.presentInResume)
      .map(s => s.skill);
    if (missing.length > 0) {
      console.log(`  Missing Skills : ${missing.join(", ")}`);
    }
  });

  // 5. Save output
  const outputPath = path.join(__dirname, "../output/sample-output.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n✅ Output saved to: output/sample-output.json`);
  console.log("=".repeat(55) + "\n");
}

runTest();