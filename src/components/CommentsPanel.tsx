import React, { useEffect, useRef, useState } from "react";
import { LuX, LuMessageSquarePlus, LuSend } from "react-icons/lu";

export interface CommentPayload {
    quotedText: string;
    note: string;
    savedAt: string; // ISO timestamp
}

interface CommentsPanelProps {
    /** The highlighted text the clinician is commenting on */
    quotedText: string;
    onClose: () => void;
    onSave: (payload: CommentPayload) => Promise<void>;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ quotedText, onClose, onSave }) => {
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const t = setTimeout(() => textareaRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    const handleSave = async () => {
        const trimmed = note.trim();
        if (!trimmed || loading) return;
        setLoading(true);
        try {
            await onSave({ quotedText, note: trimmed, savedAt: new Date().toISOString() });
            setSaved(true);
            setNote("");
            setTimeout(() => { setSaved(false); onClose(); }, 1200);
        } catch (err) {
            console.error("Failed to save comment:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSave(); }
        if (e.key === "Escape") onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 10000,
                    background: "rgba(0,0,0,0.15)",
                    animation: "commentBackdropIn 0.15s ease",
                }}
            />

            {/* Panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "fixed", right: 24, top: "50%",
                    transform: "translateY(-50%)",
                    width: 340, background: "#ffffff", borderRadius: 14,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
                    zIndex: 10001, display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    animation: "commentPanelIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "14px 16px 12px", borderBottom: "1px solid #f3f4f6",
                    display: "flex", alignItems: "center", gap: 8,
                }}>
                    <span style={{
                        width: 28, height: 28, borderRadius: 8, background: "#f0fdf4",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                        <LuMessageSquarePlus size={14} color="#008540" />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }}>
                        Add Comment
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
                            color: "#9ca3af", transition: "color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
                    >
                        <LuX size={15} />
                    </button>
                </div>

                {/* Quoted text — yellow highlight style */}
                <div style={{
                    margin: "12px 16px 0", padding: "10px 12px",
                    background: "#fefce8", borderRadius: 8,
                }}>
                    <p style={{
                        fontSize: 11, fontWeight: 600, color: "#854d0e",
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
                    }}>
                        Selected text
                    </p>
                    <p style={{
                        fontSize: 12, color: "#374151", fontStyle: "italic",
                        lineHeight: 1.6, margin: 0,
                        display: "-webkit-box", WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                        "{quotedText}"
                    </p>
                </div>

                {/* Textarea */}
                <div style={{ padding: "12px 16px 0" }}>
                    <textarea
                        ref={textareaRef}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write your clinical note…"
                        rows={4}
                        style={{
                            width: "100%", resize: "none", border: "1px solid #e5e7eb",
                            borderRadius: 8, padding: "10px 12px", fontSize: 13,
                            color: "#111827", lineHeight: 1.6, outline: "none",
                            transition: "border-color 0.15s, box-shadow 0.15s",
                            boxSizing: "border-box", fontFamily: "inherit",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#008540"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,133,64,0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0", textAlign: "right" }}>
                        ⌘ Enter to save · Esc to cancel
                    </p>
                </div>

                {/* Actions */}
                <div style={{ padding: "12px 16px 16px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 7,
                            border: "1px solid #e5e7eb", background: "#fff", color: "#374151",
                            cursor: "pointer", transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f9fafb")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !note.trim() || saved}
                        style={{
                            padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 7,
                            border: "none",
                            background: saved ? "#16a34a" : loading ? "#9ca3af" : !note.trim() ? "#d1fae5" : "#008540",
                            color: !note.trim() && !saved ? "#6ee7b7" : "#fff",
                            cursor: loading || !note.trim() ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            transition: "background 0.15s",
                        }}
                    >
                        {saved ? "Saved ✓" : loading ? "Saving…" : <><LuSend size={12} />Save</>}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes commentBackdropIn { from{opacity:0} to{opacity:1} }
                @keyframes commentPanelIn {
                    from { opacity:0; transform:translateY(calc(-50% + 12px)); }
                    to   { opacity:1; transform:translateY(-50%); }
                }
            `}</style>
        </>
    );
};

export default CommentsPanel;
