function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2933;">
      <h1 style="font-size: 20px; color: #2f6f4f;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">Skolr</p>
    </div>
  `;
}

export function invitationEmail(params: { inviteUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Vous êtes invité(e) à rejoindre Skolr',
    html: layout(
      'Invitation Skolr',
      `
        <p>Un établissement vous invite à créer votre compte sur Skolr.</p>
        <p>
          <a href="${params.inviteUrl}" style="display: inline-block; padding: 10px 20px; background: #2f6f4f; color: #fff; text-decoration: none; border-radius: 6px;">
            Créer mon compte
          </a>
        </p>
        <p>Ce lien est valable 7 jours.</p>
      `,
    ),
  };
}

export function welcomeEmail(params: { name: string }): { subject: string; html: string } {
  return {
    subject: 'Bienvenue sur Skolr',
    html: layout(
      `Bienvenue, ${params.name} !`,
      `<p>Votre compte Skolr a été créé avec succès. Vous pouvez dès maintenant vous connecter.</p>`,
    ),
  };
}
