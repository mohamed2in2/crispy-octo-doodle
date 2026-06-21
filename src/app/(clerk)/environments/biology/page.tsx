"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

/* ─── DNA Match Data ─────────────────────────────────────────────────────── */
const PAIRS: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const BASES = ["A", "T", "G", "C"] as const;
const BASE_COLORS: Record<string, string> = { A: "#1D9E75", T: "#D4537E", G: "#534AB7", C: "#EF9F27" };

// DNA generator based on level (1-10) with duplicate prevention
function genDNAQ(level: number, usedStrands: Set<string>) {
  const len = level <= 3 ? 5 : level <= 6 ? 7 : level <= 9 ? 9 : 11;
  let strand1: string[] = [];
  let key = "";
  
  // Keep generating until unique
  let attempts = 0;
  do {
    strand1 = Array.from({ length: len }, () => BASES[Math.floor(Math.random() * 4)]);
    key = strand1.join("");
    attempts++;
  } while (usedStrands.has(key) && attempts < 100);
  
  usedStrands.add(key);

  const strand2 = strand1.map(b => PAIRS[b]);
  const blankPos = Math.floor(Math.random() * len);
  const answer = strand2[blankPos];
  
  return { strand1, strand2, blankPos, answer };
}

type DNAQuestion = ReturnType<typeof genDNAQ>;

/* ─── Cell Tap Data & Templating ────────────────────────────────────────── */
interface CellFact {
  id: string;
  name: string;
  category: "easy" | "medium" | "hard";
  clues: string[];
  explanation: string;
}

const CELL_FACTS: CellFact[] = [
  { id: "1", name: "الميتوكوندريا", category: "easy", clues: ["عضية مسؤولة عن التنفس الخلوي وإنتاج الطاقة (ATP)", "تعتبر بمثابة مصنع الطاقة الرئيسي داخل الخلايا", "تتميز بغشاء مزدوج وتحتوي على حمض نووي خاص بها"], explanation: "الميتوكوندريا تولد الطاقة للخلية" },
  { id: "2", name: "النواة", category: "easy", clues: ["عضية تحتوي على المادة الوراثية وتتحكم في أنشطة الخلية", "مركز السيطرة الرئيسي ومخزن الحمض النووي (DNA)", "تتميز بغلاف نووي يحيط بالمادة الوراثية"], explanation: "النواة تتحكم بالخلية وتحفظ الـ DNA" },
  { id: "3", name: "الريبوسومات", category: "easy", clues: ["العضية المسؤولة عن تصنيع وبناء البروتينات", "تقوم بترجمة الحمض النووي الريبوزي mRNA إلى بروتينات", "عضية صغيرة جداً غير غشائية تنتج سلاسل الببتيد"], explanation: "الريبوسومات تبني البروتينات" },
  { id: "4", name: "البلاستيدات الخضراء", category: "easy", clues: ["عضية نباتية تجري عملية البناء الضوئي لصنع الغذاء", "تتحكم في امتصاص أشعة الشمس لإنتاج السكر في النبات", "عضية تحتوي على الكلوروفيل وتكسب النبات لونه الأخضر"], explanation: "البلاستيدات تجري البناء الضوئي" },
  { id: "5", name: "الغشاء الخلوي", category: "easy", clues: ["غلاف ينظم دخول وخروج المواد من وإلى الخلية", "غشاء شبه منفذ يتميز بالنفاذية الاختيارية", "يحمي الخلية ويحافظ على اتزانها الداخلي بيئياً"], explanation: "الغشاء ينظم مرور المواد بالخلية" },
  { id: "6", name: "جدار الخلية", category: "easy", clues: ["جدار صلب يحيط بالخلايا النباتية لمنحها الدعامة والشكل", "يتكون أساساً من مادة السيليلوز ويحمي الخلية النباتية", "يمنع انفجار الخلية النباتية نتيجة الضغط الأسموزي"], explanation: "الجدار يوفر حماية ودعامة للنبات" },
  { id: "7", name: "جهاز جولجي", category: "medium", clues: ["عضية تقوم بتعديل وتعبئة البروتينات وتصديرها", "مجموعة من الأكياس الغشائية المفلطحة التي تشبه مكتب البريد", "تقوم بإضافة السكريات للبروتينات لإنتاج البروتينات السكرية"], explanation: "جهاز جولجي يغلف ويشحن البروتينات" },
  { id: "8", name: "الليسوسومات", category: "medium", clues: ["عضيات هاضمة تحتوي على إنزيمات لتحليل المواد التالفة", "الجسيمات الحالة التي تدمر البكتيريا والعضيات الهرمة", "تقوم بعملية التحلل الذاتي عند موت الخلية"], explanation: "الليسوسومات تهضم الفضلات بالخلية" },
  { id: "9", name: "الشبكة الإندوبلازمية الخشنة", category: "medium", clues: ["شبكة تنقل المواد وتتميز بوجود الريبوسومات على سطحها", "مسؤولة عن تعديل ونقل البروتينات المصنعة حديثاً", "أقنية متصلة بالنواة تسهم في معالجة سلاسل البروتين"], explanation: "الخشنة تنقل وتعدل البروتينات" },
  { id: "10", name: "الشبكة الإندوبلازمية الملساء", category: "medium", clues: ["عضية تقوم بتصنيع الدهون وإزالة السموم من الخلية", "شبكة أقنية تخلو من الريبوسومات على سطحها الخارجي", "تساهم في تخزين الكالسيوم واستقلاب الكربوهيدرات"], explanation: "الملساء تبني الدهون وتزيل السموم" },
  { id: "11", name: "السيتوبلازم", category: "easy", clues: ["سائل شبه هلامي تطفو فيه العضيات الخلوية المختلفة", "المادة السائلة التي تمتد بين النواة والغشاء الخلوي", "تحدث فيه معظم التفاعلات الكيميائية الأساسية للخلية"], explanation: "السيتوبلازم سائل الخلية الأساسي" },
  { id: "12", name: "الفجوة العصارية", category: "medium", clues: ["عضية تخزن الماء والمواد الغذائية والفضلات بالخلية", "تكون كبيرة ومركزية في الخلايا النباتية وصغيرة في الحيوانية", "تحافظ على ضغط الامتلاء والانتفاخ داخل الخلايا النباتية"], explanation: "الفجوة العصارية تخزن المياه والغذاء" },
  { id: "13", name: "النوية", category: "medium", clues: ["جسم داكن داخل النواة مسؤول عن بناء الريبوسومات", "تقوم بتصنيع الحمض النووي الريبوزي rRNA وتجميع الريبوسومات", "تعتبر مركز تجميع الآلات المصنعة للبروتين"], explanation: "النوية تصنع الريبوسومات" },
  { id: "14", name: "البيروكسيسومات", category: "hard", clues: ["عضيات تفكك الأحماض الدهنية وتنتج بيروكسيد الهيدروجين", "تحتوي على إنزيم الكاتالاز لتفكيك السموم والماء الأكسجيني", "تساهم في حماية الخلية من الجذور الحرة الضارة"], explanation: "البيروكسيسومات تحلل السموم الخلوية" },
  { id: "15", name: "الهيكل الخلوي", category: "hard", clues: ["شبكة من الألياف البروتينية تدعم شكل الخلية وتساعد في حركتها", "تتكون من الأنيبيبات الدقيقة والخيوط الدقيقة والوسطية", "تعمل كطرق سريعة لنقل العضيات داخل السيتوبلازم"], explanation: "الهيكل الخلوي يدعم الحركة والشكل" },
  { id: "16", name: "الجسيم المركزي (السنتريول)", category: "hard", clues: ["تركيب ينظم خيوط المغزل أثناء انقسام الخلايا الحيوانية", "يتكون من تسع مجموعات من الأنيبيبات الدقيقة الثلاثية", "عضية غير غشائية توجد بالقرب من نواة الخلايا الحيوانية فقط"], explanation: "الجسيم المركزي يوجه انقسام الخلايا" },
  { id: "17", name: "الغشاء النووي", category: "easy", clues: ["غشاء مزدوج يحيط بالنواة ويحتوي على ثقوب نووية", "يفصل مكونات النواة عن السيتوبلازم وينظم حركتها", "يسمح بمرور الـ RNA والريبوسومات خارج النواة"], explanation: "الغشاء النووي يحمي محتوى النواة" },
  { id: "18", name: "الكروماتين", category: "hard", clues: ["خليط من DNA والبروتينات يتكثف ليشكل الكروموسومات", "الشكل غير المتكثف للمادة الوراثية خلال الطور البيني", "تلتف خيوطه حول بروتينات الهيستون لحفظ المعلومات"], explanation: "الكروماتين يمثل حمض DNA غير المتكثف" },
  { id: "19", name: "الكلوروفيل", category: "easy", clues: ["صبغة خضراء تمتص الضوء للقيام بالبناء الضوئي", "الصبغة الكيميائية المتواجدة داخل ثايلات الثايلاكويد", "تحول الطاقة الضوئية إلى طاقة كيميائية في النباتات"], explanation: "الكلوروفيل صبغة امتصاص الضوء" },
  { id: "20", name: "الأهداب والأسواط", category: "medium", clues: ["تراكيب شعرية تمتد من سطح الخلية وتساعد في الحركة", "تتكون من أنيبيبات دقيقة بترتيب خاص (9+2)", "تستخدمها البكتيريا أو الخلايا المفردة للانتقال"], explanation: "الأهداب والأسواط أدوات حركة الخلية" },
  { id: "21", name: "الدهون المفسفرة", category: "hard", clues: ["الجزيء الرئيسي المكون للغشاء الخلوي برأس محب وذيل كاره للماء", "تترتب في طبقتين لتشكل حاجزاً مرناً يحيط بالخلية", "تمنع مرور الجزيئات الذائبة في الماء بحرية عبر الغشاء"], explanation: "الدهون المفسفرة تشكل الهيكل الغشائي" }
];

// Generator for Cell questions based on level (1-10) with duplicate prevention
function genCellQ(level: number, usedQuestions: Set<string>) {
  const cat = level <= 3 ? "easy" : level <= 7 ? "medium" : "hard";
  
  // Filter facts matching the category
  let pool = CELL_FACTS.filter(f => f.category === cat);
  if (pool.length === 0) pool = CELL_FACTS;

  let chosenFact = pool[Math.floor(Math.random() * pool.length)];
  let clue = chosenFact.clues[Math.floor(Math.random() * chosenFact.clues.length)];
  let key = `${chosenFact.id}-${clue}`;

  // Duplicate prevention check
  let attempts = 0;
  while (usedQuestions.has(key) && attempts < 100) {
    chosenFact = pool[Math.floor(Math.random() * pool.length)];
    clue = chosenFact.clues[Math.floor(Math.random() * chosenFact.clues.length)];
    key = `${chosenFact.id}-${clue}`;
    attempts++;
  }
  usedQuestions.add(key);

  const answer = chosenFact.name;
  
  // Get 3 random distractors from other organelles
  const others = CELL_FACTS.filter(f => f.name !== answer).map(f => f.name);
  const wrong = others.sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = [answer, ...wrong].sort(() => Math.random() - 0.5);

  return { question: clue, answer, choices, explanation: chosenFact.explanation };
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const TOTAL_Q = 10;
const BASE_TIMERS = { easy: 16, medium: 12, hard: 8 };

const DIFF_LABEL: Record<Difficulty, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const DIFF_COLOR: Record<Difficulty, string> = { easy: "#1D9E75", medium: "#EF9F27", hard: "#D4537E" };

/* ─── Level badge ────────────────────────────────────────────────────────── */
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

/* ─── DNA Match Game ────────────────────────────────────────────────────── */
function DNAMatchGame({ onFinish, isAdaptive }: { onFinish: () => void; isAdaptive: boolean }) {
  const [diff, setDiff] = useState<Difficulty>(() => getRecommendedDifficulty("biology"));
  const startLevel = difficultyToStartLevel(diff);
  const [level, setLevel] = useState(startLevel);
  const [levelAnim, setLevelAnim] = useState(false);
  const [state, setState] = useState<"idle" | "playing" | "result">("idle");
  
  const usedStrandsRef = useRef<Set<string>>(new Set());
  const [q, setQ] = useState<DNAQuestion | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [timerPct, setTimerPct] = useState(100);
  const [result, setResult] = useState<{ correct: number; sessionScore: number; newIQ: number } | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const totalMsRef = useRef(0);
  const tStartRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const levelsRef = useRef<number[]>([]);
  const levelRef = useRef(startLevel);

  const clear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advRef.current) clearTimeout(advRef.current);
  };

  const nextQ = useCallback((idx: number) => {
    if (idx >= TOTAL_Q) {
      const avgLevel = levelsRef.current.reduce((a, b) => a + b, 0) / levelsRef.current.length;
      const gameResult: GameResult = {
        correct: correctRef.current,
        total: TOTAL_Q,
        totalTimeMs: totalMsRef.current,
        avgLevel,
        maxStreak: maxStreakRef.current,
        difficulty: levelToDifficulty(levelRef.current),
      };
      const res = updateIQ("biology", gameResult);
      setResult({ correct: correctRef.current, sessionScore: res.sessionScore, newIQ: res.newOverallIQ });
      setState("result");
      onFinish();
      return;
    }
    
    const cur = levelRef.current;
    levelsRef.current.push(cur);
    const secs = levelToTimer(cur, BASE_TIMERS);
    
    setQ(genDNAQ(cur, usedStrandsRef.current));
    setSelected(null);
    setQIdx(idx);
    setTimerPct(100);
    
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 100;
      setTimerPct(Math.max(0, 100 - (elapsed / (secs * 1000)) * 100));
      if (elapsed >= secs * 1000) {
        clearInterval(timerRef.current!);
        vibrate("wrong");
        // Slow down or fail -> decrease level
        levelRef.current = Math.max(1, levelRef.current - 1);
        setLevel(levelRef.current);
        setSelected("__timeout__");
        const now = Date.now();
        totalMsRef.current += now - tStartRef.current;
        tStartRef.current = now;
        streakRef.current = 0;
        advRef.current = setTimeout(() => nextQ(idx + 1), 900);
      }
    }, 100);
    tStartRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

  const start = () => {
    clear();
    usedStrandsRef.current.clear();
    correctRef.current = 0;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    levelsRef.current = [];
    totalMsRef.current = 0;
    const startLvl = difficultyToStartLevel(diff);
    levelRef.current = startLvl;
    setLevel(startLvl);
    setCorrect(0);
    setResult(null);
    setState("playing");
    nextQ(0);
  };

  const answer = useCallback((ch: string) => {
    if (selected) return;
    clear();
    setSelected(ch);
    const now = Date.now();
    totalMsRef.current += now - tStartRef.current;
    
    const curLevel = levelRef.current;
    const secs = levelToTimer(curLevel, BASE_TIMERS);
    const timeUsedPct = (now - tStartRef.current) / (secs * 1000);
    
    const ok = ch === q?.answer;
    const newC = correctRef.current + (ok ? 1 : 0);
    correctRef.current = newC;
    setCorrect(newC);
    
    const newStr = ok ? streakRef.current + 1 : 0;
    streakRef.current = newStr;
    maxStreakRef.current = Math.max(maxStreakRef.current, newStr);
    vibrate(ok ? (newStr >= 3 ? "streak" : "correct") : "wrong");

    // Adjust levels dynamically
    const prevLvl = levelRef.current;
    if (ok && timeUsedPct < 0.45 && levelRef.current < 10) {
      levelRef.current = Math.min(10, levelRef.current + 1);
      setLevel(levelRef.current);
      if (levelRef.current > prevLvl) {
        setLevelAnim(true);
        setTimeout(() => setLevelAnim(false), 800);
        vibrate("levelup");
      }
    } else if (!ok && levelRef.current > 1) {
      levelRef.current = Math.max(1, levelRef.current - 1);
      setLevel(levelRef.current);
    }
    
    advRef.current = setTimeout(() => nextQ(qIdx + 1), 900);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, q, qIdx, nextQ]);

  useEffect(() => () => clear(), []);

  if (state === "idle") return (
    <div className="rounded-[20px] p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🧬</div>
      <p className="text-sm mb-2" style={{ color: "var(--ink)" }}>أكمل تسلسل DNA بالضغط على القاعدة الصحيحة</p>
      <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>A↔T و G↔C · المستوى يزيد مع السرعة والدقة ⚡</p>
      
      {!isAdaptive && (
        <div className="flex gap-2 justify-center mb-6">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <button key={d} onClick={() => setDiff(d)} className="px-4 py-2 rounded-xl text-sm font-black"
              style={{ background: diff === d ? DIFF_COLOR[d] : "var(--surface-2)", color: diff === d ? "#fff" : "var(--ink-3)", border: `2px solid ${diff === d ? DIFF_COLOR[d] : "var(--border)"}` }}>
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      )}
      {isAdaptive && (
        <p className="text-xs mb-5 font-bold" style={{ color: "var(--brand)" }}>
          تم تحديد الصعوبة تلقائياً: {DIFF_LABEL[diff]} ⚡
        </p>
      )}
      
      <button onClick={start} className="w-full py-4 rounded-2xl font-black text-lg text-white" style={{ background: "linear-gradient(135deg,#1D9E75,#7F77DD)" }}>ابدأ</button>
    </div>
  );

  if (state === "result" && result) return (
    <div className="rounded-[20px] p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 52 }}>{result.correct >= 8 ? "🏆" : result.correct >= 5 ? "⭐" : "💪"}</div>
      <h3 className="text-2xl font-black mb-1" style={{ color: "var(--ink)" }}>{result.correct}/{TOTAL_Q} صحيح</h3>
      <p className="text-xs text-gray-500 mb-3">أعلى مستوى وصلت له: Lv.{Math.max(...levelsRef.current)}</p>
      <div className="rounded-xl p-4 my-4" style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)" }}>
        <div className="text-xs font-bold mb-1" style={{ color: "var(--brand)" }}>نقاط الجلسة</div>
        <div className="text-3xl font-black" style={{ color: "var(--brand)" }}>{result.sessionScore.toLocaleString("ar-EG")}</div>
        <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>IQ الكلي: <strong>{result.newIQ}</strong></div>
      </div>
      <div className="flex gap-3">
        <button onClick={start} className="flex-1 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(135deg,#1D9E75,#7F77DD)" }}>مرة أخرى</button>
        <Link href="/environments" className="flex-1 py-3 rounded-xl font-black text-center" style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" }}>البيئات</Link>
      </div>
    </div>
  );

  return (
    <div>
      <div className="h-2 rounded-full mb-4 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#1D9E75" : timerPct > 20 ? "#EF9F27" : "#D4537E" }} />
      </div>
      <div className="flex justify-between items-center mb-3">
        <LevelBadge level={level} anim={levelAnim} />
        <span className="text-xs font-bold" style={{ color: "var(--ink-3)" }}>{qIdx + 1}/{TOTAL_Q}</span>
        <span className="text-xs font-bold" style={{ color: "#D4537E" }}>🔥 {streakRef.current}</span>
      </div>

      {q && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-bold mb-3 text-center" style={{ color: "var(--ink-3)" }}>الشريط الأول (المعطى):</p>
          <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
            {q.strand1.map((b, i) => (
              <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm text-white"
                style={{ background: BASE_COLORS[b] }}>{b}</div>
            ))}
          </div>
          <p className="text-xs font-bold mb-3 text-center" style={{ color: "var(--ink-3)" }}>الشريط المتمم — أكمل القاعدة المفقودة:</p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            {q.strand2.map((b, i) => (
              i === q.blankPos ? (
                <div key={i} className="w-9 h-9 rounded-lg border-2 border-dashed flex items-center justify-center font-black text-sm"
                  style={{
                    borderColor: selected ? BASE_COLORS[selected] || "var(--border)" : "var(--border)",
                    background: selected ? (selected === q.answer ? "#1D9E7522" : "#D4537E22") : "var(--surface-2)",
                    color: selected ? BASE_COLORS[selected] || "var(--ink-3)" : "var(--ink-3)"
                  }}>
                  {selected && selected !== "__timeout__" ? selected : "؟"}
                </div>
              ) : (
                <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm text-white"
                  style={{ background: BASE_COLORS[b], opacity: 0.7 }}>{b}</div>
              )
            ))}
          </div>
        </div>
      )}

      {/* 4 colored base buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {BASES.map(base => {
          const isSel = selected === base, isAns = selected !== null && base === q?.answer, isWrong = isSel && base !== q?.answer;
          return (
            <button key={base} onClick={() => answer(base)} disabled={!!selected}
              className="py-5 rounded-2xl text-2xl font-black transition-all active:scale-95"
              style={{
                background: isAns ? "#1D9E75" : isWrong ? "#D4537E" : BASE_COLORS[base] + "22",
                color: isAns ? "#fff" : isWrong ? "#fff" : BASE_COLORS[base],
                border: `3px solid ${isAns ? "#1D9E75" : isWrong ? "#D4537E" : BASE_COLORS[base]}`,
                minHeight: 64
              }}>
              {base}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Cell Tap Game ─────────────────────────────────────────────────────── */
function CellTapGame({ onFinish, isAdaptive }: { onFinish: () => void; isAdaptive: boolean }) {
  const [diff, setDiff] = useState<Difficulty>(() => getRecommendedDifficulty("biology"));
  const startLevel = difficultyToStartLevel(diff);
  const [level, setLevel] = useState(startLevel);
  const [levelAnim, setLevelAnim] = useState(false);
  const [state, setState] = useState<"idle" | "playing" | "result">("idle");
  
  const usedQuestionsRef = useRef<Set<string>>(new Set());
  const [q, setQ] = useState<ReturnType<typeof genCellQ> | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [timerPct, setTimerPct] = useState(100);
  const [result, setResult] = useState<{ correct: number; sessionScore: number; newIQ: number } | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const totalMsRef = useRef(0);
  const tStartRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const levelsRef = useRef<number[]>([]);
  const levelRef = useRef(startLevel);

  const clear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (advRef.current) clearTimeout(advRef.current);
  };

  const nextQ = useCallback((idx: number) => {
    if (idx >= TOTAL_Q) {
      const avgLevel = levelsRef.current.reduce((a, b) => a + b, 0) / levelsRef.current.length;
      const gameResult: GameResult = {
        correct: correctRef.current,
        total: TOTAL_Q,
        totalTimeMs: totalMsRef.current,
        avgLevel,
        maxStreak: maxStreakRef.current,
        difficulty: levelToDifficulty(levelRef.current),
      };
      const res = updateIQ("biology", gameResult);
      setResult({ correct: correctRef.current, sessionScore: res.sessionScore, newIQ: res.newOverallIQ });
      setState("result");
      onFinish();
      return;
    }
    
    const cur = levelRef.current;
    levelsRef.current.push(cur);
    const secs = levelToTimer(cur, BASE_TIMERS);
    
    setQ(genCellQ(cur, usedQuestionsRef.current));
    setSelected(null);
    setQIdx(idx);
    setTimerPct(100);
    
    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 100;
      setTimerPct(Math.max(0, 100 - (elapsed / (secs * 1000)) * 100));
      if (elapsed >= secs * 1000) {
        clearInterval(timerRef.current!);
        vibrate("wrong");
        levelRef.current = Math.max(1, levelRef.current - 1);
        setLevel(levelRef.current);
        setSelected("__timeout__");
        const now = Date.now();
        totalMsRef.current += now - tStartRef.current;
        tStartRef.current = now;
        streakRef.current = 0;
        advRef.current = setTimeout(() => nextQ(idx + 1), 1200);
      }
    }, 100);
    tStartRef.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

  const start = () => {
    clear();
    usedQuestionsRef.current.clear();
    correctRef.current = 0;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    levelsRef.current = [];
    totalMsRef.current = 0;
    const startLvl = difficultyToStartLevel(diff);
    levelRef.current = startLvl;
    setLevel(startLvl);
    setCorrect(0);
    setResult(null);
    setState("playing");
    nextQ(0);
  };

  const answer = useCallback((ch: string) => {
    if (selected) return;
    clear();
    setSelected(ch);
    const now = Date.now();
    totalMsRef.current += now - tStartRef.current;
    
    const curLevel = levelRef.current;
    const secs = levelToTimer(curLevel, BASE_TIMERS);
    const timeUsedPct = (now - tStartRef.current) / (secs * 1000);
    
    const ok = ch === q?.answer;
    const newC = correctRef.current + (ok ? 1 : 0);
    correctRef.current = newC;
    setCorrect(newC);
    
    const newStr = ok ? streakRef.current + 1 : 0;
    streakRef.current = newStr;
    maxStreakRef.current = Math.max(maxStreakRef.current, newStr);
    vibrate(ok ? (newStr >= 3 ? "streak" : "correct") : "wrong");

    // Adjust levels dynamically
    const prevLvl = levelRef.current;
    if (ok && timeUsedPct < 0.45 && levelRef.current < 10) {
      levelRef.current = Math.min(10, levelRef.current + 1);
      setLevel(levelRef.current);
      if (levelRef.current > prevLvl) {
        setLevelAnim(true);
        setTimeout(() => setLevelAnim(false), 800);
        vibrate("levelup");
      }
    } else if (!ok && levelRef.current > 1) {
      levelRef.current = Math.max(1, levelRef.current - 1);
      setLevel(levelRef.current);
    }

    advRef.current = setTimeout(() => nextQ(qIdx + 1), 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, q, qIdx, nextQ]);

  useEffect(() => () => clear(), []);

  if (state === "idle") return (
    <div className="rounded-[20px] p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🔬</div>
      <p className="text-sm mb-4" style={{ color: "var(--ink)" }}>اختر العضية الخلوية الصحيحة بناءً على الوصف</p>
      
      {!isAdaptive && (
        <div className="flex gap-2 justify-center mb-6">
          {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
            <button key={d} onClick={() => setDiff(d)} className="px-4 py-2 rounded-xl text-sm font-black"
              style={{ background: diff === d ? DIFF_COLOR[d] : "var(--surface-2)", color: diff === d ? "#fff" : "var(--ink-3)", border: `2px solid ${diff === d ? DIFF_COLOR[d] : "var(--border)"}` }}>
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
      )}
      {isAdaptive && (
        <p className="text-xs mb-5 font-bold" style={{ color: "var(--brand)" }}>
          تم تحديد الصعوبة تلقائياً: {DIFF_LABEL[diff]} ⚡
        </p>
      )}
      
      <button onClick={start} className="w-full py-4 rounded-2xl font-black text-lg text-white" style={{ background: "linear-gradient(135deg,#1D9E75,#7F77DD)" }}>ابدأ</button>
    </div>
  );

  if (state === "result" && result) return (
    <div className="rounded-[20px] p-6 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 52 }}>{result.correct >= 8 ? "🏆" : result.correct >= 5 ? "⭐" : "💪"}</div>
      <h3 className="text-2xl font-black mb-1" style={{ color: "var(--ink)" }}>{result.correct}/{TOTAL_Q} صحيح</h3>
      <p className="text-xs text-gray-500 mb-3">أعلى مستوى وصلت له: Lv.{Math.max(...levelsRef.current)}</p>
      <div className="rounded-xl p-4 my-4" style={{ background: "var(--brand-soft)", border: "1px solid var(--brand)" }}>
        <div className="text-xs font-bold mb-1" style={{ color: "var(--brand)" }}>نقاط الجلسة</div>
        <div className="text-3xl font-black" style={{ color: "var(--brand)" }}>{result.sessionScore.toLocaleString("ar-EG")}</div>
        <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>IQ الكلي: <strong>{result.newIQ}</strong></div>
      </div>
      <div className="flex gap-3">
        <button onClick={start} className="flex-1 py-3 rounded-xl font-black text-white" style={{ background: "linear-gradient(135deg,#1D9E75,#7F77DD)" }}>مرة أخرى</button>
        <Link href="/environments" className="flex-1 py-3 rounded-xl font-black text-center" style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" }}>البيئات</Link>
      </div>
    </div>
  );

  return (
    <div>
      <div className="h-2 rounded-full mb-4 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${timerPct}%`, background: timerPct > 50 ? "#1D9E75" : timerPct > 20 ? "#EF9F27" : "#D4537E" }} />
      </div>
      <div className="flex justify-between items-center mb-3">
        <LevelBadge level={level} anim={levelAnim} />
        <span className="text-xs font-bold" style={{ color: "var(--ink-3)" }}>{qIdx + 1}/{TOTAL_Q}</span>
        <span className="text-xs font-bold" style={{ color: "#1D9E75" }}>✅ {correct}</span>
      </div>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "var(--ink-3)" }}>ما هذه العضية الخلوية؟</p>
        <p className="text-base font-bold leading-relaxed" style={{ color: "var(--ink)" }}>{q?.question}</p>
        {selected && q?.explanation && (
          <p className="text-xs mt-3 p-2 rounded-lg" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>💡 {q.explanation}</p>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {q?.choices.map(ch => {
          const isSel = selected === ch, isAns = selected !== null && ch === q.answer, isWrong = isSel && ch !== q.answer;
          return (
            <button key={ch} onClick={() => answer(ch)} disabled={!!selected}
              className="py-4 rounded-2xl text-sm font-black transition-all active:scale-95 leading-snug"
              style={{
                minHeight: 64,
                background: isAns ? "#1D9E75" : isWrong ? "#D4537E" : "var(--surface)",
                color: (isAns || isWrong) ? "#fff" : "var(--ink)",
                border: `2px solid ${isAns ? "#1D9E75" : isWrong ? "#D4537E" : "var(--border)"}`
              }}>
              {ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function BiologyEnvironment() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [tab, setTab] = useState<"dna" | "cell">("dna");
  const [iqData, setIqData] = useState<IQData>(() => getIQData());
  const [isAdaptive, setIsAdaptive] = useState(false);

  useEffect(() => {
    fetchMeWithRetry(2, 100).then(me => setUser(me)).catch(() => {});
    
    // Fetch adaptive difficulty setting from server
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
  const skills = SUBJECT_SKILLS["biology"];

  return (
    <ProfileGuard>
      <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)" }}>
        <Navbar user={user ? { name: user.name, role: user.role } : null} />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Link href="/environments" className="flex items-center gap-1 text-sm font-bold" style={{ color: "var(--ink-3)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              البيئات
            </Link>
            <span style={{ color: "var(--border-strong)" }}>›</span>
            <span className="text-sm font-black" style={{ color: "var(--ink)" }}>🔬 الأحياء</span>
            <div className="mr-auto flex items-center gap-2 flex-wrap">
              {(skills as (keyof typeof SKILL_LABELS)[]).map(sk => (
                <span key={sk} className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{ background: SKILL_COLORS[sk] + "22", color: SKILL_COLORS[sk] }}>
                  {SKILL_LABELS[sk].split(" ").pop()} {iqData.skills[sk].score}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {([["dna", "🧬 DNA Match"], ["cell", "🔬 Cell Tap"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className="flex-1 py-3 text-sm font-black rounded-xl transition-all"
                style={{ background: tab === id ? "var(--surface)" : "transparent", color: tab === id ? "var(--ink)" : "var(--ink-3)", boxShadow: tab === id ? "var(--shadow-sm)" : "none" }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "dna" && <DNAMatchGame key="dna" onFinish={refreshIQ} isAdaptive={isAdaptive} />}
          {tab === "cell" && <CellTapGame key="cell" onFinish={refreshIQ} isAdaptive={isAdaptive} />}
        </main>
        <Footer />
      </div>
    </ProfileGuard>
  );
}
