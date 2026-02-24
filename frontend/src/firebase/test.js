import { db } from './config';
import { collection, getDocs } from 'firebase/firestore';

export const testConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    // Try to access a non-existent collection (this will fail but should connect)
    const testQuery = await getDocs(collection(db, 'test'));
    console.log('Firebase connection successful!');
    return true;
  } catch (error) {
    console.error('Firebase connection failed:', error);
    return false;
  }
};