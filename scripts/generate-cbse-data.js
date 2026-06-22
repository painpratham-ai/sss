const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load environment variables from .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    const val = trimmed.substring(firstEquals + 1).trim();
    process.env[key] = val;
  });
}

const { callModel } = require('../src/lib/models');

const CHUNKS_METADATA = [
  // === Class 1 ===
  {
    board: 'CBSE', subject: 'Overview', className: '1', category: 'curriculum',
    chapter: 'CBSE Class 1 Curriculum Overview',
    title: 'CBSE Class 1 Curriculum - Subjects and Structure',
    tags: 'curriculum,class1,cbse,primary,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'English', className: '1', category: 'syllabus',
    chapter: 'Alphabet, Phonics & Basic Grammar',
    title: 'CBSE Class 1 English Syllabus - Alphabet, Phonics and Grammar',
    tags: 'english,syllabus,class1,cbse,grammar,phonics',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '1', category: 'syllabus',
    chapter: 'Shapes, Space and Numbers to 20',
    title: 'CBSE Class 1 Mathematics Syllabus - Shapes and Numbers',
    tags: 'mathematics,syllabus,class1,cbse,shapes,numbers',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '1', category: 'syllabus',
    chapter: 'Basic Operations & Measurement',
    title: 'CBSE Class 1 Mathematics Syllabus - Addition, Subtraction & Measurement',
    tags: 'mathematics,syllabus,class1,cbse,operations,measurement',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '1', category: 'syllabus',
    chapter: 'My Body, Family & Plants',
    title: 'CBSE Class 1 EVS Syllabus - Body, Family, Environment',
    tags: 'evs,syllabus,class1,cbse,body,family,plants',
    source: 'NCERT'
  },

  // === Class 2 ===
  {
    board: 'CBSE', subject: 'Overview', className: '2', category: 'curriculum',
    chapter: 'CBSE Class 2 Curriculum Overview',
    title: 'CBSE Class 2 Curriculum - Subjects and Structure',
    tags: 'curriculum,class2,cbse,primary,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'English', className: '2', category: 'syllabus',
    chapter: 'English Grammar & Vocabulary',
    title: 'CBSE Class 2 English Syllabus - Grammar and Vocabulary',
    tags: 'english,syllabus,class2,cbse,grammar,vocabulary',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '2', category: 'syllabus',
    chapter: 'Place Value, Weight and Capacity',
    title: 'CBSE Class 2 Mathematics Syllabus - Numbers and Measurement',
    tags: 'mathematics,syllabus,class2,cbse,numbers,measurement',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '2', category: 'syllabus',
    chapter: 'Addition, Subtraction & Geometry',
    title: 'CBSE Class 2 Mathematics Syllabus - Operations and Shapes',
    tags: 'mathematics,syllabus,class2,cbse,operations,geometry',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '2', category: 'syllabus',
    chapter: 'Plants, Animals, Air & Water',
    title: 'CBSE Class 2 EVS Syllabus - Plants, Animals, Air and Water',
    tags: 'evs,syllabus,class2,cbse,plants,animals,air,water',
    source: 'NCERT'
  },

  // === Class 3 ===
  {
    board: 'CBSE', subject: 'Overview', className: '3', category: 'curriculum',
    chapter: 'CBSE Class 3 Curriculum Overview',
    title: 'CBSE Class 3 Curriculum - Subjects and Structure',
    tags: 'curriculum,class3,cbse,primary,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'English', className: '3', category: 'syllabus',
    chapter: 'Grammar and Writing Skills',
    title: 'CBSE Class 3 English Syllabus - Parts of Speech & Writing',
    tags: 'english,syllabus,class3,cbse,grammar,writing',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '3', category: 'syllabus',
    chapter: 'Numbers, Addition, Subtraction & Symmetry',
    title: 'CBSE Class 3 Mathematics Syllabus - Numbers & Symmetry',
    tags: 'mathematics,syllabus,class3,cbse,numbers,geometry',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '3', category: 'syllabus',
    chapter: 'Multiplication, Division, Time & Money',
    title: 'CBSE Class 3 Mathematics Syllabus - Multiplication, Division, Time, Money',
    tags: 'mathematics,syllabus,class3,cbse,operations,time,money',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '3', category: 'syllabus',
    chapter: 'Plants, Animals, Water & Food',
    title: 'CBSE Class 3 EVS Syllabus - Ecosystems, Water and Food',
    tags: 'evs,syllabus,class3,cbse,plants,animals,water,food',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '3', category: 'syllabus',
    chapter: 'Transport, Communication, Shelters & Work',
    title: 'CBSE Class 3 EVS Syllabus - Transport, Shelter & Work',
    tags: 'evs,syllabus,class3,cbse,transport,shelter,work',
    source: 'NCERT'
  },

  // === Class 4 ===
  {
    board: 'CBSE', subject: 'Overview', className: '4', category: 'curriculum',
    chapter: 'CBSE Class 4 Curriculum Overview',
    title: 'CBSE Class 4 Curriculum - Subjects and Structure',
    tags: 'curriculum,class4,cbse,primary,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'English', className: '4', category: 'syllabus',
    chapter: 'Grammar, Reading and Writing',
    title: 'CBSE Class 4 English Syllabus - Grammar and Composition',
    tags: 'english,syllabus,class4,cbse,grammar,writing',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '4', category: 'syllabus',
    chapter: 'Numbers, Time, Shapes & perspectives',
    title: 'CBSE Class 4 Mathematics Syllabus - Numbers, Time & Perspectives',
    tags: 'mathematics,syllabus,class4,cbse,numbers,time,shapes',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '4', category: 'syllabus',
    chapter: 'Fractions, Decimals, Perimeter & Areas',
    title: 'CBSE Class 4 Mathematics Syllabus - Fractions and Mensuration',
    tags: 'mathematics,syllabus,class4,cbse,fractions,mensuration',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '4', category: 'syllabus',
    chapter: 'Travel, Shelters & Community Behaviors',
    title: 'CBSE Class 4 EVS Syllabus - Travel, Shelter and Animals',
    tags: 'evs,syllabus,class4,cbse,travel,shelter,animals',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '4', category: 'syllabus',
    chapter: 'Agriculture, Rivers and Conservation',
    title: 'CBSE Class 4 EVS Syllabus - Agriculture, Rivers and Conservation',
    tags: 'evs,syllabus,class4,cbse,agriculture,water,conservation',
    source: 'NCERT'
  },

  // === Class 5 ===
  {
    board: 'CBSE', subject: 'Overview', className: '5', category: 'curriculum',
    chapter: 'CBSE Class 5 Curriculum Overview',
    title: 'CBSE Class 5 Curriculum - Subjects and Structure',
    tags: 'curriculum,class5,cbse,primary,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'English', className: '5', category: 'syllabus',
    chapter: 'Advanced Grammar & Story Writing',
    title: 'CBSE Class 5 English Syllabus - Grammar and Composition',
    tags: 'english,syllabus,class5,cbse,grammar,writing',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '5', category: 'syllabus',
    chapter: 'Large Numbers, Angles, Area & Perimeter',
    title: 'CBSE Class 5 Mathematics Syllabus - Numbers, Geometry & Mensuration',
    tags: 'mathematics,syllabus,class5,cbse,numbers,geometry,mensuration',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '5', category: 'syllabus',
    chapter: 'Fractions, Decimals, Patterns & Symmetry',
    title: 'CBSE Class 5 Mathematics Syllabus - Fractions, Decimals, Patterns',
    tags: 'mathematics,syllabus,class5,cbse,fractions,decimals,patterns',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '5', category: 'syllabus',
    chapter: 'Animal Senses, Seeds, Food Preservation',
    title: 'CBSE Class 5 EVS Syllabus - Animal Senses, Seeds, Nutrition',
    tags: 'evs,syllabus,class5,cbse,senses,seeds,food',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Environmental Studies (EVS)', className: '5', category: 'syllabus',
    chapter: 'Space, Shelter, Earthquakes & Fuel Conservation',
    title: 'CBSE Class 5 EVS Syllabus - Space, Shelter & Disasters',
    tags: 'evs,syllabus,class5,cbse,space,shelter,disasters,fuel',
    source: 'NCERT'
  },

  // === Class 6 ===
  {
    board: 'CBSE', subject: 'Overview', className: '6', category: 'curriculum',
    chapter: 'CBSE Class 6 Curriculum Overview',
    title: 'CBSE Class 6 Curriculum - Subjects and Structure',
    tags: 'curriculum,class6,cbse,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '6', category: 'syllabus',
    chapter: 'Ganita Prakash: Patterns, Numbers and Algebra',
    title: 'CBSE Class 6 Mathematics Syllabus - Numbers, Patterns and Algebra',
    tags: 'mathematics,syllabus,class6,cbse,numbers,algebra,patterns',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '6', category: 'syllabus',
    chapter: 'Ganita Prakash: Geometry, Perimeter & Area',
    title: 'CBSE Class 6 Mathematics Syllabus - Geometry and Mensuration',
    tags: 'mathematics,syllabus,class6,cbse,geometry,mensuration',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Science', className: '6', category: 'syllabus',
    chapter: 'Food, Materials & Plants',
    title: 'CBSE Class 6 Science Syllabus - Food, Materials and Plants',
    tags: 'science,syllabus,class6,cbse,food,materials,plants',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Science', className: '6', category: 'syllabus',
    chapter: 'Body Movements, Motion, Light & Magnetism',
    title: 'CBSE Class 6 Science Syllabus - Body, Motion, Light & Magnetism',
    tags: 'science,syllabus,class6,cbse,body,motion,light,magnets',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '6', category: 'syllabus',
    chapter: 'History: Our Pasts - I',
    title: 'CBSE Class 6 Social Science Syllabus - History (Ancient India)',
    tags: 'social_science,history,syllabus,class6,cbse,ancient',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '6', category: 'syllabus',
    chapter: 'Geography & Civics: Earth, Diversity & Government',
    title: 'CBSE Class 6 Social Science Syllabus - Geography and Civics',
    tags: 'social_science,geography,civics,syllabus,class6,cbse',
    source: 'NCERT'
  },

  // === Class 7 ===
  {
    board: 'CBSE', subject: 'Overview', className: '7', category: 'curriculum',
    chapter: 'CBSE Class 7 Curriculum Overview',
    title: 'CBSE Class 7 Curriculum - Subjects and Structure',
    tags: 'curriculum,class7,cbse,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '7', category: 'syllabus',
    chapter: 'Integers, Fractions, Decimals & Data Handling',
    title: 'CBSE Class 7 Mathematics Syllabus - Numbers and Data',
    tags: 'mathematics,syllabus,class7,cbse,integers,fractions,data',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '7', category: 'syllabus',
    chapter: 'Simple Equations, Lines, Angles & Triangles',
    title: 'CBSE Class 7 Mathematics Syllabus - Equations and Geometry',
    tags: 'mathematics,syllabus,class7,cbse,equations,geometry,triangles',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Science', className: '7', category: 'syllabus',
    chapter: 'Nutrition, Heat & Chemical Changes',
    title: 'CBSE Class 7 Science Syllabus - Nutrition, Heat & Chemistry',
    tags: 'science,syllabus,class7,cbse,nutrition,heat,chemistry',
    source: 'NCERT (Curiosity)'
  },
  {
    board: 'CBSE', subject: 'Science', className: '7', category: 'syllabus',
    chapter: 'Respiration, Transportation, Light & Electricity',
    title: 'CBSE Class 7 Science Syllabus - Biology and Physics',
    tags: 'science,syllabus,class7,cbse,respiration,light,electricity',
    source: 'NCERT (Curiosity)'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '7', category: 'syllabus',
    chapter: 'History: Our Pasts - II (Medieval India)',
    title: 'CBSE Class 7 Social Science Syllabus - History (Medieval India)',
    tags: 'social_science,history,syllabus,class7,cbse,medieval',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '7', category: 'syllabus',
    chapter: 'Geography & Civics: Environment, State Government & Media',
    title: 'CBSE Class 7 Social Science Syllabus - Geography and Civics',
    tags: 'social_science,geography,civics,syllabus,class7,cbse,environment',
    source: 'NCERT'
  },

  // === Class 8 ===
  {
    board: 'CBSE', subject: 'Overview', className: '8', category: 'curriculum',
    chapter: 'CBSE Class 8 Curriculum Overview',
    title: 'CBSE Class 8 Curriculum - Subjects and Structure',
    tags: 'curriculum,class8,cbse,subjects,overview',
    source: 'NCERT, cbse.gov.in'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '8', category: 'syllabus',
    chapter: 'Ganita Prakash: Rational Numbers, Equations & Quadrilaterals',
    title: 'CBSE Class 8 Mathematics Syllabus - Algebra and Geometry Part I',
    tags: 'mathematics,syllabus,class8,cbse,numbers,equations,geometry',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '8', category: 'syllabus',
    chapter: 'Ganita Prakash: Squares, Cubes, Exponents & Factorisation',
    title: 'CBSE Class 8 Mathematics Syllabus - Algebra and Arithmetic Part II',
    tags: 'mathematics,syllabus,class8,cbse,algebra,arithmetic',
    source: 'NCERT (Ganita Prakash)'
  },
  {
    board: 'CBSE', subject: 'Science', className: '8', category: 'syllabus',
    chapter: 'Crop Production, Microorganisms & Natural Resources',
    title: 'CBSE Class 8 Science Syllabus - Crops, Microbes & Resources',
    tags: 'science,syllabus,class8,cbse,agriculture,microbes,resources',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Science', className: '8', category: 'syllabus',
    chapter: 'Force, Pressure, Friction, Sound & Electricity',
    title: 'CBSE Class 8 Science Syllabus - Physics Concepts',
    tags: 'science,syllabus,class8,cbse,force,friction,sound,electricity',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '8', category: 'syllabus',
    chapter: 'History: Our Pasts - III (Modern India)',
    title: 'CBSE Class 8 Social Science Syllabus - History (Modern India)',
    tags: 'social_science,history,syllabus,class8,cbse,modern',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '8', category: 'syllabus',
    chapter: 'Geography & Civics: Resources, Judiciary & Constitution',
    title: 'CBSE Class 8 Social Science Syllabus - Geography and Civics',
    tags: 'social_science,geography,civics,syllabus,class8,cbse,resources,judiciary',
    source: 'NCERT'
  },

  // === Class 9 ===
  {
    board: 'CBSE', subject: 'Overview', className: '9', category: 'curriculum',
    chapter: 'CBSE Class 9 Curriculum Overview',
    title: 'CBSE Class 9 Curriculum - Subjects and Structure',
    tags: 'curriculum,class9,cbse,secondary,subjects,overview',
    source: 'NCERT, cbseacademic.nic.in'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '9', category: 'syllabus',
    chapter: 'Number Systems, Polynomials & Coordinate Geometry',
    title: 'CBSE Class 9 Mathematics Syllabus - Algebra and Geometry Part I',
    tags: 'mathematics,syllabus,class9,cbse,numbers,algebra,geometry',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '9', category: 'syllabus',
    chapter: 'Linear Equations, Euclid Geometry, Lines & Angles',
    title: 'CBSE Class 9 Mathematics Syllabus - Geometry Foundations',
    tags: 'mathematics,syllabus,class9,cbse,equations,geometry',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '9', category: 'syllabus',
    chapter: 'Triangles, Quadrilaterals, Circles & Heron Formula',
    title: 'CBSE Class 9 Mathematics Syllabus - Advanced Geometry',
    tags: 'mathematics,syllabus,class9,cbse,triangles,circles,mensuration',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Mathematics', className: '9', category: 'syllabus',
    chapter: 'Surface Areas, Volumes & Statistics',
    title: 'CBSE Class 9 Mathematics Syllabus - Mensuration and Statistics',
    tags: 'mathematics,syllabus,class9,cbse,mensuration,statistics',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Science', className: '9', category: 'syllabus',
    chapter: 'Physics: Motion, Force, Gravitation, Work & Sound',
    title: 'CBSE Class 9 Science Syllabus - Physics Component',
    tags: 'science,physics,syllabus,class9,cbse,motion,force,gravity,energy',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Science', className: '9', category: 'syllabus',
    chapter: 'Chemistry: Matter, Atoms, Molecules & Atomic Structure',
    title: 'CBSE Class 9 Science Syllabus - Chemistry Component',
    tags: 'science,chemistry,syllabus,class9,cbse,matter,atoms,molecules',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Science', className: '9', category: 'syllabus',
    chapter: 'Biology: Cell, Tissues & Food Resources',
    title: 'CBSE Class 9 Science Syllabus - Biology Component',
    tags: 'science,biology,syllabus,class9,cbse,cell,tissues,food',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '9', category: 'syllabus',
    chapter: 'History: India and the Contemporary World - I',
    title: 'CBSE Class 9 Social Science Syllabus - History (French & Russian Revolutions)',
    tags: 'social_science,history,syllabus,class9,cbse,revolution',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '9', category: 'syllabus',
    chapter: 'Geography: Contemporary India - I',
    title: 'CBSE Class 9 Social Science Syllabus - Geography (India Map & Features)',
    tags: 'social_science,geography,syllabus,class9,cbse,india',
    source: 'NCERT'
  },
  {
    board: 'CBSE', subject: 'Social Science', className: '9', category: 'syllabus',
    chapter: 'Civics & Economics: Democracy, Constitution & Poverty',
    title: 'CBSE Class 9 Social Science Syllabus - Civics and Economics',
    tags: 'social_science,civics,economics,syllabus,class9,cbse,democracy,poverty',
    source: 'NCERT'
  }
];

async function generateChunkContent(chunk) {
  const prompt = `You are a curriculum and syllabus expert for the CBSE (Central Board of Secondary Education) board in India.
Your task is to write the detailed educational content for a syllabus/curriculum database chunk.
Use standard NCERT/CBSE guidelines.

Details of the chunk:
- Board: CBSE
- Subject: ${chunk.subject}
- Class Level: Class ${chunk.className}
- Category: ${chunk.category}
- Chapter/Theme: ${chunk.chapter}
- Title: ${chunk.title}
- Tags: ${chunk.tags}

Write a comprehensive, professional, and detailed description (about 150-250 words) outlining the topics, subtopics, learning objectives, standard textbook references, and teaching approach for this syllabus/curriculum entry. Make sure the content is highly detailed and structured using paragraphs or bullet points in plain text or basic markdown. Do NOT use HTML. Do not mention any irrelevant meta-information.

Ensure the output is clean and directly ready to be saved in our database.`;

  try {
    const result = await callModel({
      preferredModel: 'siliconflow',
      question: prompt,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 800,
      temperature: 0.3
    });
    if (result.content && result.content.trim().length > 50) {
      console.log(`  [SUCCESS] Generated using ${result.model} in ${result.durationMs}ms`);
      return result.content.trim();
    }
  } catch (e) {
    console.warn(`Error generating for Class ${chunk.className} ${chunk.subject} - ${chunk.chapter}: ${e.message}`);
  }
  return `Detailed syllabus and curriculum information for CBSE Class ${chunk.className} ${chunk.subject} - ${chunk.chapter}. Covers standard topics, subtopics, and learning outcomes in accordance with NCERT and CBSE academic guidelines.`;
}

async function main() {
  console.log(`Starting generation of CBSE Class 1-9 database chunks (${CHUNKS_METADATA.length} chunks total)...`);
  const results = [];

  const CONCURRENCY = 10;
  for (let i = 0; i < CHUNKS_METADATA.length; i += CONCURRENCY) {
    const batch = CHUNKS_METADATA.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${Math.floor(i / CONCURRENCY) + 1} of ${Math.ceil(CHUNKS_METADATA.length / CONCURRENCY)}...`);
    const batchResults = await Promise.all(batch.map(async (meta, index) => {
      const idx = i + index + 1;
      console.log(`[${idx}/${CHUNKS_METADATA.length}] Generating CBSE Class ${meta.className} ${meta.subject}: ${meta.chapter}...`);
      const content = await generateChunkContent(meta);
      console.log(`[${idx}/${CHUNKS_METADATA.length}] Completed CBSE Class ${meta.className} ${meta.subject}: ${meta.chapter}`);
      return {
        ...meta,
        content
      };
    }));
    results.push(...batchResults);
    // brief delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  // Split into three files
  const class1_3 = results.filter(c => ['1', '2', '3'].includes(c.className));
  const class4_6 = results.filter(c => ['4', '5', '6'].includes(c.className));
  const class7_9 = results.filter(c => ['7', '8', '9'].includes(c.className));

  const kbDir = 'c:/Users/HP/.openclaw-autoclaw/agents/ed/workspace/knowledge-base';
  if (!fs.existsSync(kbDir)) {
    fs.mkdirSync(kbDir, { recursive: true });
  }

  const p1_3 = path.join(kbDir, 'cbse-class-1-3.json');
  const p4_6 = path.join(kbDir, 'cbse-class-4-6.json');
  const p7_9 = path.join(kbDir, 'cbse-class-7-9.json');

  fs.writeFileSync(p1_3, JSON.stringify(class1_3, null, 2), 'utf8');
  fs.writeFileSync(p4_6, JSON.stringify(class4_6, null, 2), 'utf8');
  fs.writeFileSync(p7_9, JSON.stringify(class7_9, null, 2), 'utf8');

  console.log('\n=========================================');
  console.log('GENERATION COMPLETE!');
  console.log(`Created files:\n  - ${p1_3} (${class1_3.length} chunks)\n  - ${p4_6} (${class4_6.length} chunks)\n  - ${p7_9} (${class7_9.length} chunks)`);
  console.log('=========================================\n');
}

main().catch(console.error);
