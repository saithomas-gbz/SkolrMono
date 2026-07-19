import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Rampe "Modernist" générée depuis le rouge de marque #ec3013, shade 500 =
 * couleur de marque exacte. Valeurs alignées sur app/assets/css/tokens.css
 * (--skolr-color-accent-*) — cf. issue #124.
 */
const Skolr = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0px',
      xs: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
    },
  },
  semantic: {
    primary: {
      50: '#fff7f5',
      100: '#fff2ef',
      200: '#ffe0d9',
      300: '#ffc4b8',
      400: '#ff9783',
      500: '#ec3013',
      600: '#dd2b0f',
      700: '#ae1800',
      800: '#7c1405',
      900: '#4d170e',
      950: '#331007',
    },
    borderRadius: {
      none: '0px',
      xs: '0px',
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
    },
    content: {
      borderRadius: '0px',
    },
    formField: {
      borderRadius: '0px',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: 'var(--skolr-color-surface)',
          100: 'var(--skolr-color-neutral-100)',
          200: 'var(--skolr-color-neutral-200)',
          300: 'var(--skolr-color-neutral-300)',
          400: 'var(--skolr-color-neutral-400)',
          500: 'var(--skolr-color-neutral-500)',
          600: 'var(--skolr-color-neutral-600)',
          700: 'var(--skolr-color-neutral-700)',
          800: 'var(--skolr-color-neutral-800)',
          900: 'var(--skolr-color-neutral-900)',
          950: 'var(--skolr-color-neutral-900)',
        },
        text: {
          color: 'var(--skolr-color-text)',
          hoverColor: 'var(--skolr-color-text)',
          mutedColor: 'var(--skolr-color-text-muted)',
          hoverMutedColor: 'var(--skolr-color-text-muted)',
        },
      },
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            primary: {
              // Contraste : blanc sur primary.500 (#ec3013) ne donne que 4.20:1
              // (< seuil AA 4.5:1). primary.600/700 passent (4.74:1+). Surcharge
              // au niveau du composant (pas juste --skolr-color-text-muted-style
              // CSS globale) : le style Button de PrimeVue est injecté au
              // runtime, après les CSS statiques du projet dans le document —
              // une surcharge `:root` dans tokens.css se fait donc silencieusement
              // regagner par la déclaration --p-button-primary-background propre
              // de PrimeVue (même sélecteur `:root`, mais plus tardive dans le
              // document = priorité en cas d'égalité de spécificité). Passer par
              // `components.button` fait partie de la même génération de thème
              // que PrimeVue, donc pas de conflit d'ordre. Voir docs/security/accessibility.md (A7).
              background: '{primary.600}',
              hoverBackground: '{primary.700}',
              activeBackground: '{primary.700}',
              borderColor: '{primary.600}',
              hoverBorderColor: '{primary.700}',
              activeBorderColor: '{primary.700}',
            },
          },
        },
      },
    },
  },
});

export default Skolr;
