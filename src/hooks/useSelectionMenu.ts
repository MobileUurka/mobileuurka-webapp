import { useEffect, useRef, useState } from "react";

export type SelectionState = {
    visible: boolean;
    text: string;
    /** Viewport-relative X — use with position:fixed */
    x: number;
    /** Viewport-relative Y — use with position:fixed */
    y: number;
};

/**
 * Tracks text selections inside `containerRef`.
 *
 * Coordinates are viewport-relative so the menu should use `position: fixed`.
 * On scroll (vertical OR horizontal) and resize the coordinates are
 * recalculated from the live Range so the menu follows the selected word
 * as the page moves in any direction.
 *
 * `menuRef` — attach to the menu DOM node so clicks inside it don't close it.
 */
export default function useSelectionMenu(
    containerRef: React.RefObject<HTMLElement | null>,
    menuRef: React.RefObject<HTMLElement | null>
): SelectionState {
    const [menu, setMenu] = useState<SelectionState>({
        visible: false,
        text: "",
        x: 0,
        y: 0,
    });

    // Keep a stable ref to the active Range so scroll/resize handlers can
    // recompute position without re-registering listeners.
    const rangeRef = useRef<Range | null>(null);
    const menuStateRef = useRef(menu);
    menuStateRef.current = menu;

    // Derive viewport-relative x/y from a Range.
    const coordsFromRange = (range: Range) => {
        const rect = range.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top - 8,
        };
    };

    useEffect(() => {
        const hide = () => {
            rangeRef.current = null;
            setMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        };

        // ── Show on mouseup ───────────────────────────────────────────────────
        const handleMouseUp = () => {
            if (!containerRef.current) return;

            const selection = window.getSelection();

            if (!selection || selection.rangeCount === 0 || selection.toString().trim() === "") {
                hide();
                return;
            }

            const text = selection.toString().trim();
            const range = selection.getRangeAt(0);

            if (!containerRef.current.contains(range.commonAncestorContainer)) {
                hide();
                return;
            }

            // Clone and store the range so scroll/resize can recompute position.
            rangeRef.current = range.cloneRange();

            setMenu({
                visible: true,
                text,
                ...coordsFromRange(range),
            });
        };

        // ── Hide on click outside menu ────────────────────────────────────────
        const handleMouseDown = (e: MouseEvent) => {
            if (!menuStateRef.current.visible) return;
            if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
            hide();
        };

        // ── Follow the word on scroll (vertical + horizontal) and resize ──────
        // capture:true catches scroll on any nested scrollable container,
        // including horizontal ones.
        const handleReposition = () => {
            if (!menuStateRef.current.visible || !rangeRef.current) return;
            const { x, y } = coordsFromRange(rangeRef.current);
            setMenu((prev) => ({ ...prev, x, y }));
        };

        document.addEventListener("mouseup", handleMouseUp);
        document.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("scroll", handleReposition, { capture: true, passive: true });
        window.addEventListener("resize", handleReposition, { passive: true });

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("scroll", handleReposition, { capture: true });
            window.removeEventListener("resize", handleReposition);
        };
    }, [containerRef, menuRef]);

    return menu;
}
