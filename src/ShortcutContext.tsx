"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// Hook to check if an input is active (to prevent firing shortcuts while typing)
export const useIsInputActive = () => {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const checkActive = () => {
            const element = document.activeElement;
            const isInput =
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element?.getAttribute("contenteditable") === "true";
            setIsActive(isInput);
        };

        document.addEventListener("focusin", checkActive);
        document.addEventListener("focusout", checkActive);

        return () => {
            document.removeEventListener("focusin", checkActive);
            document.removeEventListener("focusout", checkActive);
        };
    }, []);

    return isActive;
};

interface Shortcut {
    combo: string; // e.g. "Ctrl+S", "Shift+A", "P"
    action: (e: KeyboardEvent) => void;
    scope?: string; // Optional scope (e.g., "flowchart", "global")
    description?: string;
}

interface ShortcutContextType {
    registerShortcut: (combo: string, action: (e: KeyboardEvent) => void, scope?: string, description?: string) => () => void;
    activeScope: string;
    setActiveScope: (scope: string) => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(
    undefined
);

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [activeScope, setActiveScope] = useState<string>("global");
    const isInputActive = useIsInputActive();

    const registerShortcut = useCallback(
        (combo: string, action: (e: KeyboardEvent) => void, scope: string = "global", description?: string) => {
            const newShortcut = { combo: combo.toLowerCase(), action, scope, description };
            setShortcuts((prev) => [...prev, newShortcut]);

            // Return unsubscribe function
            return () => {
                setShortcuts((prev) => prev.filter((s) => s !== newShortcut));
            };
        },
        []
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Build the combo string from the event
            const keys: string[] = [];
            if (e.ctrlKey) keys.push("ctrl");
            if (e.shiftKey) keys.push("shift");
            if (e.altKey) keys.push("alt");
            if (e.metaKey) keys.push("meta");
            
            // Don't add modifier keys themselves to the end
            if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
                keys.push(e.key.toLowerCase());
            }

            const currentCombo = keys.join("+");

            // Find matching shortcuts
            const matches = shortcuts.filter(
                (s) => s.combo === currentCombo
            );

            // Filter by scope
            // Priority: Active scope > Global
            const scopedMatch = matches.find((s) => s.scope === activeScope);
            const globalMatch = matches.find((s) => s.scope === "global");

            const match = scopedMatch || globalMatch;

            if (match) {
                // If it's a single key shortcut (no modifiers) and user is typing, ignore it
                const hasModifiers = e.ctrlKey || e.altKey || e.metaKey; // Shift is tricky, sometimes acceptable (Shift+A)
                
                // Allow Shift-only shortcuts or no-modifier shortcuts ONLY if not typing in input
                // EXCEPT if it's a specific functional key like F5? 
                // For now: block non-Ctrl/Alt shortcuts if input is active.
                if (isInputActive && !hasModifiers) {
                    // Function keys like F1-F12 are usually okay
                    if (!e.key.startsWith("F") || e.key.length === 1) {
                         return;
                    }
                }

                // If user is typing in editor, we generally want to block single letters
                // But Ctrl+S should always work.
                
                e.preventDefault();
                match.action(e);
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }
    }, [shortcuts, activeScope, isInputActive]);

    const contextValue = React.useMemo(() => ({ registerShortcut, activeScope, setActiveScope }), [registerShortcut, activeScope, setActiveScope]);

    return (
        <ShortcutContext.Provider value={contextValue}>
            {children}
        </ShortcutContext.Provider>
    );
};

export const useShortcut = () => {
    const context = useContext(ShortcutContext);
    if (!context) {
        throw new Error("useShortcut must be used within a ShortcutProvider");
    }
    return context;
};
