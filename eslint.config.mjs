import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // These admin/storefront effects intentionally hydrate React state from
      // external APIs/browser storage after mount.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
