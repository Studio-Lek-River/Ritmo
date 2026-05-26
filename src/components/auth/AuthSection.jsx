import { useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser, userHasPassword } from '../../sync/auth';
import useStoredState from '../../hooks/useStoredState';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import EmailVerifyNotice from './EmailVerifyNotice';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';
import MagicLinkForm from './MagicLinkForm';
import MailSentNotice from './MailSentNotice';
import PasswordPrompt from './PasswordPrompt';
import SignedInPanel from './SignedInPanel';
import ChangePasswordForm from './ChangePasswordForm';

function detectResetFlow() {
  try {
    if (new URLSearchParams(window.location.search).has('reset')) return true;
    if (window.location.hash.includes('type=recovery')) return true;
  } catch {
    // ignore
  }
  return false;
}

function cleanRecoveryUrl() {
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    // ignore
  }
}

export default function AuthSection({ theme, onNavigateHousehold }) {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('signIn');
  const [pendingEmail, setPendingEmail] = useState(null);
  const [hasPasswordFlag, setHasPasswordFlag] = useState(true);
  const [promptDismissed, setPromptDismissed] = useStoredState('auth.passwordPromptDismissed', false);

  useEffect(() => {
    const inReset = detectResetFlow();
    if (inReset) setView('resetPassword');

    getCurrentUser().then((u) => {
      setUser(u);
      if (u && !inReset) {
        userHasPassword().then((hp) => {
          setHasPasswordFlag(hp);
          if (!hp && !promptDismissed) setView('passwordPrompt');
          else setView('signedIn');
        });
      }
    });

    const unsub = onAuthChange(async (newUser) => {
      setUser(newUser);
      if (newUser) {
        if (detectResetFlow()) {
          setView('resetPassword');
          return;
        }
        const hp = await userHasPassword();
        setHasPasswordFlag(hp);
        if (!hp && !promptDismissed) setView('passwordPrompt');
        else setView('signedIn');
      } else {
        setView('signIn');
        setPendingEmail(null);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goSignIn() {
    setView('signIn');
    setPendingEmail(null);
  }

  if (view === 'resetPassword') {
    return (
      <ResetPasswordForm
        theme={theme}
        onSaved={async () => {
          cleanRecoveryUrl();
          const u = await getCurrentUser();
          setUser(u);
          setHasPasswordFlag(true);
          setView(u ? 'signedIn' : 'signIn');
        }}
      />
    );
  }

  if (view === 'passwordPrompt' && user) {
    return (
      <PasswordPrompt
        theme={theme}
        onSet={() => {
          setHasPasswordFlag(true);
          setView('signedIn');
        }}
        onDismiss={() => {
          setPromptDismissed(true);
          setView('signedIn');
        }}
      />
    );
  }

  if (view === 'signedIn' && user) {
    return (
      <SignedInPanel
        theme={theme}
        user={user}
        onChangePassword={() => setView('changePassword')}
        onNavigateHousehold={onNavigateHousehold}
      />
    );
  }

  if (view === 'changePassword' && user) {
    return (
      <ChangePasswordForm
        theme={theme}
        email={user.email}
        hasPassword={hasPasswordFlag}
        onSaved={() => {
          setHasPasswordFlag(true);
          setTimeout(() => setView('signedIn'), 1200);
        }}
        onCancel={() => setView('signedIn')}
      />
    );
  }

  if (view === 'signUp') {
    return (
      <SignUpForm
        theme={theme}
        onSubmitted={(email) => {
          setPendingEmail(email);
          setView('verifyEmail');
        }}
        onBackToSignIn={goSignIn}
      />
    );
  }

  if (view === 'verifyEmail') {
    return (
      <EmailVerifyNotice
        theme={theme}
        email={pendingEmail}
        onUseOtherEmail={() => setView('signUp')}
      />
    );
  }

  if (view === 'forgotPassword') {
    return (
      <ForgotPasswordForm
        theme={theme}
        onSubmitted={(email) => {
          setPendingEmail(email);
          setView('mailSent');
        }}
        onBackToSignIn={goSignIn}
      />
    );
  }

  if (view === 'magicLink') {
    return (
      <MagicLinkForm
        theme={theme}
        onSubmitted={(email) => {
          setPendingEmail(email);
          setView('mailSent');
        }}
        onSignInWithPassword={goSignIn}
      />
    );
  }

  if (view === 'mailSent') {
    return (
      <MailSentNotice
        theme={theme}
        email={pendingEmail}
        onUseOtherEmail={goSignIn}
      />
    );
  }

  return (
    <SignInForm
      theme={theme}
      onForgotPassword={() => setView('forgotPassword')}
      onSignUp={() => setView('signUp')}
      onMagicLink={() => setView('magicLink')}
    />
  );
}
