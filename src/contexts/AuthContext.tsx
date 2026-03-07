import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, logoutUser, resendVerificationEmail } from '../firebase/firebase';

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
  }) => Promise<{ user: User; needsVerification: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  isEmailVerified: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsEmailVerified(user?.emailVerified || false);
      
      if (user) {
        // Fetch user data from Firestore
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            // Create user document if it doesn't exist
            const userData: UserData = {
              uid: user.uid,
              name: user.displayName || '',
              email: user.email || '',
              emailVerified: user.emailVerified,
              profileCompleted: false,
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            
            await setDoc(docRef, userData);
            setUserData(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const { loginWithEmail } = await import('../firebase/firebase');
    await loginWithEmail(email, password);
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    city: string;
  }) => {
    const { registerWithEmail } = await import('../firebase/firebase');
    const result = await registerWithEmail(userData.email, userData.password, userData.name);
    
    // Save additional user data to Firestore
    if (result.user) {
      const userDoc = doc(db, 'users', result.user.uid);
      await setDoc(userDoc, {
        uid: result.user.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        city: userData.city,
        emailVerified: false,
        profileCompleted: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }
    
    return result;
  };

  const logout = async () => {
    await logoutUser();
  };

  const resetPassword = async (email: string) => {
    const { resetPassword } = await import('../firebase/firebase');
    await resetPassword(email);
  };

  const resendVerification = async () => {
    if (!currentUser) throw new Error('No user logged in');
    await resendVerificationEmail(currentUser);
  };

  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!currentUser) throw new Error('No user logged in');
    
    // Update Firebase Auth profile
    if (data.name) {
      await updateProfile(currentUser, { displayName: data.name });
    }
    
    // Update Firestore
    const userDoc = doc(db, 'users', currentUser.uid);
    await setDoc(userDoc, data, { merge: true });
    
    // Update local state
    setUserData(prev => prev ? { ...prev, ...data } : null);
  };

  const value = {
    currentUser,
    userData,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    resendVerification,
    updateUserProfile,
    isEmailVerified,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};  