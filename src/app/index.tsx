import { useRouter } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';
import SplashScreen from '@/screens/SplashScreen';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  return (
    <SplashScreen
      onNavigate={() => {
        if (loading) {
          return;
        }

        router.replace(user ? '/home' : '/login');
      }}
    />
  );
}
