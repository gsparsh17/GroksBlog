'use client';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../lib/api';

const CATEGORY_ICONS = {
  All: '✦', Technology: '💻', AI: '🤖', Sports: '⚽',
  Politics: '🏛', Science: '🔬', Business: '📈',
  Entertainment: '🎬', Health: '🩺', World: '🌍',
};

export default function CategoryTabs({ active, onChange }) {
  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {CATEGORIES.map((cat) => (
        <motion.button
          key={cat}
          onClick={() => onChange(cat)}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
            active === cat
              ? 'text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--border)]'
          }`}
          whileTap={{ scale: 0.95 }}
        >
          {active === cat && (
            <motion.div
              layoutId="category-pill"
              className="absolute inset-0 bg-[var(--accent)] rounded-full -z-10"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
          <span>{cat}</span>
        </motion.button>
      ))}
    </div>
  );
}
