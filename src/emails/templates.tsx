import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components'
import * as React from 'react'

type Locale = 'fr' | 'en'

function EmailLayout({
  preview,
  title,
  children,
}: {
  preview: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f5f7fb', fontFamily: 'Arial, sans-serif' }}>
        <Container
          style={{
            margin: '32px auto',
            maxWidth: '560px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            padding: '32px',
          }}
        >
          <Text style={{ color: '#2455a4', fontWeight: 700, letterSpacing: '0.08em' }}>C2I2A</Text>
          <Heading style={{ color: '#17213b', fontSize: '24px' }}>{title}</Heading>
          {children}
          <Hr style={{ borderColor: '#e5e7eb', margin: '28px 0 16px' }} />
          <Text style={{ color: '#667085', fontSize: '12px' }}>C2I2A · HEEC Marrakech</Text>
        </Container>
      </Body>
    </Html>
  )
}

export async function magicLinkEmail(locale: Locale, link: string, ttlMinutes: number) {
  const fr = locale === 'fr'
  return render(
    <EmailLayout
      preview={fr ? 'Votre lien de connexion C2I2A' : 'Your C2I2A sign-in link'}
      title={fr ? 'Connexion à votre espace' : 'Sign in to your account'}
    >
      <Text>
        {fr
          ? `Ce lien est valable ${ttlMinutes} minutes et ne peut être utilisé qu’une fois.`
          : `This link is valid for ${ttlMinutes} minutes and can only be used once.`}
      </Text>
      <Section style={{ textAlign: 'center', margin: '28px 0' }}>
        <Button
          href={link}
          style={{
            backgroundColor: '#2455a4',
            borderRadius: '8px',
            color: '#fff',
            padding: '12px 20px',
          }}
        >
          {fr ? 'Se connecter' : 'Sign in'}
        </Button>
      </Section>
      <Text style={{ color: '#667085', fontSize: '13px' }}>
        {fr
          ? 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.'
          : 'If you did not request this link, you can ignore this message.'}
      </Text>
    </EmailLayout>,
  )
}

export async function registrationEmail(locale: Locale, firstName: string, signInUrl?: string) {
  const fr = locale === 'fr'
  return render(
    <EmailLayout
      preview={fr ? 'Inscription C2I2A confirmée' : 'C2I2A registration confirmed'}
      title={fr ? 'Inscription confirmée' : 'Registration confirmed'}
    >
      <Text>{fr ? `Bonjour ${firstName},` : `Hello ${firstName},`}</Text>
      <Text>
        {fr
          ? 'Votre inscription au colloque C2I2A est confirmée. Au plaisir de vous accueillir.'
          : 'Your registration for the C2I2A conference is confirmed. We look forward to welcoming you.'}
      </Text>
      {signInUrl ? (
        <>
          <Text>
            {fr
              ? 'Un espace vous permet de déposer votre résumé et de suivre vos soumissions :'
              : 'You also have an account to submit an abstract and track your submissions:'}
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button
              href={signInUrl}
              style={{
                backgroundColor: '#2455a4',
                borderRadius: '8px',
                color: '#fff',
                padding: '12px 20px',
              }}
            >
              {fr ? 'Accéder à mon espace' : 'Sign in to your account'}
            </Button>
          </Section>
          <Text style={{ color: '#667085', fontSize: '13px' }}>
            {fr
              ? 'Ce lien a une durée de validité limitée et ne peut être utilisé qu’une seule fois.'
              : 'This link is valid for a limited time and can only be used once.'}
          </Text>
        </>
      ) : null}
    </EmailLayout>,
  )
}

export async function submissionReceivedEmail(locale: Locale, title: string) {
  const fr = locale === 'fr'
  return render(
    <EmailLayout
      preview={fr ? 'Soumission C2I2A reçue' : 'C2I2A submission received'}
      title={fr ? 'Soumission reçue' : 'Submission received'}
    >
      <Text>
        {fr
          ? `Nous avons bien reçu votre soumission « ${title} ». Le comité scientifique vous notifiera après relecture.`
          : `We have received your submission “${title}”. The scientific committee will notify you after review.`}
      </Text>
    </EmailLayout>,
  )
}

export async function submissionDecisionEmail({
  locale,
  title,
  status,
  notes,
}: {
  locale: Locale
  title: string
  status: 'accepted' | 'rejected'
  notes?: string | null
}) {
  const fr = locale === 'fr'
  const accepted = status === 'accepted'
  return render(
    <EmailLayout
      preview={fr ? 'Décision concernant votre soumission' : 'Decision on your submission'}
      title={fr ? 'Décision du comité scientifique' : 'Scientific committee decision'}
    >
      <Text>
        {fr
          ? `Votre soumission « ${title} » a été ${accepted ? 'acceptée' : 'refusée'}.`
          : `Your submission “${title}” has been ${accepted ? 'accepted' : 'rejected'}.`}
      </Text>
      {notes ? (
        <Section style={{ borderLeft: '3px solid #d5a72e', paddingLeft: '16px' }}>
          <Text>{notes}</Text>
        </Section>
      ) : null}
    </EmailLayout>,
  )
}
