"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { fetchMeWithRetry, type MeUser } from "@/lib/fetch-me";
import {
  updateIQ, getIQData, getRecommendedDifficulty, vibrate,
  SKILL_LABELS, SKILL_COLORS, SUBJECT_SKILLS,
  levelToDifficulty, difficultyToStartLevel, levelToTimer,
  type Difficulty, type IQData, type GameResult,
} from "@/lib/iq-system";

// Periodic Table Data
const ELEMENTS = [
  { number: 1, mass: "1.008", symbol: "H", name: "Hydrogen", category: "nonmetal" },
  { number: 2, mass: "4.002", symbol: "He", name: "Helium", category: "noble gas" },
  { number: 3, mass: "6.94", symbol: "Li", name: "Lithium", category: "alkali metal" },
  { number: 4, mass: "9.012", symbol: "Be", name: "Beryllium", category: "alkaline earth metal" },
  { number: 5, mass: "10.81", symbol: "B", name: "Boron", category: "metalloid" },
  { number: 6, mass: "12.011", symbol: "C", name: "Carbon", category: "nonmetal" },
  { number: 7, mass: "14.007", symbol: "N", name: "Nitrogen", category: "nonmetal" },
  { number: 8, mass: "15.999", symbol: "O", name: "Oxygen", category: "nonmetal" },
  { number: 9, mass: "18.998", symbol: "F", name: "Fluorine", category: "halogen" },
  { number: 10, mass: "20.18", symbol: "Ne", name: "Neon", category: "noble gas" },
  { number: 11, mass: "22.99", symbol: "Na", name: "Sodium", category: "alkali metal" },
  { number: 12, mass: "24.305", symbol: "Mg", name: "Magnesium", category: "alkaline earth metal" },
  { number: 13, mass: "26.982", symbol: "Al", name: "Aluminum", category: "post-transition metal" },
  { number: 14, mass: "28.085", symbol: "Si", name: "Silicon", category: "metalloid" },
  { number: 15, mass: "30.974", symbol: "P", name: "Phosphorus", category: "nonmetal" },
  { number: 16, mass: "32.06", symbol: "S", name: "Sulfur", category: "nonmetal" },
  { number: 17, mass: "35.45", symbol: "Cl", name: "Chlorine", category: "halogen" },
  { number: 18, mass: "39.948", symbol: "Ar", name: "Argon", category: "noble gas" },
  { number: 19, mass: "39.098", symbol: "K", name: "Potassium", category: "alkali metal" },
  { number: 20, mass: "40.078", symbol: "Ca", name: "Calcium", category: "alkaline earth metal" },
  { number: 21, mass: "44.956", symbol: "Sc", name: "Scandium", category: "transition metal" },
  { number: 22, mass: "47.867", symbol: "Ti", name: "Titanium", category: "transition metal" },
  { number: 23, mass: "50.942", symbol: "V", name: "Vanadium", category: "transition metal" },
  { number: 24, mass: "51.996", symbol: "Cr", name: "Chromium", category: "transition metal" },
  { number: 25, mass: "54.938", symbol: "Mn", name: "Manganese", category: "transition metal" },
  { number: 26, mass: "55.845", symbol: "Fe", name: "Iron", category: "transition metal" },
  { number: 27, mass: "58.933", symbol: "Co", name: "Cobalt", category: "transition metal" },
  { number: 28, mass: "58.693", symbol: "Ni", name: "Nickel", category: "transition metal" },
  { number: 29, mass: "63.546", symbol: "Cu", name: "Copper", category: "transition metal" },
  { number: 30, mass: "65.38", symbol: "Zn", name: "Zinc", category: "transition metal" },
  { number: 31, mass: "69.723", symbol: "Ga", name: "Gallium", category: "post-transition metal" },
  { number: 32, mass: "72.63", symbol: "Ge", name: "Germanium", category: "metalloid" },
  { number: 33, mass: "74.922", symbol: "As", name: "Arsenic", category: "metalloid" },
  { number: 34, mass: "78.971", symbol: "Se", name: "Selenium", category: "nonmetal" },
  { number: 35, mass: "79.904", symbol: "Br", name: "Bromine", category: "halogen" },
  { number: 36, mass: "83.798", symbol: "Kr", name: "Krypton", category: "noble gas" },
  { number: 37, mass: "85.468", symbol: "Rb", name: "Rubidium", category: "alkali metal" },
  { number: 38, mass: "87.62", symbol: "Sr", name: "Strontium", category: "alkaline earth metal" },
  { number: 39, mass: "88.906", symbol: "Y", name: "Yttrium", category: "transition metal" },
  { number: 40, mass: "91.224", symbol: "Zr", name: "Zirconium", category: "transition metal" },
  { number: 41, mass: "92.906", symbol: "Nb", name: "Niobium", category: "transition metal" },
  { number: 42, mass: "95.95", symbol: "Mo", name: "Molybdenum", category: "transition metal" },
  { number: 43, mass: "98", symbol: "Tc", name: "Technetium", category: "transition metal" },
  { number: 44, mass: "101.07", symbol: "Ru", name: "Ruthenium", category: "transition metal" },
  { number: 45, mass: "102.91", symbol: "Rh", name: "Rhodium", category: "transition metal" },
  { number: 46, mass: "106.42", symbol: "Pd", name: "Palladium", category: "transition metal" },
  { number: 47, mass: "107.87", symbol: "Ag", name: "Silver", category: "transition metal" },
  { number: 48, mass: "112.41", symbol: "Cd", name: "Cadmium", category: "transition metal" },
  { number: 49, mass: "114.82", symbol: "In", name: "Indium", category: "post-transition metal" },
  { number: 50, mass: "118.71", symbol: "Sn", name: "Tin", category: "post-transition metal" },
  { number: 51, mass: "121.76", symbol: "Sb", name: "Antimony", category: "metalloid" },
  { number: 52, mass: "127.6", symbol: "Te", name: "Tellurium", category: "metalloid" },
  { number: 53, mass: "126.9", symbol: "I", name: "Iodine", category: "halogen" },
  { number: 54, mass: "131.29", symbol: "Xe", name: "Xenon", category: "noble gas" },
  { number: 55, mass: "132.91", symbol: "Cs", name: "Cesium", category: "alkali metal" },
  { number: 56, mass: "137.33", symbol: "Ba", name: "Barium", category: "alkaline earth metal" }
];

// Element usage facts (clues for usage game mode)
const USAGE_QUESTIONS = [
  { element: "Titanium", symbol: "Ti", question: "أي عنصر يستخدم على نطاق واسع في هياكل الطائرات والمركبات الفضائية لصلابته وخفته؟", hint: "فلز انتقالي خفيف وقوي، عدده الذري 22" },
  { element: "Gold", symbol: "Au", question: "أي عنصر يستخدم في الحلي والمجوهرات لبريقة ومقاومته للصدأ؟", hint: "فلز ثمين أصفر اللون، عدده الذري 79" },
  { element: "Carbon", symbol: "C", question: "عنصر يشكل أساس الحياة العضوية على كوكب الأرض ويوجد في الجرافيت والألماس؟", hint: "عدده الذري 6، وهو لافلز رئيسي" },
  { element: "Iron", symbol: "Fe", question: "أي عنصر يعد المكون الأساسي لصناعة الفولاذ والحديد الصلب؟", hint: "هام لنقل الأكسجين في الدم، عدده الذري 26" },
  { element: "Silicon", symbol: "Si", question: "أي شبه فلز يستخدم في صناعة الشرائح الإلكترونية وأشباه الموصلات؟", hint: "عدده الذري 14، ويتواجد بكثرة في الرمل" },
  { element: "Aluminum", symbol: "Al", question: "أي فلز خفيف الوزن يستخدم في صناعة عبوات المشروبات ورقائق المطبخ؟", hint: "عدده الذري 13، وفير جداً في القشرة الأرضية" },
  { element: "Copper", symbol: "Cu", question: "عنصر كيميائي يتميز بناقليته العالية للكهرباء ويستخدم في الأسلاك الكهربائية؟", hint: "فلز انتقالي لونه بني محمر، عدده الذري 29" },
  { element: "Mercury", symbol: "Hg", question: "أي عنصر فلزي يكون سائلاً في درجة حرارة الغرفة وكان يستخدم في مقاييس الحرارة؟", hint: "فلز ثقيل وسام جداً، عدده الذري 80" },
  { element: "Oxygen", symbol: "O", question: "غاز لا غنى عنه لتنفس الكائنات الحية ويشكل حوالي 21% من الهواء؟", hint: "لافلز نشط كيميائياً، عدده الذري 8" },
  { element: "Helium", symbol: "He", question: "غاز خامل وخفيف جداً يستخدم في ملء بالونات الطيران والمناطيد؟", hint: "أول الغازات النبيلة في الجدول، عدده الذري 2" },
  { element: "Calcium", symbol: "Ca", question: "عنصر ضروري جداً لبناء عظام وأسنان قوية ويتواجد بكثرة في الحليب؟", hint: "فلز قلوي ترابي، عدده الذري 20" },
  { element: "Sodium", symbol: "Na", question: "عنصر يتفاعل بشدة مع الماء، وهو أحد مكونات ملح الطعام الكيميائية؟", hint: "فلز قلوي نشط جداً، عدده الذري 11" },
  { element: "Chlorine", question: "غاز أصفر مخضر يستخدم لتعقيم مياه الشرب والمسابح؟", symbol: "Cl", hint: "من الهالوجينات السامة، عدده الذري 17" },
  { element: "Silver", symbol: "Ag", question: "فلز أبيض ثمين يعتبر أفضل موصل للكهرباء والحرارة على الإطلاق؟", hint: "عدده الذري 47، ويستخدم في صناعة المرايا والمجوهرات" },
  { element: "Tungsten", symbol: "W", question: "عنصر يتميز بأعلى درجة انصهار بين الفلزات، ويستخدم في فتايل المصابيح الكهربائية؟", hint: "يسمى أيضاً وولفرام، عدده الذري 74" },
  { element: "Lithium", symbol: "Li", question: "أخف الفلزات وزناً، ويستخدم بشكل أساسي في صناعة بطاريات الهواتف والسيارات؟", hint: "أول الفلزات القلوية، عدده الذري 3" },
  { element: "Nitrogen", symbol: "N", question: "غاز يشكل الغالبية العظمى من غلاف الأرض الجوي بنسبة 78%؟", hint: "لافلز عديم اللون والرائحة، عدده الذري 7" },
  { element: "Fluorine", symbol: "F", question: "عنصر هالوجيني شديد التفاعل يضاف إلى معجون الأسنان لحمايتها من التسوس؟", hint: "أعلى العناصر كهروسالبية، عدده الذري 9" },
  { element: "Iodine", symbol: "I", question: "عنصر لافلي داكن من الهالوجينات يستخدم مطهراً للجروح والعمليات الجراحية؟", hint: "يتسامى متحولاً لبخار بنفسجي، عدده الذري 53" },
  { element: "Argon", symbol: "Ar", question: "غاز خامل يستخدم لملء المصابيح الكهربائية لمنع تأكسد الفتيل؟", hint: "ثالث أكثر الغازات وفرة في الغلاف الجوي، عدده الذري 18" }
];

const CATEGORY_COLORS: Record<string, string> = {
  "nonmetal": "from-emerald-400 to-emerald-600",
  "noble gas": "from-purple-400 to-purple-600",
  "alkali metal": "from-red-400 to-red-600",
  "alkaline earth metal": "from-orange-400 to-orange-600",
  "metalloid": "from-yellow-400 to-yellow-600",
  "halogen": "from-pink-400 to-pink-600",
  "transition metal": "from-blue-400 to-blue-600",
  "post-transition metal": "from-cyan-400 to-cyan-600",
};

const TOTAL_Q = 10;
const BASE_TIMERS = { easy: 30, medium: 22, hard: 14 };

const DIFF_LABEL: Record<Difficulty, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const DIFF_COLOR: Record<Difficulty, string> = { easy: "#1D9E75", medium: "#EF9F27", hard: "#D4537E" };

function LevelBadge({ level, anim }: { level: number; anim: boolean }) {
  const diff = levelToDifficulty(level);
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-white transition-all ${anim ? "scale-125" : ""}`}
        style={{ background: DIFF_COLOR[diff] }}>
        Lv.{level}
        {anim && <span className="mr-1">⬆️</span>}
      </div>
    </div>
  );
}

export default function ChemistryPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"element" | "usage">("element");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [isAdaptive, setIsAdaptive] = useState(false);
  const [iqData, setIqData] = useState<IQData>(() => getIQData());

  const [level, setLevel] = useState(5);
  const [levelAnim, setLevelAnim] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerPct, setTimerPct] = useState(100);
  const [showHint, setShowHint] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [newIQ, setNewIQ] = useState(1000);

  const [draggedElement, setDraggedElement] = useState<any>(null);
  const usedQuestionsRef = useRef<Set<string>>(new Set());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tStartRef = useRef<number>(0);
  const totalMsRef = useRef<number>(0);
  const correctRef = useRef<number>(0);
  const streakRef = useRef<number>(0);
  const maxStreakRef = useRef<number>(0);
  const levelsRef = useRef<number[]>([]);
  const levelRef = useRef<number>(5);

  useEffect(() => {
    fetchMeWithRetry(2, 100).then(me => setUser(me)).catch(() => {});
    
    // Fetch adaptive difficulty settings
    fetch("/api/student/iq")
      .then(res => res.json())
      .then(data => {
        if (data && data.isAdaptive) {
          setIsAdaptive(true);
        }
      })
      .catch(() => {});
  }, []);

  const refreshIQ = () => setIqData(getIQData());

  const generateQuestionByLevel = useCallback((lvl: number): any => {
    // Determine bounds based on level
    const maxElementNum = lvl <= 3 ? 15 : lvl <= 6 ? 30 : lvl <= 9 ? 45 : 56;
    
    if (gameMode === "element") {
      let pool = ELEMENTS.filter(e => e.number <= maxElementNum);
      if (pool.length === 0) pool = ELEMENTS;
      
      let chosen = pool[Math.floor(Math.random() * pool.length)];
      let key = `el-${chosen.number}`;
      
      let attempts = 0;
      while (usedQuestionsRef.current.has(key) && attempts < 100) {
        chosen = pool[Math.floor(Math.random() * pool.length)];
        key = `el-${chosen.number}`;
        attempts++;
      }
      usedQuestionsRef.current.add(key);

      return {
        element: chosen,
        hint: `العنصر هو لافلز أو فلز ينتمي لمجموعة ${chosen.category} كتلته الذرية ${chosen.mass} وعدده الذري ${chosen.number}`
      };
    } else {
      let pool = USAGE_QUESTIONS;
      let chosen = pool[Math.floor(Math.random() * pool.length)];
      let key = `usage-${chosen.element}`;
      
      let attempts = 0;
      while (usedQuestionsRef.current.has(key) && attempts < 100) {
        chosen = pool[Math.floor(Math.random() * pool.length)];
        key = `usage-${chosen.element}`;
        attempts++;
      }
      usedQuestionsRef.current.add(key);

      return chosen;
    }
  }, [gameMode]);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const avgLevel = levelsRef.current.reduce((a, b) => a + b, 0) / levelsRef.current.length;
    const gameResult: GameResult = {
      correct: correctRef.current,
      total: TOTAL_Q,
      totalTimeMs: totalMsRef.current,
      avgLevel,
      maxStreak: maxStreakRef.current,
      difficulty: levelToDifficulty(levelRef.current),
    };
    
    const res = updateIQ("chemistry", gameResult);
    setSessionScore(res.sessionScore);
    setNewIQ(res.newOverallIQ);
    setGameOver(true);
    setGameStarted(false);
    refreshIQ();
  }, []);

  const nextQuestion = useCallback((idx: number) => {
    if (idx >= TOTAL_Q) {
      finishGame();
      return;
    }

    const curLvl = levelRef.current;
    levelsRef.current.push(curLvl);
    
    const q = generateQuestionByLevel(curLvl);
    setCurrentQuestion(q);
    setQIdx(idx);
    setShowHint(false);
    
    const secs = levelToTimer(curLvl, BASE_TIMERS);
    setTimeLeft(secs);
    setTimerPct(100);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 100;
      setTimerPct(Math.max(0, 100 - (elapsed / (secs * 1000)) * 100));
      setTimeLeft(Math.max(0, Math.ceil(secs - elapsed / 1000)));
      
      if (elapsed >= secs * 1000) {
        clearInterval(timerRef.current!);
        vibrate("wrong");
        
        // Timeout -> level down
        levelRef.current = Math.max(1, levelRef.current - 1);
        setLevel(levelRef.current);
        streakRef.current = 0;
        
        const now = Date.now();
        totalMsRef.current += now - tStartRef.current;
        tStartRef.current = now;
        
        nextQuestion(idx + 1);
      }
    }, 100);
    
    tStartRef.current = Date.now();
  }, [generateQuestionByLevel, finishGame]);

  const startGame = (mode: "element" | "usage") => {
    setGameMode(mode);
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setQIdx(0);
    usedQuestionsRef.current.clear();
    
    correctRef.current = 0;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    levelsRef.current = [];
    totalMsRef.current = 0;
    
    const startLvl = difficultyToStartLevel(difficulty);
    levelRef.current = startLvl;
    setLevel(startLvl);
    
    nextQuestion(0);
  };

  const handleAnswer = (correct: boolean) => {
    const now = Date.now();
    totalMsRef.current += now - tStartRef.current;
    
    const curLevel = levelRef.current;
    const secs = levelToTimer(curLevel, BASE_TIMERS);
    const timeUsedPct = (now - tStartRef.current) / (secs * 1000);
    
    if (correct) {
      const timeBonus = Math.max(0, Math.floor((1 - timeUsedPct) * 15));
      setScore((s) => s + 10 + timeBonus);
      correctRef.current += 1;
      
      const newStr = streakRef.current + 1;
      streakRef.current = newStr;
      maxStreakRef.current = Math.max(maxStreakRef.current, newStr);
      vibrate(newStr >= 3 ? "streak" : "correct");

      // Adaptive Level Up
      const prevLvl = levelRef.current;
      if (timeUsedPct < 0.45 && levelRef.current < 10) {
        levelRef.current = Math.min(10, levelRef.current + 1);
        setLevel(levelRef.current);
        if (levelRef.current > prevLvl) {
          setLevelAnim(true);
          setTimeout(() => setLevelAnim(false), 800);
          vibrate("levelup");
        }
      }
    } else {
      setScore((s) => Math.max(0, s - 5));
      streakRef.current = 0;
      vibrate("wrong");
      
      // Level Down
      if (levelRef.current > 1) {
        levelRef.current = Math.max(1, levelRef.current - 1);
        setLevel(levelRef.current);
      }
    }

    nextQuestion(qIdx + 1);
  };

  const handleDrop = (element: typeof ELEMENTS[0]) => {
    if (!currentQuestion) return;

    if (gameMode === "element") {
      const isCorrect = element.number === currentQuestion.element.number;
      handleAnswer(isCorrect);
    } else {
      const isCorrect = element.name === currentQuestion.element || element.symbol === currentQuestion.symbol;
      handleAnswer(isCorrect);
    }
    setDraggedElement(null);
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || "from-gray-400 to-gray-600";
  };

  // Periodic table layout - grid positions [col, row]
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
    };
    return positions[number] || { col: 1, row: 1 };
  };

  const skills = SUBJECT_SKILLS["chemistry"] || [];

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <motion.div className="mb-6 flex flex-wrap justify-between items-center gap-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div>
              <Link href="/environments" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-2 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                العودة للبيئات
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-4xl">🧪</div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">الكيمياء</h1>
                  <p className="text-gray-500 dark:text-gray-400">لعبة الجدول الدوري المعرفية</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              {skills.map(sk => (
                <span key={sk} className="px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: SKILL_COLORS[sk as keyof typeof SKILL_COLORS] + "22", color: SKILL_COLORS[sk as keyof typeof SKILL_COLORS] }}>
                  {SKILL_LABELS[sk as keyof typeof SKILL_LABELS]} {iqData.skills[sk].score}
                </span>
              ))}
              <Link href="/environments/iq" className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-600">
                🧠 {iqData.overallIQ}
              </Link>
            </div>
          </motion.div>

          {!gameStarted ? (
            <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              {gameOver ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100 dark:border-gray-700">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">انتهت اللعبة!</h2>
                  <div className="text-5xl font-black text-green-500 mb-4">{score}</div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">مجموع النقاط</p>
                  
                  <div className="rounded-xl p-4 my-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200">
                    <div className="text-sm text-purple-600 font-bold mb-1">نقاط جلسة الذكاء</div>
                    <div className="text-3xl font-black text-purple-600">{sessionScore.toLocaleString("ar-EG")}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">معدل IQ الكلي الجديد: <strong>{newIQ}</strong></div>
                  </div>

                  <div className="flex gap-4">
                    <motion.button onClick={() => startGame(gameMode)} className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      العب مجدداً
                    </motion.button>
                    <Link href="/environments" className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-bold rounded-xl text-center border border-gray-200">
                      العودة للبيئات
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100 dark:border-gray-700">
                  <div className="text-6xl mb-4">🎮</div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">لعبة العناصر الكيميائية</h2>
                  
                  {/* Game Mode Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">اختر نوع اللعبة</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button onClick={() => setGameMode("element")} className={`p-4 rounded-xl border-2 transition-all ${gameMode === "element" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="text-3xl mb-2">🔬</div>
                        <div className="font-bold text-gray-900 dark:text-white">البحث عن العنصر</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">ابحث عن العنصر بالرمز أو الاسم</div>
                      </motion.button>
                      <motion.button onClick={() => setGameMode("usage")} className={`p-4 rounded-xl border-2 transition-all ${gameMode === "usage" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="text-3xl mb-2">💡</div>
                        <div className="font-bold text-gray-900 dark:text-white">استخدامات العناصر</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-bold font-sans">حدد العنصر بناءً على طريقة استخدامه</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">اختر الصعوبة</h3>
                    
                    {!isAdaptive && (
                      <div className="grid grid-cols-3 gap-3">
                        {(["easy", "medium", "hard"] as Difficulty[]).map((diff) => (
                          <motion.button key={diff} onClick={() => setDifficulty(diff)} className={`p-3 rounded-xl border-2 transition-all ${difficulty === diff ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <div className="font-bold text-gray-900 dark:text-white">{DIFF_LABEL[diff]}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">تعديل تلقائي للمستوى ⚡</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                    {isAdaptive && (
                      <p className="text-xs py-3 rounded-xl bg-purple-50 text-purple-600 font-bold border border-purple-200">
                        تم تفعيل صعوبة البداية التلقائية بناءً على مستواك الحالي: {DIFF_LABEL[difficulty]} ⚡
                      </p>
                    )}
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                    {gameMode === "element" 
                      ? "اسحب العنصر المطلوب من الجدول الدوري وضعه في المنطقة المخصصة قبل انتهاء الوقت!"
                      : "اقرأ اللغز واسحب العنصر المناسب إلى منطقة الإلقاء!"
                    }
                  </p>
                  <motion.button onClick={() => startGame(gameMode)} className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl text-lg w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    ابدأ اللعب
                  </motion.button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Game Stats */}
              <motion.div className="grid grid-cols-4 gap-2 sm:gap-4" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{score}</div>
                  <div className="text-xs text-gray-500">النقاط</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                  <div className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                    {timeLeft}s
                  </div>
                  <div className="text-xs text-gray-500">الوقت</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center">
                  <LevelBadge level={level} anim={levelAnim} />
                  <div className="text-[10px] text-gray-500 mt-0.5">المستوى</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                  <div className="text-2xl font-black text-gray-900 dark:text-white">{qIdx + 1}/{TOTAL_Q}</div>
                  <div className="text-xs text-gray-500">السؤال</div>
                </div>
              </motion.div>

              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#1D9E75" : timerPct > 20 ? "#EF9F27" : "#D4537E" }} />
              </div>

              {/* Current Question */}
              <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-700" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {gameMode === "element" 
                      ? `ابحث عن العنصر: ${currentQuestion?.element.name} (${currentQuestion?.element.symbol})`
                      : currentQuestion?.question
                    }
                  </h3>
                  <button onClick={() => setShowHint(!showHint)} className="px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors text-xs font-bold shrink-0">
                    💡 مساعدة
                  </button>
                </div>
                <AnimatePresence>
                  {showHint && currentQuestion && (
                    <motion.div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-blue-700 dark:text-blue-300 text-sm font-semibold border border-blue-100" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      {currentQuestion.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Drop Zone */}
              <motion.div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-2xl p-6 text-center border-3 border-dashed border-green-300 dark:border-green-800 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={() => draggedElement && handleDrop(draggedElement)}>
                <div className="text-emerald-700 dark:text-emerald-400 text-lg font-black mb-1">
                  {draggedElement ? `اسقط ${draggedElement.name} هنا` : "اسحب العنصر الصحيح وضعه هنا"}
                </div>
                <p className="text-xs text-gray-400">أو اضغط مباشرة على العنصر بالجدول الدوري أدناه للإجابة السريعة!</p>
              </motion.div>

              {/* Periodic Table */}
              <motion.div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 overflow-x-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(18, minmax(40px, 1fr))", minWidth: "780px" }} dir="ltr">
                  {ELEMENTS.map((element) => {
                    const pos = getGridPosition(element.number);
                    return (
                      <motion.div key={element.number} style={{ gridColumn: pos.col, gridRow: pos.row }} draggable onDragStart={() => setDraggedElement(element)} onDragEnd={() => setDraggedElement(null)} onClick={() => handleDrop(element)}
                        className={`relative p-2 rounded-xl cursor-grab active:cursor-grabbing bg-gradient-to-br ${getCategoryColor(element.category)} text-white shadow-sm hover:shadow-md hover:scale-105 transition-all text-center border border-black/5`}>
                        <div className="text-[9px] font-bold opacity-80">{element.number}</div>
                        <div className="text-base font-black tracking-tight">{element.symbol}</div>
                        <div className="text-[7px] truncate hidden sm:block font-bold">{element.name}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* End Game Button */}
              <button onClick={finishGame} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors border border-red-200">
                إنهاء الجلسة وحفظ النقاط 🏁
              </button>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}
