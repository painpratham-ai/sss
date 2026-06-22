'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Thermometer, Play, Pause, Save, FileDown,
  RefreshCw, Info, HelpCircle, CheckCircle, ChevronRight, Compass, ShieldAlert,
  Sun, Sparkles, Eye, Lightbulb, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { jsPDF } from 'jspdf';

// ─── Types ───────────────────────────────────────────────────────────────
type LabExperiment = 'physics_lens' | 'chemistry_titration' | 'biology_photosynthesis';

interface PhysicsRecord {
  id: string;
  serial: number;
  u: number;
  v: number;
  f: number;
  hO: number;
  hI: number;
  nature: string;
}

interface ChemistryRecord {
  id: string;
  trial: number;
  hcl_conc: number;
  naoh_conc: number;
  hcl_vol: number;
  v_base: number;
  indicator: string;
  max_temp: number;
  eq_ph: number;
  status: 'Accurate' | 'Under-titrated' | 'Over-titrated';
}

interface BiologyRecord {
  id: string;
  reading: number;
  distance: number;
  wavelength: string;
  co2: number;
  temp: number;
  bubbles: number;
  o2_ppm: number;
}

export function VirtualLabTab() {
  const [activeExp, setActiveExp] = useState<LabExperiment>('physics_lens');

  // --- Guided Challenges Progress ---
  const [completedChallenges, setCompletedChallenges] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lab_completed_challenges');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return {
      'phy-o1': false, 'phy-o2': false, 'phy-o3': false,
      'chem-o1': false, 'chem-o2': false, 'chem-o3': false,
      'bio-o1': false, 'bio-o2': false, 'bio-o3': false,
    };
  });

  useEffect(() => {
    localStorage.setItem('lab_completed_challenges', JSON.stringify(completedChallenges));
  }, [completedChallenges]);

  const completeChallenge = (id: string, name: string) => {
    setCompletedChallenges(prev => {
      if (prev[id]) return prev;
      
      toast.success(`Challenge Completed: ${name}! (+100 Study Points)`, {
        icon: '🎉',
        duration: 4000
      });

      fetch('/api/study-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'challenge_completed',
          subject: id.startsWith('phy') ? 'Physics' : id.startsWith('chem') ? 'Chemistry' : 'Biology',
          topic: `Lab Challenge: ${name}`,
          metadata: { challengeId: id, points: 100 }
        })
      }).catch(err => console.error('Failed to log challenge study event:', err));

      return { ...prev, [id]: true };
    });
  };


  // ─── Physics State: Lens ────────────────────────────────────────────────
  const [lensU, setLensU] = useState<number>(30); // Object distance (cm)
  const [lensF, setLensF] = useState<number>(15); // Focal length (cm)
  const [lensHO, setLensHO] = useState<number>(3); // Object height (cm)
  const [physicsRecords, setPhysicsRecords] = useState<PhysicsRecord[]>([]);

  // Calculate v and real-time outputs
  const isRealImage = lensU > lensF;
  const rawV = (lensU * lensF) / (lensU - lensF);
  const lensV = isRealImage ? parseFloat(rawV.toFixed(1)) : 999; // 999 = virtual
  const magnification = isRealImage ? parseFloat((lensV / lensU).toFixed(2)) : parseFloat((lensF / (lensF - lensU)).toFixed(2));
  const lensHI = parseFloat((lensHO * magnification).toFixed(1));

  const getPhysicsNature = () => {
    if (lensU === lensF) return 'No Image (At Infinity)';
    if (lensU < lensF) return 'Virtual, Erect & Magnified';
    if (lensU === 2 * lensF) return 'Real, Inverted & Same Size';
    if (lensU > 2 * lensF) return 'Real, Inverted & Diminished';
    return 'Real, Inverted & Magnified';
  };

  const addPhysicsRecord = () => {
    const newRec: PhysicsRecord = {
      id: `phy-${Date.now()}`,
      serial: physicsRecords.length + 1,
      u: lensU,
      v: lensV,
      f: lensF,
      hO: lensHO,
      hI: lensHI,
      nature: getPhysicsNature()
    };
    setPhysicsRecords([...physicsRecords, newRec]);
    toast.success('Observation recorded successfully.');

    // Check physics challenges
    if (lensU === 2 * lensF) {
      completeChallenge('phy-o1', 'Set object distance to u = 2f (Real, Inverted & Same Size)');
    } else if (lensU < lensF) {
      completeChallenge('phy-o2', 'Set object distance to u < f (Virtual, Erect & Magnified)');
    } else if (lensU > 2 * lensF) {
      completeChallenge('phy-o3', 'Set object distance to u > 2f (Real, Inverted & Diminished)');
    }

    // Log study event to Second Brain
    fetch('/api/study-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'simulator_run',
        subject: 'Physics',
        topic: 'Convex Lens Image Formation',
        metadata: { u: lensU, v: lensV, f: lensF, magnification, nature: newRec.nature }
      })
    }).catch(err => console.error('Failed to log physics lab study event:', err));
  };

  // ─── Chemistry State: Titration ─────────────────────────────────────────
  const [chemM1, setChemM1] = useState<number>(0.1); // HCl Molarity (M)
  const [chemM2, setChemM2] = useState<number>(0.1); // NaOH Molarity (M)
  const [chemV1, setChemV1] = useState<number>(20); // HCl Volume (ml)
  const [chemIndicator, setChemIndicator] = useState<'phenolphthalein' | 'litmus' | 'methyl_orange'>('phenolphthalein');
  const [chemFlowRate, setChemFlowRate] = useState<'off' | 'slow' | 'medium' | 'fast'>('off');
  const [naohVolume, setNaohVolume] = useState<number>(0.0);
  const [chemRecords, setChemRecords] = useState<ChemistryRecord[]>([]);

  // Calculate Equivalence Point Volume
  const equivalenceVolume = parseFloat(((chemM1 * chemV1) / chemM2).toFixed(1));

  // Exothermic Heat calculation
  const getFlaskTemp = () => {
    const molesHCl = (chemM1 * chemV1) / 1000;
    const molesNaOH = (chemM2 * naohVolume) / 1000;
    const molesReacted = Math.min(molesHCl, molesNaOH);
    const heatCapacityJ = 4.18; // Specific heat capacity of water
    const massG = chemV1 + naohVolume; // Assuming 1g/ml density
    const heatReleasedJ = molesReacted * 57300; // 57.3 kJ/mol
    const tempChange = massG > 0 ? heatReleasedJ / (massG * heatCapacityJ) : 0;
    return parseFloat((25.0 + tempChange).toFixed(1));
  };
  const currentTemp = getFlaskTemp();

  // Dynamic pH calculation
  const getPHValue = () => {
    const nH_init = (chemM1 * chemV1) / 1000;
    const nOH_added = (chemM2 * naohVolume) / 1000;
    const totalVolL = (chemV1 + naohVolume) / 1000;

    if (Math.abs(nH_init - nOH_added) < 1e-6) {
      return 7.0;
    } else if (nH_init > nOH_added) {
      const excessH = nH_init - nOH_added;
      const concH = excessH / totalVolL;
      return parseFloat(Math.max(1.0, -Math.log10(concH)).toFixed(2));
    } else {
      const excessOH = nOH_added - nH_init;
      const concOH = excessOH / totalVolL;
      const pOH = -Math.log10(concOH);
      return parseFloat(Math.min(13.5, 14.0 - pOH).toFixed(2));
    }
  };
  const currentPH = getPHValue();

  // Dynamic Color mappings
  const getSolutionColor = () => {
    const ph = currentPH;
    if (chemIndicator === 'phenolphthalein') {
      if (ph < 8.2) return 'rgba(255, 255, 255, 0.2)';
      if (ph <= 10.0) {
        const ratio = (ph - 8.2) / 1.8;
        return `rgba(244, 114, 182, ${0.15 + ratio * 0.65})`;
      }
      return 'rgba(219, 39, 119, 0.9)'; // deep magenta
    } else if (chemIndicator === 'litmus') {
      if (ph < 5.0) return 'rgba(239, 68, 68, 0.35)'; // red
      if (ph <= 8.0) {
        const ratio = (ph - 5.0) / 3.0;
        return `rgba(${239 - ratio * 180}, ${68 + ratio * 62}, ${68 + ratio * 178}, 0.35)`;
      }
      return 'rgba(59, 130, 246, 0.35)'; // blue
    } else { // methyl orange
      if (ph < 3.1) return 'rgba(239, 68, 68, 0.4)'; // red
      if (ph <= 4.4) {
        const ratio = (ph - 3.1) / 1.3;
        return `rgba(249, ${115 + ratio * 80}, 22, 0.4)`; // orange
      }
      return 'rgba(234, 179, 8, 0.4)'; // yellow
    }
  };

  const getTitrationStatus = (vol: number): 'Accurate' | 'Under-titrated' | 'Over-titrated' => {
    const diff = Math.abs(vol - equivalenceVolume);
    if (diff <= 0.2) return 'Accurate';
    if (vol < equivalenceVolume) return 'Under-titrated';
    return 'Over-titrated';
  };

  const addChemRecord = () => {
    const status = getTitrationStatus(naohVolume);
    const newRec: ChemistryRecord = {
      id: `chem-${Date.now()}`,
      trial: chemRecords.length + 1,
      hcl_conc: chemM1,
      naoh_conc: chemM2,
      hcl_vol: chemV1,
      v_base: naohVolume,
      indicator: chemIndicator,
      max_temp: currentTemp,
      eq_ph: currentPH,
      status
    };
    setChemRecords([...chemRecords, newRec]);

    if (status === 'Accurate') {
      toast.success('Perfect endpoint reached! Excellent volumetric measurement.');
      if (chemIndicator === 'phenolphthalein') {
        completeChallenge('chem-o1', 'Accurate Phenolphthalein titration (pH = 7, status = Accurate)');
      } else if (chemIndicator === 'methyl_orange') {
        completeChallenge('chem-o2', 'Accurate Methyl Orange titration (pH = 7, status = Accurate)');
      }
    } else if (status === 'Under-titrated') {
      toast.warning('Neutralization incomplete. Try adding more titrant.');
    } else {
      toast.error('Over-titrated! The endpoint has been exceeded.');
      if (status === 'Over-titrated') {
        completeChallenge('chem-o3', 'Exceed the equivalence point (status = Over-titrated)');
      }
    }

    fetch('/api/study-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'simulator_run',
        subject: 'Chemistry',
        topic: 'Acid-Base Titration',
        metadata: { hcl_conc: chemM1, naoh_conc: chemM2, v_base: naohVolume, status }
      })
    }).catch(err => console.error('Failed to log chemistry lab study event:', err));
  };

  // Titration flow interval
  useEffect(() => {
    if (chemFlowRate !== 'off') {
      const intervalMs = 120;
      let increment = 0.05;
      if (chemFlowRate === 'medium') increment = 0.15;
      if (chemFlowRate === 'fast') increment = 0.4;

      const timer = setInterval(() => {
        setNaohVolume((prev) => {
          const next = parseFloat((prev + increment).toFixed(2));
          if (next >= 50.0) {
            setChemFlowRate('off');
            return 50.0;
          }
          return next;
        });
      }, intervalMs);
      return () => clearInterval(timer);
    }
  }, [chemFlowRate]);

  // ─── Biology State: Photosynthesis ──────────────────────────────────────
  const [lampDist, setLampDist] = useState<number>(40); // cm
  const [bioWavelength, setBioWavelength] = useState<'white' | 'red' | 'blue' | 'green'>('white');
  const [bioNaHCO3, setBioNaHCO3] = useState<number>(1.0); // % CO2 addition
  const [bioTemp, setBioTemp] = useState<number>(25); // Celsius
  const [bioSpecies, setBioSpecies] = useState<'elodea' | 'hydrilla'>('elodea');
  const [bioRecords, setBioRecords] = useState<BiologyRecord[]>([]);

  // Calculate light intensity (Lux) based on Inverse Square Law: I = 10000 / d^2
  const lightIntensity = Math.round(10000 / Math.max(1, Math.pow(lampDist / 10, 2)));

  // Calculate bubble count per minute
  const getBubbleRate = () => {
    const baseRate = bioSpecies === 'elodea' ? 75 : 92;
    const co2Mult = 0.1 + bioNaHCO3 * 0.95;

    let wavelengthMult = 1.0;
    if (bioWavelength === 'red') wavelengthMult = 1.35;
    else if (bioWavelength === 'blue') wavelengthMult = 1.15;
    else if (bioWavelength === 'green') wavelengthMult = 0.12; // Green light reflected

    // Bell curve for enzyme activity (optimal temp = 33C)
    const tempMult = Math.max(0.04, 1.0 - Math.pow(bioTemp - 33, 2) / 650);

    const distanceFactor = 1500 / (Math.pow(lampDist, 2) + 200);

    return Math.max(1, Math.round(baseRate * co2Mult * wavelengthMult * tempMult * distanceFactor + 2));
  };
  const bubbleCount = getBubbleRate();

  // Dissolved Oxygen Saturation calculation
  const dissolvedOxygenPPM = parseFloat((6.2 + (bubbleCount / 10) * (bioTemp / 20)).toFixed(1));

  const addBioRecord = () => {
    const newRec: BiologyRecord = {
      id: `bio-${Date.now()}`,
      reading: bioRecords.length + 1,
      distance: lampDist,
      wavelength: bioWavelength,
      co2: bioNaHCO3,
      temp: bioTemp,
      bubbles: bubbleCount,
      o2_ppm: dissolvedOxygenPPM
    };
    setBioRecords([...bioRecords, newRec]);
    toast.success('Observation recorded successfully.');

    // Check biology challenges
    if (bubbleCount > 40) {
      completeChallenge('bio-o1', 'High rate of photosynthesis bubbles (bubbles > 40)');
    }
    if (bioWavelength === 'green' && bubbleCount < 5) {
      completeChallenge('bio-o2', 'Reflective green light filter (bubbles < 5)');
    }
    if (bioTemp === 10) {
      completeChallenge('bio-o3', 'Cold water constraint (temp = 10°C)');
    }

    fetch('/api/study-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'simulator_run',
        subject: 'Biology',
        topic: 'Photosynthesis Rate and Light Intensity',
        metadata: { distance: lampDist, wavelength: bioWavelength, temp: bioTemp, bubbles: bubbleCount }
      })
    }).catch(err => console.error('Failed to log biology lab study event:', err));
  };

  // ─── Reset function ─────────────────────────────────────────────────────
  const resetLab = () => {
    if (activeExp === 'physics_lens') {
      setLensU(30);
      setLensF(15);
      setLensHO(3);
      setPhysicsRecords([]);
    } else if (activeExp === 'chemistry_titration') {
      setChemFlowRate('off');
      setNaohVolume(0.0);
      setChemRecords([]);
    } else {
      setLampDist(40);
      setBioWavelength('white');
      setBioNaHCO3(1.0);
      setBioTemp(25);
      setBioRecords([]);
    }
    toast.info('Apparatus reset to default parameters.');
  };

  // ─── jsPDF Practical Lab Journal Report Generator ───────────────────────
  const generatePDFReport = () => {
    const doc = new jsPDF();

    // Custom Header Banner
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CISCE SCIENCE PRACTICAL LABORATORY JOURNAL', 16, 26);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 150, 52);
    doc.text('Subject Class: Class 10 Science Practicals (ICSE Syllabus)', 16, 52);

    doc.setDrawColor(220, 220, 220);
    doc.line(16, 56, 194, 56);

    let y = 68;

    if (activeExp === 'physics_lens') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text('EXPERIMENT: To determine focal length and magnification parameters of Convex Lens.', 16, y);

      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('AIM:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('To find the focal length, image distance (v), and transverse magnification (m) of a convex lens.', 32, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('APPARATUS:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('Optical bench, convex lens, lens holder, illuminated candle object, screen, and meter scale.', 44, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('FORMULAS:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('Lens Formula: 1/f = 1/v - 1/u. Magnification: m = v/u = hI/hO.', 44, y);

      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATION RECORD TABLE:', 16, y);

      y += 6;
      doc.setFillColor(245, 245, 245);
      doc.rect(16, y, 178, 8, 'F');
      doc.rect(16, y, 178, 8, 'S');
      doc.setFontSize(8.5);
      doc.text('Serial', 19, y + 5.5);
      doc.text('u (cm)', 32, y + 5.5);
      doc.text('v (cm)', 52, y + 5.5);
      doc.text('f (cm)', 72, y + 5.5);
      doc.text('hO (cm)', 92, y + 5.5);
      doc.text('hI (cm)', 112, y + 5.5);
      doc.text('Nature of Image', 132, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      physicsRecords.forEach((rec) => {
        doc.rect(16, y, 178, 8, 'S');
        doc.text(String(rec.serial), 21, y + 5.5);
        doc.text(`${rec.u} cm`, 32, y + 5.5);
        doc.text(rec.v === 999 ? 'Virtual' : `${rec.v} cm`, 52, y + 5.5);
        doc.text(`${rec.f} cm`, 72, y + 5.5);
        doc.text(`${rec.hO} cm`, 92, y + 5.5);
        doc.text(`${rec.hI} cm`, 112, y + 5.5);
        doc.text(rec.nature, 132, y + 5.5);
        y += 8;
      });

      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PRECAUTIONS & SAFETY PROTOCOLS:', 16, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      doc.text('1. The optical center of the lens, candle flame tip, and center of screen must align vertically.', 16, y);
      y += 5;
      doc.text('2. Parallax error between image needle and actual image tip must be removed.', 16, y);

    } else if (activeExp === 'chemistry_titration') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text('EXPERIMENT: Neutralization Titration of Hydrochloric Acid (HCl) with Sodium Hydroxide (NaOH).', 16, y);

      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('AIM:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('To determine the concentration and strength of unknown HCl using standard NaOH solution.', 32, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('APPARATUS:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('50 mL Burette, 20 mL Pipette, Conical flask, Indicators, Thermometer.', 44, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('CHEMICAL EQUATION:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('HCl (aq) + NaOH (aq) -> NaCl (aq) + H2O (l) + 57.3 kJ/mol (Exothermic Neutralization)', 62, y);

      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATION RECORD TABLE:', 16, y);

      y += 6;
      doc.setFillColor(245, 245, 245);
      doc.rect(16, y, 178, 8, 'F');
      doc.rect(16, y, 178, 8, 'S');
      doc.setFontSize(8.5);
      doc.text('Trial', 19, y + 5.5);
      doc.text('HCl Vol (mL)', 32, y + 5.5);
      doc.text('HCl Conc (M)', 62, y + 5.5);
      doc.text('NaOH Added (mL)', 92, y + 5.5);
      doc.text('Max Temp (C)', 122, y + 5.5);
      doc.text('End pH', 152, y + 5.5);
      doc.text('Status', 172, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      chemRecords.forEach((rec) => {
        doc.rect(16, y, 178, 8, 'S');
        doc.text(String(rec.trial), 21, y + 5.5);
        doc.text(`${rec.hcl_vol} mL`, 32, y + 5.5);
        doc.text(`${rec.hcl_conc} M`, 62, y + 5.5);
        doc.text(`${rec.v_base} mL`, 92, y + 5.5);
        doc.text(`${rec.max_temp} C`, 122, y + 5.5);
        doc.text(String(rec.eq_ph), 152, y + 5.5);
        doc.text(rec.status, 172, y + 5.5);
        y += 8;
      });

      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('CONCORDANT VOLUME & CALCULATION:', 16, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      const accurateTrials = chemRecords.filter(r => r.status === 'Accurate');
      const meanNaOH = accurateTrials.length > 0
        ? parseFloat((accurateTrials.reduce((sum, r) => sum + r.v_base, 0) / accurateTrials.length).toFixed(2))
        : '___';
      doc.text(`Mean Titre value of NaOH for neutralization: ${meanNaOH} mL. Formula applied: M1 * V1 = M2 * V2`, 16, y);

    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text('EXPERIMENT: Factors affecting rate of photosynthesis in water plants (Elodea/Hydrilla).', 16, y);

      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.text('AIM:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('To investigate the influence of light distance (intensity), temperature, and NaHCO3 concentration.', 32, y);

      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.text('PHYSIOLOGICAL EQUATION:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text('6CO2 + 6H2O + Light Energy -> Chlorophyll -> C6H12O6 + 6O2 (Bubbles)', 66, y);

      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVATION RECORD TABLE:', 16, y);

      y += 6;
      doc.setFillColor(245, 245, 245);
      doc.rect(16, y, 178, 8, 'F');
      doc.rect(16, y, 178, 8, 'S');
      doc.setFontSize(8.5);
      doc.text('No.', 19, y + 5.5);
      doc.text('Distance (cm)', 32, y + 5.5);
      doc.text('Filter Color', 62, y + 5.5);
      doc.text('NaHCO3 (%)', 92, y + 5.5);
      doc.text('Temp (C)', 122, y + 5.5);
      doc.text('Bubbles/Min', 142, y + 5.5);
      doc.text('Dissolved O2', 170, y + 5.5);

      y += 8;
      doc.setFont('helvetica', 'normal');
      bioRecords.forEach((rec) => {
        doc.rect(16, y, 178, 8, 'S');
        doc.text(String(rec.reading), 21, y + 5.5);
        doc.text(`${rec.distance} cm`, 32, y + 5.5);
        doc.text(rec.wavelength, 62, y + 5.5);
        doc.text(`${rec.co2}%`, 92, y + 5.5);
        doc.text(`${rec.temp} C`, 122, y + 5.5);
        doc.text(`${rec.bubbles}`, 142, y + 5.5);
        doc.text(`${rec.o2_ppm} PPM`, 170, y + 5.5);
        y += 8;
      });
    }

    doc.save(`icse_practical_journal_${activeExp}.pdf`);
    toast.success('Lab Journal report successfully compiled and downloaded as PDF!');
  };

  // ─── Rendering helpers for ray diagrams ─────────────────────────────────
  const getRayCoordinates = () => {
    const width = 500;
    const height = 180;
    const xLens = width / 2;
    const yAxis = height / 2;
    const scale = 3.2; // pixels per cm

    const xObj = xLens - lensU * scale;
    const yObjTip = yAxis - lensHO * scale;

    const xF1 = xLens - lensF * scale;
    const xF2 = xLens + lensF * scale;

    let xImg = xLens + lensV * scale;
    let yImgTip = yAxis + lensHI * scale; // inverted

    if (!isRealImage) {
      // Virtual image: same side as object, erect
      xImg = xLens - Math.abs(lensV) * scale;
      yImgTip = yAxis - lensHI * scale;
    }

    return { xLens, yAxis, xObj, yObjTip, xF1, xF2, xImg, yImgTip, scale };
  };

  const ray = getRayCoordinates();

  return (
    <div className="grid gap-6 lg:grid-cols-[2.2fr_1.8fr] w-full max-w-6xl mx-auto">

      {/* Simulator Device Panel */}
      <Card className="flex flex-col h-full border border-black/5 dark:border-white/5 shadow-md overflow-hidden bg-slate-950 text-white">
        <CardHeader className="bg-slate-900 border-b border-white/5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="size-5 text-emerald-400" />
              <CardTitle className="text-sm font-bold tracking-tight">Interactive Science Simulation Workspace</CardTitle>
            </div>
            <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-white/5">
              <Button
                variant={activeExp === 'physics_lens' ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-[10px] px-2.5 rounded-md transition-all ${
                  activeExp === 'physics_lens' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => {
                  setActiveExp('physics_lens');
                  setPhysicsRecords([]);
                }}
              >
                Physics (Lens)
              </Button>
              <Button
                variant={activeExp === 'chemistry_titration' ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-[10px] px-2.5 rounded-md transition-all ${
                  activeExp === 'chemistry_titration' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => {
                  setActiveExp('chemistry_titration');
                  setNaohVolume(0);
                  setChemFlowRate('off');
                  setChemRecords([]);
                }}
              >
                Chemistry (Titration)
              </Button>
              <Button
                variant={activeExp === 'biology_photosynthesis' ? 'default' : 'ghost'}
                size="sm"
                className={`h-7 text-[10px] px-2.5 rounded-md transition-all ${
                  activeExp === 'biology_photosynthesis' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => {
                  setActiveExp('biology_photosynthesis');
                  setBioRecords([]);
                }}
              >
                Biology (Photosynthesis)
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* ─── SIMULATION AREA RENDER ─── */}
        <div className="flex-grow p-4 min-h-[340px] flex items-center justify-center relative bg-gradient-to-b from-slate-950 to-slate-900 border-b border-white/5">

          {/* 1. Convex Lens Simulator View */}
          {activeExp === 'physics_lens' && (
            <div className="w-full flex flex-col items-center justify-between space-y-4">
              <div className="relative w-full h-[180px] bg-slate-950/80 border border-white/5 rounded-xl overflow-hidden flex items-center justify-center">
                {/* SVG Ray Diagram */}
                <svg className="w-full h-full" viewBox="0 0 500 180">
                  {/* Central Optical Axis Line */}
                  <line x1="10" y1={ray.yAxis} x2="490" y2={ray.yAxis} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Focal Points F1 & F2, 2F1 & 2F2 */}
                  <circle cx={ray.xF1} cy={ray.yAxis} r="3" fill="#60a5fa" />
                  <text x={ray.xF1 - 6} y={ray.yAxis + 14} fill="#60a5fa" className="text-[8px] font-mono">F1</text>

                  <circle cx={ray.xF1 - lensF * ray.scale} cy={ray.yAxis} r="3" fill="#60a5fa" />
                  <text x={ray.xF1 - lensF * ray.scale - 9} y={ray.yAxis + 14} fill="#60a5fa" className="text-[8px] font-mono">2F1</text>

                  <circle cx={ray.xF2} cy={ray.yAxis} r="3" fill="#60a5fa" />
                  <text x={ray.xF2 - 6} y={ray.yAxis + 14} fill="#60a5fa" className="text-[8px] font-mono">F2</text>

                  <circle cx={ray.xF2 + lensF * ray.scale} cy={ray.yAxis} r="3" fill="#60a5fa" />
                  <text x={ray.xF2 + lensF * ray.scale - 9} y={ray.yAxis + 14} fill="#60a5fa" className="text-[8px] font-mono">2F2</text>

                  {/* Convex Lens vertical plane line */}
                  <path d={`M ${ray.xLens} 20 L ${ray.xLens} 160`} stroke="rgba(56, 189, 248, 0.4)" strokeWidth="3" />
                  <path d={`M ${ray.xLens - 6} 25 L ${ray.xLens} 15 L ${ray.xLens + 6} 25`} fill="none" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="2" />
                  <path d={`M ${ray.xLens - 6} 155 L ${ray.xLens} 165 L ${ray.xLens + 6} 155`} fill="none" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="2" />
                  <circle cx={ray.xLens} cy={ray.yAxis} r="4" fill="rgba(56, 189, 248, 0.8)" />
                  <text x={ray.xLens + 7} y={ray.yAxis - 7} fill="rgba(56, 189, 248, 0.8)" className="text-[8px] font-bold font-mono">O</text>

                  {/* Object Arrow Candle */}
                  <g>
                    {/* Candle Body */}
                    <rect x={ray.xObj - 3} y={ray.yObjTip} width="6" height={ray.yAxis - ray.yObjTip} fill="rgba(148, 163, 184, 0.9)" rx="1" />
                    {/* Burning Flame */}
                    <path d={`M ${ray.xObj} ${ray.yObjTip} C ${ray.xObj - 4} ${ray.yObjTip - 7} ${ray.xObj} ${ray.yObjTip - 12} ${ray.xObj} ${ray.yObjTip - 12} C ${ray.xObj} ${ray.yObjTip - 12} ${ray.xObj + 4} ${ray.yObjTip - 7} ${ray.xObj} ${ray.yObjTip}`} fill="#f59e0b" />
                    <text x={ray.xObj - 12} y={ray.yAxis + 13} fill="#94a6b8" className="text-[8px] font-bold font-mono">Obj</text>
                  </g>

                  {/* Image Arrow Candle */}
                  {lensU !== lensF && (
                    <g>
                      {/* Image Body */}
                      <rect x={ray.xImg - 2} y={isRealImage ? ray.yAxis : ray.yImgTip} width="4" height={Math.abs(ray.yAxis - ray.yImgTip)} fill="rgba(52, 211, 153, 0.6)" rx="1" />
                      {/* Image Flame */}
                      {isRealImage ? (
                        <path d={`M ${ray.xImg} ${ray.yImgTip} C ${ray.xImg - 3} ${ray.yImgTip + 6} ${ray.xImg} ${ray.yImgTip + 10} ${ray.xImg} ${ray.yImgTip + 10} C ${ray.xImg} ${ray.yImgTip + 10} ${ray.xImg + 3} ${ray.yImgTip + 6} ${ray.xImg} ${ray.yImgTip}`} fill="#f59e0b" opacity="0.75" />
                      ) : (
                        <path d={`M ${ray.xImg} ${ray.yImgTip} C ${ray.xImg - 3} ${ray.yImgTip - 6} ${ray.xImg} ${ray.yImgTip - 10} ${ray.xImg} ${ray.yImgTip - 10} C ${ray.xImg} ${ray.yImgTip - 10} ${ray.xImg + 3} ${ray.yImgTip - 6} ${ray.xImg} ${ray.yImgTip}`} fill="#f59e0b" opacity="0.5" />
                      )}
                      <text x={ray.xImg - 12} y={isRealImage ? ray.yAxis - 6 : ray.yAxis + 13} fill="#34d399" className="text-[8px] font-bold font-mono">Img</text>
                    </g>
                  )}

                  {/* Incident Parallel Ray to Lens, then Bending Through Focus F2 */}
                  {/* Ray 1: Horizontal */}
                  <line x1={ray.xObj} y1={ray.yObjTip} x2={ray.xLens} y2={ray.yObjTip} stroke="#ef4444" strokeWidth="1.2" strokeDasharray="300" strokeDashoffset="0" />
                  {/* Ray 1 Refracted: through F2 to Image tip */}
                  {lensU !== lensF && (
                    <line x1={ray.xLens} y1={ray.yObjTip} x2={isRealImage ? ray.xImg : ray.xLens + 160} y2={isRealImage ? ray.yImgTip : ray.yAxis + (ray.yAxis - ray.yObjTip)} stroke="#ef4444" strokeWidth="1.2" />
                  )}
                  {/* Virtual Extension backing up (dashed) */}
                  {!isRealImage && lensU !== lensF && (
                    <line x1={ray.xLens} y1={ray.yObjTip} x2={ray.xImg} y2={ray.yImgTip} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,4" />
                  )}

                  {/* Optical Center Ray: straight through O */}
                  {lensU !== lensF && (
                    <line x1={ray.xObj} y1={ray.yObjTip} x2={isRealImage ? ray.xImg : ray.xLens + 140} y2={isRealImage ? ray.yImgTip : ray.yAxis + (ray.yAxis - ray.yObjTip) * 0.9} stroke="#a855f7" strokeWidth="1.2" />
                  )}
                  {/* OC Virtual Extension backing up */}
                  {!isRealImage && lensU !== lensF && (
                    <line x1={ray.xLens} y1={ray.yAxis} x2={ray.xImg} y2={ray.yImgTip} stroke="#a855f7" strokeWidth="1" strokeDasharray="4,4" />
                  )}
                </svg>

                {/* Focused Screen Slider Mock indicator */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 border border-white/10 px-2 py-0.5 rounded text-[8px] text-slate-400">
                  <Eye className="size-3 text-sky-400" />
                  Focal Plane Tracing
                </div>
              </div>

              {/* Convex Lens Nature parameters */}
              <div className="grid grid-cols-4 gap-4 text-center text-xs bg-slate-950 border border-white/5 p-3 rounded-xl w-full">
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Image Nature</span>
                  <span className={`font-bold ${lensU === lensF ? 'text-rose-400' : 'text-emerald-400'}`}>{getPhysicsNature()}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Image Pos (v)</span>
                  <span className="text-sky-400 font-mono font-bold">{lensU === lensF ? 'Infinity' : isRealImage ? `${lensV} cm` : `-${Math.abs(lensV)} cm`}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Height (hI)</span>
                  <span className="text-amber-400 font-mono font-bold">{lensU === lensF ? 'N/A' : `${lensHI} cm`}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Magnification</span>
                  <span className="text-indigo-400 font-mono font-bold">{lensU === lensF ? 'Infinite' : `${isRealImage ? '-' : '+'}${Math.abs(magnification)}x`}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Chemistry Titration View */}
          {activeExp === 'chemistry_titration' && (
            <div className="w-full flex items-start justify-center gap-10 select-none">
              {/* Burette & Flask graphic */}
              <div className="relative w-32 h-[260px] flex flex-col items-center">
                {/* Clamp Stand back support */}
                <div className="absolute right-4 top-0 bottom-0 w-2.5 bg-slate-800 rounded-full" />
                <div className="absolute right-0 bottom-0 w-20 h-3.5 bg-slate-700 rounded-md" />

                {/* Clamp arm */}
                <div className="absolute right-4 top-20 w-10 h-2 bg-slate-500 border border-slate-600" />

                {/* Burette Tube */}
                <div className="absolute right-12 top-4 w-4 h-44 border-2 border-white/20 rounded-t bg-sky-200/5 overflow-hidden flex flex-col justify-end">
                  {/* NaOH Liquid inside */}
                  <motion.div
                    animate={{ height: `${Math.max(0, 100 - (naohVolume / 50) * 100)}%` }}
                    className="w-full bg-sky-400/35 rounded-b transition-all duration-300"
                  />
                  {/* Burette volume tick marks */}
                  <div className="absolute inset-y-0 right-0 w-1 flex flex-col justify-between text-[4px] text-white/40 font-mono">
                    <span>- 0</span>
                    <span>- 10</span>
                    <span>- 20</span>
                    <span>- 30</span>
                    <span>- 40</span>
                    <span>- 50</span>
                  </div>
                </div>

                {/* Valve Stopcock */}
                <div className="absolute right-[49px] top-[178px] flex flex-col items-center">
                  <div className={`w-3.5 h-3 rounded transition-colors ${chemFlowRate !== 'off' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <div className="w-1.5 h-6 bg-slate-400" />
                </div>

                {/* Dropping water particles */}
                {chemFlowRate !== 'off' && (
                  <motion.div
                    key={naohVolume}
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: 52, opacity: [1, 1, 0], scale: [1, 1, 0.7] }}
                    transition={{ duration: 0.35, ease: 'easeIn' }}
                    className="absolute right-[51px] top-[204px] size-1.5 bg-sky-300 rounded-full"
                  />
                )}

                {/* Reactant flask at bottom */}
                <div className="absolute right-5 bottom-3.5 flex flex-col items-center">
                  {/* Neck */}
                  <div className="w-4 h-6 border-l-2 border-r-2 border-white/20 bg-transparent" />
                  {/* Conical Flask body */}
                  <div className="relative w-14 h-16 border-2 border-white/20 rounded-b-xl rounded-t-lg bg-sky-200/5 overflow-hidden flex items-end">
                    {/* Neutralization reacted solution color */}
                    <motion.div
                      animate={{ backgroundColor: getSolutionColor() }}
                      className="w-full h-8 transition-colors duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Chemistry Output Readouts */}
              <div className="flex-1 max-w-[210px] space-y-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[9px] uppercase font-semibold">Temp (Heat)</span>
                    <span className="text-orange-400 font-bold">{currentTemp} °C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[9px] uppercase font-semibold">Solution pH</span>
                    <span className="text-amber-400 font-bold">{currentPH}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[9px] uppercase font-semibold">NaOH added</span>
                    <span className="text-sky-400 font-bold">{naohVolume} mL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-[9px] uppercase font-semibold">Target Titre</span>
                    <span className="text-slate-300 font-semibold">{equivalenceVolume} mL</span>
                  </div>
                </div>

                {/* Mini SVG pH curve graph */}
                <div className="w-full h-[100px] bg-slate-950 border border-white/5 rounded-xl p-1.5 flex flex-col justify-between">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block text-center">pH Neutralization Curve</span>
                  <svg className="w-full h-14" viewBox="0 0 100 50">
                    {/* Axes */}
                    <line x1="10" y1="5" x2="10" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                    <line x1="10" y1="45" x2="95" y2="45" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                    {/* Sigmoid pH curve */}
                    <path
                      d={`M 10 42 C 40 42, ${equivalenceVolume * 1.8} 42, ${equivalenceVolume * 1.8} 25 S ${equivalenceVolume * 1.8 + 10} 8, 95 8`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.5"
                    />
                    {/* Live indicator dot */}
                    <circle
                      cx={Math.min(95, 10 + naohVolume * 1.7)}
                      cy={currentPH < 7 ? 42 - (currentPH * 2.4) : currentPH === 7 ? 25 : 25 - (currentPH - 7) * 2.5}
                      r="2.5"
                      fill="#ef4444"
                    />
                  </svg>
                  <div className="flex justify-between text-[7px] text-slate-400 font-mono px-1">
                    <span>0 M HCl</span>
                    <span>Endpoint pH 7</span>
                    <span>NaOH</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Biology Photosynthesis View */}
          {activeExp === 'biology_photosynthesis' && (
            <div className="w-full flex flex-col items-center justify-between space-y-4">
              <div className="relative w-full h-[180px] bg-slate-950/80 border border-white/5 rounded-xl overflow-hidden flex items-center justify-between px-6">
                
                {/* Wavelength Filter Lamp */}
                <motion.div
                  animate={{ x: Math.max(0, lampDist * 1.7 - 35) }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="relative flex flex-col items-center z-10"
                >
                  <div className="size-9 rounded-full bg-slate-500 flex items-center justify-center relative shadow-md">
                    {/* Color glow bulb */}
                    <div className={`size-5 rounded-full ${
                      bioWavelength === 'white' ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]' :
                      bioWavelength === 'red' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' :
                      bioWavelength === 'blue' ? 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.8)]' :
                      'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                    }`} />

                    {/* Emitted Light Cone gradient */}
                    <div
                      className={`absolute left-8 h-12 w-28 blur-md rounded-r-full origin-left ${
                        bioWavelength === 'white' ? 'bg-gradient-to-r from-white/15 to-transparent' :
                        bioWavelength === 'red' ? 'bg-gradient-to-r from-rose-500/20 to-transparent' :
                        bioWavelength === 'blue' ? 'bg-gradient-to-r from-sky-500/20 to-transparent' :
                        'bg-gradient-to-r from-emerald-500/20 to-transparent'
                      }`}
                      style={{
                        transform: `scale(${Math.max(0.3, 1.3 - lampDist / 90)})`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-300 mt-1 font-mono uppercase font-bold">{bioWavelength} light</span>
                </motion.div>

                {/* Beaker with Plants & Rising Bubbles */}
                <div className="absolute right-8 bottom-3 flex items-start gap-4 z-10">
                  
                  {/* Microscopic Chloroplast preview circle */}
                  <div className="size-14 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-sm p-1 flex flex-col items-center justify-center text-[7px] text-emerald-400 font-mono shadow-inner">
                    <span>Chloroplasts</span>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: Math.max(1, 10 / (bubbleCount / 10)), ease: 'linear' }}
                      className="size-5 border-2 border-dashed border-emerald-400/80 rounded-full mt-1 flex items-center justify-center"
                    >
                      <div className="size-2 bg-emerald-400 rounded-full" />
                    </motion.div>
                  </div>

                  {/* Glass beaker */}
                  <div className="relative w-20 h-28 border-2 border-white/20 rounded-b-lg rounded-t bg-sky-200/5 flex items-end justify-center p-2 overflow-hidden shadow-md">
                    {/* Water Level */}
                    <div className="absolute inset-x-0 bottom-0 top-4 bg-sky-300/10" />

                    {/* Plant stem & leaves */}
                    <div className="w-2.5 h-20 bg-emerald-700/80 rounded-full flex flex-col justify-between py-3 items-center">
                      <div className="w-7 h-1.5 bg-emerald-500/70 rounded-full" />
                      <div className="w-7 h-1.5 bg-emerald-500/70 rounded-full" />
                      <div className="w-7 h-1.5 bg-emerald-500/70 rounded-full" />
                      <div className="w-7 h-1.5 bg-emerald-500/70 rounded-full" />
                    </div>

                    {/* Oxygen bubble particles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {Array.from({ length: Math.min(20, Math.ceil(bubbleCount / 4)) }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 95, x: 20 + (i * 12) % 40, opacity: 0, scale: 0.5 }}
                          animate={{
                            y: [-10, 20, 95].reverse(),
                            opacity: [0, 1, 1, 0],
                            scale: [0.5, 0.9, 0.9, 0.7],
                            x: [20 + (i * 12) % 40, 25 + (i * 12) % 40 + Math.sin(i) * 5, 20 + (i * 12) % 40]
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.4 + (i % 3) * 0.4,
                            delay: i * 0.25,
                            ease: 'linear'
                          }}
                          className="absolute size-2 rounded-full border border-sky-300/40 bg-sky-200/20 shadow-inner"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photosynthesis parameters dashboard */}
              <div className="grid grid-cols-4 gap-4 text-center text-xs bg-slate-950 border border-white/5 p-3 rounded-xl w-full">
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Light (Lux)</span>
                  <span className="text-amber-400 font-mono font-bold">{lightIntensity} lx</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Temp (°C)</span>
                  <span className="text-rose-400 font-mono font-bold">{bioTemp} °C</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">O2 PPM</span>
                  <span className="text-emerald-400 font-mono font-bold">{dissolvedOxygenPPM} PPM</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[9px] uppercase font-semibold">Bubble Rate</span>
                  <span className="text-indigo-400 font-mono font-bold">{bubbleCount} / min</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ─── SIMULATION PARAMETER CONTROLS ─── */}
        <CardContent className="py-4 space-y-4 bg-slate-900/60 border-b border-white/5">

          {/* A. Convex Lens Controls (4 interactive parameters) */}
          {activeExp === 'physics_lens' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-4">
                {/* Object Distance u */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <Label htmlFor="u-distance">Object Dist (u)</Label>
                    <span className="font-mono text-white font-bold">{lensU} cm</span>
                  </div>
                  <Slider
                    id="u-distance"
                    min={15}
                    max={60}
                    step={1}
                    value={[lensU]}
                    onValueChange={(val) => setLensU(val[0])}
                  />
                </div>

                {/* Focal Length f */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <Label htmlFor="lens-focal">Focal Length (f)</Label>
                    <span className="font-mono text-white font-bold">{lensF} cm</span>
                  </div>
                  <Slider
                    id="lens-focal"
                    min={10}
                    max={25}
                    step={1}
                    value={[lensF]}
                    onValueChange={(val) => setLensF(val[0])}
                  />
                </div>

                {/* Object Height hO */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <Label htmlFor="lens-ho">Object Height (hO)</Label>
                    <span className="font-mono text-white font-bold">{lensHO} cm</span>
                  </div>
                  <Slider
                    id="lens-ho"
                    min={1}
                    max={5}
                    step={0.5}
                    value={[lensHO]}
                    onValueChange={(val) => setLensHO(val[0])}
                  />
                </div>
              </div>

              {/* Legend checklist explaining ray parameters */}
              <div className="border border-white/5 bg-slate-950 p-2.5 rounded-lg text-[10px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">ICSE Ray Tracing Protocols:</span>
                <p>• Incident Parallel Ray (Red) refracts through the focal point (F2).</p>
                <p>• Optical Center Ray (Purple) passes through O un-deviated.</p>
                <p>• Lens magnification is inverted (-) for real and upright (+) for virtual images.</p>
              </div>
            </div>
          )}

          {/* B. Chemistry Titration Controls (6 interactive parameters) */}
          {activeExp === 'chemistry_titration' && (
            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-4 gap-3 font-normal">
                {/* HCl Concentration */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">HCl Conc (M)</Label>
                  <Select value={String(chemM1)} onValueChange={(val) => setChemM1(parseFloat(val))}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.05">0.05 M</SelectItem>
                      <SelectItem value="0.1">0.10 M</SelectItem>
                      <SelectItem value="0.2">0.20 M</SelectItem>
                      <SelectItem value="0.5">0.50 M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NaOH Concentration */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">NaOH Conc (M)</Label>
                  <Select value={String(chemM2)} onValueChange={(val) => setChemM2(parseFloat(val))}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.05">0.05 M</SelectItem>
                      <SelectItem value="0.1">0.10 M</SelectItem>
                      <SelectItem value="0.2">0.20 M</SelectItem>
                      <SelectItem value="0.5">0.50 M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* HCl Flask Volume */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">HCl Volume</Label>
                  <Select value={String(chemV1)} onValueChange={(val) => setChemV1(parseFloat(val))}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10.0 mL</SelectItem>
                      <SelectItem value="20">20.0 mL</SelectItem>
                      <SelectItem value="25">25.0 mL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Indicator selector */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Indicator</Label>
                  <Select value={chemIndicator} onValueChange={(val: any) => setChemIndicator(val)}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phenolphthalein">Phenol</SelectItem>
                      <SelectItem value="litmus">Litmus</SelectItem>
                      <SelectItem value="methyl_orange">M-Orange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Drop Flow Controller */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Burette Valve:</span>
                <div className="flex gap-1.5 flex-1 bg-slate-950 p-1 rounded-lg border border-white/5">
                  {(['off', 'slow', 'medium', 'fast'] as const).map((rate) => (
                    <Button
                      key={rate}
                      variant={chemFlowRate === rate ? 'default' : 'ghost'}
                      className={`h-6 text-[9px] flex-1 font-semibold rounded-md capitalize ${
                        chemFlowRate === rate ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      onClick={() => setChemFlowRate(rate)}
                    >
                      {rate === 'off' ? 'Closed' : rate}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. Biology Photosynthesis Controls (5 interactive parameters) */}
          {activeExp === 'biology_photosynthesis' && (
            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-4 gap-3 font-normal">
                {/* Wavelength colors filter */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Color Filter</Label>
                  <Select value={bioWavelength} onValueChange={(val: any) => setBioWavelength(val)}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">White</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green (Reflect)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NaHCO3 CO2 Conc */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">NaHCO₃ Conc (%)</Label>
                  <Select value={String(bioNaHCO3)} onValueChange={(val) => setBioNaHCO3(parseFloat(val))}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0.0 % (CO2 Free)</SelectItem>
                      <SelectItem value="0.5">0.5 %</SelectItem>
                      <SelectItem value="1">1.0 %</SelectItem>
                      <SelectItem value="2">2.0 %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Water Temp */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Water Temp (°C)</Label>
                  <Select value={String(bioTemp)} onValueChange={(val) => setBioTemp(parseInt(val))}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10°C (Cold)</SelectItem>
                      <SelectItem value="22">22°C</SelectItem>
                      <SelectItem value="33">33°C (Optimal)</SelectItem>
                      <SelectItem value="48">48°C (Hot)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plant Species */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Species</Label>
                  <Select value={bioSpecies} onValueChange={(val: any) => setBioSpecies(val)}>
                    <SelectTrigger className="h-7 text-[10px] bg-slate-950 border-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elodea">Elodea</SelectItem>
                      <SelectItem value="hydrilla">Hydrilla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lamp distance slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-normal">
                  <Label htmlFor="bio-lamp-dist">Lamp Distance</Label>
                  <span className="font-mono text-white font-bold">{lampDist} cm</span>
                </div>
                <Slider
                  id="bio-lamp-dist"
                  min={10}
                  max={80}
                  step={1}
                  value={[lampDist]}
                  onValueChange={(val) => setLampDist(val[0])}
                />
              </div>
            </div>
          )}

          {/* Record Actions bar */}
          <div className="flex gap-2.5 border-t border-white/5 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] bg-slate-950 border-white/10 hover:bg-slate-900"
              onClick={resetLab}
            >
              <RefreshCw className="size-3.5" />
              Reset Apparatus
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (activeExp === 'physics_lens') addPhysicsRecord();
                else if (activeExp === 'chemistry_titration') addChemRecord();
                else addBioRecord();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold gap-1.5 flex-1"
            >
              <Save className="size-3.5" />
              Record Observation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guided Lab Challenges Card */}
      <Card className="border border-black/5 dark:border-white/5 shadow-md bg-slate-950 text-white">
        <CardHeader className="bg-slate-900 border-b border-white/5 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xs font-bold tracking-wider uppercase text-emerald-400">Guided Lab Challenges</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                Complete core board experiments to earn points.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3.5 space-y-3">
          {activeExp === 'physics_lens' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                <span>Lens Formula Challenges</span>
                <span>
                  {Object.keys(completedChallenges).filter(k => k.startsWith('phy') && completedChallenges[k]).length}/3 Done
                </span>
              </div>
              <div className="space-y-2">
                <ChallengeItem
                  title="Real, Inverted & Same Size"
                  description="Set object distance to exactly 2f (u = 2f) and log observation."
                  isCompleted={completedChallenges['phy-o1']}
                />
                <ChallengeItem
                  title="Virtual, Erect & Magnified"
                  description="Set object distance less than focal length (u < f) and log observation."
                  isCompleted={completedChallenges['phy-o2']}
                />
                <ChallengeItem
                  title="Real, Inverted & Diminished"
                  description="Set object distance greater than 2f (u > 2f) and log observation."
                  isCompleted={completedChallenges['phy-o3']}
                />
              </div>
            </div>
          )}

          {activeExp === 'chemistry_titration' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                <span>Volumetric Analysis Challenges</span>
                <span>
                  {Object.keys(completedChallenges).filter(k => k.startsWith('chem') && completedChallenges[k]).length}/3 Done
                </span>
              </div>
              <div className="space-y-2">
                <ChallengeItem
                  title="Phenolphthalein Endpoint"
                  description="Achieve an Accurate titration status (pH = 7) using Phenolphthalein and log it."
                  isCompleted={completedChallenges['chem-o1']}
                />
                <ChallengeItem
                  title="Methyl Orange Endpoint"
                  description="Achieve an Accurate titration status (pH = 7) using Methyl Orange and log it."
                  isCompleted={completedChallenges['chem-o2']}
                />
                <ChallengeItem
                  title="Exceed Equivalence"
                  description="Over-titrate the acid solution (NaOH > equivalence volume) and log it."
                  isCompleted={completedChallenges['chem-o3']}
                />
              </div>
            </div>
          )}

          {activeExp === 'biology_photosynthesis' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                <span>Photosynthesis Rate Challenges</span>
                <span>
                  {Object.keys(completedChallenges).filter(k => k.startsWith('bio') && completedChallenges[k]).length}/3 Done
                </span>
              </div>
              <div className="space-y-2">
                <ChallengeItem
                  title="Oxygen Bubble Surge"
                  description="Configure parameters to achieve a bubble rate of > 40 / min and log it."
                  isCompleted={completedChallenges['bio-o1']}
                />
                <ChallengeItem
                  title="Green Light Constraint"
                  description="Equip a green filter resulting in minimum absorption (bubbles < 5) and log it."
                  isCompleted={completedChallenges['bio-o2']}
                />
                <ChallengeItem
                  title="Enzymatic Cold Stop"
                  description="Set temperature to 10°C to limit photosynthetic activity and log it."
                  isCompleted={completedChallenges['bio-o3']}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observation Table Logs */}
      <Card className="flex flex-col border border-black/5 dark:border-white/5 shadow-md justify-between bg-slate-950 text-white">
        <CardHeader className="bg-slate-900 border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold">Logged Observation Journal</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">
                Recorded data points matching practical curriculum.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[9px] uppercase font-bold text-emerald-400 border-emerald-400/35">
              Class 10 logs
            </Badge>
          </div>
        </CardHeader>

        {/* Observation Table viewports */}
        <CardContent className="flex-grow py-4 overflow-auto min-h-[220px]">
          {activeExp === 'physics_lens' && (
            <Table className="border-white/5">
              <TableHeader>
                <TableRow className="hover:bg-slate-900/40 border-white/5">
                  <TableHead className="w-12 text-[10px]">No.</TableHead>
                  <TableHead className="text-[10px]">u (cm)</TableHead>
                  <TableHead className="text-[10px]">v (cm)</TableHead>
                  <TableHead className="text-[10px]">f (cm)</TableHead>
                  <TableHead className="text-[10px]">hO / hI</TableHead>
                  <TableHead className="text-[10px]">Nature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {physicsRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[10px] text-slate-400 py-10">
                      No measurements logged. Adjust lens parameters and record observations.
                    </TableCell>
                  </TableRow>
                ) : (
                  physicsRecords.map((rec) => (
                    <TableRow key={rec.id} className="text-[10px] font-mono hover:bg-slate-900/40 border-white/5">
                      <TableCell>{rec.serial}</TableCell>
                      <TableCell>{rec.u} cm</TableCell>
                      <TableCell>{rec.v === 999 ? 'Virtual' : `${rec.v} cm`}</TableCell>
                      <TableCell>{rec.f} cm</TableCell>
                      <TableCell>{rec.hO}/{rec.hI}</TableCell>
                      <TableCell className="font-semibold text-emerald-400">{rec.nature}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeExp === 'chemistry_titration' && (
            <Table className="border-white/5">
              <TableHeader>
                <TableRow className="hover:bg-slate-900/40 border-white/5">
                  <TableHead className="w-12 text-[10px]">Trial</TableHead>
                  <TableHead className="text-[10px]">Acid (mL)</TableHead>
                  <TableHead className="text-[10px]">Base (mL)</TableHead>
                  <TableHead className="text-[10px]">Max Temp</TableHead>
                  <TableHead className="text-[10px]">pH</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chemRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[10px] text-slate-400 py-10">
                      No titration records logged. Run burette flow and record observations.
                    </TableCell>
                  </TableRow>
                ) : (
                  chemRecords.map((rec) => (
                    <TableRow key={rec.id} className="text-[10px] font-mono hover:bg-slate-900/40 border-white/5">
                      <TableCell>{rec.trial}</TableCell>
                      <TableCell>{rec.hcl_vol} mL</TableCell>
                      <TableCell>{rec.v_base} mL</TableCell>
                      <TableCell>{rec.max_temp} °C</TableCell>
                      <TableCell>{rec.eq_ph}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[8px] font-bold py-0 px-1 rounded uppercase ${
                            rec.status === 'Accurate' ? 'bg-emerald-600 text-white' :
                            rec.status === 'Under-titrated' ? 'bg-slate-700 text-slate-300' :
                            'bg-rose-600 text-white'
                          }`}
                        >
                          {rec.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {activeExp === 'biology_photosynthesis' && (
            <Table className="border-white/5">
              <TableHeader>
                <TableRow className="hover:bg-slate-900/40 border-white/5">
                  <TableHead className="w-12 text-[10px]">No.</TableHead>
                  <TableHead className="text-[10px]">Dist (cm)</TableHead>
                  <TableHead className="text-[10px]">Filter</TableHead>
                  <TableHead className="text-[10px]">NaHCO3</TableHead>
                  <TableHead className="text-[10px]">Temp</TableHead>
                  <TableHead className="text-[10px]">Bubbles/Min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bioRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[10px] text-slate-400 py-10">
                      No observation readings logged. Adjust distance/temp parameters and record.
                    </TableCell>
                  </TableRow>
                ) : (
                  bioRecords.map((rec) => (
                    <TableRow key={rec.id} className="text-[10px] font-mono hover:bg-slate-900/40 border-white/5">
                      <TableCell>{rec.reading}</TableCell>
                      <TableCell>{rec.distance} cm</TableCell>
                      <TableCell className="uppercase">{rec.wavelength}</TableCell>
                      <TableCell>{rec.co2}%</TableCell>
                      <TableCell>{rec.temp}°C</TableCell>
                      <TableCell className="font-semibold text-emerald-400">{rec.bubbles}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Generate journal button */}
        <CardContent className="bg-slate-900 border-t border-white/5 p-4 space-y-3">
          <div className="rounded-lg border border-white/5 bg-slate-950 p-2.5 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldAlert className="size-3.5" />
              ICSE Board Compliance Notice:
            </span>
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Academic journals require at least 3 distinct observations, aim statement, formulas, calculations, and precautions. Keep logging until you satisfy these criteria.
            </p>
          </div>

          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-4 shadow-sm"
            onClick={generatePDFReport}
            disabled={
              (activeExp === 'physics_lens' && physicsRecords.length === 0) ||
              (activeExp === 'chemistry_titration' && chemRecords.length === 0) ||
              (activeExp === 'biology_photosynthesis' && bioRecords.length === 0)
            }
          >
            <FileDown className="size-4" />
            Forge & Export Lab Journal Report (PDF)
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}

function ChallengeItem({ title, description, isCompleted }: { title: string; description: string; isCompleted: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${isCompleted ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900/40 border-white/5'}`}>
      <div className={`size-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isCompleted ? 'bg-emerald-500 text-white' : 'border border-slate-600'}`}>
        {isCompleted && <CheckCircle className="size-3" />}
      </div>
      <div className="space-y-0.5 text-left">
        <p className={`text-[11px] font-semibold ${isCompleted ? 'text-emerald-400' : 'text-slate-200'}`}>
          {title}
        </p>
        <p className="text-[9px] text-slate-400 leading-normal">
          {description}
        </p>
      </div>
    </div>
  );
}

