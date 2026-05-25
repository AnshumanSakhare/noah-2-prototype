export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}

export const subjects: Subject[] = [
  { id: 'science', name: 'Science', icon: '🔬', color: '#5b8c6f' },
  { id: 'math', name: 'Math', icon: '📐', color: '#5b6abf', comingSoon: true },
  { id: 'english', name: 'English', icon: '📝', color: '#e8734a', comingSoon: true },
];
