"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";

// Periodic Table Data
const ELEMENTS = [
  { number: 1, mass: "1.0080", symbol: "H", name: "Hydrogen", category: "nonmetal" },
  { number: 2, mass: "4.00260", symbol: "He", name: "Helium", category: "noble gas" },
  { number: 3, mass: "7.0", symbol: "Li", name: "Lithium", category: "alkali metal" },
  { number: 4, mass: "9.012183", symbol: "Be", name: "Beryllium", category: "alkaline earth metal" },
  { number: 5, mass: "10.81", symbol: "B", name: "Boron", category: "metalloid" },
  { number: 6, mass: "12.011", symbol: "C", name: "Carbon", category: "nonmetal" },
  { number: 7, mass: "14.007", symbol: "N", name: "Nitrogen", category: "nonmetal" },
  { number: 8, mass: "15.999", symbol: "O", name: "Oxygen", category: "nonmetal" },
  { number: 9, mass: "18.99840316", symbol: "F", name: "Fluorine", category: "halogen" },
  { number: 10, mass: "20.180", symbol: "Ne", name: "Neon", category: "noble gas" },
  { number: 11, mass: "22.9897693", symbol: "Na", name: "Sodium", category: "alkali metal" },
  { number: 12, mass: "24.305", symbol: "Mg", name: "Magnesium", category: "alkaline earth metal" },
  { number: 13, mass: "26.981538", symbol: "Al", name: "Aluminum", category: "post-transition metal" },
  { number: 14, mass: "28.085", symbol: "Si", name: "Silicon", category: "metalloid" },
  { number: 15, mass: "30.97376200", symbol: "P", name: "Phosphorus", category: "nonmetal" },
  { number: 16, mass: "32.07", symbol: "S", name: "Sulfur", category: "nonmetal" },
  { number: 17, mass: "35.45", symbol: "Cl", name: "Chlorine", category: "halogen" },
  { number: 18, mass: "39.9", symbol: "Ar", name: "Argon", category: "noble gas" },
  { number: 19, mass: "39.0983", symbol: "K", name: "Potassium", category: "alkali metal" },
  { number: 20, mass: "40.08", symbol: "Ca", name: "Calcium", category: "alkaline earth metal" },
  { number: 21, mass: "44.95591", symbol: "Sc", name: "Scandium", category: "transition metal" },
  { number: 22, mass: "47.867", symbol: "Ti", name: "Titanium", category: "transition metal" },
  { number: 23, mass: "50.9415", symbol: "V", name: "Vanadium", category: "transition metal" },
  { number: 24, mass: "51.996", symbol: "Cr", name: "Chromium", category: "transition metal" },
  { number: 25, mass: "54.93804", symbol: "Mn", name: "Manganese", category: "transition metal" },
  { number: 26, mass: "55.84", symbol: "Fe", name: "Iron", category: "transition metal" },
  { number: 27, mass: "58.93319", symbol: "Co", name: "Cobalt", category: "transition metal" },
  { number: 28, mass: "58.693", symbol: "Ni", name: "Nickel", category: "transition metal" },
  { number: 29, mass: "63.55", symbol: "Cu", name: "Copper", category: "transition metal" },
  { number: 30, mass: "65.4", symbol: "Zn", name: "Zinc", category: "transition metal" },
  { number: 31, mass: "69.723", symbol: "Ga", name: "Gallium", category: "post-transition metal" },
  { number: 32, mass: "72.63", symbol: "Ge", name: "Germanium", category: "metalloid" },
  { number: 33, mass: "74.92159", symbol: "As", name: "Arsenic", category: "metalloid" },
  { number: 34, mass: "78.97", symbol: "Se", name: "Selenium", category: "nonmetal" },
  { number: 35, mass: "79.90", symbol: "Br", name: "Bromine", category: "halogen" },
  { number: 36, mass: "83.80", symbol: "Kr", name: "Krypton", category: "noble gas" },
  { number: 37, mass: "85.468", symbol: "Rb", name: "Rubidium", category: "alkali metal" },
  { number: 38, mass: "87.62", symbol: "Sr", name: "Strontium", category: "alkaline earth metal" },
  { number: 39, mass: "88.90584", symbol: "Y", name: "Yttrium", category: "transition metal" },
  { number: 40, mass: "91.22", symbol: "Zr", name: "Zirconium", category: "transition metal" },
  { number: 41, mass: "92.90637", symbol: "Nb", name: "Niobium", category: "transition metal" },
  { number: 42, mass: "95.95", symbol: "Mo", name: "Molybdenum", category: "transition metal" },
  { number: 43, mass: "96.90636", symbol: "Tc", name: "Technetium", category: "transition metal" },
  { number: 44, mass: "101.1", symbol: "Ru", name: "Ruthenium", category: "transition metal" },
  { number: 45, mass: "102.9055", symbol: "Rh", name: "Rhodium", category: "transition metal" },
  { number: 46, mass: "106.42", symbol: "Pd", name: "Palladium", category: "transition metal" },
  { number: 47, mass: "107.868", symbol: "Ag", name: "Silver", category: "transition metal" },
  { number: 48, mass: "112.41", symbol: "Cd", name: "Cadmium", category: "transition metal" },
  { number: 49, mass: "114.818", symbol: "In", name: "Indium", category: "post-transition metal" },
  { number: 50, mass: "118.71", symbol: "Sn", name: "Tin", category: "post-transition metal" },
  { number: 51, mass: "121.760", symbol: "Sb", name: "Antimony", category: "metalloid" },
  { number: 52, mass: "127.6", symbol: "Te", name: "Tellurium", category: "metalloid" },
  { number: 53, mass: "126.9045", symbol: "I", name: "Iodine", category: "halogen" },
  { number: 54, mass: "131.29", symbol: "Xe", name: "Xenon", category: "noble gas" },
  { number: 55, mass: "132.9054520", symbol: "Cs", name: "Cesium", category: "alkali metal" },
  { number: 56, mass: "137.33", symbol: "Ba", name: "Barium", category: "alkaline earth metal" },
  { number: 57, mass: "138.9055", symbol: "La", name: "Lanthanum", category: "lanthanide" },
  { number: 58, mass: "140.116", symbol: "Ce", name: "Cerium", category: "lanthanide" },
  { number: 59, mass: "140.90766", symbol: "Pr", name: "Praseodymium", category: "lanthanide" },
  { number: 60, mass: "144.24", symbol: "Nd", name: "Neodymium", category: "lanthanide" },
  { number: 61, mass: "144.91276", symbol: "Pm", name: "Promethium", category: "lanthanide" },
  { number: 62, mass: "150.4", symbol: "Sm", name: "Samarium", category: "lanthanide" },
  { number: 63, mass: "151.964", symbol: "Eu", name: "Europium", category: "lanthanide" },
  { number: 64, mass: "157.25", symbol: "Gd", name: "Gadolinium", category: "lanthanide" },
  { number: 65, mass: "158.92535", symbol: "Tb", name: "Terbium", category: "lanthanide" },
  { number: 66, mass: "162.500", symbol: "Dy", name: "Dysprosium", category: "lanthanide" },
  { number: 67, mass: "164.93033", symbol: "Ho", name: "Holmium", category: "lanthanide" },
  { number: 68, mass: "167.26", symbol: "Er", name: "Erbium", category: "lanthanide" },
  { number: 69, mass: "168.93422", symbol: "Tm", name: "Thulium", category: "lanthanide" },
  { number: 70, mass: "173.05", symbol: "Yb", name: "Ytterbium", category: "lanthanide" },
  { number: 71, mass: "174.9667", symbol: "Lu", name: "Lutetium", category: "lanthanide" },
  { number: 72, mass: "178.49", symbol: "Hf", name: "Hafnium", category: "transition metal" },
  { number: 73, mass: "180.9479", symbol: "Ta", name: "Tantalum", category: "transition metal" },
  { number: 74, mass: "183.84", symbol: "W", name: "Tungsten", category: "transition metal" },
  { number: 75, mass: "186.207", symbol: "Re", name: "Rhenium", category: "transition metal" },
  { number: 76, mass: "190.2", symbol: "Os", name: "Osmium", category: "transition metal" },
  { number: 77, mass: "192.22", symbol: "Ir", name: "Iridium", category: "transition metal" },
  { number: 78, mass: "195.08", symbol: "Pt", name: "Platinum", category: "transition metal" },
  { number: 79, mass: "196.96657", symbol: "Au", name: "Gold", category: "transition metal" },
  { number: 80, mass: "200.59", symbol: "Hg", name: "Mercury", category: "transition metal" },
  { number: 81, mass: "204.383", symbol: "Tl", name: "Thallium", category: "post-transition metal" },
  { number: 82, mass: "207", symbol: "Pb", name: "Lead", category: "post-transition metal" },
  { number: 83, mass: "208.98040", symbol: "Bi", name: "Bismuth", category: "post-transition metal" },
  { number: 84, mass: "208.98243", symbol: "Po", name: "Polonium", category: "metalloid" },
  { number: 85, mass: "209.98715", symbol: "At", name: "Astatine", category: "halogen" },
  { number: 86, mass: "222.01758", symbol: "Rn", name: "Radon", category: "noble gas" },
  { number: 87, mass: "223.01973", symbol: "Fr", name: "Francium", category: "alkali metal" },
  { number: 88, mass: "226.02541", symbol: "Ra", name: "Radium", category: "alkaline earth metal" },
  { number: 89, mass: "227.02775", symbol: "Ac", name: "Actinium", category: "actinide" },
  { number: 90, mass: "232.038", symbol: "Th", name: "Thorium", category: "actinide" },
  { number: 91, mass: "231.03588", symbol: "Pa", name: "Protactinium", category: "actinide" },
  { number: 92, mass: "238.0289", symbol: "U", name: "Uranium", category: "actinide" },
  { number: 93, mass: "237.048172", symbol: "Np", name: "Neptunium", category: "actinide" },
  { number: 94, mass: "244.06420", symbol: "Pu", name: "Plutonium", category: "actinide" },
  { number: 95, mass: "243.061380", symbol: "Am", name: "Americium", category: "actinide" },
  { number: 96, mass: "247.07035", symbol: "Cm", name: "Curium", category: "actinide" },
  { number: 97, mass: "247.07031", symbol: "Bk", name: "Berkelium", category: "actinide" },
  { number: 98, mass: "251.07959", symbol: "Cf", name: "Californium", category: "actinide" },
  { number: 99, mass: "252.0830", symbol: "Es", name: "Einsteinium", category: "actinide" },
  { number: 100, mass: "257.09511", symbol: "Fm", name: "Fermium", category: "actinide" },
  { number: 101, mass: "258.09843", symbol: "Md", name: "Mendelevium", category: "actinide" },
  { number: 102, mass: "259.10100", symbol: "No", name: "Nobelium", category: "actinide" },
  { number: 103, mass: "266.120", symbol: "Lr", name: "Lawrencium", category: "actinide" },
];

// 50 Questions with hints
const QUESTIONS = ELEMENTS.slice(0, 50).map((el) => ({
  element: el,
  hint: `${el.name} is a ${el.category} with atomic number ${el.number} and atomic mass ${el.mass}.`,
}));

// Element usage questions for card game
// Developer: AhmedEhab | Contact: ahmedehab2n5@gmail.com
const USAGE_QUESTIONS = [
  { element: "Titanium", question: "Which element is used in airplanes and spacecraft?", hint: "It's a strong, lightweight transition metal with atomic number 22" },
  { element: "Gold", question: "Which element is used in jewelry and electronics for its conductivity?", hint: "A precious yellow metal with atomic number 79" },
  { element: "Carbon", question: "Which element is the basis of all organic life?", hint: "Found in diamonds and graphite, atomic number 6" },
  { element: "Iron", question: "Which element is the main component of steel?", hint: "Essential for blood, atomic number 26" },
  { element: "Silicon", question: "Which element is used in computer chips?", hint: "A semiconductor, atomic number 14" },
  { element: "Aluminum", question: "Which lightweight metal is used in cans and foil?", hint: "Atomic number 13, abundant in Earth's crust" },
  { element: "Copper", question: "Which element is used in electrical wiring?", hint: "Excellent conductor, atomic number 29" },
  { element: "Mercury", question: "Which element is liquid at room temperature?", hint: "Used in thermometers, atomic number 80" },
  { element: "Uranium", question: "Which element is used in nuclear power?", hint: "Radioactive, atomic number 92" },
  { element: "Oxygen", question: "Which element do we breathe to survive?", hint: "Essential for respiration, atomic number 8" },
  { element: "Helium", question: "Which element is used in balloons?", hint: "Lightest noble gas, atomic number 2" },
  { element: "Neon", question: "Which element is used in neon signs?", hint: "Glows red-orange in tubes, atomic number 10" },
  { element: "Calcium", question: "Which element is essential for strong bones?", hint: "Found in milk, atomic number 20" },
  { element: "Sodium", question: "Which element is in table salt?", hint: "Reactive alkali metal, atomic number 11" },
  { element: "Chlorine", question: "Which element is used to disinfect water?", hint: "Greenish gas, atomic number 17" },
  { element: "Silver", question: "Which element is used in photography and jewelry?", hint: "Best conductor of heat, atomic number 47" },
  { element: "Platinum", question: "Which precious metal is used in catalytic converters?", hint: "Very resistant to corrosion, atomic number 78" },
  { element: "Lead", question: "Which heavy metal was used in pencils?", hint: "Actually used in batteries, atomic number 82" },
  { element: "Zinc", question: "Which element is used to galvanize steel?", hint: "Essential trace mineral, atomic number 30" },
  { element: "Nickel", question: "Which element is used in coins and stainless steel?", hint: "Atomic number 28" },
  { element: "Chromium", question: "Which element gives stainless steel its shine?", hint: "Atomic number 24" },
  { element: "Tungsten", question: "Which element has the highest melting point?", hint: "Used in light bulb filaments, atomic number 74" },
  { element: "Lithium", question: "Which element is used in rechargeable batteries?", hint: "Lightest metal, atomic number 3" },
  { element: "Cobalt", question: "Which element is used in blue pigments and batteries?", hint: "Atomic number 27" },
  { element: "Magnesium", question: "Which element burns with a bright white flame?", hint: "Used in flares, atomic number 12" },
  { element: "Sulfur", question: "Which yellow element smells like rotten eggs?", hint: "Atomic number 16" },
  { element: "Phosphorus", question: "Which element is used in matches?", hint: "Glows in the dark, atomic number 15" },
  { element: "Nitrogen", question: "Which element makes up 78% of Earth's atmosphere?", hint: "Essential for proteins, atomic number 7" },
  { element: "Fluorine", question: "Which element is used in toothpaste?", hint: "Most reactive nonmetal, atomic number 9" },
  { element: "Argon", question: "Which noble gas is used in light bulbs?", hint: "Third most abundant gas in atmosphere, atomic number 18" },
  { element: "Potassium", question: "Which element is essential for nerve function?", hint: "Found in bananas, atomic number 19" },
  { element: "Hydrogen", question: "Which is the most abundant element in the universe?", hint: "Fuel for stars, atomic number 1" },
  { element: "Boron", question: "Which element is used in fiberglass and detergents?", hint: "Atomic number 5" },
  { element: "Beryllium", question: "Which lightweight element is used in aerospace?", hint: "Toxic metal, atomic number 4" },
  { element: "Scandium", question: "Which element is used in high-performance sports equipment?", hint: "Atomic number 21" },
  { element: "Vanadium", question: "Which element strengthens steel?", hint: "Atomic number 23" },
  { element: "Manganese", question: "Which element is essential for steel production?", hint: "Atomic number 25" },
  { element: "Gallium", question: "Which metal melts in your hand?", hint: "Used in semiconductors, atomic number 31" },
  { element: "Germanium", question: "Which element was used in early transistors?", hint: "Semiconductor, atomic number 32" },
  { element: "Arsenic", question: "Which toxic element was historically used as poison?", hint: "Metalloid, atomic number 33" },
  { element: "Selenium", question: "Which element is essential in small amounts for health?", hint: "Used in photocopiers, atomic number 34" },
  { element: "Bromine", question: "Which element is the only liquid nonmetal at room temperature?", hint: "Red-brown liquid, atomic number 35" },
  { element: "Krypton", question: "Which noble gas is used in high-performance lighting?", hint: "Superman's home planet, atomic number 36" },
  { element: "Rubidium", question: "Which element ignites spontaneously in air?", hint: "Alkali metal, atomic number 37" },
  { element: "Strontium", question: "Which element gives red color to fireworks?", hint: "Atomic number 38" },
  { element: "Yttrium", question: "Which element is used in LEDs and lasers?", hint: "Atomic number 39" },
  { element: "Zirconium", question: "Which element is used in nuclear reactors?", hint: "Atomic number 40" },
  { element: "Niobium", question: "Which element is used in superconducting magnets?", hint: "Atomic number 41" },
  { element: "Molybdenum", question: "Which element is essential for enzyme function?", hint: "Used in high-strength steel, atomic number 42" },
  { element: "Technetium", question: "Which is the first artificially produced element?", hint: "Radioactive, atomic number 43" },
  { element: "Ruthenium", question: "Which element is used in electronics and catalysis?", hint: "Rare transition metal, atomic number 44" },
  { element: "Rhodium", question: "Which precious metal is the most expensive?", hint: "Used in catalytic converters, atomic number 45" },
  { element: "Palladium", question: "Which element is used in hydrogen fuel cells?", hint: "Atomic number 46" },
  { element: "Cadmium", question: "Which toxic element is used in rechargeable batteries?", hint: "Atomic number 48" },
  { element: "Indium", question: "Which element is used in touch screens?", hint: "Atomic number 49" },
  { element: "Tin", question: "Which element is used in solder?", hint: "Atomic number 50" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "nonmetal": "from-green-400 to-green-600",
  "noble gas": "from-purple-400 to-purple-600",
  "alkali metal": "from-red-400 to-red-600",
  "alkaline earth metal": "from-orange-400 to-orange-600",
  "metalloid": "from-yellow-400 to-yellow-600",
  "halogen": "from-pink-400 to-pink-600",
  "transition metal": "from-blue-400 to-blue-600",
  "post-transition metal": "from-cyan-400 to-cyan-600",
  "lanthanide": "from-indigo-400 to-indigo-600",
  "actinide": "from-rose-400 to-rose-600",
};

export default function ChemistryPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"element" | "usage">("element");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [currentQuestion, setCurrentQuestion] = useState<typeof QUESTIONS[0] | typeof USAGE_QUESTIONS[0] | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showHint, setShowHint] = useState(false);
  const [draggedElement, setDraggedElement] = useState<typeof ELEMENTS[0] | null>(null);
  const [questionProbabilities, setQuestionProbabilities] = useState<number[]>(
    QUESTIONS.map(() => 1)
  );
  const [usageQuestionProbabilities, setUsageQuestionProbabilities] = useState<number[]>(
    USAGE_QUESTIONS.map(() => 1)
  );
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const selectRandomQuestion = useCallback(() => {
    if (gameMode === "element") {
      const availableIndices = questionProbabilities
        .map((prob, idx) => ({ prob, idx }))
        .filter(({ prob }) => prob > 0);

      if (availableIndices.length === 0) {
        setQuestionProbabilities(QUESTIONS.map(() => 1));
        setAnsweredQuestions(new Set());
        return QUESTIONS[0];
      }

      const totalProb = availableIndices.reduce((sum, { prob }) => sum + prob, 0);
      let random = Math.random() * totalProb;
      let selectedIndex = availableIndices[0].idx;

      for (const { prob, idx } of availableIndices) {
        random -= prob;
        if (random <= 0) {
          selectedIndex = idx;
          break;
        }
      }

      return QUESTIONS[selectedIndex];
    } else {
      const availableIndices = usageQuestionProbabilities
        .map((prob, idx) => ({ prob, idx }))
        .filter(({ prob }) => prob > 0);

      if (availableIndices.length === 0) {
        setUsageQuestionProbabilities(USAGE_QUESTIONS.map(() => 1));
        setAnsweredQuestions(new Set());
        return USAGE_QUESTIONS[0];
      }

      const totalProb = availableIndices.reduce((sum, { prob }) => sum + prob, 0);
      let random = Math.random() * totalProb;
      let selectedIndex = availableIndices[0].idx;

      for (const { prob, idx } of availableIndices) {
        random -= prob;
        if (random <= 0) {
          selectedIndex = idx;
          break;
        }
      }

      return USAGE_QUESTIONS[selectedIndex];
    }
  }, [questionProbabilities, usageQuestionProbabilities, gameMode]);

  const startGame = (mode: "element" | "usage", diff: "easy" | "medium" | "hard") => {
    setGameMode(mode);
    setDifficulty(diff);
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    
    // Set time based on difficulty
    const timeMap = { easy: 45, medium: 30, hard: 15 };
    setTimeLeft(timeMap[diff]);
    
    setShowHint(false);
    setAnsweredQuestions(new Set());
    setQuestionProbabilities(QUESTIONS.map(() => 1));
    setUsageQuestionProbabilities(USAGE_QUESTIONS.map(() => 1));
    
    // Select question based on mode
    const question = mode === "element" 
      ? QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]
      : USAGE_QUESTIONS[Math.floor(Math.random() * USAGE_QUESTIONS.length)];
    setCurrentQuestion(question);
  };

  const nextQuestion = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const probabilities = gameMode === "element" ? questionProbabilities : usageQuestionProbabilities;
    const availableIndices = probabilities
      .map((prob, idx) => ({ prob, idx }))
      .filter(({ prob }) => prob > 0);

    if (availableIndices.length === 0) {
      // Game over - all questions answered
      setGameStarted(false);
      setGameOver(true);
      setFinalScore(score);
      setCurrentQuestion(null);
      return;
    }

    const question = selectRandomQuestion();
    setCurrentQuestion(question);
    
    const timeMap = { easy: 45, medium: 30, hard: 15 };
    setTimeLeft(timeMap[difficulty]);
    setShowHint(false);
  }, [questionProbabilities, usageQuestionProbabilities, gameMode, difficulty, score, selectRandomQuestion]);

  useEffect(() => {
    if (gameStarted && currentQuestion && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - lose points
            setScore((s) => s - 10);
            nextQuestion();
            // Reset time based on difficulty
            const timeMap = { easy: 45, medium: 30, hard: 15 };
            return timeMap[difficulty];
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, currentQuestion, timeLeft, nextQuestion, difficulty]);

  const handleDrop = (element: typeof ELEMENTS[0]) => {
    if (!currentQuestion) return;

    if (gameMode === "element") {
      const question = currentQuestion as typeof QUESTIONS[0];
      if (element.number === question.element.number) {
        // Correct answer
        const timeBonus = Math.floor(timeLeft / 2);
        setScore((s) => s + 10 + timeBonus);
        
        const newProbabilities = [...questionProbabilities];
        const questionIndex = QUESTIONS.findIndex(
          (q) => q.element.number === question.element.number
        );
        newProbabilities[questionIndex] = Math.max(0, newProbabilities[questionIndex] - 0.5);
        setQuestionProbabilities(newProbabilities);
        
        setAnsweredQuestions((prev) => new Set([...prev, questionIndex]));
        
        nextQuestion();
      } else {
        setScore((s) => s - 5);
      }
    } else {
      const question = currentQuestion as typeof USAGE_QUESTIONS[0];
      if (element.name === question.element) {
        // Correct answer
        const timeBonus = Math.floor(timeLeft / 2);
        setScore((s) => s + 10 + timeBonus);
        
        const newProbabilities = [...usageQuestionProbabilities];
        const questionIndex = USAGE_QUESTIONS.findIndex(
          (q) => q.element === question.element
        );
        newProbabilities[questionIndex] = Math.max(0, newProbabilities[questionIndex] - 0.5);
        setUsageQuestionProbabilities(newProbabilities);
        
        setAnsweredQuestions((prev) => new Set([...prev, questionIndex]));
        
        nextQuestion();
      } else {
        setScore((s) => s - 5);
      }
    }
    setDraggedElement(null);
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || "from-gray-400 to-gray-600";
  };

  // Periodic table layout - exact grid positions [col, row]
  const getGridPosition = (number: number) => {
    const positions: Record<number, { col: number; row: number }> = {
      // Period 1
      1: { col: 1, row: 1 },   // H
      2: { col: 18, row: 1 },  // He
      
      // Period 2
      3: { col: 1, row: 2 },   // Li
      4: { col: 2, row: 2 },   // Be
      5: { col: 13, row: 2 },  // B
      6: { col: 14, row: 2 },  // C
      7: { col: 15, row: 2 },  // N
      8: { col: 16, row: 2 },  // O
      9: { col: 17, row: 2 },  // F
      10: { col: 18, row: 2 }, // Ne
      
      // Period 3
      11: { col: 1, row: 3 },  // Na
      12: { col: 2, row: 3 },  // Mg
      13: { col: 13, row: 3 }, // Al
      14: { col: 14, row: 3 }, // Si
      15: { col: 15, row: 3 }, // P
      16: { col: 16, row: 3 }, // S
      17: { col: 17, row: 3 }, // Cl
      18: { col: 18, row: 3 }, // Ar
      
      // Period 4
      19: { col: 1, row: 4 },  // K
      20: { col: 2, row: 4 },  // Ca
      21: { col: 3, row: 4 },  // Sc
      22: { col: 4, row: 4 },  // Ti
      23: { col: 5, row: 4 },  // V
      24: { col: 6, row: 4 },  // Cr
      25: { col: 7, row: 4 },  // Mn
      26: { col: 8, row: 4 },  // Fe
      27: { col: 9, row: 4 },  // Co
      28: { col: 10, row: 4 }, // Ni
      29: { col: 11, row: 4 }, // Cu
      30: { col: 12, row: 4 }, // Zn
      31: { col: 13, row: 4 }, // Ga
      32: { col: 14, row: 4 }, // Ge
      33: { col: 15, row: 4 }, // As
      34: { col: 16, row: 4 }, // Se
      35: { col: 17, row: 4 }, // Br
      36: { col: 18, row: 4 }, // Kr
      
      // Period 5
      37: { col: 1, row: 5 },  // Rb
      38: { col: 2, row: 5 },  // Sr
      39: { col: 3, row: 5 },  // Y
      40: { col: 4, row: 5 },  // Zr
      41: { col: 5, row: 5 },  // Nb
      42: { col: 6, row: 5 },  // Mo
      43: { col: 7, row: 5 },  // Tc
      44: { col: 8, row: 5 },  // Ru
      45: { col: 9, row: 5 },  // Rh
      46: { col: 10, row: 5 }, // Pd
      47: { col: 11, row: 5 }, // Ag
      48: { col: 12, row: 5 }, // Cd
      49: { col: 13, row: 5 }, // In
      50: { col: 14, row: 5 }, // Sn
      51: { col: 15, row: 5 }, // Sb
      52: { col: 16, row: 5 }, // Te
      53: { col: 17, row: 5 }, // I
      54: { col: 18, row: 5 }, // Xe
      
      // Period 6
      55: { col: 1, row: 6 },  // Cs
      56: { col: 2, row: 6 },  // Ba
      57: { col: 3, row: 6 },  // La
      72: { col: 4, row: 6 },  // Hf
      73: { col: 5, row: 6 },  // Ta
      74: { col: 6, row: 6 },  // W
      75: { col: 7, row: 6 },  // Re
      76: { col: 8, row: 6 },  // Os
      77: { col: 9, row: 6 },  // Ir
      78: { col: 10, row: 6 }, // Pt
      79: { col: 11, row: 6 }, // Au
      80: { col: 12, row: 6 }, // Hg
      81: { col: 13, row: 6 }, // Tl
      82: { col: 14, row: 6 }, // Pb
      83: { col: 15, row: 6 }, // Bi
      84: { col: 16, row: 6 }, // Po
      85: { col: 17, row: 6 }, // At
      86: { col: 18, row: 6 }, // Rn
      
      // Period 7
      87: { col: 1, row: 7 },  // Fr
      88: { col: 2, row: 7 },  // Ra
      89: { col: 3, row: 7 },  // Ac
      104: { col: 4, row: 7 }, // Rf
      105: { col: 5, row: 7 }, // Db
      106: { col: 6, row: 7 }, // Sg
      107: { col: 7, row: 7 }, // Bh
      108: { col: 8, row: 7 }, // Hs
      109: { col: 9, row: 7 }, // Mt
      110: { col: 10, row: 7 }, // Ds
      111: { col: 11, row: 7 }, // Rg
      112: { col: 12, row: 7 }, // Cn
      113: { col: 13, row: 7 }, // Nh
      114: { col: 14, row: 7 }, // Fl
      115: { col: 15, row: 7 }, // Mc
      116: { col: 16, row: 7 }, // Lv
      117: { col: 17, row: 7 }, // Ts
      118: { col: 18, row: 7 }, // Og
      
      // Lanthanoids (row 9)
      58: { col: 3, row: 9 },  // Ce
      59: { col: 4, row: 9 },  // Pr
      60: { col: 5, row: 9 },  // Nd
      61: { col: 6, row: 9 },  // Pm
      62: { col: 7, row: 9 },  // Sm
      63: { col: 8, row: 9 },  // Eu
      64: { col: 9, row: 9 },  // Gd
      65: { col: 10, row: 9 }, // Tb
      66: { col: 11, row: 9 }, // Dy
      67: { col: 12, row: 9 }, // Ho
      68: { col: 13, row: 9 }, // Er
      69: { col: 14, row: 9 }, // Tm
      70: { col: 15, row: 9 }, // Yb
      71: { col: 16, row: 9 }, // Lu
      
      // Actinoids (row 10)
      90: { col: 3, row: 10 }, // Th
      91: { col: 4, row: 10 }, // Pa
      92: { col: 5, row: 10 }, // U
      93: { col: 6, row: 10 }, // Np
      94: { col: 7, row: 10 }, // Pu
      95: { col: 8, row: 10 }, // Am
      96: { col: 9, row: 10 }, // Cm
      97: { col: 10, row: 10 }, // Bk
      98: { col: 11, row: 10 }, // Cf
      99: { col: 12, row: 10 }, // Es
      100: { col: 13, row: 10 }, // Fm
      101: { col: 14, row: 10 }, // Md
      102: { col: 15, row: 10 }, // No
      103: { col: 16, row: 10 }, // Lr
    };
    
    return positions[number] || { col: 1, row: 1 };
  };

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={{ name: "", role: "student" }} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/environments"
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              العودة للبيئات
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-4xl">🧪</div>
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white">الكيمياء</h1>
                <p className="text-gray-500 dark:text-gray-400">لعبة الجدول الدوري</p>
              </div>
            </div>
          </motion.div>

          {!gameStarted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-8"
            >
              {gameOver ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100 dark:border-gray-700">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">انتهت اللعبة!</h2>
                  <div className="text-5xl font-black text-green-500 mb-4">{finalScore}</div>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">النقاط النهائية</p>
                  <motion.button
                    onClick={() => {
                      setGameOver(false);
                      setScore(0);
                      setCurrentQuestion(null);
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    العودة للقائمة
                  </motion.button>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100 dark:border-gray-700">
                  <div className="text-6xl mb-4">🎮</div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">لعبة العناصر الكيميائية</h2>
                  
                  {/* Game Mode Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">اختر نوع اللعبة</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        onClick={() => setGameMode("element")}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          gameMode === "element"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-3xl mb-2">🔬</div>
                        <div className="font-bold text-gray-900 dark:text-white">البحث عن العنصر</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ابحث عن العنصر بالاسم</div>
                      </motion.button>
                      <motion.button
                        onClick={() => setGameMode("usage")}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          gameMode === "usage"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-3xl mb-2">💡</div>
                        <div className="font-bold text-gray-900 dark:text-white">استخدامات العناصر</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">حدد العنصر من الاستخدام</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">اختر الصعوبة</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {["easy", "medium", "hard"].map((diff) => (
                        <motion.button
                          key={diff}
                          onClick={() => setDifficulty(diff as "easy" | "medium" | "hard")}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            difficulty === diff
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="font-bold text-gray-900 dark:text-white">
                            {diff === "easy" ? "سهل" : diff === "medium" ? "متوسط" : "صعب"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {diff === "easy" ? "45 ثانية" : diff === "medium" ? "30 ثانية" : "15 ثانية"}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {gameMode === "element" 
                      ? "اسحب العنصر المطلوب من الجدول الدوري وضعه في المنطقة المخصصة قبل انتهاء الوقت!"
                      : "اسحب العنصر المناسب للسؤال من الجدول الدوري!"
                    }
                  </p>
                  <ul className="text-right text-gray-600 dark:text-gray-400 mb-8 space-y-2">
                    <li>• كل إجابة صحيحة = +10 نقاط + مكافأة الوقت</li>
                    <li>• كل إجابة خاطئة = -5 نقاط</li>
                    <li>• انتهاء الوقت = -10 نقاط</li>
                    <li>• استخدم زر المساعدة للتعلم</li>
                  </ul>
                  <motion.button
                    onClick={() => startGame(gameMode, difficulty)}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity text-lg w-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ابدأ اللعبة
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Game Stats */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-2 sm:gap-4"
              >
                <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{score}</div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">النقاط</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700">
                  <div className={`text-2xl sm:text-3xl font-black ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {timeLeft}s
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">الوقت المتبقي</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                    {answeredQuestions.size}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">الأسئلة المجابة</div>
                </div>
              </motion.div>

              {/* Current Question */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                    {gameMode === "element" 
                      ? `ابحث عن: ${(currentQuestion as typeof QUESTIONS[0])?.element.name}`
                      : (currentQuestion as typeof USAGE_QUESTIONS[0])?.question
                    }
                  </h3>
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    className="px-3 sm:px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    💡 مساعدة
                  </motion.button>
                </div>
                <AnimatePresence>
                  {showHint && currentQuestion && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 text-blue-700 dark:text-blue-300 text-sm"
                    >
                      {currentQuestion.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Drop Zone */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center border-4 border-dashed border-green-300 dark:border-green-600"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedElement) {
                    handleDrop(draggedElement);
                  }
                }}
              >
                <div className="text-white text-lg sm:text-2xl font-bold mb-2">
                  {draggedElement ? `اسقط ${draggedElement.name} هنا` : "اسحب العنصر هنا"}
                </div>
                <div className="text-white/80 text-xs sm:text-sm">
                  {gameMode === "element" 
                    ? (currentQuestion as typeof QUESTIONS[0])?.element.name
                    : (currentQuestion as typeof USAGE_QUESTIONS[0])?.element
                  }
                </div>
              </motion.div>

              {/* Periodic Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 overflow-x-auto"
              >
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: "repeat(18, minmax(40px, 1fr))",
                  minWidth: "720px"
                }} dir="ltr">
                  {ELEMENTS.map((element) => {
                    const pos = getGridPosition(element.number);
                    return (
                      <motion.div
                        key={element.number}
                        style={{
                          gridColumn: pos.col,
                          gridRow: pos.row,
                        }}
                        draggable
                        onDragStart={() => setDraggedElement(element)}
                        onDragEnd={() => setDraggedElement(null)}
                        className={`relative p-1 sm:p-2 rounded-lg cursor-grab active:cursor-grabbing bg-gradient-to-br ${getCategoryColor(element.category)} text-white shadow-md hover:shadow-lg hover:scale-105 transition-all`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(element)}
                      >
                        <div className="text-[10px] sm:text-xs font-bold">{element.number}</div>
                        <div className="text-sm sm:text-lg font-black">{element.symbol}</div>
                        <div className="text-[8px] sm:text-xs truncate hidden sm:block">{element.name}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* End Game Button */}
              <motion.button
                onClick={() => setGameStarted(false)}
                className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                إنهاء اللعبة
              </motion.button>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}
