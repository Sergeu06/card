import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import './UpgradePage.css';

const MAX_SLOTS = 5;
const CHANCE_PER_CARD = 20;

const getCardAttribute = (card) =>
  card?.stat_type || card?.statType || card?.attribute || card?.type || 'Без типа';

const normalizeRarityScore = (score) => {
  const numericScore = Number(score);
  return Number.isFinite(numericScore) ? numericScore : 0;
};

const getSecretRecipesInfo = (userData) => {
  if (userData?.resources?.SecretRecipes != null) {
    return {
      value: Number(userData.resources.SecretRecipes) || 0,
      path: 'resources.SecretRecipes',
    };
  }

  if (userData?.resources?.secretRecipes != null) {
    return {
      value: Number(userData.resources.secretRecipes) || 0,
      path: 'resources.secretRecipes',
    };
  }

  if (userData?.SecretRecipes != null) {
    return {
      value: Number(userData.SecretRecipes) || 0,
      path: 'SecretRecipes',
    };
  }

  if (userData?.secretRecipes != null) {
    return {
      value: Number(userData.secretRecipes) || 0,
      path: 'secretRecipes',
    };
  }

  return { value: 0, path: 'SecretRecipes' };
};

function UpgradePage({ uid }) {
  const [playerCards, setPlayerCards] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [extraChance, setExtraChance] = useState(0);
  const [secretRecipes, setSecretRecipes] = useState(0);
  const [secretRecipesPath, setSecretRecipesPath] = useState('SecretRecipes');
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        const secretInfo = getSecretRecipesInfo(userData);

        setSecretRecipes(secretInfo.value);
        setSecretRecipesPath(secretInfo.path);

        if (!userData.cards || !Array.isArray(userData.cards)) {
          setPlayerCards([]);
          return;
        }

        const playerCardDetails = await Promise.all(
          userData.cards.map(async (card, index) => {
            if (!card?.card_id) {
              return null;
            }

            const cardDoc = await getDoc(doc(db, 'cards', card.card_id));
            const cardData = cardDoc.exists() ? cardDoc.data() : {};
            const rarityScore = normalizeRarityScore(card.rarityScore);

            return {
              id: card.card_id,
              instanceKey: `${card.card_id}-${rarityScore}-${index}`,
              rarityScore,
              ...cardData,
            };
          })
        );

        setPlayerCards(playerCardDetails.filter(Boolean));
      } catch (fetchError) {
        console.error('Ошибка при загрузке данных пользователя:', fetchError);
        setError('Не удалось загрузить данные пользователя.');
      }
    };

    const fetchAllCards = async () => {
      try {
        const cardsSnapshot = await getDocs(collection(db, 'cards'));
        const cardsData = cardsSnapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        setAllCards(cardsData);
      } catch (fetchError) {
        console.error('Ошибка при загрузке списка карт:', fetchError);
        setError('Не удалось загрузить список карт.');
      }
    };

    if (uid) {
      fetchUserData();
      fetchAllCards();
    }
  }, [uid]);

  const baseChance = useMemo(
    () => Math.min(100, selectedCards.length * CHANCE_PER_CARD),
    [selectedCards.length]
  );

  const maxExtraChance = useMemo(
    () => Math.max(0, Math.min(100 - baseChance, secretRecipes)),
    [baseChance, secretRecipes]
  );

  useEffect(() => {
    if (extraChance > maxExtraChance) {
      setExtraChance(maxExtraChance);
    }
  }, [extraChance, maxExtraChance]);

  const totalChance = Math.min(100, baseChance + extraChance);

  const isCardSelected = (card) =>
    selectedCards.some((selected) => selected.instanceKey === card.instanceKey);

  const handleCardToggle = (card) => {
    setError(null);
    setStatusMessage(null);

    if (isCardSelected(card)) {
      const nextSelection = selectedCards.filter(
        (selected) => selected.instanceKey !== card.instanceKey
      );

      setSelectedCards(nextSelection);
      if (nextSelection.length === 0) {
        setSelectedAttribute(null);
      }

      return;
    }

    if (selectedCards.length >= MAX_SLOTS) {
      setError('Можно выбрать максимум 5 карт.');
      return;
    }

    const cardAttribute = getCardAttribute(card);
    if (selectedAttribute && cardAttribute !== selectedAttribute) {
      setError('Можно объединять карты только с одинаковой характеристикой.');
      return;
    }

    setSelectedAttribute(cardAttribute);
    setSelectedCards([...selectedCards, card]);
  };

  const handleExtraChanceChange = (event) => {
    setError(null);
    setStatusMessage(null);
    setExtraChance(Number(event.target.value));
  };

  const handleTryLuck = async () => {
    setError(null);
    setStatusMessage(null);

    if (selectedCards.length === 0) {
      setError('Выберите хотя бы одну карту для слияния.');
      return;
    }

    if (extraChance > secretRecipes) {
      setError('Недостаточно ресурса SecretRecipes для выбранного шанса.');
      return;
    }

    if (!selectedAttribute) {
      setError('Не удалось определить характеристику выбранных карт.');
      return;
    }

    setIsProcessing(true);

    try {
      const userDocRef = doc(db, 'users', uid);
      const selectedKeys = new Set(selectedCards.map((card) => card.instanceKey));
      const remainingCards = playerCards.filter(
        (card) => !selectedKeys.has(card.instanceKey)
      );

      const remainingCardEntries = remainingCards.map((card) => ({
        card_id: card.id,
        rarityScore: card.rarityScore,
      }));

      const successRoll = Math.random() * 100 <= totalChance;
      let newCard = null;
      let updatedEntries = remainingCardEntries;

      if (successRoll) {
        const cardsByAttribute = allCards.filter(
          (card) => getCardAttribute(card) === selectedAttribute
        );

        if (cardsByAttribute.length === 0) {
          setError('Не удалось подобрать карту для награды.');
          setIsProcessing(false);
          return;
        }

        const rewardCard = cardsByAttribute[Math.floor(Math.random() * cardsByAttribute.length)];
        const newRarityScore = Math.random();

        updatedEntries = [
          ...remainingCardEntries,
          { card_id: rewardCard.id, rarityScore: newRarityScore },
        ];

        newCard = {
          ...rewardCard,
          id: rewardCard.id,
          rarityScore: newRarityScore,
          instanceKey: `${rewardCard.id}-${newRarityScore}-${Date.now()}`,
        };
      }

      const updatedSecretRecipes = Math.max(0, secretRecipes - extraChance);

      await updateDoc(userDocRef, {
        cards: updatedEntries,
        [secretRecipesPath]: updatedSecretRecipes,
      });

      setPlayerCards(newCard ? [...remainingCards, newCard] : remainingCards);
      setSecretRecipes(updatedSecretRecipes);
      setSelectedCards([]);
      setSelectedAttribute(null);
      setExtraChance(0);
      setStatusMessage(
        successRoll
          ? 'Слияние успешно! Вы получили новую карту.'
          : 'Слияние не удалось. Карты утрачены.'
      );
    } catch (submitError) {
      console.error('Ошибка при выполнении слияния:', submitError);
      setError('Не удалось выполнить слияние. Попробуйте снова.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="upgrade-page">
      <header className="upgrade-header">
        <h1>Прокачка карт</h1>
        <p>Слияйте карты с одинаковой характеристикой и повышайте редкость.</p>
      </header>

      {(error || statusMessage) && (
        <div className={`upgrade-message ${error ? 'is-error' : 'is-success'}`}>
          {error || statusMessage}
        </div>
      )}

      <section className="fusion-panel">
        <div className="fusion-summary">
          <h2>Слияние</h2>
          <p className="fusion-subtitle">
            Выбрано: {selectedCards.length}/{MAX_SLOTS} • Шанс: {totalChance}%
          </p>
          <p className="fusion-attribute">
            Характеристика: {selectedAttribute || 'не выбрана'}
          </p>
          <div className="fusion-slots">
            {Array.from({ length: MAX_SLOTS }).map((_, index) => {
              const card = selectedCards[index];
              return (
                <button
                  type="button"
                  key={card?.instanceKey || index}
                  className={`fusion-slot ${card ? 'has-card' : ''}`}
                  onClick={() => card && handleCardToggle(card)}
                >
                  {card ? (
                    <>
                      <img src={card.image_url} alt={card.name} />
                      <span>{card.name}</span>
                    </>
                  ) : (
                    <span className="slot-placeholder">Пусто</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="fusion-controls">
          <div className="chance-control">
            <label htmlFor="chance-slider">
              Доп. шанс за SecretRecipes: {extraChance}%
            </label>
            <input
              id="chance-slider"
              type="range"
              min="0"
              max={maxExtraChance}
              value={extraChance}
              onChange={handleExtraChanceChange}
            />
            <div className="chance-footer">
              <span>SecretRecipes: {secretRecipes}</span>
              <span>Макс. доп. шанс: {maxExtraChance}%</span>
            </div>
          </div>

          <button
            type="button"
            className="fusion-submit"
            onClick={handleTryLuck}
            disabled={isProcessing}
          >
            Попытать удачу
          </button>
        </div>
      </section>

      <section className="fusion-cards">
        <h2>Ваши карты</h2>
        {playerCards.length === 0 ? (
          <div className="empty-inventory">Ваши карты пусты.</div>
        ) : (
          <div className="fusion-cards-grid">
            {playerCards.map((card) => {
              const cardAttribute = getCardAttribute(card);
              const isSelected = isCardSelected(card);
              const isDisabled =
                selectedAttribute && cardAttribute !== selectedAttribute && !isSelected;

              return (
                <button
                  type="button"
                  key={card.instanceKey}
                  className={`fusion-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleCardToggle(card)}
                  disabled={isDisabled}
                >
                  <img src={card.image_url} alt={card.name} />
                  <div className="fusion-card-info">
                    <strong>{card.name}</strong>
                    <span>Редкость: {card.rarityScore.toFixed(2)}</span>
                    <span>Характеристика: {cardAttribute}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default UpgradePage;
