import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, CheckSquare, Target, Lightbulb, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'goal' | 'project' | 'transaction';
  title: string;
  subtitle?: string;
}

const typeIcons = {
  task: CheckSquare,
  note: FileText,
  goal: Target,
  project: Lightbulb,
  transaction: Wallet,
};

const typeColors = {
  task: 'text-blue-400',
  note: 'text-green-400',
  goal: 'text-yellow-400',
  project: 'text-purple-400',
  transaction: 'text-orange-400',
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: "/" to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mock search - in production this would search the database
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Simulated results - in production, this would be a Supabase query
    const mockResults: SearchResult[] = [
      { id: '1', type: 'task' as const, title: 'Review budget report', subtitle: 'Due today' },
      { id: '2', type: 'note' as const, title: 'Meeting notes - December', subtitle: '3 days ago' },
      { id: '3', type: 'goal' as const, title: 'Save for vacation', subtitle: '45% complete' },
    ].filter(r => r.title.toLowerCase().includes(query.toLowerCase()));

    setResults(mockResults);
  }, [query]);

  return (
    <div className="relative flex-1 max-w-md">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-text',
          isOpen 
            ? 'border-primary bg-muted' 
            : 'border-border bg-muted/50 hover:bg-muted'
        )}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        {isOpen ? (
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            Search... <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50">/</kbd>
          </span>
        )}
        {isOpen && query && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuery('');
              setIsOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="py-2">
              {results.map((result) => {
                const Icon = typeIcons[result.type];
                return (
                  <button
                    key={result.id}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left transition-colors"
                    onClick={() => {
                      // Navigate to the item
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <Icon className={cn('h-4 w-4', typeColors[result.type])} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{result.type}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
