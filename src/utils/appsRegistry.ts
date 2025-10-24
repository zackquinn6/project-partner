import { AppReference } from '@/interfaces/Project';

export const NATIVE_APPS: Record<string, Omit<AppReference, 'id'>> = {
  'project-customizer': {
    appName: 'Project Customizer',
    appType: 'native',
    icon: 'Settings',
    description: 'Customize your project phases and decisions',
    actionKey: 'project-customizer',
    displayOrder: 1
  },
  'project-scheduler': {
    appName: 'Project Scheduler',
    appType: 'native',
    icon: 'Calendar',
    description: 'Plan your project timeline',
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
    appName: 'My Tools',
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
