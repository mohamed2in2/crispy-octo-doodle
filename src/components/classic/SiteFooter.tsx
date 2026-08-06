"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { SHELL } from "./copy";
import { IconSparkle } from "./icons";
import "@/styles/classic-shell.css";

interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
}

const SOCIAL: Array<{ label: string; href: string }> = [
	{ label: SHELL.facebook, href: "https://facebook.com" },
	{ label: SHELL.instagram, href: "https://instagram.com" },
	{ label: SHELL.youtube, href: "https://youtube.com" },
	{ label: SHELL.tiktok, href: "https://tiktok.com" },
];

export function SiteFooter() {
	const year = new Date().getFullYear();

	return (
		<footer className="c-footer">
			<div className="c-footer__inner">
				<div className="c-footer__brand">
					<span className="c-footer__logo">Code-UP</span>
					<p className="c-footer__tagline">{SHELL.tagline}</p>
				</div>

				<div>
					<h2 className="c-footer__heading">{SHELL.pages}</h2>
					<ul className="c-footer__list">
						<li>
							<Link className="c-footer__link" href="/account/home">
								{SHELL.home}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/courses">
								{SHELL.courses}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/account/financial">
								{SHELL.financial}
							</Link>
						</li>
						<li>
							<Link className="c-footer__link" href="/terms">
								{SHELL.help}
							</Link>
						</li>
					</ul>
				</div>

				<div>
					<h2 className="c-footer__heading">{SHELL.followUs}</h2>
					<ul className="c-footer__list">
						{SOCIAL.map((item) => (
							<li key={item.label}>
								<a
									className="c-footer__link"
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
								>
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>

			<p className="c-footer__copy">
				{SHELL.rightsReserved} © {year}
			</p>
		</footer>
	);
}

export function FloatingAssistant() {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [initialLoad, setInitialLoad] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		if (isOpen) {
			scrollToBottom();
		}
	}, [isOpen, messages, loading]);

	useEffect(() => {
		if (isOpen && messages.length === 0 && !initialLoad) {
			setInitialLoad(true);
			fetch("/api/ai/chat", { credentials: "include" })
				.then((r) => (r.ok ? r.json() : null))
				.then((data) => {
					if (data?.messages) {
						setMessages(data.messages);
					}
				})
				.catch(() => {});
		}
	}, [isOpen, messages.length, initialLoad]);

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
				setMessages((prev) => [
					...prev,
					{
						id: (Date.now() + 1).toString(),
						role: "assistant",
						content: data.message,
					},
				]);
			} else {
				throw new Error("Failed to send message");
			}
		} catch {
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
		<>
			{/* Floating Chat Modal */}
			{isOpen ? (
				<div className="c-ai-modal" dir="rtl">
					{/* Header */}
					<div className="c-ai-modal__header">
						<div className="c-ai-modal__header-info">
							<span className="c-ai-modal__header-icon">💡</span>
							<div>
								<h3 className="c-ai-modal__title">{SHELL.ai}</h3>
								<span className="c-ai-modal__status">متصل الآن 🟢</span>
							</div>
						</div>

						<div className="c-ai-modal__header-tools">
							<button
								type="button"
								onClick={handleClearChat}
								title="مسح المحادثة"
								className="c-ai-modal__btn-clear"
							>
								🗑️ مسح
							</button>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								aria-label="إغلاق"
								className="c-ai-modal__btn-close"
							>
								✕
							</button>
						</div>
					</div>

					{/* Messages Body */}
					<div className="c-ai-modal__body">
						{messages.length === 0 ? (
							<div className="c-ai-modal__empty">
								<div className="c-ai-modal__avatar">💡</div>
								<h4 className="c-ai-modal__greeting">أهلاً بك! 👋</h4>
								<p className="c-ai-modal__desc">
									أنا مرشدك الدراسي الذكي. اسألني عن أي جزئية في الشرح أو الكورس!
								</p>
								<div className="c-ai-modal__prompts">
									<button
										type="button"
										onClick={() => setInput("اشرح لي مفهوم المتغيرات في البرمجة")}
										className="c-ai-modal__prompt"
									>
										💡 اشرح لي مفهوم المتغيرات
									</button>
									<button
										type="button"
										onClick={() => setInput("كيف أستعد للاختبار القادم؟")}
										className="c-ai-modal__prompt"
									>
										📝 كيف أستعد للاختبار القادم؟
									</button>
								</div>
							</div>
						) : (
							<>
								{messages.map((msg) => (
									<div
										key={msg.id}
										className={`c-ai-modal__msg ${
											msg.role === "user" ? "c-ai-modal__msg--user" : "c-ai-modal__msg--assistant"
										}`}
									>
										<div className="c-ai-modal__bubble">{msg.content}</div>
									</div>
								))}
								{loading && (
									<div className="c-ai-modal__msg c-ai-modal__msg--assistant">
										<div className="c-ai-modal__bubble">جارٍ التفكير... 💡</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</>
						)}
					</div>

					{/* Input Footer */}
					<form onSubmit={handleSend} className="c-ai-modal__footer">
						<input
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="اسألني أي شيء..."
							disabled={loading}
							className="c-ai-modal__input"
						/>
						<button
							type="submit"
							disabled={!input.trim() || loading}
							className="c-ai-modal__send"
						>
							إرسال
						</button>
					</form>
				</div>
			) : null}

			{/* Floating Teal Trigger Button */}
			<button
				type="button"
				className="c-ai-float"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-label={SHELL.ai}
				aria-expanded={isOpen}
			>
				<IconSparkle size={20} />
				<span className="c-ai-float__label">{SHELL.ai}</span>
			</button>
		</>
	);
}
