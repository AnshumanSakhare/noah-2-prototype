export interface Student {
  id: string;
  name: string;
  color: string;
  detail: string;
  weak: string[];
  strong: string[];
  tag: 'weak' | 'mid' | 'strong';
  tagLabel: string;
  memory: string;
}

export const students: Student[] = [
  {
    id: 'arjun',
    name: 'Arjun M.',
    color: '#e8734a',
    detail: 'Profile updated 2h ago · 14 activities tracked',
    weak: ['lo2', 'lo4'],
    strong: ['lo1'],
    tag: 'weak',
    tagLabel: 'Needs support',
    memory: 'Confuses force and acceleration — tends to skip the F=ma rearrange. Strong on definitions, shaky on numeric problems.'
  },
  {
    id: 'meera',
    name: 'Meera S.',
    color: '#5b6abf',
    detail: 'Profile updated 1d ago · 21 activities tracked',
    weak: ['lo3'],
    strong: ['lo2', 'lo4'],
    tag: 'mid',
    tagLabel: 'Developing',
    memory: 'Gets action–reaction pairs backwards under time pressure, but recovers quickly with a hint. Confident with calculations.'
  },
  {
    id: 'kabir',
    name: 'Kabir R.',
    color: '#5b8c6f',
    detail: 'Profile updated 3h ago · 9 activities tracked',
    weak: ['lo1', 'lo3'],
    strong: ['lo4'],
    tag: 'mid',
    tagLabel: 'Developing',
    memory: 'Mixes up which law is which. Learns best from worked examples and animations rather than text.'
  },
];
