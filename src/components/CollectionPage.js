import React from 'react';
import './Collection.css'; // Импорт стилей

function Collection({ uid }) {
  // Пример массива карт для демонстрации. Здесь можно заменить на данные пользователя
  const cards = []; // Пустой массив для примера (можно заменить на реальный массив карт)

  return (
    <div className="collection-container">
      <h1>Коллекция</h1>

      {/* Условие для отображения карт или сообщения */}
      {cards.length === 0 ? (
        <div className="empty-inventory">
          Ваш инвентарь пуст.
        </div>
      ) : (
        <div className="grid">
          {cards.map((card, index) => (
            <div key={index} className="card">
              <div className="card-content">
                {card} {/* Это будет заменено на изображение или контент карты */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Collection;
