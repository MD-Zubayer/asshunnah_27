import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function HomeRedirect() {
  const { isSignedIn, redirectAfterLogout } = useAuth();

  // Logout করা থাকলে login page এ redirect
  if (redirectAfterLogout) {
    return <Redirect href="/login" />;
  }

  // Guest বা Authenticated হলে dashboard এ redirect
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  // Default: login page এ redirect
  return <Redirect href="/login" />;
}

