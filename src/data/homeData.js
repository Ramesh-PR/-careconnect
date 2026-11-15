// Realistic sample data for the CareConnect Homepage

export const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'For Caregivers', href: '#caregivers' },
];

export const sampleMedications = [
  {
    id: 1,
    name: 'Lisinopril (10mg)',
    purpose: 'Blood Pressure Support',
    time: '8:00 AM',
    instruction: 'Take 1 tablet with a full glass of water',
    status: 'Taken',
  },
  {
    id: 2,
    name: 'Vitamin D3 (2000 IU)',
    purpose: 'Bone & Immune Health',
    time: '1:00 PM',
    instruction: 'Take 1 softgel after lunch',
    status: 'Due Now',
  },
  {
    id: 3,
    name: 'Metformin (500mg)',
    purpose: 'Blood Sugar Balance',
    time: '7:30 PM',
    instruction: 'Take 1 tablet with evening meal',
    status: 'Upcoming',
  },
];

export const featuresList = [
  {
    id: 'med-reminders',
    iconName: 'Pill',
    title: 'Clear Medication Reminders',
    description:
      'Large-print visual and audio alerts tell seniors exactly which medicine to take, the dosage, and simple instructions.',
    accent: 'teal',
  },
  {
    id: 'family-sync',
    iconName: 'Users',
    title: 'Family & Caregiver Alerts',
    description:
      'Family members receive instant peace-of-mind updates when a dose is taken or if a scheduled medication is missed.',
    accent: 'sky',
  },
  {
    id: 'health-vitals',
    iconName: 'HeartPulse',
    title: 'Simple Daily Health Check-Ins',
    description:
      'Log blood pressure, blood sugar, or daily mood with one-tap large buttons designed specifically for older adults.',
    accent: 'teal',
  },
  {
    id: 'emergency-sos',
    iconName: 'ShieldAlert',
    title: 'One-Touch Emergency SOS',
    description:
      'Quickly reach emergency contacts, primary doctors, and family caregivers with a single prominent SOS button.',
    accent: 'sky',
  },
  {
    id: 'doctor-appointments',
    iconName: 'CalendarCheck',
    title: 'Doctor Visit Organizer',
    description:
      'Keep track of upcoming clinic visits, prescription refills, and doctor notes in one clutter-free calendar.',
    accent: 'teal',
  },
  {
    id: 'voice-friendly',
    iconName: 'Volume2',
    title: 'Accessible & Easy to Read',
    description:
      'Built with high-contrast colors, extra-large buttons, and zero confusing menus so anyone can use it comfortably.',
    accent: 'sky',
  },
];

export const howItWorksSteps = [
  {
    stepNumber: '01',
    iconName: 'ClipboardList',
    title: 'Add Medications & Care Schedule',
    description:
      'A senior or family caregiver enters the medicine names, times, and doctor instructions in less than 2 minutes.',
  },
  {
    stepNumber: '02',
    iconName: 'BellRing',
    title: 'Receive Friendly Timely Prompts',
    description:
      'At the scheduled time, CareConnect displays a clear, high-contrast reminder card with a single "Mark as Taken" button.',
  },
  {
    stepNumber: '03',
    iconName: 'CheckCircle2',
    title: 'Stay Connected with Loved Ones',
    description:
      'With one tap, the dose is logged and family caregivers see real-time confirmation that their loved one is safe and on track.',
  },
];

