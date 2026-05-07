import { forwardRef, useState } from "react";
import { LuCopy, LuCheck, LuMessageSquarePlus, LuSearch } from "react-icons/lu";

type SelectionMenuProps = {
    menu: {
        visible: boolean;
        text: string;
        /** Viewport-relative X */
        x: number;
        /** Viewport-relative Y */
        y: number;
    };
    onComment?: (text: string) => void;
};

/**
 * Floating context menu rendered with `position: fixed` so it stays anchored
 * to the viewport regardless of scroll position or container nesting.
 *
 * Forward the ref to the outer wrapper so `useSelectionMenu` can detect
 * clicks inside the menu and keep it open.
 */
const SelectionMenu = forwardRef<HTMLDivElement, SelectionMenuProps>(
    ({ menu, onComment }, ref) => {
        const [copied, setCopied] = useState(false);

        if (!menu.visible) return null;

        const handleCopy = () => {
            navigator.clipboard.writeText(menu.text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            });
        };

        const handleComment = () => {
            onComment?.(menu.text);
        };

        const handleSearch = () => {
            window.open(
                `https://www.google.com/search?q=${encodeURIComponent(menu.text)}`,
                "_blank",
                "noopener,noreferrer"
            );
        };

        return (
            <div
                ref={ref}
                style={{
                    // fixed keeps the menu in the viewport regardless of scroll
                    position: "fixed",
                    top: menu.y,
                    left: menu.x,
                    // shift left by half the menu width and up by full menu height
                    transform: "translateX(-50%) translateY(-100%)",
                    zIndex: 9999,
                    userSelect: "none",
                    // entrance animation
                    animation: "selectionMenuIn 0.12s ease-out",
                }}
            >
                {/* Dark pill */}
                <div
                    style={{
                        background: "#1f2937",
                        borderRadius: "10px",
                        boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        minWidth: "148px",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    {/* Copy — with "Copied!" flash */}
                    <MenuButton
                        icon={copied ? <LuCheck size={13} /> : <LuCopy size={13} />}
                        label={copied ? "Copied!" : "Copy"}
                        accent={copied ? "#4ade80" : undefined}
                        onMouseDown={handleCopy}
                    />

                    <Divider />

                    <MenuButton
                        icon={<LuMessageSquarePlus size={13} />}
                        label="Add comment"
                        onMouseDown={handleComment}
                    />

                    <Divider />

                    <MenuButton
                        icon={<LuSearch size={13} />}
                        label="Search Google"
                        onMouseDown={handleSearch}
                    />
                </div>

                {/* Downward caret pointing at the selection */}
                <div
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid #1f2937",
                        margin: "0 auto",
                    }}
                />

                {/* Keyframe injected once */}
                <style>{`
                    @keyframes selectionMenuIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(calc(-100% + 6px)); }
                        to   { opacity: 1; transform: translateX(-50%) translateY(-100%); }
                    }
                `}</style>
            </div>
        );
    }
);

SelectionMenu.displayName = "SelectionMenu";
export default SelectionMenu;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Divider = () => (
    <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "0 10px" }} />
);

type MenuButtonProps = {
    icon: React.ReactNode;
    label: string;
    onMouseDown: () => void;
    accent?: string;
};

function MenuButton({ icon, label, onMouseDown, accent }: MenuButtonProps) {
    return (
        <button
            // preventDefault keeps the browser from clearing the text selection
            onMouseDown={(e) => {
                e.preventDefault();
                onMouseDown();
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "transparent",
                border: "none",
                color: accent ?? "#f3f4f6",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                padding: "9px 14px",
                width: "100%",
                textAlign: "left",
                transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
        >
            <span style={{ opacity: 0.75, display: "flex", color: accent ?? "inherit" }}>
                {icon}
            </span>
            {label}
        </button>
    );
}
