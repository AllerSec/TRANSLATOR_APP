export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const PREDEFINED_CATEGORIES: Category[] = [
  {
    id: 'work',
    name: 'Work',
    icon: '💼',
    color: '#3b82f6', // blue
  },
  {
    id: 'study',
    name: 'Study',
    icon: '📚',
    color: '#8b5cf6', // purple
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: '✈️',
    color: '#10b981', // green
  },
  {
    id: 'personal',
    name: 'Personal',
    icon: '👤',
    color: '#f59e0b', // amber
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍽️',
    color: '#ef4444', // red
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    color: '#ec4899', // pink
  },
  {
    id: 'health',
    name: 'Health',
    icon: '⚕️',
    color: '#14b8a6', // teal
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📝',
    color: '#64748b', // slate
  },
];
