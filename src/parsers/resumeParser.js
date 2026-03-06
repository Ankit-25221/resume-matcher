/**
 * Resume Parser - Extracts name, experience, skills from resume text
 * Rule-based only (no LLMs)
 */

const { extractSkills } = require("./jdParser");

function extractName(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line) &&
      !/\d/.test(line) &&
      line.split(" ").length <= 4 &&
      !/(engineer|developer|manager|resume|curriculum|vitae|objective|summary|contact|email|phone|linkedin)/i.test(line)
    ) {
      return line;
    }
  }

  const namePattern = /(?:name\s*[:\-]?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i;
  const match = namePattern.exec(text);
  if (match) return match[1].trim();

  return "Unknown";
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  const match = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  return match ? match[0].trim() : null;
}

function extractExperienceFromResume(text) {
  const explicitPatterns = [
    /(\d+\.?\d*)\+?\s*years?\s+of\s+(?:total\s+)?(?:professional\s+|relevant\s+)?experience/gi,
    /total\s+experience[:\s]*(\d+\.?\d*)\s*years?/gi,
    /(\d+\.?\d*)\s*years?\s+(?:of\s+)?experience\s+(?:in|with)/gi,
  ];

  for (const pattern of explicitPatterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) return parseFloat(match[1]);
  }

  const monthYearRe =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,.\s]+(\d{4})\s*[-–to]+\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,.\s]+(\d{4})|(present|current|now))/gi;

  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthMap = {
    jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
    jul:7, aug:8, sep:9, oct:10, nov:11, dec:12,
  };

  let totalMonths = 0;
  let m;
  monthYearRe.lastIndex = 0;

  while ((m = monthYearRe.exec(text)) !== null) {
    const startMonthStr = m[1].toLowerCase().substring(0, 3);
    const startYear     = parseInt(m[2]);
    const endMonthStr   = m[3] ? m[3].toLowerCase().substring(0, 3) : null;
    const endYear       = m[4] ? parseInt(m[4]) : currentYear;
    const endMonth      = endMonthStr ? monthMap[endMonthStr] : currentMonth;
    const startMonth    = monthMap[startMonthStr] || 1;

    const months = (endYear - startYear) * 12 + (endMonth - startMonth);
    if (months > 0 && months < 600) totalMonths += months;
  }

  if (totalMonths > 0) return parseFloat((totalMonths / 12).toFixed(1));

  const workContextRe =
    /(?:engineer|developer|analyst|architect|consultant|manager|intern|specialist|lead|senior|junior|staff)[^\n]{0,120}?(\d{4})\s*[-–to]+\s*(\d{4}|present|current)/gi;

  totalMonths = 0;
  workContextRe.lastIndex = 0;

  while ((m = workContextRe.exec(text)) !== null) {
    const startYear = parseInt(m[1]);
    const endYear   = /present|current/i.test(m[2]) ? currentYear : parseInt(m[2]);
    if (endYear >= startYear && endYear - startYear < 40) {
      totalMonths += (endYear - startYear) * 12;
    }
  }

  if (totalMonths > 0) return parseFloat((totalMonths / 12).toFixed(1));

  return null;
}

function extractEducation(text) {
  const degrees = [];
  const patterns = [
    /(?:bachelor(?:'s)?|b\.?s\.?|b\.?e\.?|b\.?tech\.?)\s+(?:of\s+|in\s+)?([^\n,]+)/gi,
    /(?:master(?:'s)?|m\.?s\.?|m\.?e\.?|m\.?tech\.?|mba)\s+(?:of\s+|in\s+)?([^\n,]+)/gi,
    /(?:phd|ph\.d\.?|doctorate)\s+(?:in\s+)?([^\n,]+)/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) degrees.push(match[0].trim().substring(0, 80));
  }

  return degrees;
}

function parseResume(text) {
  const name             = extractName(text);
  const email            = extractEmail(text);
  const phone            = extractPhone(text);
  const skills           = extractSkills(text);
  const yearOfExperience = extractExperienceFromResume(text);
  const education        = extractEducation(text);

  return {
    name,
    email,
    phone,
    resumeSkills: skills,
    yearOfExperience,
    education,
  };
}

module.exports = { parseResume };