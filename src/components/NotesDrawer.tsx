import React from "react";
import { LuX, LuMessageSquare, LuTrash2 } from "react-icons/lu";
import type { CommentPayload } from "./CommentsPanel";

interface NotesDrawerProps {
    notes: CommentPayload[];
    onClose: () => void;
    onDelete?: (index: number) => void;
}

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
    });
};

const NotesDrawer: React.FC<NotesDrawerProps> = ({ notes, onClose, onDelete }) => {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 10000,
                    background: "rgba(0,0,0,0.15)",
                    animation: "drawerBackdropIn 0.15s ease",
                }}
            />

            {/* Drawer — slides in from the right */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "fixed", right: 0, top: 0, bottom: 0,
                    width: 360,
                    background: "#fff",
                    boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
                    zIndex: 10001,
                    display: "flex", flexDirection: "column",
                    animation: "drawerSlideIn 0.22s cubic-bezier(0.25,0.46,0.45,0.94)",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "18px 20px 14px",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex", alignItems: "center", gap: 10,
                    flexShrink: 0,
                }}>
                    <span style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 3px rgba(0,133,64,0.15)",
                    }}>
                        <LuMessageSquare size={15} color="#008540" />
                    </span>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>
                            Clinical Notes
                        </p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                            {notes.length} {notes.length === 1 ? "note" : "notes"} saved
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: 6, borderRadius: 7, display: "flex", alignItems: "center",
                            color: "#9ca3af", transition: "color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f3f4f6"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
                    >
                        <LuX size={16} />
                    </button>
                </div>

                {/* Notes list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                    {notes.length === 0 ? (
                        <div style={{
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            height: "100%", gap: 10, color: "#9ca3af",
                        }}>
                            <LuMessageSquare size={32} style={{ opacity: 0.3 }} />
                            <p style={{ fontSize: 13, margin: 0 }}>No notes yet</p>
                            <p style={{ fontSize: 11, margin: 0, textAlign: "center", maxWidth: 200 }}>
                                Highlight any text in the report and click "Add comment"
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {notes.map((n, i) => (
                                <NoteCard
                                    key={i}
                                    note={n}
                                    index={i}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes drawerBackdropIn { from{opacity:0} to{opacity:1} }
                @keyframes drawerSlideIn {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0); }
                }
            `}</style>
        </>
    );
};

export default NotesDrawer;

// ─── Note card ────────────────────────────────────────────────────────────────

interface NoteCardProps {
    note: CommentPayload;
    index: number;
    onDelete?: (index: number) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, index, onDelete }) => {
    const [hovered, setHovered] = React.useState(false);
    console.log(note)
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered ? "#fafafa" : "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
                transition: "box-shadow 0.15s, background 0.15s",
                boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
            }}
        >
            {/* Quoted text */}
            <div style={{
                padding: "10px 12px 8px",
                background: "#fefce8",
                borderBottom: "1px solid #fef08a",
                display: "flex", gap: 8, alignItems: "flex-start",
            }}>
                <p style={{
                    fontSize: 11, color: "#854d0e",
                    fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.06em", margin: "0 0 3px", flexShrink: 0,
                    display: "none",
                }} />
                <p style={{
                    fontSize: 11.5, color: "#374151",
                    fontStyle: "italic", lineHeight: 1.55,
                    margin: 0, flex: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}>
                    "{note.quotedText}"
                </p>
            </div>

            {/* Note body + meta */}
            <div style={{ padding: "10px 12px 10px" }}>
                <p style={{
                    fontSize: 12.5, color: "#111827",
                    lineHeight: 1.6, margin: "0 0 8px",
                    whiteSpace: "pre-wrap",
                }}>
                    {note.note}
                </p>
                <div style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{note.editedBy} ~ {formatTime(note.savedAt)}</span>
                    {onDelete && (
                        <button
                            onClick={() => onDelete(index)}
                            style={{
                                background: "transparent", border: "none",
                                cursor: "pointer", padding: "3px 5px",
                                borderRadius: 5, display: "flex", alignItems: "center",
                                color: "#d1d5db",
                                opacity: hovered ? 1 : 0,
                                transition: "opacity 0.15s, color 0.15s, background 0.15s",
                            } as React.CSSProperties}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                            title="Delete note"
                        >
                            <LuTrash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
