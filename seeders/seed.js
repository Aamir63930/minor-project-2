require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Course = require('../models/Course');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const SubjectFacultyMap = require('../models/SubjectFacultyMap');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');
};

// ─────────────────────────────────────────────
// 1. COURSES
// ─────────────────────────────────────────────
const courses = [
  { courseCode: '0171', name: 'Bachelor of Technology in Computer Science & Engineering', shortName: 'CSE', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
  { courseCode: '0173', name: 'Bachelor of Technology in CSE (AI & Machine Learning)', shortName: 'CSE-AIML', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
  { courseCode: '0175', name: 'Bachelor of Technology in CSE (Data Science)', shortName: 'CSE-DS', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
  { courseCode: '0177', name: 'Bachelor of Technology in CSE (Full Stack Development)', shortName: 'CSE-FSD', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
  { courseCode: '0179', name: 'Bachelor of Technology in CSE (Cloud Computing)', shortName: 'CSE-CC', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
  { courseCode: '0181', name: 'Bachelor of Technology in CSE (UI/UX)', shortName: 'CSE-UIUX', degree: 'B.Tech', duration: 4, totalSemesters: 8, department: 'School of Engineering & Technology' },
];

// ─────────────────────────────────────────────
// 2. SUBJECTS — University style, semester-wise
//    Common subjects shared across all branches (Sem 1 & 2)
//    Branch-specific from Sem 3 onwards
// ─────────────────────────────────────────────
const subjects = [

  // ══════════════════════════════════════
  // SEMESTER 1 — Common to ALL branches
  // ══════════════════════════════════════
  { subjectCode: 'KAS101', name: 'Engineering Mathematics-I', shortName: 'M-I', courseCode: 'COMMON', semester: 1, credits: 4, type: 'Theory', category: 'Common' },
  { subjectCode: 'KAS102', name: 'Engineering Physics', shortName: 'EP', courseCode: 'COMMON', semester: 1, credits: 4, type: 'Theory', category: 'Common' },
  { subjectCode: 'KAS103', name: 'Engineering Chemistry', shortName: 'EC', courseCode: 'COMMON', semester: 1, credits: 4, type: 'Theory', category: 'Common' },
  { subjectCode: 'KCS101', name: 'Introduction to Programming (C)', shortName: 'C-Prog', courseCode: 'COMMON', semester: 1, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAS151', name: 'Engineering Physics Lab', shortName: 'EP Lab', courseCode: 'COMMON', semester: 1, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS151', name: 'Programming Lab (C)', shortName: 'C Lab', courseCode: 'COMMON', semester: 1, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KAS104', name: 'Basic Electrical Engineering', shortName: 'BEE', courseCode: 'COMMON', semester: 1, credits: 3, type: 'Theory', category: 'Common' },
  { subjectCode: 'KHU101', name: 'Communication Skills', shortName: 'CS', courseCode: 'COMMON', semester: 1, credits: 2, type: 'Theory', category: 'Common' },

  // ══════════════════════════════════════
  // SEMESTER 2 — Common to ALL branches
  // ══════════════════════════════════════
  { subjectCode: 'KAS201', name: 'Engineering Mathematics-II', shortName: 'M-II', courseCode: 'COMMON', semester: 2, credits: 4, type: 'Theory', category: 'Common' },
  { subjectCode: 'KCS201', name: 'Data Structures', shortName: 'DS', courseCode: 'COMMON', semester: 2, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS202', name: 'Object Oriented Programming (Java)', shortName: 'OOP', courseCode: 'COMMON', semester: 2, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAS202', name: 'Engineering Mathematics-III (Probability & Statistics)', shortName: 'M-III', courseCode: 'COMMON', semester: 2, credits: 3, type: 'Theory', category: 'Common' },
  { subjectCode: 'KCS251', name: 'Data Structures Lab', shortName: 'DS Lab', courseCode: 'COMMON', semester: 2, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS252', name: 'OOP Lab (Java)', shortName: 'OOP Lab', courseCode: 'COMMON', semester: 2, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KHU201', name: 'Professional Ethics & Human Values', shortName: 'Ethics', courseCode: 'COMMON', semester: 2, credits: 2, type: 'Theory', category: 'Common' },
  { subjectCode: 'KCS203', name: 'Digital Electronics & Logic Design', shortName: 'DELD', courseCode: 'COMMON', semester: 2, credits: 3, type: 'Theory', category: 'Core' },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE Core (0171)
  // ══════════════════════════════════════════
  { subjectCode: 'KCS301', name: 'Discrete Mathematics', shortName: 'DM', courseCode: '0171', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS302', name: 'Computer Organization & Architecture', shortName: 'COA', courseCode: '0171', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS303', name: 'Operating Systems', shortName: 'OS', courseCode: '0171', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS304', name: 'Database Management Systems', shortName: 'DBMS', courseCode: '0171', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS351', name: 'OS Lab', shortName: 'OS Lab', courseCode: '0171', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS352', name: 'DBMS Lab', shortName: 'DBMS Lab', courseCode: '0171', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS305', name: 'Design & Analysis of Algorithms', shortName: 'DAA', courseCode: '0171', semester: 3, credits: 3, type: 'Theory', category: 'Core' },

  // SEMESTER 4 — CSE Core (0171)
  { subjectCode: 'KCS401', name: 'Theory of Automata & Formal Languages', shortName: 'TOC', courseCode: '0171', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS402', name: 'Computer Networks', shortName: 'CN', courseCode: '0171', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS403', name: 'Software Engineering', shortName: 'SE', courseCode: '0171', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS404', name: 'Microprocessors & Interfacing', shortName: 'MP', courseCode: '0171', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS451', name: 'Computer Networks Lab', shortName: 'CN Lab', courseCode: '0171', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS452', name: 'Software Engineering Lab', shortName: 'SE Lab', courseCode: '0171', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KOE401', name: 'Open Elective-I', shortName: 'OE-I', courseCode: '0171', semester: 4, credits: 3, type: 'Theory', category: 'Open Elective' },

  // SEMESTER 5 — CSE Core (0171)
  { subjectCode: 'KCS501', name: 'Compiler Design', shortName: 'CD', courseCode: '0171', semester: 5, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS502', name: 'Artificial Intelligence', shortName: 'AI', courseCode: '0171', semester: 5, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS503', name: 'Web Technologies', shortName: 'WT', courseCode: '0171', semester: 5, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS504', name: 'Information Security', shortName: 'IS', courseCode: '0171', semester: 5, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS551', name: 'AI Lab', shortName: 'AI Lab', courseCode: '0171', semester: 5, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KCS552', name: 'Web Technologies Lab', shortName: 'WT Lab', courseCode: '0171', semester: 5, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 6 — CSE Core (0171)
  { subjectCode: 'KCS601', name: 'Machine Learning', shortName: 'ML', courseCode: '0171', semester: 6, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS602', name: 'Cloud Computing', shortName: 'CC', courseCode: '0171', semester: 6, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS603', name: 'Big Data Analytics', shortName: 'BDA', courseCode: '0171', semester: 6, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCS604', name: 'Minor Project', shortName: 'MP', courseCode: '0171', semester: 6, credits: 4, type: 'Theory', category: 'Minor Project' },
  { subjectCode: 'KCS651', name: 'ML Lab', shortName: 'ML Lab', courseCode: '0171', semester: 6, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE-AIML (0173)
  // ══════════════════════════════════════════
  { subjectCode: 'KAI301', name: 'Discrete Mathematics & Graph Theory', shortName: 'DMGT', courseCode: '0173', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI302', name: 'Computer Organization & Architecture', shortName: 'COA', courseCode: '0173', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI303', name: 'Operating Systems', shortName: 'OS', courseCode: '0173', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI304', name: 'Database Management Systems', shortName: 'DBMS', courseCode: '0173', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI305', name: 'Python Programming for AI', shortName: 'Python-AI', courseCode: '0173', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI351', name: 'Python Programming Lab', shortName: 'Python Lab', courseCode: '0173', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KAI352', name: 'DBMS Lab', shortName: 'DBMS Lab', courseCode: '0173', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 4 — CSE-AIML (0173)  ← YOUR CURRENT SEMESTER
  { subjectCode: 'KAI401', name: 'Mathematics for Machine Learning', shortName: 'Math-ML', courseCode: '0173', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI402', name: 'Machine Learning Fundamentals', shortName: 'ML', courseCode: '0173', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI403', name: 'Computer Networks', shortName: 'CN', courseCode: '0173', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI404', name: 'Software Engineering & Agile Methods', shortName: 'SE', courseCode: '0173', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI405', name: 'Data Visualization & Storytelling', shortName: 'DV', courseCode: '0173', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI451', name: 'Machine Learning Lab', shortName: 'ML Lab', courseCode: '0173', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KAI452', name: 'Data Visualization Lab', shortName: 'DV Lab', courseCode: '0173', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 5 — CSE-AIML (0173)
  { subjectCode: 'KAI501', name: 'Deep Learning', shortName: 'DL', courseCode: '0173', semester: 5, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI502', name: 'Natural Language Processing', shortName: 'NLP', courseCode: '0173', semester: 5, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI503', name: 'Computer Vision', shortName: 'CV', courseCode: '0173', semester: 5, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI504', name: 'Reinforcement Learning', shortName: 'RL', courseCode: '0173', semester: 5, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI505', name: 'Big Data & Distributed Computing', shortName: 'BDC', courseCode: '0173', semester: 5, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI551', name: 'Deep Learning Lab', shortName: 'DL Lab', courseCode: '0173', semester: 5, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KAI552', name: 'NLP Lab', shortName: 'NLP Lab', courseCode: '0173', semester: 5, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 6 — CSE-AIML (0173)
  { subjectCode: 'KAI601', name: 'AI Ethics & Responsible AI', shortName: 'AI Ethics', courseCode: '0173', semester: 6, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI602', name: 'Generative AI & Large Language Models', shortName: 'GenAI', courseCode: '0173', semester: 6, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI603', name: 'MLOps & Model Deployment', shortName: 'MLOps', courseCode: '0173', semester: 6, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KAI604', name: 'Minor Project (AI)', shortName: 'Mini Proj', courseCode: '0173', semester: 6, credits: 4, type: 'Theory', category: 'Minor Project' },
  { subjectCode: 'KAI651', name: 'MLOps Lab', shortName: 'MLOps Lab', courseCode: '0173', semester: 6, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE-DS (0175)
  // ══════════════════════════════════════════
  { subjectCode: 'KDS301', name: 'Discrete Mathematics', shortName: 'DM', courseCode: '0175', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS302', name: 'Computer Organization & Architecture', shortName: 'COA', courseCode: '0175', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS303', name: 'Database Systems & SQL', shortName: 'DBS', courseCode: '0175', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS304', name: 'Statistical Methods for Data Science', shortName: 'Stats-DS', courseCode: '0175', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS305', name: 'Python for Data Science', shortName: 'Python-DS', courseCode: '0175', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS351', name: 'Python & Stats Lab', shortName: 'Py-Stats Lab', courseCode: '0175', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KDS352', name: 'Database Lab', shortName: 'DB Lab', courseCode: '0175', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 4 — CSE-DS (0175)
  { subjectCode: 'KDS401', name: 'Machine Learning for Data Science', shortName: 'ML-DS', courseCode: '0175', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS402', name: 'Data Warehousing & Mining', shortName: 'DWM', courseCode: '0175', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS403', name: 'Big Data Technologies (Hadoop/Spark)', shortName: 'Big Data', courseCode: '0175', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS404', name: 'Data Visualization (Tableau/PowerBI)', shortName: 'DV', courseCode: '0175', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KDS451', name: 'ML-DS Lab', shortName: 'ML-DS Lab', courseCode: '0175', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KDS452', name: 'Big Data Lab', shortName: 'BD Lab', courseCode: '0175', semester: 4, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE-FSD (0177)
  // ══════════════════════════════════════════
  { subjectCode: 'KFS301', name: 'Discrete Mathematics', shortName: 'DM', courseCode: '0177', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS302', name: 'Database Systems', shortName: 'DBS', courseCode: '0177', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS303', name: 'Frontend Development (HTML/CSS/JS)', shortName: 'FE Dev', courseCode: '0177', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS304', name: 'Operating Systems', shortName: 'OS', courseCode: '0177', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS305', name: 'JavaScript & ES6+', shortName: 'JS', courseCode: '0177', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS351', name: 'Frontend Dev Lab', shortName: 'FE Lab', courseCode: '0177', semester: 3, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
  { subjectCode: 'KFS352', name: 'Database Lab', shortName: 'DB Lab', courseCode: '0177', semester: 3, credits: 1, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 4 — CSE-FSD (0177)
  { subjectCode: 'KFS401', name: 'React.js & Frontend Frameworks', shortName: 'React', courseCode: '0177', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS402', name: 'Node.js & Backend Development', shortName: 'Node', courseCode: '0177', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS403', name: 'RESTful API Design & Development', shortName: 'REST API', courseCode: '0177', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS404', name: 'Computer Networks', shortName: 'CN', courseCode: '0177', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS405', name: 'Software Engineering', shortName: 'SE', courseCode: '0177', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KFS451', name: 'Full Stack Dev Lab', shortName: 'FS Lab', courseCode: '0177', semester: 4, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE-CC (0179)
  // ══════════════════════════════════════════
  { subjectCode: 'KCC301', name: 'Discrete Mathematics', shortName: 'DM', courseCode: '0179', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC302', name: 'Computer Networks & Protocols', shortName: 'CN', courseCode: '0179', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC303', name: 'Operating Systems & Linux', shortName: 'OS-Linux', courseCode: '0179', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC304', name: 'Database Management Systems', shortName: 'DBMS', courseCode: '0179', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC305', name: 'Cloud Fundamentals (AWS/Azure)', shortName: 'Cloud Fund', courseCode: '0179', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC351', name: 'Linux & Networking Lab', shortName: 'Linux Lab', courseCode: '0179', semester: 3, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 4 — CSE-CC (0179)
  { subjectCode: 'KCC401', name: 'Cloud Architecture & Design', shortName: 'Cloud Arch', courseCode: '0179', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC402', name: 'Virtualization & Containerization (Docker/K8s)', shortName: 'Docker-K8s', courseCode: '0179', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC403', name: 'Cloud Security', shortName: 'Cloud Sec', courseCode: '0179', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC404', name: 'DevOps Practices', shortName: 'DevOps', courseCode: '0179', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KCC451', name: 'Cloud Lab (AWS/Azure)', shortName: 'Cloud Lab', courseCode: '0179', semester: 4, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // ══════════════════════════════════════════
  // SEMESTER 3 — CSE-UIUX (0181)
  // ══════════════════════════════════════════
  { subjectCode: 'KUX301', name: 'Design Thinking & Human Centered Design', shortName: 'Design Think', courseCode: '0181', semester: 3, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX302', name: 'Visual Design Principles', shortName: 'VDP', courseCode: '0181', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX303', name: 'Frontend Development (HTML/CSS)', shortName: 'FE Dev', courseCode: '0181', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX304', name: 'User Research & Usability Testing', shortName: 'UR', courseCode: '0181', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX305', name: 'Database Basics', shortName: 'DB', courseCode: '0181', semester: 3, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX351', name: 'Figma & Prototyping Lab', shortName: 'Figma Lab', courseCode: '0181', semester: 3, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },

  // SEMESTER 4 — CSE-UIUX (0181)
  { subjectCode: 'KUX401', name: 'Interaction Design & Prototyping', shortName: 'IxD', courseCode: '0181', semester: 4, credits: 4, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX402', name: 'Mobile App Design (Android/iOS)', shortName: 'Mobile Design', courseCode: '0181', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX403', name: 'JavaScript for UI', shortName: 'JS-UI', courseCode: '0181', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX404', name: 'Accessibility & Inclusive Design', shortName: 'A11y', courseCode: '0181', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX405', name: 'Computer Networks', shortName: 'CN', courseCode: '0181', semester: 4, credits: 3, type: 'Theory', category: 'Core' },
  { subjectCode: 'KUX451', name: 'UI/UX Portfolio Lab', shortName: 'Portfolio Lab', courseCode: '0181', semester: 4, credits: 2, type: 'Lab', category: 'Lab', hasTheory: false, hasLab: true },
];

// ─────────────────────────────────────────────
// 3. FACULTY
// ─────────────────────────────────────────────
const facultyRaw = [
  // HOD / Senior Faculty
  { email: 'dr.rajesh.sharma@krmu.edu.in', name: 'Dr. Rajesh Sharma', employeeId: 'EMP001', designation: 'Professor', specialization: ['Artificial Intelligence', 'Machine Learning'], role: 'admin' },
  { email: 'dr.priya.verma@krmu.edu.in', name: 'Dr. Priya Verma', employeeId: 'EMP002', designation: 'Professor', specialization: ['Data Science', 'Statistics', 'Big Data'], role: 'faculty' },
  { email: 'dr.anil.kumar@krmu.edu.in', name: 'Dr. Anil Kumar', employeeId: 'EMP003', designation: 'Professor', specialization: ['Computer Networks', 'Cloud Computing', 'Cybersecurity'], role: 'faculty' },

  // Associate Professors
  { email: 'dr.meena.gupta@krmu.edu.in', name: 'Dr. Meena Gupta', employeeId: 'EMP004', designation: 'Associate Professor', specialization: ['Software Engineering', 'Full Stack Development'], role: 'faculty' },
  { email: 'dr.suresh.pandey@krmu.edu.in', name: 'Dr. Suresh Pandey', employeeId: 'EMP005', designation: 'Associate Professor', specialization: ['Database Systems', 'Data Warehousing'], role: 'faculty' },
  { email: 'dr.kavita.singh@krmu.edu.in', name: 'Dr. Kavita Singh', employeeId: 'EMP006', designation: 'Associate Professor', specialization: ['Machine Learning', 'Deep Learning', 'Computer Vision'], role: 'faculty' },
  { email: 'dr.rohit.jain@krmu.edu.in', name: 'Dr. Rohit Jain', employeeId: 'EMP007', designation: 'Associate Professor', specialization: ['Mathematics', 'Discrete Mathematics', 'Theory of Computation'], role: 'faculty' },

  // Assistant Professors
  { email: 'ms.ananya.mishra@krmu.edu.in', name: 'Ms. Ananya Mishra', employeeId: 'EMP008', designation: 'Assistant Professor', specialization: ['Python', 'AI', 'NLP'], role: 'faculty' },
  { email: 'mr.vikram.chauhan@krmu.edu.in', name: 'Mr. Vikram Chauhan', employeeId: 'EMP009', designation: 'Assistant Professor', specialization: ['React', 'Node.js', 'Full Stack'], role: 'faculty' },
  { email: 'ms.ritu.agarwal@krmu.edu.in', name: 'Ms. Ritu Agarwal', employeeId: 'EMP010', designation: 'Assistant Professor', specialization: ['UI/UX Design', 'Figma', 'Design Thinking'], role: 'faculty' },
  { email: 'mr.arjun.nair@krmu.edu.in', name: 'Mr. Arjun Nair', employeeId: 'EMP011', designation: 'Assistant Professor', specialization: ['Cloud Computing', 'AWS', 'DevOps', 'Docker'], role: 'faculty' },
  { email: 'ms.divya.rao@krmu.edu.in', name: 'Ms. Divya Rao', employeeId: 'EMP012', designation: 'Assistant Professor', specialization: ['Data Visualization', 'Tableau', 'Statistics'], role: 'faculty' },
  { email: 'mr.saurabh.tiwari@krmu.edu.in', name: 'Mr. Saurabh Tiwari', employeeId: 'EMP013', designation: 'Assistant Professor', specialization: ['Operating Systems', 'Computer Architecture', 'Embedded Systems'], role: 'faculty' },
  { email: 'ms.pooja.bhatt@krmu.edu.in', name: 'Ms. Pooja Bhatt', employeeId: 'EMP014', designation: 'Assistant Professor', specialization: ['Deep Learning', 'Computer Vision', 'Image Processing'], role: 'faculty' },
  { email: 'mr.nikhil.saxena@krmu.edu.in', name: 'Mr. Nikhil Saxena', employeeId: 'EMP015', designation: 'Senior Assistant Professor', specialization: ['Mathematics', 'Engineering Physics', 'Engineering Chemistry'], role: 'faculty' },

  // Lab Instructors
  { email: 'mr.rakesh.yadav@krmu.edu.in', name: 'Mr. Rakesh Yadav', employeeId: 'EMP016', designation: 'Lab Instructor', specialization: ['Programming Labs', 'Python', 'Java'], role: 'faculty' },
  { email: 'ms.sunita.kumari@krmu.edu.in', name: 'Ms. Sunita Kumari', employeeId: 'EMP017', designation: 'Lab Instructor', specialization: ['Cloud Labs', 'Linux', 'Networking'], role: 'faculty' },
];

// ─────────────────────────────────────────────
// 4. SUBJECT-FACULTY MAPPING
//    Real university style: one faculty per subject per section
//    Senior faculty → theory heavy / core subjects
//    Lab instructors → lab subjects
// ─────────────────────────────────────────────
// This is built dynamically after faculty are inserted (see seedAll())

// ─────────────────────────────────────────────
// 5. STUDENT GENERATION
// ─────────────────────────────────────────────

const firstNamesMale = [
  'Aarav','Arjun','Vivaan','Aditya','Vihaan','Sai','Arnav','Ishaan','Kabir','Reyansh',
  'Shivam','Rohit','Kunal','Akash','Nikhil','Rahul','Harsh','Yash','Mohit','Aman',
  'Kartik','Deepak','Ritik','Varun','Gaurav','Sumit','Ankit','Vikram','Pranav','Abhishek',
  'Sourav','Tarun','Manish','Sunil','Prateek','Aakash','Rishabh','Parth','Dev','Siddharth',
  'Lakshay','Tushar','Karan','Piyush','Ayush','Raghav','Dhruv','Shivansh','Mayank','Sachin',
  'Tanmay','Ansh','Utkarsh','Himanshu','Rohan','Naman','Akshat','Divyansh','Abhinav','Rajat'
];

const firstNamesFemale = [
  'Aanya','Aadhya','Ananya','Pari','Diya','Myra','Sara','Riya','Priya','Neha',
  'Sneha','Pooja','Kajal','Nisha','Divya','Simran','Kavya','Shruti','Aditi','Swati',
  'Nikita','Komal','Aisha','Tanya','Meera','Shreya','Sanya','Ishita','Vidya','Ritika',
  'Pallavi','Ankita','Shweta','Varsha','Deepika','Sonam','Garima','Radhika','Aparna','Nandini',
  'Isha','Trisha','Bhavna','Leena','Sunita','Rekha','Monika','Pinki','Seema','Geeta'
];

const lastNames = [
  'Sharma','Verma','Gupta','Singh','Kumar','Agarwal','Jain','Yadav','Mishra','Tiwari',
  'Pandey','Chauhan','Rajput','Saxena','Srivastava','Shukla','Dwivedi','Tripathi','Chaturvedi','Pathak',
  'Joshi','Nair','Pillai','Rao','Reddy','Iyer','Menon','Krishnan','Bhat','Kaur',
  'Thakur','Rawat','Bisht','Negi','Mehta','Shah','Patel','Desai','Choksi','Modi',
  'Bansal','Garg','Goyal','Arora','Bhatia','Kapoor','Malhotra','Khanna','Sethi','Anand'
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStudents() {
  const students = [];
  const usedEmails = new Set();
  const usedRolls = new Set();

  const courseBatches = [
    { courseCode: '0171', shortName: 'CSE',     batchSizes: { 2023: 180, 2024: 180 } },
    { courseCode: '0173', shortName: 'CSEAIML', batchSizes: { 2023: 120, 2024: 120 } },
    { courseCode: '0175', shortName: 'CSEDS',   batchSizes: { 2023: 90,  2024: 90  } },
    { courseCode: '0177', shortName: 'CSEFSD',  batchSizes: { 2023: 90,  2024: 90  } },
    { courseCode: '0179', shortName: 'CSECC',   batchSizes: { 2023: 60,  2024: 60  } },
    { courseCode: '0181', shortName: 'CSEUIUX', batchSizes: { 2023: 60,  2024: 60  } },
  ];

  const courseNames = {
    '0171': 'Bachelor of Technology in Computer Science & Engineering',
    '0173': 'Bachelor of Technology in CSE (AI & Machine Learning)',
    '0175': 'Bachelor of Technology in CSE (Data Science)',
    '0177': 'Bachelor of Technology in CSE (Full Stack Development)',
    '0179': 'Bachelor of Technology in CSE (Cloud Computing)',
    '0181': 'Bachelor of Technology in CSE (UI/UX)',
  };

  // Inject YOUR roll number first
  students.push({
    email: '2401730232@krmu.edu.in',
    name: 'Enrolled Student',
    rollNo: '2401730232',
    courseCode: '0173',
    courseName: courseNames['0173'],
    enrollmentYear: 2024,
    batch: '2024-2028',
    section: 'C',
    gender: 'Male',
    role: 'student',
    isActive: true,
  });
  usedEmails.add('2401730232@krmu.edu.in');
  usedRolls.add('2401730232');

  for (const course of courseBatches) {
    for (const [yearStr, count] of Object.entries(course.batchSizes)) {
      const year = parseInt(yearStr);
      const yy = String(year).slice(2); // "23" or "24"
      const batch = `${year}-${year + 4}`;
      const sections = count > 120 ? ['A','B','C'] : count > 60 ? ['A','B'] : ['A'];

      // Total seats distributed across sections
      const perSection = Math.ceil(count / sections.length);
      let globalRollCounter = 1;

      for (const section of sections) {
        for (let i = 0; i < perSection && globalRollCounter <= count; i++, globalRollCounter++) {
          const isFemale = Math.random() < 0.38;
          const firstName = isFemale ? randomFrom(firstNamesFemale) : randomFrom(firstNamesMale);
          const lastName = randomFrom(lastNames);
          const fullName = `${firstName} ${lastName}`;

          const rollSeq = String(globalRollCounter).padStart(4, '0');
          const rollNo = `${yy}${course.courseCode}${rollSeq}`;

          if (usedRolls.has(rollNo)) continue;
          usedRolls.add(rollNo);

          // Email: firstname.lastname<rollseq>@krmu.edu.in (sanitized)
          let emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rollSeq}`;
          emailBase = emailBase.replace(/[^a-z0-9.]/g, '');
          let email = `${emailBase}@krmu.edu.in`;

          // Ensure uniqueness
          let suffix = 1;
          while (usedEmails.has(email)) {
            email = `${emailBase}${suffix}@krmu.edu.in`;
            suffix++;
          }
          usedEmails.add(email);

          students.push({
            email,
            name: fullName,
            rollNo,
            courseCode: course.courseCode,
            courseName: courseNames[course.courseCode],
            enrollmentYear: year,
            batch,
            section,
            gender: isFemale ? 'Female' : 'Male',
            role: 'student',
            isActive: true,
          });
        }
      }
    }
  }
  return students;
}

// ─────────────────────────────────────────────
// 6. SUBJECT-FACULTY MAPPINGS
// ─────────────────────────────────────────────
// Maps: subjectCode → { theory: employeeId, lab: employeeId (optional) }
// University style: theory and lab can be different faculty
const subjectFacultyAssignments = {
  // ── COMMON SEM 1 ──
  'KAS101': { theory: 'EMP015' },           // Math-I → Sr. Asst Prof (Maths)
  'KAS102': { theory: 'EMP015' },           // Engineering Physics
  'KAS103': { theory: 'EMP015' },           // Engineering Chemistry
  'KCS101': { theory: 'EMP008' },           // C Programming → Ananya
  'KAS151': { lab: 'EMP016' },             // Physics Lab → Lab Instructor
  'KCS151': { lab: 'EMP016' },             // C Lab
  'KAS104': { theory: 'EMP015' },          // BEE
  'KHU101': { theory: 'EMP015' },          // Communication Skills

  // ── COMMON SEM 2 ──
  'KAS201': { theory: 'EMP007' },           // Math-II → Dr. Rohit Jain (Maths specialist)
  'KCS201': { theory: 'EMP008' },           // Data Structures → Ananya
  'KCS202': { theory: 'EMP009' },           // OOP Java → Vikram (FS)
  'KAS202': { theory: 'EMP007' },           // Math-III (Prob & Stats)
  'KCS251': { lab: 'EMP016' },             // DS Lab
  'KCS252': { lab: 'EMP016' },             // OOP Lab
  'KHU201': { theory: 'EMP015' },          // Ethics
  'KCS203': { theory: 'EMP013' },          // Digital Electronics → Saurabh

  // ── CSE CORE SEM 3 ──
  'KCS301': { theory: 'EMP007' },           // Discrete Maths
  'KCS302': { theory: 'EMP013' },           // COA
  'KCS303': { theory: 'EMP013' },           // OS
  'KCS304': { theory: 'EMP005' },           // DBMS → Dr. Suresh Pandey
  'KCS351': { lab: 'EMP016' },             // OS Lab
  'KCS352': { lab: 'EMP016' },             // DBMS Lab
  'KCS305': { theory: 'EMP008' },           // DAA

  // ── CSE CORE SEM 4 ──
  'KCS401': { theory: 'EMP007' },           // TOC
  'KCS402': { theory: 'EMP003' },           // Computer Networks → Dr. Anil Kumar
  'KCS403': { theory: 'EMP004' },           // Software Engg → Dr. Meena Gupta
  'KCS404': { theory: 'EMP013' },           // Microprocessors
  'KCS451': { lab: 'EMP017' },             // CN Lab → Lab Instructor
  'KCS452': { lab: 'EMP016' },             // SE Lab
  'KOE401': { theory: 'EMP011' },           // Open Elective

  // ── CSE CORE SEM 5 ──
  'KCS501': { theory: 'EMP007' },           // Compiler Design
  'KCS502': { theory: 'EMP001' },           // AI → Dr. Rajesh Sharma (HOD)
  'KCS503': { theory: 'EMP009' },           // Web Tech → Vikram
  'KCS504': { theory: 'EMP003' },           // Info Security
  'KCS551': { lab: 'EMP016' },             // AI Lab
  'KCS552': { lab: 'EMP009' },             // WT Lab → Vikram

  // ── CSE CORE SEM 6 ──
  'KCS601': { theory: 'EMP006' },           // ML → Dr. Kavita Singh
  'KCS602': { theory: 'EMP011' },           // Cloud → Arjun Nair
  'KCS603': { theory: 'EMP002' },           // Big Data → Dr. Priya Verma
  'KCS604': { theory: 'EMP004' },           // Minor Project
  'KCS651': { lab: 'EMP016' },             // ML Lab

  // ── AIML SEM 3 ──
  'KAI301': { theory: 'EMP007' },           // DMGT
  'KAI302': { theory: 'EMP013' },           // COA
  'KAI303': { theory: 'EMP013' },           // OS
  'KAI304': { theory: 'EMP005' },           // DBMS
  'KAI305': { theory: 'EMP008' },           // Python for AI
  'KAI351': { lab: 'EMP016' },             // Python Lab
  'KAI352': { lab: 'EMP016' },             // DBMS Lab

  // ── AIML SEM 4 (YOUR SEMESTER) ──
  'KAI401': { theory: 'EMP007' },           // Math for ML → Dr. Rohit Jain
  'KAI402': { theory: 'EMP006' },           // ML Fundamentals → Dr. Kavita Singh
  'KAI403': { theory: 'EMP003' },           // Computer Networks → Dr. Anil Kumar
  'KAI404': { theory: 'EMP004' },           // Software Engg → Dr. Meena Gupta
  'KAI405': { theory: 'EMP012' },           // Data Visualization → Ms. Divya Rao
  'KAI451': { lab: 'EMP016' },             // ML Lab → Lab Instructor
  'KAI452': { lab: 'EMP012' },             // DV Lab → Divya Rao

  // ── AIML SEM 5 ──
  'KAI501': { theory: 'EMP006' },           // Deep Learning
  'KAI502': { theory: 'EMP008' },           // NLP
  'KAI503': { theory: 'EMP014' },           // Computer Vision → Pooja Bhatt
  'KAI504': { theory: 'EMP001' },           // RL → Dr. Rajesh Sharma
  'KAI505': { theory: 'EMP002' },           // Big Data
  'KAI551': { lab: 'EMP014' },             // DL Lab
  'KAI552': { lab: 'EMP008' },             // NLP Lab

  // ── AIML SEM 6 ──
  'KAI601': { theory: 'EMP001' },           // AI Ethics
  'KAI602': { theory: 'EMP001' },           // GenAI/LLMs
  'KAI603': { theory: 'EMP011' },           // MLOps
  'KAI604': { theory: 'EMP006' },           // Minor Project
  'KAI651': { lab: 'EMP011' },             // MLOps Lab

  // ── DS SEM 3 ──
  'KDS301': { theory: 'EMP007' },
  'KDS302': { theory: 'EMP013' },
  'KDS303': { theory: 'EMP005' },
  'KDS304': { theory: 'EMP002' },
  'KDS305': { theory: 'EMP008' },
  'KDS351': { lab: 'EMP016' },
  'KDS352': { lab: 'EMP016' },

  // ── DS SEM 4 ──
  'KDS401': { theory: 'EMP006' },
  'KDS402': { theory: 'EMP005' },
  'KDS403': { theory: 'EMP002' },
  'KDS404': { theory: 'EMP012' },
  'KDS451': { lab: 'EMP016' },
  'KDS452': { lab: 'EMP017' },

  // ── FSD SEM 3 ──
  'KFS301': { theory: 'EMP007' },
  'KFS302': { theory: 'EMP005' },
  'KFS303': { theory: 'EMP009' },
  'KFS304': { theory: 'EMP013' },
  'KFS305': { theory: 'EMP009' },
  'KFS351': { lab: 'EMP009' },
  'KFS352': { lab: 'EMP016' },

  // ── FSD SEM 4 ──
  'KFS401': { theory: 'EMP009' },
  'KFS402': { theory: 'EMP009' },
  'KFS403': { theory: 'EMP004' },
  'KFS404': { theory: 'EMP003' },
  'KFS405': { theory: 'EMP004' },
  'KFS451': { lab: 'EMP009' },

  // ── CC SEM 3 ──
  'KCC301': { theory: 'EMP007' },
  'KCC302': { theory: 'EMP003' },
  'KCC303': { theory: 'EMP013' },
  'KCC304': { theory: 'EMP005' },
  'KCC305': { theory: 'EMP011' },
  'KCC351': { lab: 'EMP017' },

  // ── CC SEM 4 ──
  'KCC401': { theory: 'EMP011' },
  'KCC402': { theory: 'EMP011' },
  'KCC403': { theory: 'EMP003' },
  'KCC404': { theory: 'EMP011' },
  'KCC451': { lab: 'EMP017' },

  // ── UIUX SEM 3 ──
  'KUX301': { theory: 'EMP010' },
  'KUX302': { theory: 'EMP010' },
  'KUX303': { theory: 'EMP009' },
  'KUX304': { theory: 'EMP010' },
  'KUX305': { theory: 'EMP005' },
  'KUX351': { lab: 'EMP010' },

  // ── UIUX SEM 4 ──
  'KUX401': { theory: 'EMP010' },
  'KUX402': { theory: 'EMP010' },
  'KUX403': { theory: 'EMP009' },
  'KUX404': { theory: 'EMP010' },
  'KUX405': { theory: 'EMP003' },
  'KUX451': { lab: 'EMP010' },
};

// ─────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────
async function seedAll() {
  await connectDB();

  console.log('🗑️  Clearing existing data...');
  await Course.deleteMany({});
  await Student.deleteMany({});
  await Faculty.deleteMany({});
  await Subject.deleteMany({});
  await SubjectFacultyMap.deleteMany({});
  console.log('✅ Cleared');

  // 1. Insert Courses
  console.log('📚 Seeding courses...');
  await Course.insertMany(courses);
  console.log(`✅ ${courses.length} courses inserted`);

  // 2. Insert Subjects
  console.log('📖 Seeding subjects...');
  await Subject.insertMany(subjects);
  console.log(`✅ ${subjects.length} subjects inserted`);

  // 3. Insert Faculty (with hashed passwords)
  console.log('👨‍🏫 Seeding faculty...');
  const hashedPassword = await bcrypt.hash('Faculty@123', 10);
  const facultyDocs = facultyRaw.map(f => ({ ...f, password: hashedPassword, department: 'School of Engineering & Technology' }));
  const insertedFaculty = await Faculty.insertMany(facultyDocs);
  console.log(`✅ ${insertedFaculty.length} faculty inserted`);

  // Build employeeId → _id map
  const empIdToDoc = {};
  insertedFaculty.forEach(f => { empIdToDoc[f.employeeId] = f; });

  // 4. Insert Students
  console.log('🎓 Generating & seeding students...');
  const studentData = generateStudents();
  await Student.insertMany(studentData);
  console.log(`✅ ${studentData.length} students inserted`);

  // 5. Build Subject-Faculty Mappings
  console.log('🔗 Building subject-faculty mappings...');
  const academicYear = '2025-26';
  const maps = [];

  for (const [subjectCode, assignment] of Object.entries(subjectFacultyAssignments)) {
    const subjectDoc = subjects.find(s => s.subjectCode === subjectCode);
    if (!subjectDoc) continue;

    const courseCode = subjectDoc.courseCode;
    const semester = subjectDoc.semester;

    // Determine which actual course codes this applies to
    const targetCourseCodes = courseCode === 'COMMON'
      ? ['0171','0173','0175','0177','0179','0181']
      : [courseCode];

    for (const cc of targetCourseCodes) {
      // Theory mapping
      if (assignment.theory) {
        const fac = empIdToDoc[assignment.theory];
        if (fac) {
          maps.push({
            subjectCode,
            facultyId: fac._id,
            courseCode: cc,
            semester,
            section: 'A',
            academicYear,
            type: 'Theory',
            isActive: true
          });
        }
      }

      // Lab mapping
      if (assignment.lab) {
        const fac = empIdToDoc[assignment.lab];
        if (fac) {
          maps.push({
            subjectCode,
            facultyId: fac._id,
            courseCode: cc,
            semester,
            section: 'A',
            academicYear,
            type: 'Lab',
            isActive: true
          });
        }
      }
    }
  }

  await SubjectFacultyMap.insertMany(maps);
  console.log(`✅ ${maps.length} subject-faculty mappings inserted`);

  // ── Summary ──
  console.log('\n════════════════════════════════════');
  console.log('🎉 SOET Portal Database Seeded!');
  console.log('════════════════════════════════════');
  console.log(`📚 Courses    : ${courses.length}`);
  console.log(`📖 Subjects   : ${subjects.length}`);
  console.log(`👨‍🏫 Faculty    : ${insertedFaculty.length}`);
  console.log(`🎓 Students   : ${studentData.length}`);
  console.log(`🔗 SF Maps    : ${maps.length}`);
  console.log('────────────────────────────────────');
  console.log('🔐 Faculty login password: Faculty@123');
  console.log('📧 Your roll no: 2401730232');
  console.log('📧 Your email  : 2401730232@krmu.edu.in');
  console.log('════════════════════════════════════\n');

  await mongoose.connection.close();
  process.exit(0);
}

seedAll().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});