import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthProvider';
import { WelcomeScreen } from '../src/features/auth/WelcomeScreen';
export default function Index() {
  const { user } = useAuth();
  if (user) return <Redirect href={user.role === 'AGENCY' ? '/(agency)/workspace' : '/(user)/home'} />;
  return <WelcomeScreen />;
}
