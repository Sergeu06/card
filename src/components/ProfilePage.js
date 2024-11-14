import React from 'react';

function Profile({ uid }) {
  return (
    <div>
      <h1>Профиль</h1>
      <p>UID: {uid}</p> {/* Выводим UID */}
    </div>
  );
}

export default Profile;
