"use client";

import { useEffect, useRef, useState } from "react";
import {
  Report,
  Comment,
  GRAVITY_META,
  TYPE_LABELS,
  CATEGORY_LABELS,
  REACTION_EMOJIS,
} from "@/lib/types";
import {
  MessageCircle,
  MapPin,
  ThumbsUp,
  Clock,
  Share2,
  BadgeCheck,
  ShieldCheck,
  Siren,
  Send,
  Loader2,
} from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

function formatAgo(date: Date): string {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function WhatsAppIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function ReportCard({
  report,
  onUpvote,
  onUpdateReport,
  commentCount,
  onCommentCount,
}: {
  report: Report;
  onUpvote?: (id: string, upvotes: number) => void;
  onUpdateReport?: (report: Report) => void;
  commentCount?: number;
  onCommentCount?: (id: string, count: number) => void;
}) {
  const meta = GRAVITY_META[report.gravity];
  const defaultPhone = process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP || "";
  const targetPhone = report.contactPhone || defaultPhone;
  const waLink = targetPhone ? buildWhatsAppLink(targetPhone, report) : "";

  const reactions = report.reactions ?? {};

  const [threadOpen, setThreadOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const origin = typeof window !== "undefined" ? location.origin : "";
  const shareUrl = `${origin}?rc=${report.id}`;
  const shareText = `🚨 ${GRAVITY_META[report.gravity].label} · ${CATEGORY_LABELS[report.category]} · ${report.title}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&src=emergiayuda`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const [reactError, setReactError] = useState("");
  const [myReactions, setMyReactions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`react:${report.id}`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareOpen && shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    if (shareOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [shareOpen]);

  async function openThread() {
    if (threadOpen) {
      setThreadOpen(false);
      return;
    }
    setThreadOpen(true);
    setLoadingComments(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/reports/${report.id}/comments`);
      const data = (await res.json()) as { comments?: Comment[] };
      setComments(data.comments ?? []);
      onCommentCount?.(report.id, (data.comments ?? []).length);
    } catch {
      setCommentError("No se pudieron cargar los comentarios");
    } finally {
      setLoadingComments(false);
    }
  }

  async function sendComment() {
    const content = commentText.trim();
    if (!content || sendingComment) return;
    setSendingComment(true);
    setCommentError("");
    try {
      const res = await fetch(`/api/reports/${report.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as { comment?: Comment; error?: string };
      if (!res.ok) {
        setCommentError(data.error ?? "Error al publicar");
        return;
      }
      if (!data.comment) return;
      setComments((prev) => [...prev, data.comment!]);
      onCommentCount?.(report.id, comments.length + 1);
      setCommentText("");
    } catch {
      setCommentError("Error de red al publicar");
    } finally {
      setSendingComment(false);
    }
  }

  async function toggleReaction(emoji: string) {
    const on = !myReactions.includes(emoji);
    const delta = on ? 1 : -1;
    const prevReport = report;
    setMyReactions((prev) => {
      const next = on ? [...prev, emoji] : prev.filter((e) => e !== emoji);
      try {
        localStorage.setItem(`react:${report.id}`, JSON.stringify(next));
      } catch {
        /* almacenamiento no disponible */
      }
      return next;
    });
    const optimistic: Report = {
      ...report,
      reactions: {
        ...reactions,
        [emoji]: Math.max(0, (reactions[emoji] ?? 0) + delta),
      },
    };
    onUpdateReport?.(optimistic);
    setReactError("");
    try {
      const res = await fetch(`/api/reports/${report.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, delta }),
      });
      if (res.ok) {
        const data = (await res.json()) as { report: Report };
        onUpdateReport?.(data.report);
      } else if (res.status === 401) {
        setReactError("Inicia sesión para reaccionar");
        onUpdateReport?.(prevReport);
        setMyReactions((prev) =>
          on ? prev.filter((e) => e !== emoji) : [...prev, emoji],
        );
      } else {
        onUpdateReport?.(prevReport);
        setMyReactions((prev) =>
          on ? prev.filter((e) => e !== emoji) : [...prev, emoji],
        );
      }
    } catch {
      onUpdateReport?.(prevReport);
      setMyReactions((prev) =>
        on ? prev.filter((e) => e !== emoji) : [...prev, emoji],
      );
    }
  }

  return (
    <article className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: meta.color }}
            title={`Gravedad ${meta.label}`}
          >
            {report.gravity === "critica" ? <Siren size={17} /> : <MapPin size={17} />}
          </span>
          <div>
            <p className="text-xs font-semibold" style={{ color: meta.color }}>
              {meta.label} · {CATEGORY_LABELS[report.category]}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-gray-400">
              <Clock size={10} /> {formatAgo(report.createdAt)}
              {report.createdByName && (
                <span className="truncate"> · {report.createdByName}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
            {TYPE_LABELS[report.type]}
          </span>
          {report.verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-600"
              title={
                report.verifiedBy
                  ? `Verificado por ${report.verifiedBy}`
                  : "Información verificada"
              }
            >
              <ShieldCheck size={12} /> Verificado
            </span>
          )}
          {report.status === "resuelto" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
              <BadgeCheck size={12} /> Resuelto
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-sm font-bold leading-snug text-gray-900">
        {report.title}
      </h3>
      {report.description && (
        <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-gray-600">
          {report.description}
        </p>
      )}

      {report.address && (
        <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
          <MapPin size={12} /> {report.address}
        </p>
      )}

      {report.image && (
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.image}
            alt={`Foto de ${report.title}`}
            className="max-h-64 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {REACTION_EMOJIS.map((emoji) => {
          const count = reactions[emoji] ?? 0;
          const active = myReactions.includes(emoji);
          const show = count > 0 || active;
          if (!show) return null;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              title="Reaccionar"
              className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition active:scale-95 ${
                active
                  ? "border-blue-300 bg-blue-50 font-semibold"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
        {reactError && (
          <p className="w-full text-[11px] font-medium text-amber-600">
            {reactError}
          </p>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {onUpvote && (
          <button
            onClick={() => onUpvote(report.id, report.upvotes + 1)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-50 px-3 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
            title="Me gusta"
          >
            <ThumbsUp size={13} /> {report.upvotes}
          </button>
        )}

        <button
          onClick={openThread}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-indigo-50 px-2.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
          aria-expanded={threadOpen}
          title="Comentarios"
        >
          <MessageCircle size={14} />
          {commentCount !== undefined && commentCount > 0 && (
            <span className="tabular-nums">{commentCount}</span>
          )}
        </button>

        <div className="relative inline-flex items-center" ref={shareRef}>
        <button
          onClick={() => setShareOpen(!shareOpen)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition hover:bg-violet-100"
          title="Compartir"
          aria-expanded={shareOpen}
        >
          <Share2 size={14} />
        </button>

        {shareOpen && (
          <div className="animate-in fade-in-0 zoom-in-95 absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
            >
              <span>📋</span> Copiar enlace
            </button>
            <a
              href={fbUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                navigator.clipboard?.writeText(`${shareText}\n\n${shareUrl}`);
                alert("Se abrirá Facebook con el enlace del reporte.\nInfo del reporte copiada: " + shareText);
                setShareOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
            >
              <span>📘</span> Facebook
            </a>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShareOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-green-600 hover:bg-green-50"
            >
              <span>💚</span> WhatsApp
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setShareOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-sky-600 hover:bg-sky-50"
            >
              <span>✈️</span> Telegram
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
                alert("Instagram no abre directamente. Enlace copiado. Pega en tu historia o publicación.");
                setShareOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-pink-600 hover:bg-pink-50"
            >
              <span>📷</span> Instagram
            </button>
          </div>
        )}
      </div>

        <a
          href={`https://www.google.com/maps?q=${report.lat},${report.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition hover:bg-blue-100"
          title="Cómo llegar"
        >
          <MapPin size={14} />
        </a>

        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition hover:bg-green-200"
            title="WhatsApp"
          >
            <WhatsAppIcon size={15} />
          </a>
        ) : (
          <span className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <WhatsAppIcon size={15} />
          </span>
        )}
      </div>

      {threadOpen && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
            {loadingComments && (
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={13} className="animate-spin" /> Cargando…
              </p>
            )}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs text-slate-400">
                Sin comentarios todavía. Sé el primero en aportar información.
              </p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-white p-2.5 shadow-sm">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                    {c.authorName.charAt(0).toUpperCase()}
                  </span>
                  {c.authorName}
                  <span className="ml-auto font-normal text-slate-400">
                    {formatAgo(c.createdAt)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                  {c.content}
                </p>
              </div>
            ))}
          </div>

          {commentError && (
            <p className="mt-2 text-[11px] font-medium text-amber-600">
              {commentError}
            </p>
          )}

          <div className="mt-2.5 space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
              rows={2}
              maxLength={500}
              placeholder="Aporta información o ayuda…"
              className="min-h-0 w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none transition focus:border-blue-500"
            />
            <button
              onClick={sendComment}
              disabled={sendingComment || !commentText.trim()}
              className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              {sendingComment ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Publicar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}