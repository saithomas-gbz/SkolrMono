import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  successUrl,
  cancelUrl,
  portalReturnUrl,
  assertBillingRedirectsConfigured,
} from '../lib/redirectUrls';

const sauvegarde = { ...process.env };

beforeEach(() => {
  delete process.env.STRIPE_SUCCESS_URL;
  delete process.env.STRIPE_CANCEL_URL;
  delete process.env.STRIPE_PORTAL_RETURN_URL;
  delete process.env.STRIPE_SECRET_KEY;
});

afterEach(() => {
  process.env = { ...sauvegarde };
});

describe('portalReturnUrl', () => {
  it("retire la query de l'URL de succès", () => {
    // Le defaut d'origine : le portail reutilisait STRIPE_SUCCESS_URL telle
    // quelle, si bien qu'un retour APRES ANNULATION affichait « Paiement
    // confirme » (#267).
    process.env.STRIPE_SUCCESS_URL = 'https://skolr.example/admin/billing?success=1';
    expect(portalReturnUrl()).toBe('https://skolr.example/admin/billing');
  });

  it('respecte une URL de retour explicitement configurée', () => {
    process.env.STRIPE_SUCCESS_URL = 'https://skolr.example/admin/billing?success=1';
    process.env.STRIPE_PORTAL_RETURN_URL = 'https://skolr.example/admin';
    expect(portalReturnUrl()).toBe('https://skolr.example/admin');
  });

  it('tolère une URL de succès non parsable', () => {
    process.env.STRIPE_SUCCESS_URL = '/admin/billing?success=1';
    expect(portalReturnUrl()).toBe('/admin/billing');
  });

  it("n'invente rien quand aucune URL n'est configurée", () => {
    expect(portalReturnUrl()).toBe('');
    expect(successUrl()).toBe('');
    expect(cancelUrl()).toBe('');
  });
});

describe('assertBillingRedirectsConfigured', () => {
  it('laisse démarrer quand Stripe est inactif', () => {
    // Pas de cle : la facturation ne sert pas, le service doit tourner quand meme.
    expect(() => assertBillingRedirectsConfigured({} as NodeJS.ProcessEnv)).not.toThrow();
  });

  it('refuse de démarrer si Stripe est actif sans URL de redirection', () => {
    expect(() =>
      assertBillingRedirectsConfigured({ STRIPE_SECRET_KEY: 'sk_test_x' } as NodeJS.ProcessEnv),
    ).toThrow(/STRIPE_SUCCESS_URL et STRIPE_CANCEL_URL/);
  });

  it("accorde le message au nombre de variables manquantes", () => {
    // Message lu par un exploitant au moment ou le service refuse de demarrer :
    // il doit etre correct, pas seulement comprehensible.
    expect(() =>
      assertBillingRedirectsConfigured({ STRIPE_SECRET_KEY: 'sk_test_x' } as NodeJS.ProcessEnv),
    ).toThrow(/ne sont pas définies\. Sans elles, .*Renseignez-les/);

    expect(() =>
      assertBillingRedirectsConfigured({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_SUCCESS_URL: 'https://skolr.example/ok',
      } as NodeJS.ProcessEnv),
    ).toThrow(/n'est pas définie\. Sans elle, .*Renseignez-la/);
  });

  it('nomme la seule variable manquante', () => {
    expect(() =>
      assertBillingRedirectsConfigured({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_SUCCESS_URL: 'https://skolr.example/ok',
      } as NodeJS.ProcessEnv),
    ).toThrow(/STRIPE_CANCEL_URL n'est pas définie/);
  });

  it('laisse démarrer quand tout est configuré', () => {
    expect(() =>
      assertBillingRedirectsConfigured({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_SUCCESS_URL: 'https://skolr.example/ok',
        STRIPE_CANCEL_URL: 'https://skolr.example/ko',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });
});
