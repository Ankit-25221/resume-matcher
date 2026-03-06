/**
 * Matching Engine
 * Calculates how well a resume matches each JD
 * Rule-based only (no LLMs)
 */

function normalizeSkill(skill) {
  return skill
    .toLowerCase()
    .replace(/[.\-_]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\//, "")
    .trim();
}

const SKILL_ALIASES = {
  "nodejs":                 ["node.js", "node js", "nodejs", "node"],
  "reactjs":                ["react.js", "react js", "reactjs", "react"],
  "angularjs":              ["angular.js", "angular js", "angularjs", "angular"],
  "vuejs":                  ["vue.js", "vue js", "vuejs", "vue"],
  "postgresql":             ["postgres", "postgresql", "psql"],
  "elasticsearch":          ["elastic search", "elasticsearch", "elk", "elk stack"],
  "cpp":                    ["c++", "cpp", "c/c++", "c, c++"],
  "csharp":                 ["c#", "csharp"],
  "dotnet":                 [".net", "dotnet", "asp.net", "aspnet"],
  "restapi":                ["rest api", "rest apis", "restful", "restful api", "rest"],
  "cicd":                   ["ci/cd", "ci cd", "cicd", "continuous integration", "continuous delivery"],
  "kubernetes":             ["k8s", "kubernetes"],
  "machinelearning":        ["machine learning", "ml"],
  "deeplearning":           ["deep learning", "dl"],
  "nosql":                  ["no sql", "nosql", "no-sql"],
  "microservices":          ["micro services", "microservices", "microservice"],
  "springboot":             ["spring boot", "springboot"],
  "nextjs":                 ["next.js", "nextjs", "next js"],
  "nuxtjs":                 ["nuxt.js", "nuxtjs", "nuxt js"],
  "tailwind":               ["tailwind", "tailwindcss", "tailwind css"],
  "graphql":                ["graphql", "graph ql"],
  "typescript":             ["typescript", "ts"],
  "javascript":             ["javascript", "js"],
  "mongodb":                ["mongo", "mongodb"],
  "googlecloud":            ["gcp", "google cloud", "google cloud platform"],
  "aws":                    ["aws", "amazon web services"],
  "azure":                  ["azure", "microsoft azure"],
  "apachespark":            ["spark", "apache spark"],
  "unittesting":            ["unit testing", "unit tests", "unit test"],
  "versioncontrol":         ["version control", "source control", "scm"],
  "shellscripting":         ["shell scripting", "bash scripting", "shell script", "unix shell"],
  "artificialintelligence": ["artificial intelligence", "ai"],
};

// Precompute reverse lookup: surface → canonical
const _surfaceToCanonical = new Map();
for (const [canonical, surfaces] of Object.entries(SKILL_ALIASES)) {
  for (const s of surfaces) {
    _surfaceToCanonical.set(normalizeSkill(s), canonical);
  }
  _surfaceToCanonical.set(canonical, canonical);
}

function buildAliasLookup(resumeSkills) {
  const lookup = new Set();

  for (const skill of resumeSkills) {
    const norm = normalizeSkill(skill);
    lookup.add(norm);

    const canonical = _surfaceToCanonical.get(norm);
    if (canonical) {
      lookup.add(canonical);
      const surfaces = SKILL_ALIASES[canonical];
      if (surfaces) surfaces.forEach(s => lookup.add(normalizeSkill(s)));
    }
  }

  return lookup;
}

function isSkillPresent(jdSkill, resumeSkillLookup) {
  const norm = normalizeSkill(jdSkill);
  if (resumeSkillLookup.has(norm)) return true;

  const canonical = _surfaceToCanonical.get(norm);
  if (canonical && resumeSkillLookup.has(canonical)) return true;

  if (canonical && SKILL_ALIASES[canonical]) {
    for (const s of SKILL_ALIASES[canonical]) {
      if (resumeSkillLookup.has(normalizeSkill(s))) return true;
    }
  }

  return false;
}

function calculateMatchingScore(jdSkills, resumeSkillLookup, requiredSkills = []) {
  if (!jdSkills || jdSkills.length === 0) return 0;

  const requiredSet = new Set(requiredSkills.map(normalizeSkill));
  let weightedMatched = 0;
  let weightedTotal   = 0;

  for (const skill of jdSkills) {
    const isRequired = requiredSet.has(normalizeSkill(skill));
    const weight     = isRequired ? 1.4 : 0.6;
    weightedTotal   += weight;
    if (isSkillPresent(skill, resumeSkillLookup)) weightedMatched += weight;
  }

  if (weightedTotal === 0) return 0;
  const score = (weightedMatched / weightedTotal) * 100;
  return Math.min(100, Math.round(score * 10) / 10);
}

function buildSkillsAnalysis(jdSkills, resumeSkillLookup) {
  return jdSkills.map(skill => ({
    skill,
    presentInResume: isSkillPresent(skill, resumeSkillLookup),
  }));
}

function matchResumeToJDs(parsedResume, parsedJDs) {
  const resumeSkillLookup = buildAliasLookup(parsedResume.resumeSkills || []);

  const matchingJobs = parsedJDs.map(jd => {
    const skillsAnalysis = buildSkillsAnalysis(jd.allSkills, resumeSkillLookup);
    const matchingScore  = calculateMatchingScore(
      jd.allSkills,
      resumeSkillLookup,
      jd.requiredSkills
    );

    return {
      jobId:              jd.jobId,
      role:               jd.role,
      aboutRole:          jd.aboutRole,
      salary:             jd.salary || "Not specified",
      requiredExperience: jd.yearOfExperience,
      skillsAnalysis,
      matchingScore,
    };
  });

  matchingJobs.sort((a, b) => b.matchingScore - a.matchingScore);

  return {
    name:             parsedResume.name,
    email:            parsedResume.email,
    phone:            parsedResume.phone,
    yearOfExperience: parsedResume.yearOfExperience,
    resumeSkills:     parsedResume.resumeSkills,
    education:        parsedResume.education,
    matchingJobs,
  };
}

module.exports = { matchResumeToJDs, buildSkillsAnalysis, calculateMatchingScore };