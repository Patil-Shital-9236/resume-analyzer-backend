function calculateATSScore({
  matchedSkills,
  requiredSkills,
  sections
}) {

  let score = 0;

  // -----------------------------
  // 1️⃣ Skill Match (40 points)
  // -----------------------------
  if (requiredSkills.length > 0) {
    const skillScore =
      (matchedSkills.length / requiredSkills.length) * 40;
    score += skillScore;
  }

  // -----------------------------
  // 2️⃣ Experience Section (25)
  // -----------------------------
  if (sections.includes("experience")) {
    score += 25;
  }

  // -----------------------------
  // 3️⃣ Projects Section (15)
  // -----------------------------
  if (sections.includes("projects")) {
    score += 15;
  }

  // -----------------------------
  // 4️⃣ Certifications (10)
  // -----------------------------
  if (sections.includes("certifications")) {
    score += 10;
  }

  // -----------------------------
  // 5️⃣ Resume Structure (10)
  // -----------------------------
  if (
    sections.includes("education") &&
    sections.includes("skills")
  ) {
    score += 10;
  }

  return Math.round(score);
}

module.exports = calculateATSScore;