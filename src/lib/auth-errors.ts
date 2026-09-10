function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code: string }).code);
  }

  return undefined;
}

export function getAuthErrorMessage(error: unknown) {
  const code = getErrorCode(error);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com este e-mail.';
    case 'auth/invalid-email':
      return 'Informe um e-mail válido, como nome@gmail.com.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet.';
    case 'auth/missing-email':
      return 'Informe o e-mail para continuar.';
    case 'auth/operation-not-allowed':
      return 'Este login ainda não foi ativado. No Firebase Console, abra Authentication > Sign-in method e ative E-mail/senha e Google.';
    case 'auth/configuration-not-found':
      return 'Abra o Firebase Console no projeto pud-ai, entre em Authentication e clique em Começar. Depois ative E-mail/senha em Sign-in method.';
    case 'auth/invalid-api-key':
      return 'A chave do Firebase está inválida. Confira o arquivo .env e reinicie com npx expo start -c.';
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta com este e-mail usando outro método de login.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login com Google cancelado.';
    default:
      return code
        ? `Não foi possível autenticar (${code}).`
        : 'Não foi possível autenticar. Tente novamente.';
  }
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
