export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: string; // SVG path data for icon
}

export const navItems: NavItem[] = [
  { 
    to: '/home', 
    label: 'Home', 
    shortLabel: 'Home',
    icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' // Home icon
  },
  { 
    to: '/demographics', 
    label: 'Equity Frame', 
    shortLabel: 'Equity',
    icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' // People icon
  },
  { 
    to: '/methods', 
    label: 'Methods', 
    shortLabel: 'Methods',
    icon: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z' // Cloud/upload icon (research)
  },
  { 
    to: '/pathway', 
    label: 'How It Works', 
    shortLabel: 'Pathway',
    icon: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z' // Network/path icon
  },
  { 
    to: '/dose', 
    label: 'Credit Levels', 
    shortLabel: 'Credits',
    icon: 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z' // Trending up icon
  },
  { 
    to: '/so-what', 
    label: 'So, What?', 
    shortLabel: 'Impact',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' // Check circle icon
  },
  { 
    to: '/researcher', 
    label: 'Researcher', 
    shortLabel: 'About',
    icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' // Person icon
  },
];
