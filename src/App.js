import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, DropdownButton, Dropdown, ButtonGroup, Navbar, Nav } from 'react-bootstrap';
import axios from 'axios';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import TradingViewChart from './components/TradingViewChart';
import { getPrice } from './api/binance';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLinkedin, faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons';
import { faDice as faDiceSolid } from '@fortawesome/free-solid-svg-icons';
import brandlogo from './btc.webp';
import tickSound from './tick.mp3';

const SYMBOLS = {
  BTC: { symbol: 'BTCUSDT', name: 'Bitcoin', id: 'bitcoin' },
  SOL: { symbol: 'SOLUSDT', name: 'Solana', id: 'solana' },
  ETH: { symbol: 'ETHUSDT', name: 'Ethereum', id: 'ethereum' },
  BNB: { symbol: 'BNBUSDT', name: 'Binance Coin', id: 'binancecoin' },
  FTM: { symbol: 'FTMUSDT', name: 'Fantom', id: 'fantom' }
};

const houseEdge = 2.5; // 莊家優勢，偷改數值哈

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS.BTC.symbol);
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

  const [betAmount, setBetAmount] = useState(0);
  const [winChance, setWinChance] = useState(50);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false); 
  const [betResult, setBetResult] = useState(null); 
  const [profit, setProfit] = useState(0); 
  const [playerWins, setPlayerWins] = useState(0); 
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = Object.values(SYMBOLS).map(s => s.symbol);
        const requests = symbols.map(symbol => getPrice(symbol));

        // https://www.runoob.com/js/js-async.html
        /* Promise的解釋，就是異步编程，同時執行很多request，然後await等待他們都fulfilled
        再傳送到 responses 變數 */
        const responses = await Promise.all(requests);

        // Response: 
        /* 
        0: {symbol: 'BTCUSDT', price: '66271.51000000'}
        1: {symbol: 'SOLUSDT', price: '145.52000000'}
        2: {symbol: 'ETHUSDT', price: '3561.50000000'}
        3: {symbol: 'BNBUSDT', price: '606.80000000'}
        4: {symbol: 'FTMUSDT', price: '0.63390000'} 
        */

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

    /* clearInterval來確定他被清除，防止組件卸載後，定時任務仍然繼續運行並試圖更新已經卸載的組件
    從而導致潛在的內存洩漏和性能問題。 */
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {

    // async: 異步函數，自動將函數返回值包裝在一個 Promise 內，並允許在函數內部使用 await 關鍵字來等待 Promise 被解決（fulfilled）或拒絕（rejected）。
    const fetchCoinIcons = async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
          params: {
            vs_currency: 'usd',
            ids: Object.values(SYMBOLS).map(s => s.id).join(','),
          },
        });

        console.log(response)

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

      // https://www.runoob.com/jsref/jsref-reduce.html
      // reduce: 將陣列中的每個元素按照指定的方式組合成一個單一的值。
      // Example: 

      /* 
      item.symbol: FTMUSDT item.amount: 1798.91860295
      item.symbol: ETHUSDT item.amount: 0.73021135
      item.symbol: BNBUSDT item.amount: 8.65502451 
      */

      const holdingsData = response.data.reduce((acc, item) => {
        //console.log("item.symbol: " + item.symbol, "item.amount: " + item.amount)
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
      setBalance(parseFloat(response.data.amount));  // 確保 balance 是數字, string convert to float 哈
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
      const price = currentPrice;
      const amount = parseFloat(buyTotal) / currentPrice;
      const total = parseFloat(buyTotal);

      if (total <= balance && amount > 0) {
        const newBalance = balance - total;
        setBalance(newBalance);
        updateBalance(newBalance);
        // 展開 holdings 對象中的所有屬性，將其複製到新的對象 newHoldings 中
        // 把其他沒有用到的都複製過去
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
        alert('餘額不足或金額無效');
      }
    } catch (error) {
      console.error('購買訂單執行失敗:', error);
    }
  };

  const handleSell = async () => {
    try {
      const data = await getPrice(selectedSymbol);
      const currentPrice = parseFloat(data.price);
      const price = currentPrice;
      const amount = parseFloat(sellTotal) / currentPrice;
      const total = amount * currentPrice;

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
        alert('持倉不足或金額無效');
      }
    } catch (error) {
      console.error('賣出訂單執行失敗:', error);
    }
  };

  const handleSymbolChange = (eventKey) => {
    setSelectedSymbol(eventKey);
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

  const handleBetAmountChange = (e) => {
    setBetAmount(e.target.value);
  };
  const audio = new Audio(tickSound);

  const handleWinChanceChange = (e) => {
    const sliderValue = e.target.value;
    const winChanceValue = 100 - sliderValue;
    audio.play();
    setWinChance(winChanceValue);
  };

  const calculateMultiplier = (winChance) => {
    return ((98) / winChance).toFixed(4);
  };

  const handleBet = () => {
    // 根據玩家的贏得次數和總收益來決定是否讓玩家輸
    const randomNigga = (Math.random() * 5)
    const shouldPlayerLose = playerWins >= randomNigga;

    let win = Math.random() * 100 < (winChance - houseEdge); // 偷偷減ㄏ
    if (shouldPlayerLose) {
      win = false;
    }

    // debug
    console.log("shouldPlayerLose: " + shouldPlayerLose, "PlayerWins:" + playerWins, "randomNigga: " + randomNigga, "win: " + win)
    
    let profitValue = 0;
    if (win) {
      profitValue = parseFloat(betAmount) * calculateMultiplier(winChance);
      setBalance(balance + profitValue);
      setPlayerWins(playerWins + 1); // 增加玩家的勝利次數
    } else {
      profitValue = -parseFloat(betAmount);
      setBalance(balance - parseFloat(betAmount));
      setPlayerWins(0); // 重置玩家的勝利次數
    }
    setTotalProfit(totalProfit + profitValue); // 更新總收益
    setProfit(profitValue.toFixed(4));
    setBetResult(win ? 'win' : 'lose');
    setShowResultModal(true);
    setShowBetModal(false);
  };

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
          <img src={brandlogo} width={40} className='mx-3' alt="brand logo"></img>
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
            variant={'outline-primary active'}
          >
            Market
          </Button>
          <Button
            variant="outline-info"
            onClick={() => setShowModal(true)}
          >
            Holdings
          </Button>
          <Button
            variant="outline-success"
            onClick={() => setShowBetModal(true)}
          >
            Bet
          </Button>
        </ButtonGroup>
        <div className="card transaction-card mb-4">
          <div className="card-body">
            <div className="transaction-container">
              <div style={{ width: '48%' }}>
                {renderMarketOrderFields(true)}
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
                {renderMarketOrderFields(false)}
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

        <Modal show={showBetModal} onHide={() => setShowBetModal(false)} className="modal-centered">
          <Modal.Header closeButton>
            <Modal.Title>Bet Your USDT</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group controlId="betAmount">
                <Form.Label>Bet Amount (USDT):</Form.Label>
                <Form.Control
                  type="number"
                  value={betAmount}
                  onChange={handleBetAmountChange}
                />
                <Form.Label>Current Balance: ${balance.toFixed(2)} USDT</Form.Label>
              </Form.Group>
              <Form.Group controlId="winChance">
                <Form.Label>Win Chance: {winChance}% (Multiplier: x{calculateMultiplier(winChance)})</Form.Label>
                <div className="slider-container">
                  <div className="slider-labels">
                    <div><span>2%</span></div>
                    <div><span>25%</span></div>
                    <div><span>50%</span></div>
                    <div><span>75%</span></div>
                    <div><span>98%</span></div>
                  </div>
                  <input 
                  type="range" 
                  min="2" 
                  max="98" 
                  value={100 - winChance} 
                  onChange={handleWinChanceChange} 
                  className="slider"
                  style={{
                    background: `linear-gradient(to right, #e9113c ${(100 - winChance)}%, #00e701 ${(100 - winChance)}%)`
                    }}
                   />
                  <FontAwesomeIcon icon={faDiceSolid} className="icon" />
                </div>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={handleBet}>
              <FontAwesomeIcon icon={faDiceSolid} /> Bet
            </Button>
            <Button variant="secondary" onClick={() => setShowBetModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showResultModal} onHide={() => setShowResultModal(false)} className="modal-centered">
          <Modal.Header closeButton>
            <Modal.Title>{betResult === 'win' ? 'You Win!' : 'You Lose'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <FontAwesomeIcon
              icon={betResult === 'win' ? faDiceSolid : faDiceSolid}
              size="4x"
              className={`mb-4 ${betResult === 'win' ? 'text-success' : 'text-danger'}`}
            />
            <p><strong>Bet Amount:</strong> {betAmount} USDT</p>
            <p><strong>Win Chance:</strong> {winChance}%</p>
            <p><strong>Multiplier:</strong> x{calculateMultiplier(winChance)}</p>
            <p><strong>Profit:</strong> ${profit} USDT</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResultModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}

export default App;
