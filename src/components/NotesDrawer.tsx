import React from "react";
import { LuX, LuMessageSquare, LuTrash2, LuExternalLink } from "react-icons/lu";
import type { CommentPayload } from "./CommentsPanel";

export interface VersionedComment extends CommentPayload {
    commentId?: string;
    documentId: string;
    versionLabel: string;
    isCurrentVersion: boolean;
}

interface NotesDrawerProps {
    notes: VersionedComment[];
    onClose: () => void;
    onDelete?: (commentId: string) => void;
    onGoToVersion?: (documentId: string) => void;
}

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
    });
};

const NotesDrawer: React.FC<NotesDrawerProps> = ({ notes, onClose, onDelete, onGoToVersion }) => {
    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 10000,
                    background: "rgba(0,0,0,0.15)",
                    animation: "drawerBackdropIn 0.15s ease",
                }}
            />

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
                            {notes.length} {notes.length === 1 ? "note" : "notes"} across all versions
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: 6, borderRadius: 7, display: "flex", alignItems: "center",
                            color: "#9ca3af",
                        }}
                    >
                        <LuX size={16} />
                    </button>
                </div>

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
                                Highlight any text in the latest report and click &quot;Add comment&quot;
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {notes.map((note) => (
                                <NoteCard
                                    key={note.commentId ?? `${note.documentId}-${note.savedAt}`}
                                    note={note}
                                    onDelete={onDelete}
                                    onGoToVersion={onGoToVersion}
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

interface NoteCardProps {
    note: VersionedComment;
    onDelete?: (commentId: string) => void;
    onGoToVersion?: (documentId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onDelete, onGoToVersion }) => {
    const [hovered, setHovered] = React.useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered ? "#fafafa" : "#fff",
                border: note.isCurrentVersion ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "hidden",
                transition: "box-shadow 0.15s, background 0.15s",
                boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.07)" : "none",
            }}
        >
            <div style={{
                padding: "8px 12px",
                background: note.isCurrentVersion ? "#f0fdf4" : "#f9fafb",
                borderBottom: "1px solid #f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
                <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: note.isCurrentVersion ? "#008540" : "#6b7280",
                }}>
                    {note.versionLabel}
                    {note.isCurrentVersion ? " · viewing" : ""}
                </span>
                {!note.isCurrentVersion && onGoToVersion && (
                    <button
                        type="button"
                        onClick={() => onGoToVersion(note.documentId)}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: 10, fontWeight: 600, color: "#008540",
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: "2px 4px", borderRadius: 4,
                        }}
                    >
                        <LuExternalLink size={11} />
                        View on report
                    </button>
                )}
            </div>

            <div style={{
                padding: "10px 12px 8px",
                background: "#fefce8",
                borderBottom: "1px solid #fef08a",
            }}>
                <p style={{
                    fontSize: 11.5, color: "#374151",
                    fontStyle: "italic", lineHeight: 1.55,
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}>
                    &quot;{note.quotedText}&quot;
                </p>
            </div>

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
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>
                        {note.editedBy} · {formatTime(note.savedAt)}
                    </span>
                    {note.isCurrentVersion && note.commentId && onDelete && (
                        <button
                            onClick={() => onDelete(note.commentId!)}
                            style={{
                                background: "transparent", border: "none",
                                cursor: "pointer", padding: "3px 5px",
                                borderRadius: 5, display: "flex", alignItems: "center",
                                color: "#d1d5db",
                                opacity: hovered ? 1 : 0,
                            }}
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
