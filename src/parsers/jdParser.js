/**
 * JD Parser - Extracts salary, experience, skills from Job Descriptions
 * Rule-based only (no LLMs)
 */

const SKILLS_DICT = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "MATLAB", "Fortran", "Bash",
  "Shell Scripting", "Shell", "Perl", "Haskell", "Erlang", "Elixir", "Dart", "Lua",
  "C Programming",
  "React", "Angular", "AngularJS", "Vue.js", "Vue", "jQuery", "HTML", "CSS",
  "SASS", "LESS", "Bootstrap", "Tailwind", "Next.js", "Nuxt.js", "Redux",
  "GraphQL", "WebSockets",
  "Node.js", "Express", "Spring Boot", "Spring", "Django", "Flask", "FastAPI",
  "Ruby on Rails", "Laravel", "ASP.NET", ".NET", "Hibernate", "Kafka", "RabbitMQ",
  "gRPC", "REST API", "RESTful", "Microservices",
  "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Oracle", "SQL Server",
  "Microsoft SQL Server", "Redis", "Cassandra", "DynamoDB", "Firebase",
  "Elasticsearch", "DB2", "MariaDB", "CouchDB", "Neo4j", "Kibana", "Logstash",
  "Docker", "Kubernetes", "Jenkins", "Git", "GitHub", "GitLab", "Bitbucket",
  "CI/CD", "Terraform", "Ansible", "Chef", "Puppet", "AWS", "Azure", "GCP",
  "Google Cloud", "Linux", "Unix", "Nginx", "Apache", "Prometheus",
  "Grafana", "Helm", "ArgoCD", "DevOps", "DevSecOps",
  "Machine Learning", "Deep Learning", "Artificial Intelligence",
  "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
  "Apache Spark", "Hadoop", "Airflow", "Data Pipeline", "NLP",
  "Computer Vision", "OpenCV", "Tableau", "Power BI", "LLM",
  "Unit Testing", "Integration Testing", "Selenium", "Jest", "Mocha", "JUnit",
  "Pytest", "TDD", "BDD", "Agile", "Scrum", "Kanban", "SDLC",
  "MPI", "OpenMP", "CUDA", "FPGA", "Embedded Systems", "RTOS",
  "OpenAPI", "Swagger", "OAuth", "JWT", "LDAP", "ActiveMQ",
  "Protobuf", "YAML", "JSON", "XML", "ELK Stack",
  "SQL", "API", "SDK", "OOP", "SaaS", "PaaS", "IaaS",
];

const STRICT_WORD_SKILLS = new Set([
  "Go", "SQL", "API", "SDK", "OOP", "SaaS", "PaaS", "IaaS",
  "ML", "AI", "NLP", "TDD", "BDD", "AWS", "GCP", "JWT",
  "Vue", "Git", "PHP", "XML", "CSS", "HTML",
]);

const EXTRACTION_ALIASES = {
  "nodejs":                 "Node.js",
  "node js":                "Node.js",
  "reactjs":                "React",
  "react.js":               "React",
  "vuejs":                  "Vue.js",
  "vue js":                 "Vue.js",
  "angularjs":              "Angular",
  "angular.js":             "Angular",
  "postgres":               "PostgreSQL",
  "k8s":                    "Kubernetes",
  "restful":                "REST API",
  "restful api":            "REST API",
  "rest":                   "REST API",
  "springboot":             "Spring Boot",
  "spring-boot":            "Spring Boot",
  "asp.net":                "ASP.NET",
  "dotnet":                 ".NET",
  "mongo":                  "MongoDB",
  "elastic search":         "Elasticsearch",
  "elk":                    "Elasticsearch",
  "elk stack":              "Elasticsearch",
  "ci cd":                  "CI/CD",
  "cicd":                   "CI/CD",
  "continuous integration": "CI/CD",
  "machine learning":       "Machine Learning",
  "deep learning":          "Deep Learning",
  "artificial intelligence":"Artificial Intelligence",
  "micro services":         "Microservices",
  "microservice":           "Microservices",
  "devops":                 "DevOps",
  "shell scripting":        "Shell Scripting",
  "bash scripting":         "Shell Scripting",
  "unit test":              "Unit Testing",
  "unit tests":             "Unit Testing",
  "apache spark":           "Apache Spark",
  "google cloud platform":  "GCP",
  "amazon web services":    "AWS",
  "microsoft azure":        "Azure",
  "object oriented":        "OOP",
};

function extractSalary(text) {
  const patterns = [
    { re: /\$\s?([\d,]+)\s*[-–]{1,2}\s*\$\s?([\d,]+)\s*(?:per year|\/year|annually|per annum)?/i, type: "range" },
    { re: /\$\s?([\d,.]+)\s*(?:\/hour|per hour)\s*to\s*\$\s?([\d,]+)\s*(?:\/year|per year)?/i, type: "range" },
    { re: /(?:₹|rs\.?\s*)(\d[\d,]*)\s*(?:per annum|p\.?a\.?|per year|\/year)?/i, type: "single_inr" },
    { re: /(?:salary|ctc|compensation)[:\s]*(?:₹|rs\.?)?\s*([\d,.]+\s*(?:lpa|lakh|lakhs?))/i, type: "single" },
    { re: /(?:range|pay|compensation)[^\n]{0,40}?(\d{5,6})\s*[-–]\s*(\d{5,6})/i, type: "range" },
    { re: /(?:salary|compensation)[:\s]*\$\s?([\d,]+)/i, type: "single_dollar" },
  ];

  for (const { re, type } of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    if (type === "range") {
      return `$${match[1].replace(/,/g, "")} - $${match[2].replace(/,/g, "")}`;
    }
    if (type === "single_dollar") return `$${match[1].replace(/,/g, "")}`;
    if (type === "single_inr")    return `₹${match[1].replace(/,/g, "")}`;
    return match[1].trim();
  }
  return null;
}

function extractExperience(text) {
  if (/\b(freshers?|entry[- ]level|entry level|0\s*years?)\b/i.test(text)) return 0;

  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:strong\s+)?(?:hands[- ]on\s+)?experience/gi,
    /(?:bachelor(?:'s)?|master(?:'s)?|phd|degree)\s+with\s+(\d+)\+?\s*years?/gi,
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:professional\s+|relevant\s+|related\s+)?experience/gi,
    /(?:minimum|min\.?|at least)\s+(?:of\s+)?(\d+)\+?\s*years?/gi,
    /(\d+)\+?\s*years?\s+of\s+(?:programming|software|development|coding)/gi,
    /(\d+)\+?\s*years?\s+(?:experience|exp)/gi,
  ];

  const values = [];
  for (const pattern of patterns) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      const n = parseFloat(m[1]);
      if (!isNaN(n) && n >= 0 && n <= 40) values.push(n);
    }
  }

  if (values.length === 0) return null;
  return Math.max(...values);
}

function extractSkills(text) {
  const found = new Set();
  const lowerText = " " + text.toLowerCase() + " ";

  for (const skill of SKILLS_DICT) {
    const lowerSkill = skill.toLowerCase();
    const escaped = lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (regex.test(lowerText)) found.add(skill);
  }

  for (const [surface, canonical] of Object.entries(EXTRACTION_ALIASES)) {
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
    if (regex.test(lowerText)) found.add(canonical);
  }

  const cLangPatterns = [
    /\b[Cc]\s+(?:programming|language|developer|code|codebase)\b/,
    /\blanguages?[^.\n]*\bC\b(?!\+\+|#)/,
    /\bproficient\s+in\s+(?:[A-Za-z+#,\s]*\s)?C\b(?!\+\+|#)/,
    /\bexperience\s+(?:with|in)\s+(?:[A-Za-z+#,\s]*\s)?C\b(?!\+\+|#)/,
    /(?:^|[\s,(])C,\s*C\+\+/m,
    /(?:^|[\s,(])C\/C\+\+/m,
    /\bC\s+and\s+C\+\+\b/i,
    /\bwith\s+(?:low[- ]level\s+)?(?:languages?\s+)?(?:like\s+)?C\b(?!\+\+|#)/i,
    /\bApplied\s+programming\s+experience\s+with[^.]*\bC\b/i,
    /\blow[- ]level\s+languages?\s+(?:like\s+)?C\b(?!\+\+|#)/i,
  ];
  if (cLangPatterns.some(p => p.test(text))) found.add("C");

  const aiPatterns = [
    /\bAI\s*(?:\/|and|&)\s*ML\b/i,
    /\bartificial\s+intelligence\b/i,
    /\bAI[- ](?:powered|based|driven|tools|platform|model|system|engineer)/i,
    /\b(?:exposure|experience|skills?)\s+(?:in|with)\s+AI\b/i,
    /\bAI\s+(?:exposure|experience|background)\b/i,
    /\binterest\s+(?:in|or)\s+AI\b/i,
  ];
  if (aiPatterns.some(p => p.test(text))) found.add("Artificial Intelligence");

  return [...found];
}

function extractRoleInfo(text) {
  const titlePatterns = [
    /(?:position|role|title|job title)[:\s]+([^\n.]+)/i,
    /seeking\s+(?:a\s+)?([^\n.]+?)\s+to/i,
    /opening for\s+(?:a\s+)?([^\n.]+?)[\n.]/i,
    /this position is for\s+(?:a\s+)?([^\n.]+?)[\n.]/i,
  ];

  let role = "Software Engineer";
  for (const p of titlePatterns) {
    const m = p.exec(text);
    if (m) {
      role = m[1].trim().replace(/\s+/g, " ").substring(0, 80);
      break;
    }
  }

  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 40);
  const aboutRole = lines.slice(0, 2).join(" ").substring(0, 300) || "N/A";

  return { role, aboutRole };
}

function splitRequiredOptional(text, allSkills) {
  const lines = text.split("\n");
  const optionalSkills = new Set();

  const optionalHeaderRe =
    /^\s*(?:desired|good to have|nice to have|optional skills?|preferred|bonus points?|plus|would be (?:a )?plus)[:\s]*$/i;
  const requiredHeaderRe =
    /^\s*(?:required|must have|basic qualifications?|minimum qualifications?|responsibilities|what you.ll do)[:\s]*$/i;

  let inOptionalSection = false;
  const optionalText = [];

  for (const line of lines) {
    if (optionalHeaderRe.test(line)) { inOptionalSection = true; continue; }
    if (requiredHeaderRe.test(line)) { inOptionalSection = false; continue; }
    if (inOptionalSection) optionalText.push(line.toLowerCase());
  }

  const combinedOptional = optionalText.join(" ");

  for (const skill of allSkills) {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
    if (re.test(combinedOptional)) optionalSkills.add(skill);
  }

  const requiredSkills = allSkills.filter(s => !optionalSkills.has(s));
  return { requiredSkills, optionalSkills: [...optionalSkills] };
}

function parseJD(text, jobId = "JD001") {
  const salary = extractSalary(text);
  const yearOfExperience = extractExperience(text);
  const allSkills = extractSkills(text);
  const { role, aboutRole } = extractRoleInfo(text);
  const { requiredSkills, optionalSkills } = splitRequiredOptional(text, allSkills);

  return {
    jobId, role, aboutRole, salary,
    yearOfExperience, requiredSkills,
    optionalSkills, allSkills, rawText: text,
  };
}

module.exports = { parseJD, extractSkills, extractSalary, extractExperience };