function extractExperience(resumeText) {

  const experienceKeywords = [
    "experience",
    "worked at",
    "intern",
    "internship",
    "developer",
    "engineer",
    "company",
    "organization"
  ];

  const lines = resumeText.split("\n");

  const experience = [];

  lines.forEach(line => {

    const lowerLine = line.toLowerCase();

    experienceKeywords.forEach(keyword => {

      if (lowerLine.includes(keyword)) {
        experience.push(line.trim());
      }

    });

  });

  // remove duplicates
  return [...new Set(experience)];

}

module.exports = extractExperience;