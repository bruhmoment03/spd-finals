import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import TradingViewChart from './components/TradingViewChart';
import { Modal, Button, Form, DropdownButton, Dropdown, ButtonGroup, Navbar, Nav } from 'react-bootstrap';
import axios from 'axios';
import { getPrice } from './api/binance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedin, faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons';

const SYMBOLS = {
  BTC: { symbol: 'BTCUSDT', name: 'Bitcoin', id: 'bitcoin' },
  SOL: { symbol: 'SOLUSDT', name: 'Solana', id: 'solana' },
  ETH: { symbol: 'ETHUSDT', name: 'Ethereum', id: 'ethereum' },
  BNB: { symbol: 'BNBUSDT', name: 'Binance Coin', id: 'binancecoin' },
  FTM: { symbol: 'FTMUSDT', name: 'Fantom', id: 'fantom' }
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({});
  const [orders, setOrders] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [coinIcons, setCoinIcons] = useState({});

  useEffect(() => {
    const fetchCurrentPrice = async () => {
      try {
        const data = await getPrice(selectedSymbol);
        setCurrentPrice(parseFloat(data.price));
      } catch (error) {
        console.error('Failed to fetch current price:', error);
      }
    };

    fetchCurrentPrice();
    const intervalId = setInterval(fetchCurrentPrice, 5000); // 每5秒获取一次最新价格

    return () => clearInterval(intervalId);
  }, [selectedSymbol]);

  useEffect(() => {
    const fetchCoinIcons = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            ids: Object.values(SYMBOLS).map(s => s.id).join(','),
          },
        });
        const icons = {};
        response.data.forEach((coin) => {
          icons[coin.id] = coin.image;
        });
        setCoinIcons(icons);
      } catch (error) {
        console.error('Failed to fetch coin icons:', error);
      }
    };

    fetchCoinIcons();
  }, []);

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

  const formatNumber = (number, decimals = 6) => {
    return parseFloat(number).toFixed(decimals);
  };

  const handleBuy = async () => {
    try {
      const data = await getPrice(selectedSymbol);
      const currentPrice = parseFloat(data.price);
      const price = orderType === 'market' ? currentPrice : parseFloat(buyPrice);
      const amount = orderType === 'market' ? parseFloat(buyTotal) / price : parseFloat(buyAmount);
      const total = orderType === 'market' ? parseFloat(buyTotal) : parseFloat(buyTotal);

      // 检查限价订单价格是否小于当前价格
      if (orderType === 'limit' && price < currentPrice) {
        alert('Limit buy price must be greater than or equal to the current price');
        return;
      }

      if (total <= balance && amount > 0) {
        setBalance(balance - total);
        const newHoldings = {
          ...holdings,
          [selectedSymbol]: (holdings[selectedSymbol] || 0) + amount
        };
        setHoldings(newHoldings);
        setOrders([...orders, { type: 'buy', symbol: selectedSymbol, price, amount, total }]);
        setBuyPrice('');
        setBuyAmount('');
        setBuyTotal('');
        setSuccessDetails({
          type: 'Buy',
          symbol: selectedSymbol,
          icon: coinIcons[SYMBOLS[getCurrentSymbolName()].id],
          price,
          total,
          amount: formatNumber(amount),
          newHoldings: formatNumber(newHoldings[selectedSymbol])
        });
        setShowSuccessModal(true);
      } else {
        alert('Insufficient balance or invalid amount');
      }
    } catch (error) {
      console.error('Failed to execute buy order:', error);
    }
  };

  const handleSell = async () => {
    try {
      const data = await getPrice(selectedSymbol);
      const currentPrice = parseFloat(data.price);
      const price = orderType === 'market' ? currentPrice : parseFloat(sellPrice);
      const amount = parseFloat(sellAmount);
      const total = orderType === 'market' ? amount * price : parseFloat(sellTotal);

      // 检查限价订单价格是否大于当前价格
      if (orderType === 'limit' && price > currentPrice) {
        alert('Limit sell price must be less than or equal to the current price');
        return;
      }

      if (amount <= (holdings[selectedSymbol] || 0) && amount > 0) {
        setBalance(balance + total);
        const newHoldings = {
          ...holdings,
          [selectedSymbol]: (holdings[selectedSymbol] || 0) - amount
        };
        setHoldings(newHoldings);
        setOrders([...orders, { type: 'sell', symbol: selectedSymbol, price, amount, total }]);
        setSellPrice('');
        setSellAmount('');
        setSellTotal('');
        setSuccessDetails({
          type: 'Sell',
          symbol: selectedSymbol,
          icon: coinIcons[SYMBOLS[getCurrentSymbolName()].id],
          price,
          total,
          amount: formatNumber(amount),
          newHoldings: formatNumber(newHoldings[selectedSymbol])
        });
        setShowSuccessModal(true);
      } else {
        alert('Insufficient holdings or invalid amount');
      }
    } catch (error) {
      console.error('Failed to execute sell order:', error);
    }
  };

  const handleSymbolChange = (eventKey) => {
    setSelectedSymbol(eventKey);
  };

  const handleOrderTypeChange = async (newOrderType) => {
    setOrderType(newOrderType);

    // 获取当前价格并设置为 Limit 价格的默认值
    if (newOrderType === 'limit') {
      try {
        const data = await getPrice(selectedSymbol);
        setBuyPrice(data.price);
        setSellPrice(data.price);
      } catch (error) {
        console.error('Failed to fetch current price:', error);
      }
    } else {
      setBuyPrice('');
      setSellPrice('');
    }

    // 清空输入字段
    setBuyAmount('');
    setBuyTotal('');
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
          placeholder={currentPrice.toFixed(2)}
          onChange={(e) => isBuy ? setBuyPrice(e.target.value) : setSellPrice(e.target.value)}
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
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand href="/">
            <img
              alt=""
              src="/ws_logo_neon.png"
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{' '}
            Crypto Trading Simulator
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ml-auto">
            <Nav.Link href="https://www.linkedin.com/in/speedo-c-2b97662b4/" target="_blank">
              <FontAwesomeIcon icon={faLinkedin} /> LinkedIn
            </Nav.Link>
            <Nav.Link href="https://github.com/bruhmoment03" target="_blank">
              <FontAwesomeIcon icon={faGithub} /> GitHub
            </Nav.Link>
            <Nav.Link href="https://discord.gg/nDgaZwmtgY" target="_blank">
              <FontAwesomeIcon icon={faDiscord} /> Discord
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <div className="container">

        <h1 className="my-4">Crypto Trading Simulator</h1>

        <div className="mt-4">
          <h2>Balance: ${balance.toFixed(2)} USDT</h2>
        </div>

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
        <ButtonGroup className="mb-3 toggle-btn-group">
          <Button
            variant={orderType === 'limit' ? 'outline-warning active' : 'outline-warning'}
            onClick={() => handleOrderTypeChange('limit')}
          >
            Limit
          </Button>
          <Button
            variant={orderType === 'market' ? 'outline-primary active' : 'outline-primary'}
            onClick={() => handleOrderTypeChange('market')}
          >
            Market
          </Button>
          <Button
            variant="outline-info"
            onClick={() => setShowModal(true)}
          >
            Holdings
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

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Holdings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ul className="list-group">
              {Object.keys(holdings).map((symbol) => (
                <li key={symbol} className="list-group-item">
                  {symbol}: {formatNumber(holdings[symbol])}
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

        <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Transaction Successful</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <img src={successDetails.icon} alt={successDetails.symbol} style={{ width: '100px', marginBottom: '20px' }} />
            <p><strong>Type:</strong> {successDetails.type}</p>
            <p><strong>Symbol:</strong> {successDetails.symbol}</p>
            <p><strong>Price:</strong> ${successDetails.price}</p>
            <p><strong>Total:</strong> ${successDetails.total}</p>
            <p><strong>Amount:</strong> {successDetails.amount} {getCurrentSymbolName()}</p>
            <p><strong>New Holdings:</strong> {successDetails.newHoldings} {getCurrentSymbolName()}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}

export default App;
