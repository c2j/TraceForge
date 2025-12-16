import { create } from 'zustand';
import { Kernel, NodeAgent } from '../types';
import { Language } from '../locales';

interface ForgeState {
  projectName: string;
  projectVersion: string;
  isConnected: boolean;
  enginePort: number;
  currentUser: string;
  kernels: Kernel[];
  nodes: NodeAgent[];
  language: Language;
  setProjectName: (name: string) => void;
  toggleConnection: () => void;
  setLanguage: (lang: Language) => void;
}

export const useForgeStore = create<ForgeState>((set) => ({
  projectName: 'E-Commerce',
  projectVersion: 'v2.1.0',
  isConnected: true,
  enginePort: 54321,
  currentUser: 'Jane Doe',
  kernels: [
    { id: '1', name: 'Chrome', version: '86.0.4240.198', path: 'C:\\browsers\\86', status: 'Compatible', type: 'local' },
    { id: '2', name: 'Chrome', version: '130.0', path: 'Built-in', status: 'Latest', type: 'bundled' },
  ],
  nodes: [
    { id: 'local', name: 'Local Desktop (This PC)', ip: '127.0.0.1', status: 'ONLINE', cpuUsage: 12, memUsage: 45, kernels: ['86', 'Latest'] },
    { id: 'rem-1', name: 'ForgeAgent-01', ip: '192.168.1.100', status: 'BUSY', cpuUsage: 70, memUsage: 50, kernels: ['Latest'] },
  ],
  language: 'en', // Default language
  setProjectName: (name) => set({ projectName: name }),
  toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
  setLanguage: (lang) => set({ language: lang }),
}));