import { useEffect } from 'react';
import { executeDirectImport } from '@/utils/directImportExecutor';

// Component that triggers direct import immediately on mount
export const DirectImportTrigger = () => {
  useEffect(() => {
    console.log('🎯 DirectImportTrigger mounted - starting import immediately');
    executeDirectImport();
  }, []);

  return null; // Hidden component, no UI
};

export default DirectImportTrigger;