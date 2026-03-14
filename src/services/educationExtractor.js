function extractEducation(resumeText) {

  const educationKeywords = [
    "bachelor",
    "master",
    "b.tech",
    "m.tech",
    "bsc",
    "msc",
    "bca",
    "mca",
    "phd",
    "degree",
    "university",
    "college",
    "school"
  ];

  const lines = resumeText.split("\n");

  const education = [];

  lines.forEach(line => {

    const lowerLine = line.toLowerCase();

    educationKeywords.forEach(keyword => {

      if (lowerLine.includes(keyword)) {
        education.push(line.trim());
      }

    });

  });

  // remove duplicates
  return [...new Set(education)];

}

module.exports = extractEducation;