import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import CollectionsIcon from '@mui/icons-material/Collections';
import StoreIcon from '@mui/icons-material/Store';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import Shop from './components/ShopPage'; // Импортируем компоненты
import Collection from './components/CollectionPage';
import Profile from './components/ProfilePage';
import Cart from './components/FightPage';

function App() {
  // Получаем параметры из текущего URL
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const uid = searchParams.get('uid'); // Получаем параметр uid

  return (
    <div>
      {/* Нижняя навигация с материалом UI */}
      <div style={{ position: 'fixed', bottom: 0, width: '100%' }}>
        <BottomNavigation showLabels>
          <BottomNavigationAction
            label="Shop"
            icon={<StoreIcon />}
            component={Link}
            to={`/Shop?uid=${uid}`} // Добавляем uid в ссылку
          />
          <BottomNavigationAction
            label="Collection"
            icon={<CollectionsIcon />}
            component={Link}
            to={`/collection?uid=${uid}`} // Добавляем uid в ссылку
          />
          <BottomNavigationAction
            label="Fight"
            icon={<SportsEsportsIcon />}
            component={Link}
            to={`/Fight?uid=${uid}`} // Добавляем uid в ссылку
          />
          <BottomNavigationAction
            label="Profile"
            icon={<AccountCircleIcon />}
            component={Link}
            to={`/profile?uid=${uid}`} // Добавляем uid в ссылку
          />
        </BottomNavigation>
      </div>

      {/* Маршруты с параметром uid */}
      <Routes>
        <Route path="/shop" element={<Shop uid={uid} />} />
        <Route path="/collection" element={<Collection uid={uid} />} />
        <Route path="/profile" element={<Profile uid={uid} />} />
        <Route path="/Fight" element={<Cart uid={uid} />} />
      </Routes>
    </div>
  );
}

export default App;
