import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Rampe générée depuis le vert de marque #498467 (HSL ≈ 150°, 29%, 40%),
 * shade 500 = couleur de marque exacte.
 */
const Skolr = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f2f8f5',
      100: '#e1efe8',
      200: '#c4ded1',
      300: '#a0cab5',
      400: '#77b496',
      500: '#498467',
      600: '#3d6f57',
      700: '#325a46',
      800: '#264536',
      900: '#1c3227',
      950: '#13221b',
    },
    colorScheme: {
      light: {
        text: {
          color: 'var(--skolr-color-text)',
          hoverColor: 'var(--skolr-color-text)',
          mutedColor: 'var(--skolr-color-text-muted)',
          hoverMutedColor: 'var(--skolr-color-text-muted)',
        },
      },
    },
  },
});

export default Skolr;
