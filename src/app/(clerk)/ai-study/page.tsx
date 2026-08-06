"use client";

import { useState, useEffect, useRef } from "react";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import { ClassicShell } from "@/components/classic/ClassicShell";
import { SHELL } from "@/components/classic/copy";
import { IconHelp } from "@/components/classic/icons";
import { Badge, Card } from "@/components/classic/pieces";
import { motion, AnimatePresence } from "framer-motion";

import "@/styles/classic-tokens.css";
import "@/styles/classic-shell.css";
import "@/styles/classic-components.css";

interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

export default function AIStudyPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);
	const [user, setUser] = useState<{ name: string; role: string } | null>(null);
	const [balanceLabel, setBalanceLabel] = useState<string>("0 جنيه");
	const [unreadCount, setUnreadCount] = useState<number>(0);

	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, loading]);

	useEffect(() => {
		const fetchInitialData = async () => {
			try {
				const [userRes, chatRes, balanceRes, notifRes] = await Promise.all([
					fetch("/api/auth/me", { credentials: "include" }),
					fetch("/api/ai/chat", { credentials: "include" }),
					fetch("/api/student/balance", { credentials: "include" }).catch(() => null),
					fetch("/api/notifications", { credentials: "include" }).catch(() => null),
				]);

				if (userRes.ok) {
					const userData = await userRes.json();
					setUser(userData.user || null);
				}

				if (chatRes.ok) {
					const chatData = await chatRes.json();
					if (chatData.messages) {
						setMessages(chatData.messages);
					}
				}

				if (balanceRes && balanceRes.ok) {
					const bData = await balanceRes.json();
					const pounds = (bData.balance ?? 0) / 100;
					setBalanceLabel(`${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(pounds)} ${SHELL.currency}`);
				}

				if (notifRes && notifRes.ok) {
					const nData = await notifRes.json();
					setUnreadCount(nData.unreadCount ?? 0);
				}
			} catch (error) {
				console.error("Error fetching initial data:", error);
			} finally {
				setInitialLoad(false);
			}
		};

		void fetchInitialData();
	}, []);

	const handleSend = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!input.trim() || loading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setLoading(true);

		try {
			const res = await fetch("/api/ai/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: userMessage.content }),
			});

			if (res.ok) {
				const data = await res.json();
				const aiMessage: Message = {
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: data.message,
				};
				setMessages((prev) => [...prev, aiMessage]);
			} else {
				throw new Error("Failed to send message");
			}
		} catch (error) {
			console.error("Chat error:", error);
			setMessages((prev) => [
				...prev,
				{
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: "عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.",
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	const handleClearChat = async () => {
		if (confirm("هل تريد مسح جميع الرسائل السابقة والحالية؟")) {
			try {
				await fetch("/api/ai/chat", { method: "DELETE" });
				setMessages([]);
			} catch {
				setMessages([]);
			}
		}
	};

	return (
		<ProfileGuard>
			<ClassicShell title="المرشد الدراسي الذكي" balanceLabel={balanceLabel} unreadCount={unreadCount}>
				<div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px]" dir="rtl">
					{/* Header bar */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-[var(--border)]">
						<div>
							<h1 className="text-2xl font-black text-[var(--ink)] flex items-center gap-2" style={{ fontFamily: "var(--font-head)" }}>
								<span className="text-2xl">💡</span> المرشد الدراسي الذكي
							</h1>
							<p className="text-xs text-[var(--ink-2)] mt-0.5">اسأل عن أي مفهوم، مسألة، أو استفسار دراسي في كورسك</p>
						</div>

						<div className="flex items-center gap-3 self-end sm:self-auto">
							<Badge label="متصل الآن 🟢" tone="green" />
							<button
								type="button"
								onClick={handleClearChat}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)] text-xs font-bold transition-all hover:opacity-90 cursor-pointer"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
								<span>مسح المحادثة</span>
							</button>
						</div>
					</div>

					{/* Chat Window Container */}
					<div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm overflow-hidden">
						{/* Messages list */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{initialLoad ? (
								<div className="h-full flex items-center justify-center">
									<div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
								</div>
							) : messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center p-6">
									<div className="w-16 h-16 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center text-3xl mb-4">
										💡
									</div>
									<h3 className="text-lg font-bold text-[var(--ink)] mb-2">أهلاً بك يا {user?.name ? user.name.split(" ")[0] : "بطل"}! 👋</h3>
									<p className="text-xs text-[var(--ink-2)] max-w-md mb-6 leading-relaxed">
										أنا مرشدك الدراسي هنا في منصة Code-UP. جاهز لمساعدتك في فهم المحاضرات وحل الأسئلة والتدريب.
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										<button
											type="button"
											onClick={() => setInput("اشرح لي مفهوم المتغيرات في البرمجة")}
											className="px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--ink)] hover:border-[var(--brand)] transition-colors cursor-pointer"
										>
											💡 اشرح لي مفهوم المتغيرات
										</button>
										<button
											type="button"
											onClick={() => setInput("كيف أستعد للاختبار القادم؟")}
											className="px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs font-medium text-[var(--ink)] hover:border-[var(--brand)] transition-colors cursor-pointer"
										>
											📝 كيف أستعد للاختبار القادم؟
										</button>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									{messages.map((msg) => (
										<motion.div
											initial={{ opacity: 0, y: 8 }}
											animate={{ opacity: 1, y: 0 }}
											key={msg.id}
											className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"}`}
										>
											<div
												className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold shadow-xs ${
													msg.role === "user"
														? "bg-[var(--brand)] text-white"
														: "bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]"
												}`}
											>
												{msg.role === "user" ? (user?.name?.[0] ?? "ط") : "💡"}
											</div>
											<div
												className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
													msg.role === "user"
														? "bg-[var(--brand)] text-white rounded-tr-xs"
														: "bg-[var(--surface-2)] text-[var(--ink)] rounded-tl-xs border border-[var(--border)]"
												}`}
											>
												<div className="whitespace-pre-wrap">{msg.content}</div>
											</div>
										</motion.div>
									))}
									{loading && (
										<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[85%] ml-auto">
											<div className="w-9 h-9 rounded-xl shrink-0 bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)] flex items-center justify-center text-sm">
												💡
											</div>
											<div className="p-3.5 rounded-2xl rounded-tl-xs bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-1.5">
												<div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-bounce" style={{ animationDelay: "0ms" }} />
												<div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-bounce" style={{ animationDelay: "150ms" }} />
												<div className="w-2 h-2 rounded-full bg-[var(--brand)] animate-bounce" style={{ animationDelay: "300ms" }} />
											</div>
										</motion.div>
									)}
									<div ref={messagesEndRef} />
								</div>
							)}
						</div>

						{/* Input Box */}
						<div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
							<form onSubmit={handleSend} className="flex items-center gap-2">
								<input
									type="text"
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder="اسألني أي شيء..."
									className="flex-1 bg-[var(--surface)] text-[var(--ink)] rounded-xl px-4 py-3 border border-[var(--border)] focus:outline-none focus:border-[var(--brand)] text-xs sm:text-sm transition-colors"
									disabled={loading || initialLoad}
								/>
								<button
									type="submit"
									disabled={!input.trim() || loading || initialLoad}
									className="px-4 py-3 rounded-xl bg-[var(--brand)] text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all text-xs cursor-pointer"
								>
									<span>إرسال</span>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
								</button>
							</form>
							<div className="text-center mt-2">
								<span className="text-[10px] text-[var(--ink-3)]">
									الإجابات تقدم لمساعدتك واستكمال استيعاب الدروس والمفاهيم.
								</span>
							</div>
						</div>
					</div>
				</div>
			</ClassicShell>
		</ProfileGuard>
	);
}
