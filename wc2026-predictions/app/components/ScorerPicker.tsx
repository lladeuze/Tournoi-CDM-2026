'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type ScorerOption = { id: string; name: string };

type Props<T extends ScorerOption> = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  players: T[];
  loading?: boolean;
  selectedId: string | null;
  selectedLabel: string;
  onSelect: (id: string) => void;
  getLabel: (player: T) => string;
  disabled?: boolean;
  placeholder?: string;
};

/** Accessible, searchable, keyboard-navigable first-scorer picker. */
export default function ScorerPicker<T extends ScorerOption>({
  open,
  onToggle,
  onClose,
  players,
  loading,
  selectedId,
  selectedLabel,
  onSelect,
  getLabel,
  disabled,
  placeholder = 'Rechercher un joueur...',
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = players.filter((p) =>
      getLabel(p).toLowerCase().includes(q)
    );
    return [
      { id: '', label: 'Aucun buteur' },
      ...matching.map((p) => ({ id: p.id, label: getLabel(p) })),
    ];
  }, [players, search, getLabel]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onDocPointer);
    return () => document.removeEventListener('mousedown', onDocPointer);
  }, [open, onClose]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = options[activeIndex];
      if (o) {
        onSelect(o.id);
        onClose();
      }
    }
  }

  return (
    <div className="scorer" ref={rootRef}>
      <button
        type="button"
        className="scorer-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{selectedLabel}</span>
        <span className="chev" aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && !disabled && (
        <div className="scorer-panel" onKeyDown={handleKeyDown}>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
          />

          {loading && (
            <p className="small" style={{ marginTop: 8 }}>
              Chargement des joueurs...
            </p>
          )}

          <ul className="scorer-list" role="listbox">
            {options.map((o, idx) => {
              const isSelected =
                (o.id !== '' && o.id === selectedId) ||
                (o.id === '' && !selectedId);
              return (
                <li key={o.id || 'none'} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`scorer-option${
                      o.id && o.id === selectedId ? ' selected' : ''
                    }${idx === activeIndex ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onSelect(o.id);
                      onClose();
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="small" style={{ marginTop: 8 }}>
            {Math.max(0, options.length - 1)} joueur(s) affiché(s) sur{' '}
            {players.length}
          </p>
        </div>
      )}
    </div>
  );
}
