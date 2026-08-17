/**
 * MentionTextarea
 *
 * A textarea that intercepts the "@" character and shows a dropdown of staff
 * members fetched from the /users endpoint. Selecting a name inserts the
 * mention inline and records the staff member in an `assignedTo` list that
 * is passed back to the parent via `onAssignedChange`.
 *
 * Usage:
 *   <MentionTextarea
 *     value={notes}
 *     onChange={setNotes}
 *     assignedTo={assignedTo}
 *     onAssignedChange={setAssignedTo}
 *     placeholder="Add notes... type @ to assign someone"
 *     rows={4}
 *   />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { userService, type User } from '../services/userServices';

export interface AssignedMember {
    id: string;
    name: string;
    email: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    assignedTo: AssignedMember[];
    onAssignedChange: (assigned: AssignedMember[]) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    disabled?: boolean;
}

export default function MentionTextarea({
    value,
    onChange,
    assignedTo,
    onAssignedChange,
    placeholder = 'Add notes... type @ to assign someone',
    rows = 4,
    className = '',
    disabled = false,
}: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Dropdown state
    const [showDropdown, setShowDropdown] = useState(false);
    const [query, setQuery] = useState('');           // text typed after @
    const [atIndex, setAtIndex] = useState(-1);       // caret position of the @ sign
    // const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Staff list
    const [allStaff, setAllStaff] = useState<User[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [staffError, setStaffError] = useState(false);

    // Fetch staff once on mount
    useEffect(() => {
        let cancelled = false;
        setLoadingStaff(true);
        userService.getUsers()
            .then(users => {
                if (!cancelled) setAllStaff(users ?? []);
            })
            .catch(() => {
                if (!cancelled) setStaffError(true);
            })
            .finally(() => {
                if (!cancelled) setLoadingStaff(false);
            });
        return () => { cancelled = true; };
    }, []);

    // Filter by what's been typed after @
    const filtered = allStaff.filter(u => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = u.email.toLowerCase();
        const q = query.toLowerCase();
        return fullName.includes(q) || email.includes(q);
    }).slice(0, 8);

    // Position the dropdown using fixed positioning so it escapes any overflow:hidden parent
    const positionDropdown = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        // const rect = ta.getBoundingClientRect();
        // setDropdownPos({
        //     top: rect.bottom + window.scrollY + 4,
        //     left: rect.left + window.scrollX,
        // });
    }, []);

    const handleKeyUp = useCallback((_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const ta = textareaRef.current;
        if (!ta) return;

        const caret = ta.selectionStart ?? 0;
        const textBefore = ta.value.slice(0, caret);

        // Find last @ that isn't preceded by a word char (to avoid emails)
        const match = textBefore.match(/(?:^|[\s\n])@(\w*)$/);

        if (match) {
            const newQuery = match[1];
            const newAtIndex = textBefore.lastIndexOf('@');
            setQuery(newQuery);
            setAtIndex(newAtIndex);
            setShowDropdown(true);
            positionDropdown();
        } else {
            setShowDropdown(false);
        }
    }, [positionDropdown]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showDropdown && (e.key === 'Escape')) {
            setShowDropdown(false);
            e.preventDefault();
        }
    };

    const insertMention = (staff: User) => {
        const ta = textareaRef.current;
        if (!ta || atIndex === -1) return;

        const fullName = `${staff.firstName} ${staff.lastName}`;
        const before = value.slice(0, atIndex);
        const caret = ta.selectionStart ?? atIndex;
        const after = value.slice(caret);

        // Replace "@query" with "@FullName "
        const newValue = `${before}@${fullName} ${after}`;
        onChange(newValue);

        // Move caret after inserted mention
        const newCaret = atIndex + fullName.length + 2; // +2 for @ and space
        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(newCaret, newCaret);
        });

        // Add to assignedTo (deduplicate)
        const member: AssignedMember = {
            id: staff.id,
            name: fullName,
            email: staff.email,
        };
        if (!assignedTo.some(a => a.id === staff.id)) {
            onAssignedChange([...assignedTo, member]);
        }

        setShowDropdown(false);
        setQuery('');
        setAtIndex(-1);
    };

    // Close dropdown on outside click
    useEffect(() => {
        if (!showDropdown) return;
        const handler = (e: MouseEvent) => {
            if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showDropdown]);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815] resize-none disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            />

            {/* Assigned badges */}
            {assignedTo.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {assignedTo.map(member => (
                        <span
                            key={member.id}
                            className="inline-flex items-center gap-1 bg-[#984815]/10 text-[#984815] text-xs font-medium px-2 py-0.5 rounded-full"
                        >
                            <span className="w-4 h-4 rounded-full bg-[#984815] text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                            </span>
                            {member.name}
                            <button
                                type="button"
                                onClick={() => onAssignedChange(assignedTo.filter(a => a.id !== member.id))}
                                className="ml-0.5 hover:text-red-500 transition leading-none"
                                title="Remove assignment"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* @ mention dropdown — fixed so it escapes overflow:hidden parents */}
            {showDropdown && (
                <div
                    className="fixed z-9999 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[220px] max-w-[320px]"
                >
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-medium text-gray-400 uppercase tracking-wide flex items-center justify-between">
                        <span>Assign to staff</span>
                        <span className="text-gray-300 normal-case font-normal">type to filter</span>
                    </div>

                    {loadingStaff && (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">
                            Loading staff...
                        </div>
                    )}

                    {!loadingStaff && staffError && (
                        <div className="px-3 py-3 text-xs text-red-400 text-center">
                            Could not load staff
                        </div>
                    )}

                    {!loadingStaff && !staffError && filtered.length === 0 && (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">
                            No staff found{query ? ` matching "${query}"` : ''}
                        </div>
                    )}

                    {!loadingStaff && filtered.map(staff => {
                        const fullName = `${staff.firstName} ${staff.lastName}`;
                        const isAlreadyAssigned = assignedTo.some(a => a.id === staff.id);
                        return (
                            <button
                                key={staff.id}
                                type="button"
                                onMouseDown={e => {
                                    // mousedown fires before blur — prevent textarea blur
                                    e.preventDefault();
                                    insertMention(staff);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition text-sm ${isAlreadyAssigned ? 'opacity-50' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="w-7 h-7 rounded-full bg-[#984815]/15 flex items-center justify-center text-[#984815] text-xs font-semibold shrink-0">
                                    {fullName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 truncate">
                                        {fullName}
                                        {isAlreadyAssigned && (
                                            <span className="ml-1.5 text-[10px] text-gray-400 font-normal">assigned</span>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-gray-400 truncate">{staff.role} {(staff as any).hospital_id || (staff as any).hospitalId ? `· ${(staff as any).hospital_id || (staff as any).hospitalId}` : ''}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
