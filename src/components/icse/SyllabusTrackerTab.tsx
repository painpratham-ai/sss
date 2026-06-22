'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen, Award, CheckCircle2, ChevronRight, HelpCircle,
  Play, RotateCcw, Loader2, Sparkles, AlertCircle, ArrowRight, X, Check, Target,
  Mic, Volume2, Calendar, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// ─── Flashcards Database ──────────────────────────────────────────────────
const FLASHCARDS_DB: Record<string, { question: string; answer: string }> = {
  'phy-s1': {
    question: "State the factors on which the moment of a force depends, and write its mathematical formula and SI unit.",
    answer: "Moment of a force depends on: 1. Magnitude of the applied force (F). 2. Perpendicular distance (d) of the line of action of the force from the axis of rotation. Formula: Moment = F * d. SI unit: Newton-meter (N m)."
  },
  'phy-s2': {
    question: "Define kinetic energy and potential energy. State the principle of conservation of mechanical energy.",
    answer: "Potential Energy is the energy possessed by a body due to its position or state of deformation. Kinetic Energy is the energy possessed by a body due to its motion. Conservation Principle: In an ideal system without friction/air resistance, the sum of potential and kinetic energy remains constant (PE + KE = Constant)."
  },
  'phy-s3': {
    question: "What is total internal reflection? State the two conditions necessary for it to occur.",
    answer: "Total internal reflection is the complete reflection of light back into the denser medium when angle of incidence exceeds critical angle. Conditions: 1. Light must travel from a denser medium to a rarer medium. 2. The angle of incidence in the denser medium must be greater than the critical angle for that pair of media."
  },
  'phy-s4': {
    question: "Define an echo. State the minimum distance in air required to hear a distinct echo, and explain why.",
    answer: "An echo is the sound heard after reflection from a distant obstacle after the original sound has ceased. Minimum distance in air is 17.2 meters. This is because the persistence of hearing is 0.1 seconds, so the sound must travel at least 2 * 17.2 = 34.4 meters at a speed of 340 m/s to arrive after 0.1s."
  },
  'phy-s5': {
    question: "State Ohm's law. State formulas for resistors connected in series and parallel.",
    answer: "Ohm's law: The current flowing through a conductor is directly proportional to the potential difference across its ends, provided physical conditions (like temperature) remain constant (V = IR). Series: Rs = R1 + R2 + ... Parallel: 1/Rp = 1/R1 + 1/R2 + ..."
  },
  'chem-s1': {
    question: "Define ionization potential and electron affinity. How do they vary across a period and down a group?",
    answer: "Ionization Potential is the energy required to remove an electron from the outermost shell of an isolated gaseous atom. Electron Affinity is the energy released when an electron is added to a gaseous atom. Both increase across a period (due to smaller atomic size and greater nuclear charge) and decrease down a group (due to shell shielding and larger size)."
  },
  'chem-s2': {
    question: "Distinguish between electrovalent (ionic) and covalent compounds in terms of melting point and electrical conductivity.",
    answer: "Electrovalent compounds have high melting/boiling points and conduct electricity in molten or aqueous states (due to free ions). Covalent compounds have low melting/boiling points and are non-conductors of electricity (due to lack of free ions or molecules)."
  },
  'chem-s3': {
    question: "Define pH. What is the pH of a neutral solution, and how does pH change during dilution of an acid?",
    answer: "pH is the negative logarithm of hydrogen ion H+ concentration. Neutral solution pH is 7. During dilution of an acid, H+ concentration decreases, which causes the pH to increase toward 7."
  },
  'chem-s4': {
    question: "State the observation when ammonium hydroxide solution is added dropwise and then in excess to a solution of Copper Sulfate.",
    answer: "When added dropwise, a pale blue precipitate of Copper Hydroxide is formed. When added in excess, the precipitate dissolves to form a deep blue / inky blue solution of Tetraamminecopper(II) sulfate."
  },
  'chem-s5': {
    question: "State the reactions at the anode and cathode during the electrolysis of acidulated water using platinum electrodes.",
    answer: "At Cathode (Reduction): 2H+ + 2e- -> H2 (Hydrogen gas). At Anode (Oxidation): 4OH- - 4e- -> 2H2O + O2 (Oxygen gas)."
  },
  'bio-s1': {
    question: "State the four stages of karyokinesis in Mitosis and explain the principal event of Metaphase.",
    answer: "Stages: Prophase, Metaphase, Anaphase, Telophase. In Metaphase, chromosomes align along the equatorial plane (metaphase plate) and get attached to spindle fibers by their centromeres."
  },
  'bio-s2': {
    question: "Define transpiration and name the three types based on the plant surface.",
    answer: "Transpiration is the loss of water in the form of water vapour from aerial parts of the plant. Three types: 1. Stomatal transpiration (through stomata, ~90%). 2. Cuticular transpiration (through cuticle). 3. Lenticular transpiration (through lenticels)."
  },
  'bio-s3': {
    question: "Describe double circulation and name the blood vessel that carries deoxygenated blood from the heart to the lungs.",
    answer: "Double circulation is the pathway where blood flows through the heart twice in one complete cycle (Pulmonary and Systemic circuits). The Pulmonary Artery carries deoxygenated blood from the right ventricle of the heart to the lungs."
  },
  'bio-s4': {
    question: "State the three processes involved in urine formation inside the nephron.",
    answer: "1. Ultrafiltration (in Malpighian capsule under high pressure). 2. Selective Reabsorption (essential substances like glucose, water are reabsorbed in PCT and loop). 3. Tubular Secretion (excess K+, H+, drugs are secreted into filtrate in DCT)."
  },
  'bio-s5': {
    question: "Define a reflex action. State the path of a nerve impulse in a reflex arc.",
    answer: "Reflex action is an involuntary, rapid, and automatic response to a stimulus without conscious thought. Reflex arc pathway: Stimulus -> Receptor -> Sensory Neuron -> Spinal Cord (Interneuron) -> Motor Neuron -> Effector (Muscle/Gland) -> Response."
  },
  'math-s1': {
    question: "Write the formulas to calculate the total interest and maturity value (MV) of a Recurring Deposit (RD) account.",
    answer: "Interest I = P * [n(n+1) / (2 * 12)] * (R / 100). Maturity Value MV = (P * n) + I, where P is monthly installment, n is period in months, R is annual rate of interest."
  },
  'math-s2': {
    question: "State the quadratic formula. How does the value of the discriminant (D) determine the nature of the roots?",
    answer: "Quadratic formula: x = [-b +/- sqrt(b^2 - 4ac)] / 2a. Discriminant D = b^2 - 4ac. Nature of roots: 1. If D > 0, roots are real and unequal. 2. If D = 0, roots are real and equal. 3. If D < 0, roots are imaginary/non-real."
  },
  'math-s3': {
    question: "State the formula for the sum of the first n terms (Sn) of an Arithmetic Progression (AP), and define the terms.",
    answer: "Sn = (n/2)[2a + (n-1)d] or Sn = (n/2)[a + l], where n is number of terms, a is first term, d is common difference, and l is the last term (nth term)."
  },
  'math-s4': {
    question: "State the tangent-secant theorem and the property of angles subtended by an arc at the center vs the circumference of a circle.",
    answer: "Tangent-Secant Theorem: PT^2 = PA * PB, where PT is tangent, PA and PB are secant segments. Arc Angle Property: The angle subtended by an arc at the center is double the angle subtended by it at any point on the circumference."
  },
  'math-s5': {
    question: "State the formulas for the volume and total surface area (TSA) of a cylinder and a sphere.",
    answer: "Cylinder: Volume = pi * r^2 * h, TSA = 2 * pi * r * (r + h). Sphere: Volume = (4/3) * pi * r^3, TSA = 4 * pi * r^2."
  }
};

// ─── Syllabus Data Structures ──────────────────────────────────────────────
interface SyllabusItem {
  id: string;
  topic: string;
  subtopic: string;
  guideline: string;
}

const SYLLABUS_DATA: Record<string, SyllabusItem[]> = {
  Physics: [
    { id: 'phy-s1', topic: 'Forces', subtopic: 'Moment of Force', guideline: 'Moment of a force; turning effect, center of gravity; uniform circular motion; conditions for equilibrium.' },
    { id: 'phy-s2', topic: 'Work, Power, Energy', subtopic: 'Mechanical Energy', guideline: 'Work, power, energy: definitions, units; potential and kinetic energy; conservation of energy.' },
    { id: 'phy-s3', topic: 'Light', subtopic: 'Refraction & Lens', guideline: 'Refraction of light through glass block and prism; critical angle; total internal reflection; convex and concave lenses; ray diagrams.' },
    { id: 'phy-s4', topic: 'Sound', subtopic: 'Echoes & Vibrations', guideline: 'Reflection of sound waves; echoes: definition, conditions; speed of sound determination; forced vibrations, resonance.' },
    { id: 'phy-s5', topic: 'Electricity', subtopic: 'Ohm\'s Law & Circuits', guideline: 'Ohm\'s law; resistance, resistivity; series and parallel combinations; EMF, terminal voltage; electrical power, heating effect.' }
  ],
  Chemistry: [
    { id: 'chem-s1', topic: 'Periodic Table', subtopic: 'Periodic Properties', guideline: 'Periodic properties and their variations: atomic size, metallic character, ionization potential, electron affinity, electronegativity.' },
    { id: 'chem-s2', topic: 'Chemical Bonding', subtopic: 'Bond Types', guideline: 'Electrovalent, covalent, and coordinate bonding; electron-dot structures; characteristics of electrovalent and covalent compounds.' },
    { id: 'chem-s3', topic: 'Acids, Bases, Salts', subtopic: 'Properties & pH', guideline: 'Definitions of acids, bases, salts; properties, pH scale, chemical titration, double decomposition reaction.' },
    { id: 'chem-s4', topic: 'Analytical Chemistry', subtopic: 'Reagents Tests', guideline: 'Action of Ammonium Hydroxide and Sodium Hydroxide on salt solutions of Ca, Fe, Cu, Zn, Pb.' },
    { id: 'chem-s5', topic: 'Electrolysis', subtopic: 'Faraday\'s Laws', guideline: 'Electrolysis: definitions, electrode reactions; electrolysis of acidulated water, copper sulphate solution; electroplating, electrorefining.' }
  ],
  Biology: [
    { id: 'bio-s1', topic: 'Cell Biology', subtopic: 'Mitosis & Meiosis', guideline: 'Structure of chromosome, DNA; Cell Cycle, Mitosis, Meiosis; karyotypes, cell division significance.' },
    { id: 'bio-s2', topic: 'Plant Physiology', subtopic: 'Absorption & Transpiration', guideline: 'Absorption by roots: osmosis, turgidity, plasmolysis; root pressure; transpiration pull; photosynthesis light/dark reactions.' },
    { id: 'bio-s3', topic: 'Human Physiology', subtopic: 'Circulatory System', guideline: 'Circulatory system: composition of blood; structure of heart, double circulation; lymphatic system; blood pressure, pulse.' },
    { id: 'bio-s4', topic: 'Human Physiology', subtopic: 'Excretory System', guideline: 'Excretory system: structure of kidney, nephron; ultrafiltration, selective reabsorption; osmoregulation.' },
    { id: 'bio-s5', topic: 'Human Physiology', subtopic: 'Nervous System', guideline: 'Nervous system: neuron structure; central, peripheral, autonomic nervous systems; reflex action, reflex arc.' }
  ],
  Mathematics: [
    { id: 'math-s1', topic: 'Commercial Maths', subtopic: 'GST & Banking', guideline: 'Goods and Services Tax (GST) computation; Banking: Recurring Deposit accounts computations.' },
    { id: 'math-s2', topic: 'Algebra', subtopic: 'Quadratic Equations', guideline: 'Quadratic equations: solution by factorization and formula; nature of roots; solving word problems.' },
    { id: 'math-s3', topic: 'Algebra', subtopic: 'AP & Matrices', guideline: 'Arithmetic Progression (AP) formula for nth term and sum of n terms; Matrices order, addition, subtraction, multiplication.' },
    { id: 'math-s4', topic: 'Geometry', subtopic: 'Circles & Similarity', guideline: 'Similarity properties, scale factor; Circle properties: chord properties, tangent and secant properties.' },
    { id: 'math-s5', topic: 'Mensuration', subtopic: 'Spherical Shapes', guideline: 'Volume and Surface Area of Right Circular Cylinder, Cone, Sphere, and Hemisphere.' }
  ]
};

const CBSE_SYLLABUS_DATA: Record<string, SyllabusItem[]> = {
  Science: [
    { id: 'cbse-sci-1', topic: 'Chemical Substances', subtopic: 'Chemical Reactions', guideline: 'Chemical equations, balanced chemical equations, implications of a balanced chemical equation, types of chemical reactions: combination, decomposition, displacement, double displacement, precipitation, endothermic exothermic reactions, oxidation and reduction.' },
    { id: 'cbse-sci-2', topic: 'Chemical Substances', subtopic: 'Acids, Bases & Salts', guideline: 'Their definitions in terms of furnishing of H+ and OH- ions, General properties, examples and uses, neutralization, concept of pH scale, importance of pH in everyday life; preparation and uses of Sodium Hydroxide, Bleaching powder, Baking soda, Washing soda, Plaster of Paris.' },
    { id: 'cbse-sci-3', topic: 'World of Living', subtopic: 'Life Processes', guideline: 'Basic concept of nutrition, respiration, transport and excretion in plants and animals.' },
    { id: 'cbse-sci-4', topic: 'Effects of Current', subtopic: 'Electricity', guideline: 'Ohm\'s law; Resistance, resistivity, factors on which the resistance of a conductor depends. Series combination of resistors, parallel combination of resistors and its applications in daily life. Heating effect of electric current and its applications in daily life. Electric power, relation between P, V, I and R.' },
    { id: 'cbse-sci-5', topic: 'Natural Phenomena', subtopic: 'Light - Mirror/Lens', guideline: 'Reflection of light by curved surfaces; Images formed by spherical mirrors, centre of curvature, principal axis, principal focus, focal length, mirror formula, magnification. Refraction; Laws of refraction, refractive index. Refraction of light by spherical lens; Image formed by spherical lenses; Lens formula; Magnification. Power of a lens.' }
  ],
  Mathematics: [
    { id: 'cbse-math-1', topic: 'Number Systems', subtopic: 'Real Numbers', guideline: 'Fundamental Theorem of Arithmetic - statements after reviewing work done earlier and after illustrating and motivating through examples, Proofs of irrationality of root 2, root 3, root 5.' },
    { id: 'cbse-math-2', topic: 'Algebra', subtopic: 'Quadratic Equations', guideline: 'Standard form of a quadratic equation ax^2 + bx + c = 0, (a != 0). Solutions of quadratic equations (only real roots) by factorization, and by using quadratic formula. Relationship between discriminant and nature of roots.' },
    { id: 'cbse-math-3', topic: 'Trigonometry', subtopic: 'Trig Ratios & Identity', guideline: 'Trigonometric ratios of an acute angle of a right-angled triangle. Proof of their existence; Values of the trigonometric ratios of 30, 45 and 60 degrees. Proof and applications of identity sin^2 A + cos^2 A = 1.' },
    { id: 'cbse-math-4', topic: 'Geometry', subtopic: 'Circles', guideline: 'Tangent to a circle at, point of contact. (Prove) The tangent at any point of a circle is perpendicular to the radius through the point of contact. (Prove) The lengths of tangents drawn from an external point to a circle are equal.' },
    { id: 'cbse-math-5', topic: 'Statistics', subtopic: 'Mean, Median, Mode', guideline: 'Mean, median and mode of grouped data (bimodal situation to be avoided).' }
  ],
  'Social Science': [
    { id: 'cbse-ss-1', topic: 'History', subtopic: 'Nationalism in India', guideline: 'First World War, Khilafat, Non-Cooperation; Differing strands within the movement; Towards Civil Disobedience; Sense of collective belonging.' },
    { id: 'cbse-ss-2', topic: 'Geography', subtopic: 'Resources & Development', guideline: 'Concept, planning in India, Land resources, Land degradation & conservation; Soil classification, soil erosion & conservation.' },
    { id: 'cbse-ss-3', topic: 'Civics', subtopic: 'Power Sharing', guideline: 'Case studies of Belgium and Sri Lanka; Why power sharing is desirable; Forms of power sharing.' },
    { id: 'cbse-ss-4', topic: 'Economics', subtopic: 'Sectors of Economy', guideline: 'Sectors of economic activities; Comparing the three sectors; Primary, Secondary and Tertiary Sectors in India; Organized vs Unorganized; Public vs Private.' }
  ]
};

// Local storage progress shape
type ProgressMap = Record<string, 'not_started' | 'reviewing' | 'mastered'>;

export function SyllabusTrackerTab({ board = 'ICSE' }: { board?: string }) {
  const [boardsMap, setBoardsMap] = useState<Record<string, Record<string, string[]>>>({});
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState(board || 'ICSE');
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [items, setItems] = useState<SyllabusItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const activeSubject = selectedSubject;
  const subjects = boardsMap[selectedBoard]?.[selectedClass] || [];
  const activeSyllabusData = { [selectedSubject]: items };

  const [progress, setProgress] = useState<ProgressMap>({});
  const [viewMode, setViewMode] = useState<'list' | 'roadmap' | 'flashcards'>('roadmap');
  const [selectedRoadmapNode, setSelectedRoadmapNode] = useState<string | null>(null);
  const [celebratingBadge, setCelebratingBadge] = useState<{ name: string; description: string; icon: string } | null>(null);

  // Spaced Repetition interface
  interface SpacedRepInfo {
    interval: number;
    repetition: number;
    easeFactor: number;
    nextReviewDate: string;
  }

  // Feature 3: Syllabus Compliance Inspector states
  const [complianceText, setComplianceText] = useState('');
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const [complianceResult, setComplianceResult] = useState<{
    score: number;
    coveredIds: string[];
    missingIds: string[];
    critique: string;
  } | null>(null);

  // Feature 5 & 6: Spaced Repetition & Audio Flashcard states
  const [spacedRep, setSpacedRep] = useState<Record<string, SpacedRepInfo>>({});
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [showCardAnswer, setShowCardAnswer] = useState(false);
  const [transcribingFlashcard, setTranscribingFlashcard] = useState(false);
  const [evaluatingFlashcard, setEvaluatingFlashcard] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [recallRating, setRecallRating] = useState<number | null>(null);
  const [recallFeedback, setRecallFeedback] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ─── Modal States ────────────────────────────────────────────────────────
  const [revisionItem, setRevisionItem] = useState<SyllabusItem | null>(null);
  const [revisionSummary, setRevisionSummary] = useState<string>('');
  const [loadingRevision, setLoadingRevision] = useState<boolean>(false);

  const [quizItem, setQuizItem] = useState<SyllabusItem | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState<boolean>(false);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // Load available options from database
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/syllabus');
        const data = await res.json();
        if (data.boardsMap) {
          setBoardsMap(data.boardsMap);
          const initialBoard = board in data.boardsMap ? board : Object.keys(data.boardsMap)[0] || 'ICSE';
          setSelectedBoard(initialBoard);

          const classes = Object.keys(data.boardsMap[initialBoard] || {}).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
            return numA - numB;
          });
          const initialClass = classes.includes('10') ? '10' : (classes.includes('12') ? '12' : classes[0] || '1');
          setSelectedClass(initialClass);

          const subjects = data.boardsMap[initialBoard]?.[initialClass] || [];
          setSelectedSubject(subjects[0] || '');
        }
      } catch (err) {
        console.error('Failed to load syllabus metadata:', err);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, [board]);

  // Load syllabus items dynamically from database when filters change
  useEffect(() => {
    if (!selectedBoard || !selectedClass || !selectedSubject) {
      setItems([]);
      return;
    }
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await fetch(`/api/syllabus?board=${selectedBoard}&className=${selectedClass}&subject=${selectedSubject}`);
        const data = await res.json();
        if (data.syllabusItems) {
          setItems(data.syllabusItems);
        }
      } catch (err) {
        console.error('Failed to fetch syllabus items:', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [selectedBoard, selectedClass, selectedSubject]);

  // Reset node selection on filter change
  useEffect(() => {
    setSelectedRoadmapNode(null);
    setActiveCardIdx(0);
    setComplianceResult(null);
    setComplianceText('');
  }, [selectedBoard, selectedClass, selectedSubject]);

  // Load progress and spaced repetition from localStorage on mount & when syllabus-updated event occurs
  useEffect(() => {
    const loadProgress = () => {
      const saved = localStorage.getItem(`${selectedBoard.toLowerCase()}_${selectedClass}_syllabus_progress`);
      if (saved) {
        try {
          setProgress(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse progress', e);
        }
      } else {
        setProgress({});
      }

      const savedRep = localStorage.getItem(`${selectedBoard.toLowerCase()}_${selectedClass}_spaced_repetition`);
      if (savedRep) {
        try {
          setSpacedRep(JSON.parse(savedRep));
        } catch (e) {
          console.error('Failed to parse spaced rep data', e);
        }
      } else {
        setSpacedRep({});
      }
    };
    loadProgress();
    window.addEventListener('syllabus-updated', loadProgress);
    return () => {
      window.removeEventListener('syllabus-updated', loadProgress);
    };
  }, [selectedBoard, selectedClass]);

  const handleBoardChange = (newBoard: string) => {
    setSelectedBoard(newBoard);
    const classes = Object.keys(boardsMap[newBoard] || {}).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
    const newClass = classes.includes('10') ? '10' : (classes.includes('12') ? '12' : classes[0] || '1');
    setSelectedClass(newClass);
    const subjects = boardsMap[newBoard]?.[newClass] || [];
    setSelectedSubject(subjects[0] || '');
  };

  const handleClassChange = (newClass: string) => {
    setSelectedClass(newClass);
    const subjects = boardsMap[selectedBoard]?.[newClass] || [];
    setSelectedSubject(subjects[0] || '');
  };

  const handleSubjectChange = (newSubject: string) => {
    setSelectedSubject(newSubject);
  };

  // Save progress helper
  const updateProgress = (itemId: string, status: 'not_started' | 'reviewing' | 'mastered') => {
    const next = { ...progress, [itemId]: status };
    setProgress(next);
    localStorage.setItem(`${selectedBoard.toLowerCase()}_${selectedClass}_syllabus_progress`, JSON.stringify(next));

    if (status === 'mastered') {
      const masteredCount = items.filter(it => next[it.id] === 'mastered').length;

      let newBadge: { name: string; description: string; icon: string } | null = null;
      if (masteredCount === 1) {
        newBadge = {
          name: 'Syllabus Novice 🏅',
          description: `You mastered your first study milestone in ${selectedSubject}!`,
          icon: '🎓'
        };
      } else if (masteredCount === 3) {
        newBadge = {
          name: 'Concept Explorer 🏆',
          description: `You unlocked 3 study checkpoints in ${selectedSubject}!`,
          icon: '🚀'
        };
      } else if (masteredCount === items.length && items.length > 0) {
        newBadge = {
          name: 'Subject Champion 👑',
          description: `Phenomenal! You conquered 100% syllabus compliance for ${selectedSubject}!`,
          icon: '🔥'
        };
      }

      if (newBadge) {
        setTimeout(() => {
          setCelebratingBadge(newBadge);
        }, 500);
      }
    }
  };

  // ─── RAG Revision Summary generator ──────────────────────────────────────
  const handleQuickRevise = async (item: SyllabusItem) => {
    setRevisionItem(item);
    setLoadingRevision(true);
    setRevisionSummary('');

    // Update status to Reviewing
    if (progress[item.id] !== 'mastered') {
      updateProgress(item.id, 'reviewing');
    }

    // Log revision study event
    fetch('/api/study-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'syllabus_toggle',
        subject: activeSubject,
        topic: item.topic,
        metadata: {
          subtopic: item.subtopic,
          action: 'reviewing',
          guideline: item.guideline
        }
      })
    }).catch(err => console.error('Failed to log syllabus revision study event:', err));

    try {
      const prompt = `Write a comprehensive, exam-focused board revision summary for this ${board} guideline point: "${item.guideline}".
Structure it clearly with:
- Key definitions & formula
- Crucial concepts explained in bullet points
- Avoid filler words. Ground the explanation in the context of ${board} Class 10 Board exam expectations.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          subject: activeSubject,
          forceReasoning: false,
          preferredModel: 'auto',
          board
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch revision');
      setRevisionSummary(data.answer);
    } catch (e: any) {
      toast.error(e.message || 'Could not fetch summary');
      setRevisionItem(null);
    } finally {
      setLoadingRevision(false);
    }
  };

  // ─── Checkpoint Quiz Arena ───────────────────────────────────────────────
  const handleTakeCheckpoint = async (item: SyllabusItem) => {
    setQuizItem(item);
    setLoadingQuiz(true);
    setQuizQuestions([]);
    setCurrentQIndex(0);
    setUserAnswers({});
    setQuizFinished(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeSubject,
          className: '10',
          topic: `Class 10 ${activeSubject} - ${item.subtopic}: ${item.guideline}`,
          board
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Quiz generation failed');

      if (data.quiz?.questions && Array.isArray(data.quiz.questions)) {
        setQuizQuestions(data.quiz.questions);
      } else {
        throw new Error('No questions returned');
      }
    } catch (e: any) {
      console.error(e);
      // Fallback local questions
      setQuizQuestions([
        { q: `Which of the following is correct regarding ${item.subtopic}?`, options: ['Option A is correct', 'Option B is correct', 'Both are correct', 'None of these'], answerIndex: 2, explanation: `This matches the standard ${board} Board curriculum syllabus guidelines.` },
        { q: `What is the principal application of ${item.topic}?`, options: ['To measure physical parameters', 'To test chemical solutions', 'General calculation methods', 'All of the above'], answerIndex: 3, explanation: 'This covers the major applications described in the specimen guideline.' }
      ]);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const finishQuiz = () => {
    setQuizFinished(true);
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answerIndex) correctCount++;
    });

    const passThreshold = Math.ceil(quizQuestions.length * 0.6); // 60% pass mark
    const passed = correctCount >= passThreshold;

    if (quizItem) {
      if (passed) {
        updateProgress(quizItem.id, 'mastered');
        toast.success(`Congratulations! You passed the checkpoint (${correctCount}/${quizQuestions.length}) and mastered this topic!`);
      } else {
        toast.error(`Checkpoint failed (${correctCount}/${quizQuestions.length}). Revision recommended.`);
      }

      // Log checkpoint quiz to Second Brain
      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'mock_test',
          subject: activeSubject,
          topic: `${quizItem.topic} Checkpoint`,
          metadata: {
            subtopic: quizItem.subtopic,
            score: correctCount,
            maxMarks: quizQuestions.length,
            passed
          }
        })
      }).catch(err => console.error('Failed to log checkpoint study event:', err));
    }
  };

  // Feature 3: Syllabus Compliance Inspector
  const checkSyllabusCompliance = async () => {
    if (!complianceText.trim()) {
      toast.error('Please paste notes or project text first.');
      return;
    }
    setCheckingCompliance(true);
    setComplianceResult(null);
    try {
      const res = await fetch('/api/syllabus/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: complianceText,
          subject: activeSubject,
          board,
          guidelines: items
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      setComplianceResult(data);
      toast.success('Syllabus compliance evaluation ready!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to inspect compliance');
    } finally {
      setCheckingCompliance(false);
    }
  };

  // Feature 5: Speech synthesis helper
  const playSpeech = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-'));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Web Speech Synthesis is not supported in this browser.');
    }
  };

  // Feature 5: Voice recorder microphone toggle
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Web Speech Recognition is not supported in this browser. Please type your answer instead.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => {
        setIsListening(true);
        setTranscribedText('');
        toast.info('Microphone active. Speak your answer now...');
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        toast.error(`Speech recognition failed: ${event.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscribedText(text);
        toast.success('Speech transcribed successfully!');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.error(e);
      toast.error('Speech recognition failed to initialize.');
      setIsListening(false);
    }
  };

  // Feature 5 & 6: Spaced Repetition evaluate card answer
  const evaluateAnswer = async (guidelineId: string, q: string, correctAns: string, studentAns: string) => {
    if (!studentAns.trim()) {
      toast.error('Please speak or type an answer first.');
      return;
    }
    setEvaluatingFlashcard(true);
    setRecallRating(null);
    setRecallFeedback('');
    try {
      const res = await fetch('/api/flashcards/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          correctAnswer: correctAns,
          studentAnswer: studentAns
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');

      const rating = data.rating;
      setRecallRating(rating);
      setRecallFeedback(data.feedback);

      // SuperMemo SM-2 Spaced Repetition calculation
      const currentCardRep = spacedRep[guidelineId] || {
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date().toISOString().split('T')[0]
      };

      let nextInterval = 1;
      let nextRepetition = currentCardRep.repetition;
      let nextEaseFactor = currentCardRep.easeFactor;

      if (rating < 3) {
        nextRepetition = 0;
        nextInterval = 1;
      } else {
        if (nextRepetition === 0) {
          nextInterval = 1;
        } else if (nextRepetition === 1) {
          nextInterval = 6;
        } else {
          nextInterval = Math.round(currentCardRep.interval * currentCardRep.easeFactor);
        }
        nextRepetition++;
      }

      nextEaseFactor = nextEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
      if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

      const nextReviewDateObj = new Date();
      nextReviewDateObj.setDate(nextReviewDateObj.getDate() + nextInterval);
      const nextReviewDateStr = nextReviewDateObj.toISOString().split('T')[0];

      const newSpacedRep = {
        ...spacedRep,
        [guidelineId]: {
          interval: nextInterval,
          repetition: nextRepetition,
          easeFactor: parseFloat(nextEaseFactor.toFixed(2)),
          nextReviewDate: nextReviewDateStr
        }
      };

      setSpacedRep(newSpacedRep);
      localStorage.setItem(`${board.toLowerCase()}_spaced_repetition`, JSON.stringify(newSpacedRep));

      // Mark guideline status
      if (rating >= 3) {
        updateProgress(guidelineId, 'mastered');
      } else {
        updateProgress(guidelineId, 'reviewing');
      }

      // Log study event to Second Brain
      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'flashcard_recall',
          subject: activeSubject,
          topic: `${activeSubject} Flashcard`,
          metadata: {
            guidelineId,
            rating,
            recallLevel: rating >= 4 ? 'easy' : rating >= 3 ? 'reviewing' : 'forgot'
          }
        })
      }).catch(err => console.error('Failed to log flashcard study event:', err));

      toast.success(`Recall graded: ${rating}/5! Next review in ${nextInterval} days.`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to grade recall');
    } finally {
      setEvaluatingFlashcard(false);
    }
  };

  // Calculate Progress Stats
  const masteredCount = items.filter(it => progress[it.id] === 'mastered').length;
  const progressPercent = items.length > 0 ? Math.round((masteredCount / items.length) * 100) : 0;

  // Process item states for Duolingo locking progression
  const processedItems = items.map((item, idx) => {
    const isMastered = progress[item.id] === 'mastered';
    const isReviewing = progress[item.id] === 'reviewing';
    let isUnlocked = false;
    
    if (idx === 0) {
      isUnlocked = true;
    } else {
      const prevItem = items[idx - 1];
      isUnlocked = progress[prevItem.id] === 'mastered';
    }
    
    return {
      ...item,
      isMastered,
      isReviewing,
      isUnlocked
    };
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      
      {/* Syllabus Compliance Inspector */}
      {viewMode !== 'flashcards' && (
        <Card className="border border-brand-soft bg-gradient-to-r from-card via-brand-soft/5 to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-brand">
              <Sparkles className="size-4 animate-pulse" />
              Board Syllabus Compliance Checker
            </CardTitle>
            <CardDescription className="text-xs">
              Paste your project draft, essays, or notes below. The AI examiner will inspect it against the official {activeSubject} syllabus guidelines and identify missing topics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={complianceText}
              onChange={(e) => setComplianceText(e.target.value)}
              placeholder="Paste your study notes, essay, or project outline here (minimum 50 words)..."
              className="w-full min-h-[100px] p-3 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-background/50 focus:outline-brand resize-y font-medium text-foreground"
            />
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-[10px] text-muted-foreground font-semibold">
                Subject: {activeSubject} | Guidelines to Match: {items.length}
              </span>
              <Button
                size="sm"
                disabled={checkingCompliance || !complianceText.trim()}
                onClick={checkSyllabusCompliance}
                className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-bold gap-1.5"
              >
                {checkingCompliance ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Analyzing notes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" /> Check Compliance
                  </>
                )}
              </Button>
            </div>

            {/* Compliance Result display */}
            <AnimatePresence>
              {complianceResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-3 border-t border-dashed"
                >
                  <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-black/5">
                    {/* Radial progress bar */}
                    <div className="relative size-16 flex items-center justify-center shrink-0">
                      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          className="stroke-brand"
                          strokeWidth="3"
                          strokeDasharray="100"
                          strokeDashoffset={100 - complianceResult.score}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xs font-extrabold text-foreground">{complianceResult.score}%</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Syllabus Alignment Score</h4>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Your content matches {complianceResult.coveredIds.length} out of {items.length} required board checkpoints.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 text-xs">
                    {/* Covered guidelines */}
                    <div className="border rounded-xl p-3 bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/10 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="size-3.5" /> Covered Board Standards ({complianceResult.coveredIds.length})
                      </span>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                        {complianceResult.coveredIds.map(id => {
                          const it = items.find(x => x.id === id);
                          return (
                            <div key={id} className="text-[10px] bg-background/60 p-1.5 rounded border border-emerald-500/5 leading-normal">
                              <strong>{it?.subtopic || 'Concept'}:</strong> {it?.guideline}
                            </div>
                          );
                        })}
                        {complianceResult.coveredIds.length === 0 && (
                          <span className="text-[10px] italic text-muted-foreground block py-2">No guidelines fully matched yet.</span>
                        )}
                      </div>
                    </div>

                    {/* Missing guidelines */}
                    <div className="border rounded-xl p-3 bg-amber-500/5 dark:bg-amber-950/10 border-amber-500/10 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="size-3.5" /> Missing / Weak Elements ({complianceResult.missingIds.length})
                      </span>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                        {complianceResult.missingIds.map(id => {
                          const it = items.find(x => x.id === id);
                          return (
                            <div key={id} className="text-[10px] bg-background/60 p-1.5 rounded border border-amber-500/5 leading-normal text-foreground">
                              <strong>{it?.subtopic || 'Concept'}:</strong> {it?.guideline}
                            </div>
                          );
                        })}
                        {complianceResult.missingIds.length === 0 && (
                          <span className="text-[10px] italic text-muted-foreground block py-2 text-emerald-600">Great! All guidelines are addressed!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Critique feedback */}
                  <div className="bg-muted/40 p-4 rounded-xl border border-black/5 space-y-1 text-xs leading-relaxed text-foreground">
                    <span className="font-bold text-brand uppercase text-[9px] tracking-wider block">Examiner Critique Feedback</span>
                    <article className="prose-icse text-foreground/90 font-medium">
                      <ReactMarkdown>{complianceResult.critique}</ReactMarkdown>
                    </article>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Board, Class & Subject Selectors */}
      <div className="space-y-4 border rounded-2xl p-5 bg-card/50 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Board Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Board</label>
            <div className="flex gap-1">
              {Object.keys(boardsMap).map((b) => (
                <Button
                  key={b}
                  variant={selectedBoard === b ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBoardChange(b)}
                  className="flex-1 text-xs font-bold"
                >
                  {b}
                </Button>
              ))}
              {Object.keys(boardsMap).length === 0 && (
                <span className="text-xs text-muted-foreground italic">Loading boards...</span>
              )}
            </div>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full h-9 rounded-xl border border-black/10 dark:border-white/10 bg-background px-3 py-1.5 text-xs font-bold focus:outline-brand text-foreground"
            >
              {Object.keys(boardsMap[selectedBoard] || {}).sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
                return numA - numB;
              }).map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          {/* Progress Bar (Stat Box) */}
          <div className="flex flex-col justify-end space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
              <span>Syllabus Compliance</span>
              <span className="text-brand font-bold">{progressPercent}% Mastered</span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
            <span className="text-[10px] text-muted-foreground">
              {masteredCount} of {items.length} guidelines checked off
            </span>
          </div>
        </div>

        {/* Subject Navigation Tabs */}
        {subjects.length > 0 && (
          <div className="space-y-1.5 border-t pt-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Select Subject</label>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((sub) => (
                <Button
                  key={sub}
                  variant={selectedSubject === sub ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSubjectChange(sub)}
                  className="text-xs font-semibold"
                >
                  {sub}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end gap-2">
        <Button
          variant={viewMode === 'roadmap' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('roadmap')}
          className="text-xs gap-1.5"
        >
          <Target className="size-3.5" />
          Roadmap Path
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="text-xs gap-1.5"
        >
          <BookOpen className="size-3.5" />
          List View
        </Button>
        <Button
          variant={viewMode === 'flashcards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('flashcards')}
          className="text-xs gap-1.5"
        >
          <Calendar className="size-3.5" />
          Active Recall Flashcards
        </Button>
      </div>

      {viewMode === 'roadmap' && (
        <div className="space-y-6">
          {/* Duolingo Winding Roadmap Pathway */}
          <div className="relative border rounded-2xl bg-gradient-to-b from-slate-900/5 to-slate-900/10 dark:from-slate-900/40 dark:to-slate-950/40 py-10 shadow-inner flex justify-center">
            
            <svg viewBox="0 0 320 450" className="w-full max-w-md mx-auto relative z-10">
              <defs>
                <filter id="badge-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Main Winding Wires */}
              <path
                d="M 160 45 C 160 45, 80 80, 80 135 C 80 190, 240 170, 240 225 C 240 280, 160 270, 160 315 C 160 360, 80 360, 80 405"
                stroke="#e2e8f0"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                className="dark:stroke-slate-800"
              />
              <path
                d="M 160 45 C 160 45, 80 80, 80 135 C 80 190, 240 170, 240 225 C 240 280, 160 270, 160 315 C 160 360, 80 360, 80 405"
                stroke="#94a3b8"
                strokeWidth="4"
                strokeDasharray="6, 8"
                strokeLinecap="round"
                fill="none"
                className="dark:stroke-slate-600"
              />

              {/* Highlight Winding Path for completed/mastered nodes */}
              {processedItems.map((item, idx) => {
                if (idx === 0) return null;
                const prevNode = processedItems[idx - 1];
                if (!prevNode.isMastered) return null;
                
                let pathSeg = '';
                if (idx === 1) pathSeg = "M 160 45 C 160 45, 80 80, 80 135";
                if (idx === 2) pathSeg = "M 80 135 C 80 190, 240 170, 240 225";
                if (idx === 3) pathSeg = "M 240 225 C 240 280, 160 270, 160 315";
                if (idx === 4) pathSeg = "M 160 315 C 160 360, 80 360, 80 405";

                return (
                  <g key={`highlight-${idx}`}>
                    <path
                      d={pathSeg}
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.3"
                    />
                    <path
                      d={pathSeg}
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                );
              })}

              {/* Nodes rendering */}
              {processedItems.map((node, idx) => {
                const cx = idx === 0 ? 160 : idx === 1 ? 80 : idx === 2 ? 240 : idx === 3 ? 160 : 80;
                const cy = idx === 0 ? 45 : idx === 1 ? 135 : idx === 2 ? 225 : idx === 3 ? 315 : 405;
                const isSelected = selectedRoadmapNode === node.id;

                return (
                  <g
                    key={node.id}
                    className={`select-none ${node.isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => {
                      if (!node.isUnlocked) {
                        toast.error("This study checkpoint is locked! Finish previous topics first.");
                        return;
                      }
                      setSelectedRoadmapNode(selectedRoadmapNode === node.id ? null : node.id);
                    }}
                  >
                    {/* Pulsing Highlight Circle */}
                    {node.isUnlocked && !node.isMastered && (
                      <circle cx={cx} cy={cy} r="25" fill="#3b82f6" opacity="0.15" />
                    )}

                    {/* Outer Ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="19"
                      fill={node.isMastered ? "#fbbf24" : node.isUnlocked ? "#3b82f6" : "#94a3b8"}
                      stroke={isSelected ? "#ffffff" : "transparent"}
                      strokeWidth="2.5"
                      filter={node.isMastered ? "url(#badge-glow)" : ""}
                    />

                    {/* Inner Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="15"
                      fill={node.isMastered ? "#fef08a" : node.isUnlocked ? "#dbeafe" : "#cbd5e1"}
                      stroke={node.isMastered ? "#ca8a04" : node.isUnlocked ? "#2563eb" : "#475569"}
                      strokeWidth="1.5"
                    />

                    {/* Icon/Emoji */}
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fontSize={node.isMastered ? "11" : "12"}
                      fontWeight="bold"
                      fill={node.isMastered ? "#854d0e" : node.isUnlocked ? "#1d4ed8" : "#475569"}
                    >
                      {node.isMastered ? "👑" : node.isUnlocked ? "▶" : "🔒"}
                    </text>

                    {/* Label Pill */}
                    <g transform={`translate(${cx}, ${cy + 26})`}>
                      <rect
                        x="-40"
                        y="-6"
                        width="80"
                        height="12"
                        rx="5"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.08)"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="bold"
                      >
                        {node.topic.slice(0, 16)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Floating Selected Node Drawer */}
          <AnimatePresence>
            {selectedRoadmapNode && (() => {
              const selectedItem = items.find(it => it.id === selectedRoadmapNode);
              if (!selectedItem) return null;
              const status = progress[selectedItem.id] || 'not_started';
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="border rounded-2xl bg-card p-5 shadow-lg space-y-4 border-brand-soft/50 bg-gradient-to-r from-card via-brand-soft/5 to-card"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 uppercase">{selectedItem.topic}</Badge>
                        <span className="text-xs font-bold text-foreground">{selectedItem.subtopic}</span>
                        {status === 'mastered' && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] gap-1 py-0.5 px-2">
                            <Check className="size-3" /> Mastered
                          </Badge>
                        )}
                        {status === 'reviewing' && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] gap-1 py-0.5 px-2">
                            <Sparkles className="size-3" /> Reviewing
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                        {selectedItem.guideline}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRevise(selectedItem)}
                        className="text-xs gap-1.5"
                      >
                        <BookOpen className="size-3.5" />
                        Quick Revise
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleTakeCheckpoint(selectedItem)}
                        className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs gap-1.5"
                      >
                        <Target className="size-3.5" />
                        Take Checkpoint
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      )}

      {viewMode === 'list' && (
        /* Syllabus Checklist (List View) */
        <div className="space-y-3.5 animate-fade-in">
          {items.map((item) => {
            const status = progress[item.id] || 'not_started';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border rounded-xl bg-card shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-black/5 dark:border-white/5"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-500 uppercase">
                      {item.topic}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">
                      {item.subtopic}
                    </span>
                    
                    {/* Spaced repetition review date badge */}
                    {spacedRep[item.id] && (
                      <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-600 bg-indigo-50/50 flex items-center gap-1 font-mono">
                        <Calendar className="size-3 text-indigo-500" />
                        Next Review: {spacedRep[item.id].nextReviewDate}
                      </Badge>
                    )}
                    
                    {/* Status Badge */}
                    {status === 'mastered' && (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] gap-1 px-1.5">
                        <Check className="size-3" /> Mastered
                      </Badge>
                    )}
                    {status === 'reviewing' && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] gap-1 px-1.5">
                        <Sparkles className="size-3" /> Reviewing
                      </Badge>
                    )}
                    {status === 'not_started' && (
                      <Badge variant="outline" className="text-[10px]">
                        Not Started
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl break-words font-medium">
                    {item.guideline}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickRevise(item)}
                    className="text-xs gap-1.5"
                  >
                    <BookOpen className="size-3.5" />
                    Quick Revise
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleTakeCheckpoint(item)}
                    className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs gap-1.5"
                  >
                    <Target className="size-3.5" />
                    Checkpoint
                  </Button>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {viewMode === 'flashcards' && (
        <div className="space-y-6 animate-fade-in max-w-xl mx-auto text-foreground">
          {(() => {
            const currentItem = items[activeCardIdx];
            if (!currentItem) return <p className="text-xs text-muted-foreground text-center">No syllabus guidelines for this subject.</p>;
            const flashcard = FLASHCARDS_DB[currentItem.id] || {
              question: `Explain the key concepts of ${currentItem.subtopic} covering:\n${currentItem.guideline}`,
              answer: `Key guideline checkpoints: ${currentItem.guideline}`
            };
            const cardRep = spacedRep[currentItem.id] || {
              interval: 0,
              repetition: 0,
              easeFactor: 2.5,
              nextReviewDate: 'New Card'
            };

            return (
              <div className="space-y-4">
                {/* Spaced repetition status bar */}
                <div className="flex justify-between items-center text-xs text-muted-foreground px-1.5">
                  <span>Card {activeCardIdx + 1} of {items.length}</span>
                  <Badge variant="outline" className="text-[10px] gap-1 px-2.5 py-0.5 border-brand-soft bg-brand-soft/10 text-brand">
                    <Calendar className="size-3" />
                    {cardRep.repetition > 0 ? `Next Review: ${cardRep.nextReviewDate} (Int: ${cardRep.interval}d)` : 'New Card (SM-2 Active)'}
                  </Badge>
                </div>

                {/* 3D Flashcard flip card */}
                <Card className="min-h-[240px] flex flex-col justify-between border-2 border-brand-soft shadow-md relative overflow-hidden bg-gradient-to-br from-card via-brand-soft/5 to-card rounded-2xl">
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand/20 via-brand to-brand/20" />
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-400">{currentItem.topic} • {currentItem.subtopic}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => playSpeech(flashcard.question)}
                        className="size-8 rounded-full p-0 text-brand hover:bg-brand-soft/20 shrink-0"
                      >
                        <Volume2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-grow flex flex-col justify-center items-center text-center p-6 space-y-4">
                    {!showCardAnswer ? (
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {flashcard.question}
                      </p>
                    ) : (
                      <div className="space-y-2 text-left w-full">
                        <span className="text-[10px] font-bold text-brand uppercase tracking-wider block border-b pb-1">Expected Answer Key:</span>
                        <p className="text-xs text-foreground leading-relaxed">
                          {flashcard.answer}
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardContent className="bg-muted/10 border-t py-3.5 flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCardAnswer(!showCardAnswer);
                        setTranscribedText('');
                        setRecallRating(null);
                        setRecallFeedback('');
                      }}
                      className="text-xs font-semibold px-4 rounded-xl"
                    >
                      {showCardAnswer ? 'Show Question' : 'Reveal Answer'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Audio transcription answer panel */}
                <Card className="border border-black/5 dark:border-white/5 p-4 space-y-4">
                  <div className="space-y-1 text-left">
                    <span className="text-xs font-bold text-foreground block">Grade Your Recall Quality</span>
                    <p className="text-[10px] text-muted-foreground">Speak or type your recall attempt. The examiner will evaluate its accuracy.</p>
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={transcribedText}
                      onChange={(e) => setTranscribedText(e.target.value)}
                      placeholder="Type your answer, or tap the microphone to speak..."
                      className="flex-1 min-h-[60px] max-h-24 p-2.5 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-background/50 focus:outline-brand font-medium resize-none shadow-sm text-foreground"
                    />
                    <Button
                      variant={isListening ? 'destructive' : 'outline'}
                      onClick={toggleListening}
                      className="size-14 rounded-xl shrink-0 flex items-center justify-center p-0"
                    >
                      <Mic className={`size-5 ${isListening ? 'animate-ping' : ''}`} />
                    </Button>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={evaluatingFlashcard || !transcribedText.trim()}
                      onClick={() => evaluateAnswer(currentItem.id, flashcard.question, flashcard.answer, transcribedText)}
                      className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs font-bold gap-1.5"
                    >
                      {evaluatingFlashcard ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Evaluating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" /> Grade Answer
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Feedback response */}
                  {recallRating !== null && (
                    <div className="rounded-xl border p-4 text-xs space-y-2 bg-gradient-to-r from-brand-soft/5 via-card to-brand-soft/5">
                      <div className="flex justify-between items-center border-b pb-1.5">
                        <span className="font-extrabold flex items-center gap-1 text-indigo-700">
                          <Sparkles className="size-3.5 text-amber-500" />
                          Recall Score: {recallRating} / 5
                        </span>
                        <Badge className={recallRating >= 4 ? 'bg-emerald-100 text-emerald-800' : recallRating >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                          {recallRating >= 4 ? 'Superb' : recallRating >= 3 ? 'Needs Review' : 'Forgot / Poor'}
                        </Badge>
                      </div>
                      <p className="text-foreground leading-relaxed font-medium">
                        {recallFeedback}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Card navigation controls */}
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeCardIdx === 0}
                    onClick={() => {
                      setActiveCardIdx(idx => idx - 1);
                      setShowCardAnswer(false);
                      setTranscribedText('');
                      setRecallRating(null);
                      setRecallFeedback('');
                    }}
                    className="text-xs"
                  >
                    Previous Card
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={activeCardIdx === items.length - 1}
                    onClick={() => {
                      setActiveCardIdx(idx => idx + 1);
                      setShowCardAnswer(false);
                      setTranscribedText('');
                      setRecallRating(null);
                      setRecallFeedback('');
                    }}
                    className="text-xs"
                  >
                    Next Card
                  </Button>
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* ─── QUICK REVISE MODAL ────────────────────────────────────────────── */}
      <Dialog open={!!revisionItem} onOpenChange={(open) => { if (!open) setRevisionItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-bold uppercase">{activeSubject}</Badge>
              <Badge variant="outline" className="text-[10px] text-brand border-brand/20 uppercase font-semibold">Syllabus Summary</Badge>
            </div>
            <DialogTitle className="text-lg">{revisionItem?.subtopic}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed italic border-l-2 pl-3">
              {revisionItem?.guideline}
            </DialogDescription>
          </DialogHeader>

          {loadingRevision ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="size-8 animate-spin text-brand" />
              <p className="text-xs text-muted-foreground font-medium">Consolidating board revision points using RAG...</p>
            </div>
          ) : (
            <article className="prose-icse text-sm leading-relaxed p-2.5">
              <ReactMarkdown>{revisionSummary}</ReactMarkdown>
            </article>
          )}

          <DialogFooter className="border-t pt-3.5">
            <Button
              onClick={() => {
                if (revisionItem) {
                  updateProgress(revisionItem.id, 'mastered');
                  
                  // Log syllabus mastered event
                  fetch('/api/study-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      eventType: 'syllabus_toggle',
                      subject: activeSubject,
                      topic: revisionItem.topic,
                      metadata: {
                        subtopic: revisionItem.subtopic,
                        action: 'mastered',
                        guideline: revisionItem.guideline
                      }
                    })
                  }).catch(err => console.error('Failed to log syllabus mastered study event:', err));
                }
                setRevisionItem(null);
                toast.success('Topic marked as Mastered!');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1 text-xs"
            >
              <CheckCircle2 className="size-3.5" />
              Mark as Mastered
            </Button>
            <Button
              variant="outline"
              onClick={() => setRevisionItem(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CHECKPOINT QUIZ MODAL ────────────────────────────────────────── */}
      <Dialog open={!!quizItem} onOpenChange={(open) => { if (!open) setQuizItem(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Target className="size-5 text-brand" />
              Topic Checkpoint: {quizItem?.subtopic}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete these checkpoint questions to test your syllabus understanding.
            </DialogDescription>
          </DialogHeader>

          {loadingQuiz ? (
            <div className="flex flex-col items-center justify-center py-14 space-y-3 text-center">
              <Loader2 className="size-7 animate-spin text-brand" />
              <p className="text-xs text-muted-foreground">Forging checkpoint questions from curriculum...</p>
            </div>
          ) : !quizFinished ? (
            // Quiz play workspace
            <div className="space-y-4 py-2">
              {quizQuestions.length > 0 && (
                <div className="space-y-4">
                  
                  {/* Progress tracker */}
                  <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                    <span>Question {currentQIndex + 1} of {quizQuestions.length}</span>
                    <Badge variant="secondary">{activeSubject}</Badge>
                  </div>

                  {/* Question */}
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {quizQuestions[currentQIndex]?.q}
                  </p>

                  {/* Options */}
                  <div className="grid gap-2 pt-1">
                    {quizQuestions[currentQIndex]?.options.map((opt: string, optIdx: number) => {
                      const isSelected = userAnswers[currentQIndex] === optIdx;
                      return (
                        <button
                          key={opt}
                          onClick={() => setUserAnswers({ ...userAnswers, [currentQIndex]: optIdx })}
                          className={`w-full text-left text-xs p-3 rounded-lg border transition-all ${isSelected ? 'bg-brand/10 border-brand font-medium text-brand' : 'hover:bg-muted/40'}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nav controls */}
                  <div className="flex justify-between items-center pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentQIndex(idx => idx - 1)}
                      disabled={currentQIndex === 0}
                      className="text-xs"
                    >
                      Back
                    </Button>

                    {currentQIndex < quizQuestions.length - 1 ? (
                      <Button
                        size="sm"
                        disabled={userAnswers[currentQIndex] === undefined}
                        onClick={() => setCurrentQIndex(idx => idx + 1)}
                        className="text-xs gap-1.5"
                      >
                        Next Question
                        <ChevronRight className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={userAnswers[currentQIndex] === undefined}
                        onClick={finishQuiz}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                      >
                        Submit Checkpoint
                      </Button>
                    )}
                  </div>

                </div>
              )}
            </div>
          ) : (
            // Quiz Results Report
            <div className="space-y-4 py-3">
              <div className="text-center space-y-2">
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Award className="size-6" />
                </span>
                <h3 className="text-base font-bold">Checkpoint Result Summary</h3>
                <p className="text-xs text-muted-foreground">
                  Score: {quizQuestions.filter((q, idx) => userAnswers[idx] === q.answerIndex).length} / {quizQuestions.length}
                </p>
              </div>

              <div className="space-y-3.5 border-t border-b py-4 max-h-[260px] overflow-y-auto">
                {quizQuestions.map((q, idx) => {
                  const isCorrect = userAnswers[idx] === q.answerIndex;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <p className="font-semibold flex items-start gap-1.5">
                        {isCorrect ? <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" /> : <X className="size-4 text-red-500 shrink-0 mt-0.5" />}
                        {q.q}
                      </p>
                      <p className="text-[10px] text-muted-foreground pl-5 leading-relaxed bg-muted/40 p-2 rounded-lg">
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentQIndex(0);
                    setUserAnswers({});
                    setQuizFinished(false);
                  }}
                  className="text-xs"
                >
                  <RotateCcw className="size-3.5" />
                  Try Again
                </Button>
                <Button
                  size="sm"
                  onClick={() => setQuizItem(null)}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-lg font-black text-amber-400 tracking-wider">MILESTONE UNLOCKED!</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{board} Specimen Achiever</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      
      {/* ─── MILESTONE BADGE POPUP ────────────────────────────────────────── */}
      <Dialog open={!!celebratingBadge} onOpenChange={(open) => { if (!open) setCelebratingBadge(null); }}>
        <DialogContent className="max-w-sm border-amber-500/20 bg-slate-950 text-white overflow-hidden">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-lg font-black text-amber-400 tracking-wider">MILESTONE UNLOCKED!</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{board} Specimen Achiever</DialogDescription>
          </DialogHeader>

          {celebratingBadge && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-5">
              
              {/* Premium Holographic Trading Card with 3D Shine */}
              <div className="relative group w-48 h-64 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 p-5 shadow-2xl flex flex-col items-center justify-between overflow-hidden select-none">
                
                {/* 3D Shine Reflection Beam */}
                <motion.div
                  initial={{ x: '-150%' }}
                  animate={{ x: '250%' }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                  className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                />

                {/* Inner Border */}
                <div className="absolute inset-1.5 border border-dashed border-amber-500/20 rounded-xl pointer-events-none" />

                {/* Badge Emoji */}
                <div className="relative z-10 size-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner mt-2">
                  {celebratingBadge.icon}
                </div>

                {/* Badge Details */}
                <div className="relative z-10 space-y-1">
                  <h4 className="font-extrabold text-sm text-amber-300 tracking-tight">{celebratingBadge.name}</h4>
                  <p className="text-[10px] text-slate-300 leading-normal px-2">
                    {celebratingBadge.description}
                  </p>
                </div>

                {/* Footer seal */}
                <span className="relative z-10 text-[8px] font-bold text-amber-500/60 uppercase tracking-wider mb-2">{board} Project Forge Badge</span>

              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  Congratulations! This milestone badge is saved to your Second Brain memory logs.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="justify-center sm:justify-center">
            <Button
              onClick={() => setCelebratingBadge(null)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 text-xs"
            >
              Collect Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
