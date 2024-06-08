import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import TradingViewChart from './components/TradingViewChart';
import { Modal, Button, Form, DropdownButton, Dropdown, ButtonGroup } from 'react-bootstrap';

const SYMBOLS = {
  BTC: { symbol: 'BTCUSDT', name: 'Bitcoin' },
  SOL: { symbol: 'SOLUSDT', name: 'Solana' },
  ETH: { symbol: 'ETHUSDT', name: 'Ethereum' },
  BNB: { symbol: 'BNBUSDT', name: 'BNB' },
  FTM: { symbol: 'FTMUSDT', name: 'Fantom' }
};

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS.BTC.symbol);
  const [orderType, setOrderType] = useState('limit'); // 'limit' or 'market'
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [buyTotal, setBuyTotal] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [sellTotal, setSellTotal] = useState('');
  const [balance, setBalance] = useState(10000); // 模擬初始金額
  const [holdings, setHoldings] = useState({
    BTCUSDT: 0,
    SOLUSDT: 0,
    ETHUSDT: 0,
    BNBUSDT: 0,
    FTMUSDT: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${selectedSymbol}`);
        const data = await response.json();
        setCurrentPrice(parseFloat(data.price));
      } catch (error) {
        console.error('Failed to fetch current price:', error);
      }
    };

    fetchCurrentPrice();
    const intervalId = setInterval(fetchCurrentPrice, 100); // 每0.1秒获取一次最新价格

    return () => clearInterval(intervalId);
  }, [selectedSymbol]);

  useEffect(() => {
    if (buyPrice && buyAmount) {
      setBuyTotal((buyPrice * buyAmount).toFixed(2));
    } else if (buyTotal && buyPrice) {
      setBuyAmount((buyTotal / buyPrice).toFixed(6));
    }
  }, [buyPrice, buyAmount, buyTotal]);

  useEffect(() => {
    if (sellPrice && sellAmount) {
      setSellTotal((sellPrice * sellAmount).toFixed(2));
    } else if (sellTotal && sellPrice) {
      setSellAmount((sellTotal / sellPrice).toFixed(6));
    }
  }, [sellPrice, sellAmount, sellTotal]);

  const handleBuy = () => {
    // Implement buy logic
  };

  const handleSell = () => {
    // Implement sell logic
  };

  const handleSymbolChange = (eventKey) => {
    setSelectedSymbol(eventKey);
  };

  const handleOrderTypeChange = (newOrderType) => {
    setOrderType(newOrderType);
    // Clear input fields when order type changes
    setBuyPrice('');
    setBuyAmount('');
    setBuyTotal('');
    setSellPrice('');
    setSellAmount('');
    setSellTotal('');
  };

  const getCurrentSymbolName = () => {
    return Object.keys(SYMBOLS).find(key => SYMBOLS[key].symbol === selectedSymbol);
  };

  const handleBuyAmountChange = (e) => {
    const value = e.target.value;
    setBuyAmount(value);
    if (buyPrice) {
      setBuyTotal((value * buyPrice).toFixed(2));
    }
  };

  const handleBuyTotalChange = (e) => {
    const value = e.target.value;
    setBuyTotal(value);
    if (buyPrice) {
      setBuyAmount((value / buyPrice).toFixed(6));
    }
  };

  const handleSellAmountChange = (e) => {
    const value = e.target.value;
    setSellAmount(value);
    if (sellPrice) {
      setSellTotal((value * sellPrice).toFixed(2));
    }
  };

  const handleSellTotalChange = (e) => {
    const value = e.target.value;
    setSellTotal(value);
    if (sellPrice) {
      setSellAmount((value / sellPrice).toFixed(6));
    }
  };

  const renderLimitOrderFields = (isBuy) => (
    <>
      <Form.Group controlId={`${isBuy ? 'buy' : 'sell'}Price`}>
        <Form.Label>Price:</Form.Label>
        <Form.Control
          type="number"
          value={isBuy ? buyPrice : sellPrice}
          onChange={(e) => isBuy ? setBuyPrice(e.target.value) : setSellPrice(e.target.value)}
          placeholder={currentPrice.toFixed(2)}
        />
      </Form.Group>
      <Form.Group controlId={`${isBuy ? 'buy' : 'sell'}Amount`}>
        <Form.Label>Amount ({getCurrentSymbolName()}):</Form.Label>
        <Form.Control
          type="number"
          value={isBuy ? buyAmount : sellAmount}
          onChange={(e) => isBuy ? handleBuyAmountChange(e) : handleSellAmountChange(e)}
        />
      </Form.Group>
      <Form.Group controlId={`${isBuy ? 'buy' : 'sell'}Total`}>
        <Form.Label>Total (USDT):</Form.Label>
        <Form.Control
          type="number"
          value={isBuy ? buyTotal : sellTotal}
          onChange={(e) => isBuy ? handleBuyTotalChange(e) : handleSellTotalChange(e)}
        />
      </Form.Group>
    </>
  );

  const renderMarketOrderFields = (isBuy) => (
    <>
      <Form.Group controlId={`${isBuy ? 'buy' : 'sell'}Price`}>
        <Form.Label>Price:</Form.Label>
        <Form.Control
          className='market-currentPrice'
          type="text"
          value="Market Price"
          readOnly
          disabled
        />
      </Form.Group>
      <Form.Group controlId={`${isBuy ? 'buy' : 'sell'}Total`}>
        <Form.Label>Total (USDT):</Form.Label>
        <Form.Control
          type="number"
          value={isBuy ? buyTotal : sellTotal}
          onChange={(e) => isBuy ? setBuyTotal(e.target.value) : setSellTotal(e.target.value)}
        />
      </Form.Group>
    </>
  );

  return (
    <div className="container">
      <h1 className="my-4">Crypto Trading Simulator</h1>
      <TradingViewChart symbol={selectedSymbol} />
      <DropdownButton
        id="dropdown-symbol-button"
        title={`${getCurrentSymbolName()} (${SYMBOLS[getCurrentSymbolName()].name})`}
        onSelect={handleSymbolChange}
        variant="secondary"
        className="mb-3"
      >
        {Object.keys(SYMBOLS).map(key => (
          <Dropdown.Item key={key} eventKey={SYMBOLS[key].symbol}>
            {key} ({SYMBOLS[key].name})
          </Dropdown.Item>
        ))}
      </DropdownButton>
      <ButtonGroup className="mb-3">
        <Button
          variant={orderType === 'limit' ? 'outline-light active' : 'outline-light'}
          onClick={() => handleOrderTypeChange('limit')}
        >
          Limit
        </Button>
        <Button
          variant={orderType === 'market' ? 'outline-light active' : 'outline-light'}
          onClick={() => handleOrderTypeChange('market')}
        >
          Market
        </Button>
      </ButtonGroup>
      <div className="card transaction-card mb-4">
        <div className="card-body">
          <div className="transaction-container">
            <div style={{ width: '48%' }}>
              {orderType === 'limit' ? renderLimitOrderFields(true) : renderMarketOrderFields(true)}
              <Button
                variant="success"
                className="btn-buy mt-2"
                onClick={handleBuy}
                block
              >
                Buy {getCurrentSymbolName()}
              </Button>
            </div>
            <div style={{ width: '48%' }}>
              {orderType === 'limit' ? renderLimitOrderFields(false) : renderMarketOrderFields(false)}
              <Button
                variant="danger"
                className="btn-sell mt-2"
                onClick={handleSell}
                block
              >
                Sell {getCurrentSymbolName()}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h4>Balance: ${balance.toFixed(2)} USDT</h4>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Holdings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-group">
            {Object.keys(holdings).map((symbol) => (
              <li key={symbol} className="list-group-item">
                {symbol}: {holdings[symbol].toFixed(6)}
              </li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
