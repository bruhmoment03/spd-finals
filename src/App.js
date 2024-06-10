import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import brandlogo from './btc.webp'
import TradingViewChart from './components/TradingViewChart';
import { Modal, Button, Form, DropdownButton, Dropdown, ButtonGroup, Navbar, Nav } from 'react-bootstrap';
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
  const [balance, setBalance] = useState(100000); // 初始價格，其實沒用
  const [holdings, setHoldings] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({});
  const [orders, setOrders] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [coinIcons, setCoinIcons] = useState({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = Object.values(SYMBOLS).map(s => s.symbol);
        const requests = symbols.map(symbol => getPrice(symbol));
        const responses = await Promise.all(requests);
        const prices = {};
        responses.forEach((response, index) => {
          prices[symbols[index]] = parseFloat(response.price);
        });
        setCurrentPrices(prices);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      }
    };

    fetchPrices();
    const intervalId = setInterval(fetchPrices, 5000); // 每5秒取得一次最新價格

    return () => clearInterval(intervalId);
  }, []);

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
    fetchHoldings();
    fetchBalance();
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

  const fetchHoldings = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/holdings');
      const holdingsData = response.data.reduce((acc, item) => {
        acc[item.symbol] = parseFloat(item.amount);
        return acc;
      }, {});
      setHoldings(holdingsData);
    } catch (error) {
      console.error('Error fetching holdings:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/balance');
      setBalance(parseFloat(response.data.amount));  // 確保 balance 是數字
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const updateHoldings = async (symbol, amount, value) => {
    try {
      await axios.post('http://localhost:5000/api/holdings', { symbol, amount, value });
      fetchHoldings();
    } catch (error) {
      console.error('Error updating holdings:', error);
    }
  };

  const updateBalance = async (amount) => {
    try {
      await axios.post('http://localhost:5000/api/balance', { amount });
      setBalance(amount);  // 直接更新 balance 狀態
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  const handleBuy = async () => {
    try {
      const data = await getPrice(selectedSymbol);
      const currentPrice = parseFloat(data.price);
      const price = orderType === 'market' ? currentPrice : parseFloat(buyPrice);
      const amount = orderType === 'market' ? parseFloat(buyTotal) / currentPrice : parseFloat(buyAmount);
      const total = orderType === 'market' ? parseFloat(buyTotal) : parseFloat(buyTotal);

      // 掛單判斷，檢查掛單價格是否小於當前價格
      if (orderType === 'limit' && price < currentPrice) {
        alert('限价购买价格必须大于或等于当前价格');
        return;
      }

      if (total <= balance && amount > 0) {
        const newBalance = balance - total;
        setBalance(newBalance);
        updateBalance(newBalance);
        const newHoldings = {
          ...holdings,
          [selectedSymbol]: (holdings[selectedSymbol] || 0) + amount
        };
        setHoldings(newHoldings);
        updateHoldings(selectedSymbol, newHoldings[selectedSymbol], total);
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
        alert('余额不足或金额无效');
      }
    } catch (error) {
      console.error('购买订单执行失败:', error);
    }
  };

  const handleSell = async () => {
    try {
      const data = await getPrice(selectedSymbol);
      const currentPrice = parseFloat(data.price);
      const price = orderType === 'market' ? currentPrice : parseFloat(sellPrice);
      const amount = orderType === 'market' ? parseFloat(sellTotal) / currentPrice : parseFloat(sellAmount);
      const total = orderType === 'market' ? amount * currentPrice : parseFloat(sellTotal);

      // 掛單判斷，檢查掛單價格是否大於當前價格
      if (orderType === 'limit' && price > currentPrice) {
        alert('限价卖出价格必须小于或等于当前价格');
        return;
      }

      if (amount <= (holdings[selectedSymbol] || 0) && amount > 0) {
        const newBalance = balance + total;
        setBalance(newBalance);
        updateBalance(newBalance);
        const newHoldings = {
          ...holdings,
          [selectedSymbol]: (holdings[selectedSymbol] || 0) - amount
        };
        setHoldings(newHoldings);
        updateHoldings(selectedSymbol, newHoldings[selectedSymbol], total);
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
        alert('持仓不足或金额无效');
      }
    } catch (error) {
      console.error('卖出订单执行失败:', error);
    }
  };

  const handleSymbolChange = (eventKey) => {
    setSelectedSymbol(eventKey);
  };

  const handleOrderTypeChange = async (newOrderType) => {
    setOrderType(newOrderType);

    // 取得當前價格並設定為 Limit 價格的預設值
    if (newOrderType === 'limit') {
      try {
        const data = await getPrice(selectedSymbol);
        setBuyPrice(data.price);
        setSellPrice(data.price);
      } catch (error) {
        console.error('获取当前价格失败:', error);
      }
    } else {
      setBuyPrice('');
      setSellPrice('');
    }

    // 清空輸入字段
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
          placeholder={currentPrices[selectedSymbol]?.toFixed(2)}
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

  const renderHoldings = () => (
    Object.keys(holdings).map((symbol) => {
      if (symbol !== null) {
        const holdingAmount = formatNumber(holdings[symbol]);
        const holdingPrice = currentPrices[symbol] || 0;
        const holdingValue = (holdings[symbol] * holdingPrice).toFixed(2);
        return (
          <div key={symbol} className="holding-details">
            <span className="holding-symbol">{symbol}</span>
            <span>Amount: {holdingAmount}</span>
            <span>Value: ${holdingValue}</span>
          </div>
        );
      }
      return null;
    })
  );

  const calculateHoldingsValue = () => {
    return Object.keys(holdings).reduce((total, symbol) => {
      const holdingPrice = currentPrices[symbol] || 0;
      const holdingValue = holdings[symbol] * holdingPrice;
      return total + holdingValue;
    }, 0).toFixed(2);
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Navbar.Brand href="/">
          
          <img src = {brandlogo} width={40} className='mx-3'></img>
          
          Crypto Trading Simulator</Navbar.Brand>
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
      <div className="container gateio-theme">
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
        <div className="mt-4">
          <h4>Balance: ${balance.toFixed(2)} USDT</h4>
          <h4>Holdings Value: ${calculateHoldingsValue()} USDT</h4>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Holdings</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {renderHoldings()}
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
