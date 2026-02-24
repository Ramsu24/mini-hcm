import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, name, schedule = { start: '09:00', end: '18:00' }) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name,
      email,
      role: 'employee',
      schedule,
      createdAt: new Date()
    });
    
    return userCredential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    console.log('AuthContext: Setting up auth listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext: onAuthStateChanged triggered', user ? `User: ${user.email}` : 'No user');
      
      if (user) {
        try {
          // Set current user immediately
          setCurrentUser(user);
          
          // Then fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          console.log('AuthContext: User document exists?', userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('AuthContext: User data from Firestore:', userData);
            console.log('AuthContext: Role from Firestore:', userData.role);
            setUserRole(userData.role || 'employee');
          } else {
            console.log('AuthContext: No user document found, setting default role');
            setUserRole('employee');
          }
        } catch (error) {
          console.error('AuthContext: Error fetching user role:', error);
          setUserRole('employee');
        }
      } else {
        console.log('AuthContext: No user, clearing states');
        setCurrentUser(null);
        setUserRole(null);
      }
      
      setLoading(false);
      console.log('AuthContext: Loading set to false');
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    register,
    login,
    logout,
    loading
  };

  console.log('AuthContext: Providing value - currentUser:', currentUser?.email, 'role:', userRole, 'loading:', loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}