// GamePage.js

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

function GamePage() {
  const [userData, setUserData] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Retrieve the UID from the URL
    const queryParams = new URLSearchParams(location.search);
    const uid = queryParams.get('uid');

    if (uid) {
      const fetchUserData = async () => {
        try {
          const userDocRef = doc(db, 'users', uid); // Reference to Firestore document
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            console.error('No data available for this user');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };

      fetchUserData();
    }
  }, [location]);

  if (!userData) {
    return <div>Loading user data...</div>;
  }

  return (
    <div>
      <h1>Welcome, {userData.nickname}</h1>
      <img src={userData.avatar_url} alt="User Avatar" />
      <p>Wins: {userData.stats.wins}</p>
      <p>Losses: {userData.stats.losses}</p>
      {/* Display other relevant user data here */}
    </div>
  );
}

export default GamePage;
