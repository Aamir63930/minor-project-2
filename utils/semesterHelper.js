/**
 * Improved Semester Logic (KR Mangalam University)
 */

function getCurrentSemester(enrollmentYear) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let semester = 1;

  // Total years passed since enrollment
  const yearsPassed = currentYear - enrollmentYear;

  // Base semesters from full years
  semester = yearsPassed * 2;

  // Determine current half
  if (currentMonth >= 7) {
    // July–Dec → odd semester
    semester += 1;
  } else {
    // Jan–Jun → even semester
    semester += 2;
  }

  // Fix: If still in enrollment year's Jan–Jun, stay in Sem 1
  if (currentYear === enrollmentYear && currentMonth <= 6) {
    semester = 1;
  }

  // Clamp between 1–8
  return Math.max(1, Math.min(8, semester));
}

function getSemesterLabel(semester) {
  const suffix = ["th", "st", "nd", "rd"];
  const v = semester % 100;
  const label = semester + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
  return `${label} Semester`;
}

function getSemesterType(semester) {
  return semester % 2 === 0 ? 'even' : 'odd';
}

function getAcademicYear(enrollmentYear, semester) {
  const offset = Math.floor((semester - 1) / 2);
  const startYear = enrollmentYear + offset;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * NEW: Get semester duration (useful for UI/dashboard)
 */
function getSemesterDuration(semester, enrollmentYear) {
  const yearOffset = Math.floor((semester - 1) / 2);
  const year = enrollmentYear + yearOffset;

  if (semester % 2 === 0) {
    return `Jan–Jun ${year + 1}`;
  } else {
    return `Jul–Nov ${year}`;
  }
}

/**
 * NEW: Full semester info (best for dashboard use)
 */
function getSemesterInfo(enrollmentYear) {
  const semester = getCurrentSemester(enrollmentYear);

  return {
    semester,
    label: getSemesterLabel(semester),
    type: getSemesterType(semester),
    academicYear: getAcademicYear(enrollmentYear, semester),
    duration: getSemesterDuration(semester, enrollmentYear)
  };
}

module.exports = {
  getCurrentSemester,
  getSemesterLabel,
  getSemesterType,
  getAcademicYear,
  getSemesterDuration,
  getSemesterInfo
};
