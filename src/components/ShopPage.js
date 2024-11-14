import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import './Shop.css';

function Shop({ uid }) {
  const [allCards, setAllCards] = useState([]);
  const [playerCards, setPlayerCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const shopSnapshot = await getDocs(collection(db, 'shop'));
        const shopCards = await Promise.all(
          shopSnapshot.docs.map(async (docSnapshot) => {
            const cardData = docSnapshot.data();
            const cardId = cardData.card_id;

            if (cardId) {
              const cardDocRef = doc(db, 'cards', cardId);
              const cardDoc = await getDoc(cardDocRef);
              const cardDetails = cardDoc.exists() ? cardDoc.data() : {};

              return {
                ...cardData,
                name: cardDetails.name || 'Без имени',
                image_url: cardDetails.image_url || '',
                description: cardDetails.description || '',
                price: cardData.price || 0,
              };
            }
            return null;
          })
        );
        setAllCards(shopCards.filter((card) => card !== null));
      } catch (error) {
        console.error('Ошибка при загрузке карт для магазина:', error);
        setError('Не удалось загрузить карты магазина');
      }
    };

    const fetchPlayerCards = async () => {
      try {
        const playerDocRef = doc(db, 'users', uid);
        const playerDoc = await getDoc(playerDocRef);
        const playerData = playerDoc.exists() ? playerDoc.data() : {};

        if (playerData.cards && Array.isArray(playerData.cards)) {
          const playerCardDetails = await Promise.all(
            playerData.cards.map(async (card) => {
              const cardId = card.card_id;
              if (cardId) {
                const cardDocRef = doc(db, 'cards', cardId);
                const cardDoc = await getDoc(cardDocRef);
                const cardData = cardDoc.exists() ? cardDoc.data() : {};

                return {
                  id: cardId,
                  ...cardData,
                  rarityScore: card.rarityScore || 0,
                };
              }
              return null;
            })
          );
          setPlayerCards(playerCardDetails.filter((card) => card !== null));
        } else {
          setPlayerCards([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке карт игрока:', error);
        setError('Не удалось загрузить карты игрока');
      }
    };

    fetchCards();
    fetchPlayerCards();
  }, [uid]);

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const closeOverlay = () => {
    setSelectedCard(null);
  };

  const handleBuyCard = () => {
    setIsConfirmingPurchase(true);
  };

  const confirmPurchase = async () => {
    if (!selectedCard || !selectedCard.card_id) {
      setError('Выберите корректную карту для покупки.');
      return;
    }

    try {
      const playerDocRef = doc(db, 'users', uid);
      const newRarityScore = Math.random();

      // Проверка card_id и rarityScore перед добавлением в arrayUnion
      await updateDoc(playerDocRef, {
        cards: arrayUnion({
          card_id: selectedCard.card_id,
          rarityScore: newRarityScore,
        }),
      });

      const shopDocRef = doc(db, 'shop', selectedCard.card_id);
      await updateDoc(shopDocRef, {
        quantity: increment(-1),
      });

      setIsConfirmingPurchase(false);
      closeOverlay();
      setPlayerCards([...playerCards, { ...selectedCard, rarityScore: newRarityScore }]);
      alert(`Вы купили карту: ${selectedCard.name}`);
    } catch (error) {
      console.error('Ошибка при покупке карты:', error);
      setError('Произошла ошибка при покупке карты. Попробуйте снова.');
    }
  };

  const cancelPurchase = () => {
    setIsConfirmingPurchase(false);
  };

  return (
    <div className="shop-container">
      <h1>Магазин карт</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="player-cards">
        <h2>Ваши карты</h2>
        {playerCards.length === 0 ? (
          <div className="empty-inventory">Ваши карты пусты.</div>
        ) : (
          <div className="grid">
            {playerCards.map((card, index) => (
              <div key={`${card.id}-${index}`} className="card" onClick={() => handleCardClick(card)}>
                <img src={card.image_url} alt={card.name} />
                <div>{card.name}</div>
                <div>Редкость: {card.rarityScore.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="available-cards">
        <h2>Карты для покупки</h2>
        <div className="grid">
          {allCards.length === 0 ? (
            <div className="empty-inventory">Карты для покупки не найдены.</div>
          ) : (
            allCards.map((card, index) => (
              <div key={`${card.card_id}-${index}`} className="card" onClick={() => handleCardClick(card)}>
                <div className="card-quantity-badge">
                  {card.quantity}/{card.total_quantity}
                </div>
                <img src={card.image_url} alt={card.name} />
                <div>{card.name}</div>
                <div>Цена: {card.price} ₽</div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedCard && (
        <div className="overlay">
          <div className="overlay-content">
            <img src={selectedCard.image_url} alt={selectedCard.name} className="overlay-image" />
            <h3>{selectedCard.name}</h3>
            <p>{selectedCard.description}</p>
            <div>Цена: {selectedCard.price} ₽</div>
            <button className="buy-btn" onClick={handleBuyCard}>Купить</button>
            <button className="close-btn" onClick={closeOverlay}>Закрыть</button>
          </div>
        </div>
      )}

      {isConfirmingPurchase && (
        <div className="confirmation-overlay">
          <div className="confirmation-content">
            <p>Вы уверены, что хотите купить карту {selectedCard?.name}?</p>
            <button onClick={confirmPurchase}>Да</button>
            <button onClick={cancelPurchase}>Нет</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shop;
