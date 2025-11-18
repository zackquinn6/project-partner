import { AppReference } from '@/interfaces/Project';

export const NATIVE_APPS: Record<string, Omit<AppReference, 'id'>> = {
  'project-customizer': {
    appName: 'Scope Builder',
    appType: 'native',
    icon: 'Settings',
    description: 'Decide what work will actually be done in each space',
    actionKey: 'project-customizer',
    displayOrder: 1
  },
  'project-scheduler': {
    appName: 'Timekeeper',
    appType: 'native',
    icon: 'Calendar',
    description: 'Put a realistic timeline to the work',
    actionKey: 'project-scheduler',
    displayOrder: 2
  },
  'shopping-checklist': {
    appName: 'Shopping Checklist',
    appType: 'native',
    icon: 'ShoppingCart',
    description: 'Order tools and materials',
    actionKey: 'shopping-checklist',
    displayOrder: 3
  },
  'my-homes': {
    appName: 'My Homes',
    appType: 'native',
    icon: 'Home',
    description: 'Manage your home properties',
    actionKey: 'my-homes',
    displayOrder: 4
  },
  'my-profile': {
    appName: 'My Profile',
    appType: 'native',
    icon: 'User',
    description: 'View and edit your profile',
    actionKey: 'my-profile',
    displayOrder: 5
  },
  'my-tools': {
    appName: 'Tool Shed',
    appType: 'native',
    icon: 'Wrench',
    description: 'Manage your tool inventory',
    actionKey: 'my-tools',
    displayOrder: 6
  },
  'tool-access': {
    appName: 'Tool Access',
    appType: 'native',
    icon: 'Hammer',
    description: 'Find tool rental locations and access options',
    actionKey: 'tool-access',
    displayOrder: 7,
    isBeta: true
  },
  'project-budgeting': {
    appName: 'Project Budgeting',
    appType: 'native',
    icon: 'DollarSign',
    description: 'Set budgets and track actual spending',
    actionKey: 'project-budgeting',
    displayOrder: 8
  },
  'project-performance': {
    appName: 'Project Performance',
    appType: 'native',
    icon: 'TrendingUp',
    description: 'View project performance dashboard',
    actionKey: 'project-performance',
    displayOrder: 9
  },
  'risk-management': {
    appName: 'Risk Management',
    appType: 'native',
    icon: 'Shield',
    description: 'Identify, assess, and mitigate project risks',
    actionKey: 'risk-management',
    displayOrder: 10
  }
};

export const getNativeAppById = (actionKey: string): AppReference | null => {
  const app = NATIVE_APPS[actionKey];
  if (!app) return null;
  
  return {
    id: `app-${actionKey}`,
    ...app
  };
};

export const getAllNativeApps = (): AppReference[] => {
  return Object.keys(NATIVE_APPS)
    .map(key => getNativeAppById(key))
    .filter((app): app is AppReference => app !== null)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
};
