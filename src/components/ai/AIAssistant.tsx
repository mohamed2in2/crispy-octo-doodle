"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

interface ChatAction {
  type: string;
  status: string;
  id?: string;
  error?: string;
}

interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: string | null;
  createdAt?: string;
}

const QUICK_PROMPTS = [
  "حلل أدائي وقولي نقاط ضعفي",
  "اعمللي خطة تدريبية للأسبوع",
  "في إجابة في كويز اتسجلت غلط",
  "مش مرتاح من شرح مدرس معين",
  "أنا بآخد كورس مع حد تاني، اعمللي خطة بديلة",
];

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "أهلاً بيك! أنا مرشدك الذكي على Code-UP 🌟\n\nأنا بشوف كل بياناتك (درجاتك، تقدمك، كورساتك) وممكن أساعدك في:\n• تحليل أداءك ونقاط ضعفك\n• خطة تدريبية مخصصة ليك\n• لو في إجابة اتسجلت غلط — هعمل طلب تعديل للمعلم\n• شكاوى عن مدرس أو محتوى\n• توجيهك لأي حاجة في الموقع\n\nاتكلم معايا براحة!",
};

export function AIAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()).catch(() => null),
      fetch("/api/ai/status").then((r) => r.json()).catch(() => null),
    ])
      .then(([auth, status]) => {
        setIsStudent(auth?.user?.role === "student");
        setAiEnabled(status?.enabled === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "حدث خطأ. حاول مرة تانية." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          actions: data.actions ? JSON.stringify(data.actions) : null,
        },
      ]);

      // Handle navigation actions
      const navAction = (data.actions as ChatAction[] | undefined)?.find(
        (a) => a.type === "navigate"
      );
      if (navAction) {
        // navigate handled separately
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "تعذر الاتصال بالخادم. حاول لاحقاً." },
      ]);
    } finally {
      setSending(false);
    }
  };

  // Don't show on admin/teacher panels or login pages
  const hideOn = [
    "/adminpanel",
    "/login",
    "/signup",
    "/forgot-password",
    "/profile-setup",
  ];
  const shouldHide = hideOn.some((p) => pathname?.startsWith(p));

  if (!authChecked || !isStudent || !aiEnabled || shouldHide) return null;

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => {
            setMessages([WELCOME_MESSAGE]);
            setInput("");
            setSending(false);
            setUnread(false);
            setOpen(true);
          }}
          className="fixed bottom-6 left-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-2xl hover:scale-110 transition-transform flex items-center justify-center group"
          aria-label="مرشد الذكاء الاصطناعي"
        >
          <span className="text-2xl group-hover:animate-bounce">🤖</span>
          {unread && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white" />
          )}
          <span className="absolute -top-12 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            مرشدك الذكي 🌟
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 left-6 right-6 sm:right-auto sm:bottom-6 sm:left-6 z-50 sm:w-[420px] h-[80vh] sm:h-[600px] max-h-[calc(100vh-3rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-base">مرشدك الذكي</h3>
                <p className="text-xs text-white/80">يعرف كل بياناتك ويساعدك</p>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setMessages([]);
                setInput("");
                setSending(false);
              }}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                ابدأ الحوار...
              </div>
            )}
            {messages.map((m, idx) => {
              const actions: ChatAction[] = m.actions
                ? (() => {
                    try {
                      return JSON.parse(m.actions);
                    } catch {
                      return [];
                    }
                  })()
                : [];
              return (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white rounded-br-sm shadow-md"
                        : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm border border-purple-100 dark:border-purple-900/40"
                    }`}
                  >
                    {m.content}
                    {actions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800/40 space-y-1">
                        {actions.map((a, ai) => (
                          <ActionBadge key={ai} action={a} router={router} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-purple-100 dark:border-purple-900/40">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-white dark:bg-slate-900 border-t border-purple-100 dark:border-purple-900/40">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 border-t border-purple-100 dark:border-purple-900/40 bg-white dark:bg-slate-900 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-shadow"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function ActionBadge({ action, router }: { action: ChatAction; router: ReturnType<typeof useRouter> }) {
  if (action.status === "failed") {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
        ⚠️ فشل: {action.error}
      </div>
    );
  }
  if (action.status === "ok" || action.status === "ignored") return null;

  const labels: Record<string, string> = {
    create_grade_request: "🎯 تم إرسال طلب تعديل الدرجة للمعلم",
    create_ticket: "🎫 تم إنشاء تذكرة دعم",
    submit_feedback: "💬 تم تسجيل ملاحظتك",
    navigate: "🔗 توجيه",
  };

  const label = labels[action.type] || action.type;

  if (action.type === "navigate") {
    return (
      <button
        onClick={() => router.push(String((action as ChatAction).id || "/"))}
        className="text-xs text-purple-700 dark:text-purple-300 underline"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded font-medium">
      {label}
    </div>
  );
}
