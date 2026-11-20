import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect } from 'react';
import { useAuthModal, useAuthStore, authKey } from './store';
import { authApi } from '@/utils/api';


/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { close, open } = useAuthModal();

  const initiate = useCallback(() => {
    SecureStore.getItemAsync(authKey).then((auth) => {
      useAuthStore.setState({
        auth: auth ? JSON.parse(auth) : null,
        isReady: true,
      });
    });
  }, []);

  const signIn = useCallback(() => {
    // Auth is handled directly in the Perfil tab.
  }, []);
  const signUp = useCallback(() => {
    // Auth is handled directly in the Perfil tab.
  }, []);

  const signOut = useCallback(async () => {
    await setAuth(null);
    close();
  }, [close, setAuth]);

  const login = useCallback(
    async (payload) => {
      const nextAuth = await authApi.login(payload);
      setAuth(nextAuth);
      close();
      return nextAuth;
    },
    [close, setAuth]
  );

  const register = useCallback(
    async (payload) => {
      const nextAuth = await authApi.register(payload);
      setAuth(nextAuth);
      close();
      return nextAuth;
    },
    [close, setAuth]
  );

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    login,
    register,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    // Auth is handled directly in the Perfil tab.
  }, [isAuthenticated, options?.mode, isReady]);
};

export default useAuth;
