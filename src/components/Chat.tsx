import React, {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { IoIosSend } from "react-icons/io";
import { HiDotsHorizontal } from "react-icons/hi";
import { LuStethoscope, LuMessageCircle, LuPencilLine, LuX } from "react-icons/lu";
import { api } from "../services/apiClient";
import type { PatientData } from "../types/patient";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMode = "assistant" | "clinical";

interface Message {
  id: string | number;
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  clinical?: {
    problem_list?: string[];
    red_flags?: string[];
    recommendations?: string[];
    citations?: string[];
    disclaimers?: string[];
  };
}

/** Shape of a raw record from GET /chatbot/patient/:patientId */
interface HistoryRecord {
  id: string;
  inquiry: string;
  response: string;
  messageType: string;
  date: string;
}

interface ChatProps {
  patient: PatientData;
  user: { id: string; name?: string; firstName?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nowStr = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Group history records by calendar date label */
function groupByDate(records: HistoryRecord[]): Record<string, HistoryRecord[]> {
  const groups: Record<string, HistoryRecord[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const r of records) {
    const d = new Date(r.date);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    if (!groups[label]) groups[label] = [];
    groups[label].push(r);
  }
  return groups;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ClinicalSection: React.FC<{
  label: string;
  items: string[];
  accent: string;
}> = ({ label, items, accent }) => {
  const [open, setOpen] = useState(true);
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-[10px] font-semibold uppercase tracking-wider ${accent} flex items-center gap-1`}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5 pl-3">
          {items.map((item, i) => (
            <li key={i} className="text-[12px] text-gray-700 leading-snug list-disc ml-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ModeToggle: React.FC<{ mode: ChatMode; onChange: (m: ChatMode) => void }> = ({
  mode,
  onChange,
}) => (
  <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
    <button
      onClick={() => onChange("assistant")}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
        mode === "assistant" ? "bg-white text-[#008540] shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <LuMessageCircle size={12} />
      Assistant
    </button>
    <button
      onClick={() => onChange("clinical")}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
        mode === "clinical" ? "bg-white text-[#ffc187] shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <LuStethoscope size={12} />
      Clinical
    </button>
  </div>
);

// ─── History Panel ────────────────────────────────────────────────────────────

const HistoryPanel: React.FC<{
  patientId: string;
  onClose: () => void;
  onLoad: (records: HistoryRecord[]) => void;
  onNewChat: () => void;
}> = ({ patientId, onClose, onLoad, onNewChat }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/chatbot/patient/${patientId}?limit=100`)
      .then((res: any) => {
        const records: HistoryRecord[] = res?.data?.chatHistory ?? [];
        // API returns newest-first; keep that order
        setHistory(records);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  const grouped = groupByDate(history);

  return (
    <div className="absolute inset-0 z-20 flex">
      {/* Panel */}
      <div className="w-full bg-white flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-800">Chat History</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              title="New chat"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <LuPencilLine size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <LuX size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-1">
              <span>No conversations yet</span>
            </div>
          ) : (
            Object.entries(grouped).map(([label, records]) => (
              <div key={label} className="mb-1">
                <p className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {label}
                </p>
                {records.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onLoad(records);
                      onClose();
                    }}
                    className="w-full text-left px-5 py-2.5 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Title = first ~45 chars of the inquiry */}
                    <p className="text-[13px] text-gray-800 font-medium truncate leading-snug">
                      {r.inquiry.length > 45 ? r.inquiry.slice(0, 45) + "…" : r.inquiry}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      <span
                        className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                          r.messageType === "clinical"
                            ? "bg-[#fff7f0] text-[#c47a3a]"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {r.messageType}
                      </span>
                      {r.response.length > 40 ? r.response.slice(0, 40) + "…" : r.response}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Chat: React.FC<ChatProps> = ({ patient, user }) => {
  const [mode, setMode] = useState<ChatMode>("assistant");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (m: ChatMode) => {
    setMode(m);
    setMessages([]);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  /** Load a group of history records back into the message list */
  const handleLoadHistory = (records: HistoryRecord[]) => {
    // Records come newest-first from the API; reverse to show oldest first
    const sorted = [...records].reverse();
    const rebuilt: Message[] = [];
    for (const r of sorted) {
      const ts = new Date(r.date).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      rebuilt.push({ id: `${r.id}-u`, text: r.inquiry, sender: "user", timestamp: ts });
      rebuilt.push({ id: `${r.id}-b`, text: r.response, sender: "bot", timestamp: ts });
    }
    setMessages(rebuilt);
    // Switch mode to match the loaded conversation
    const firstType = sorted[0]?.messageType;
    if (firstType === "clinical" || firstType === "assistant") setMode(firstType);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now(),
      text,
      sender: "user",
      timestamp: nowStr(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    resetTextareaHeight();
    setIsLoading(true);

    try {
      let botText = "";
      let clinicalData: Message["clinical"] | undefined;

      if (mode === "assistant") {
        const res = await api.post("/chatbot/assistant", {
          message: text,
          patientId: patient.id,
        });
        botText = res?.data?.response ?? "I couldn't generate a response. Please try again.";
      } else {
        const res = await api.post(`/chatbot/clinical/patient/${patient.id}`, {
          question: text,
        });
        const d = res?.data;
        botText = d?.answer ?? "I couldn't generate a clinical response. Please try again.";
        clinicalData = {
          problem_list: d?.problem_list,
          red_flags: d?.red_flags,
          recommendations: d?.recommendations,
          citations: d?.citations,
          disclaimers: d?.disclaimers,
        };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: botText,
          sender: "bot",
          timestamp: nowStr(),
          clinical: clinicalData,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text:
            err?.message === "Authentication required"
              ? "Session expired. Please log in again."
              : "Something went wrong. Please try again.",
          sender: "bot",
          timestamp: nowStr(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const adjustTextareaHeight = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const t = e.target;
    t.style.height = "auto";
    t.style.height = `${Math.min(t.scrollHeight, 150)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isClinical = mode === "clinical";
  const accentColor = isClinical ? "text-[#ffc187]" : "text-[#008540]";
  const sendBtnColor = isClinical ? "bg-[#ffc187]" : "bg-[#008540]";
  const dotColor = isClinical ? "bg-[#ffc187]" : "bg-[#79b49a]";

  return (
    <div className="flex flex-col h-full lg:h-[95%] mt-7.5 w-full bg-[#F6F6F6] rounded-xl overflow-hidden relative">

      {/* ── History panel (slides over the chat) ── */}
      {showHistory && (
        <HistoryPanel
          patientId={patient.id}
          onClose={() => setShowHistory(false)}
          onLoad={handleLoadHistory}
          onNewChat={() => {
            setMessages([]);
            setInput("");
            setShowHistory(false);
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 z-10 bg-[#F6F6F6]">
        <span className="font-semibold text-sm text-gray-800">Sabi</span>
        <div className="flex items-center gap-3">
          <ModeToggle mode={mode} onChange={handleModeChange} />
          <button
            onClick={() => setShowHistory(true)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            title="Chat history"
          >
            <HiDotsHorizontal className="text-xl" />
          </button>
        </div>
      </div>

      {/* ── Mode strip ── */}
      <div
        className={`px-5 py-2 text-[11px] border-b border-gray-100 ${
          isClinical ? "bg-[#fff7f0] text-[#c47a3a]" : "bg-green-50 text-green-700"
        }`}
      >
        {isClinical
          ? `🩺 Clinical mode — answers are grounded in ${patient?.name}'s patient record`
          : "💬 Assistant mode — general medical Q&A, no patient context"}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-10 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-[#f3eee7] rounded-2xl flex items-center justify-center mb-4">
              <img src="/images/logo.png" alt="Logo" className="w-1/2" />
            </div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-[#e6d7c8] to-[#c2c2c2] bg-clip-text text-transparent">
              Hi, {user?.name?.split(" ")[0] || user?.firstName || "User"}
            </h3>
            <h4 className="text-gray-500 mt-1 text-sm">
              {isClinical ? `Ask me anything about ${patient?.name}` : "How can I help you today?"}
            </h4>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              {(isClinical
                ? [
                    "Summarise this patient's risk factors",
                    "What do her latest vitals suggest?",
                    "Are there any red flags I should act on?",
                  ]
                : [
                    "What are warning signs of pre-eclampsia?",
                    "When should I refer for specialist care?",
                    "Explain gestational diabetes management",
                  ]
              ).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    textareaRef.current?.focus();
                  }}
                  className={`text-left text-[12px] px-4 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 text-gray-600 hover:text-gray-900 transition-all ${accentColor}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed overflow-hidden wrap-break-word ${
                    msg.sender === "user"
                      ? isClinical
                        ? "bg-[#ffc187] text-white rounded-br-sm"
                        : "bg-[#79b49a] text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h3: ({ ...props }) => <h3 className="text-sm font-bold my-1" {...props} />,
                      p: ({ ...props }) => <p className="my-1 wrap-break-word" {...props} />,
                      ul: ({ ...props }) => <ul className="ml-4 list-disc space-y-1" {...props} />,
                      strong: ({ ...props }) => <strong className="font-semibold text-inherit" {...props} />,
                      a: ({ ...props }) => <a className="break-all underline" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>

                  {msg.clinical && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      <ClinicalSection label="Problem List" items={msg.clinical.problem_list ?? []} accent="text-orange-600" />
                      <ClinicalSection label="Red Flags" items={msg.clinical.red_flags ?? []} accent="text-red-600" />
                      <ClinicalSection label="Recommendations" items={msg.clinical.recommendations ?? []} accent="text-[#c47a3a]" />
                      <ClinicalSection label="Citations" items={msg.clinical.citations ?? []} accent="text-gray-500" />
                      {msg.clinical.disclaimers?.length ? (
                        <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                          {msg.clinical.disclaimers[0]}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 tracking-tight">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start animate-in fade-in duration-300">
                <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
                  <div className={`w-1.5 h-1.5 ${dotColor} rounded-full animate-bounce [animation-delay:-0.3s]`} />
                  <div className={`w-1.5 h-1.5 ${dotColor} rounded-full animate-bounce [animation-delay:-0.15s]`} />
                  <div className={`w-1.5 h-1.5 ${dotColor} rounded-full animate-bounce`} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="p-4 border-t border-gray-50">
        <div className="flex items-end gap-3">
          <div className="flex-1 flex items-end bg-white rounded-[24px] px-2 py-1 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={adjustTextareaHeight}
              onKeyDown={handleKeyDown}
              placeholder={
                isClinical
                  ? `Ask about ${patient?.name?.split(" ")[0]}...`
                  : "Ask a medical question..."
              }
              rows={1}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm px-3 py-2.5 resize-none max-h-40 overflow-y-auto"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-12 h-12 ${sendBtnColor} text-white rounded-full flex items-center justify-center hover:brightness-95 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shrink-0`}
          >
            <IoIosSend size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
