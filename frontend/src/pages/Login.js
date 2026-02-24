import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('========== LOGIN ATTEMPT ==========');
    console.log('1️⃣ Email:', email);
    console.log('2️⃣ Password length:', password.length);
    
    try {
      setError('');
      setDebugInfo('');
      setLoading(true);
      
      // Get auth instance
      const auth = getAuth();
      console.log('3️⃣ Auth instance obtained');
      
      // Attempt login
      console.log('4️⃣ Calling signInWithEmailAndPassword...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('5️⃣ SUCCESS! User logged in:', userCredential.user.email);
      console.log('6️⃣ UID:', userCredential.user.uid);
      console.log('7️⃣ Email verified:', userCredential.user.emailVerified);
      
      console.log('8️⃣ Redirecting to dashboard...');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('========== LOGIN ERROR ==========');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Set user-friendly error message
      let errorMessage = 'Failed to login: ';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage += 'No account exists with this email. Please register first.';
          break;
        case 'auth/wrong-password':
          errorMessage += 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Invalid email format.';
          break;
        case 'auth/user-disabled':
          errorMessage += 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage += 'Network error. Check your internet connection.';
          break;
        case 'auth/invalid-api-key':
          errorMessage += 'Firebase API key is invalid. Check your configuration.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage += 'Email/password sign-in is not enabled in Firebase Console.';
          break;
        default:
          errorMessage += error.message;
      }
      
      setError(errorMessage);
      setDebugInfo(`Error code: ${error.code}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    },
    box: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '20px',
      color: '#111827'
    },
    input: {
      width: '100%',
      padding: '10px',
      marginBottom: '15px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '16px'
    },
    button: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '16px',
      cursor: 'pointer',
      opacity: loading ? 0.5 : 1
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    debug: {
      backgroundColor: '#e0f2fe',
      color: '#0369a1',
      padding: '8px',
      borderRadius: '4px',
      marginTop: '10px',
      fontSize: '12px',
      fontFamily: 'monospace'
    },
    link: {
      display: 'block',
      textAlign: 'center',
      marginTop: '15px',
      color: '#4f46e5',
      textDecoration: 'none'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>Mini HCM</h1>
        
        {error && (
          <div style={styles.error}>
            <strong>❌ Error:</strong> {error}
          </div>
        )}
        
        {debugInfo && (
          <div style={styles.debug}>
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button 
            type="submit" 
            style={styles.button} 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <Link to="/register" style={styles.link}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default Login;