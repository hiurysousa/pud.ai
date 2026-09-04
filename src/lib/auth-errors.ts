import { FirebaseError } from 'firebase/app';

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com este e-mail.';
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.';
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
    default:
      return 'Não foi possível autenticar. Tente novamente.';
  }
}
