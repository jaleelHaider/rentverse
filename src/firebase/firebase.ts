import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
  AuthErrorCodes
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2YZkNvpcYGE0B9YLeuzSGNhPU5lVwQ9g",
  authDomain: "rentverse-3db43.firebaseapp.com",
  projectId: "rentverse-3db43",
  storageBucket: "rentverse-3db43.firebasestorage.app",
  messagingSenderId: "512447272668",
  appId: "1:512447272668:web:f368be20bd45e857478619",
  measurementId: "G-V0138BD32V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth functions
export const registerWithEmail = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with name
    await updateProfile(user, { displayName: name });
    
    // Send email verification
    await sendEmailVerification(user);
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profileCompleted: false
    });
    
    return { user, needsVerification: true };
  } catch (error: any) {
    let errorMessage = 'Registration failed';
    
    switch (error.code) {
      case AuthErrorCodes.EMAIL_EXISTS:
        errorMessage = 'Email already registered';
        break;
      case AuthErrorCodes.INVALID_EMAIL:
        errorMessage = 'Invalid email address';
        break;
      case AuthErrorCodes.WEAK_PASSWORD:
        errorMessage = 'Password should be at least 6 characters';
        break;
      default:
        errorMessage = error.message || 'Registration failed';
    }
    
    throw new Error(errorMessage);
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      await signOut(auth);
      throw new Error('EMAIL_NOT_VERIFIED');
    }
    
    // Update last login in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString()
      }, { merge: true });
    } catch (firestoreError) {
      console.warn('Skipping lastLogin update:', firestoreError);
    }
    
    return user;
  } catch (error: any) {
    let errorMessage = 'Login failed';
    
    switch (error.code) {
      case AuthErrorCodes.INVALID_EMAIL:
        errorMessage = 'Invalid email address';
        break;
      case AuthErrorCodes.USER_DELETED:
        errorMessage = 'User not found';
        break;
      case AuthErrorCodes.INVALID_PASSWORD:
        errorMessage = 'Invalid password';
        break;
      case 'EMAIL_NOT_VERIFIED':
        errorMessage = 'Please verify your email first';
        break;
      default:
        errorMessage = error.message || 'Login failed';
    }
    
    throw new Error(errorMessage);
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send reset email');
  }
};

export const resendVerificationEmail = async (user: User) => {
  try {
    await sendEmailVerification(user);
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to resend verification email');
  }
};

export const getUserProfile = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};