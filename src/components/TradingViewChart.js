import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { DropdownButton, Dropdown } from 'react-bootstrap';

const intervals = {
  '1s': '1 Second',
  '1m': '1 Minute',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '1h': '1 Hour',
  '4h': '4 Hours',
  '1d': '1 Day',
};

const TradingViewChart = ({ symbol }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const [interval, setChartInterval] = useState('4h');

  useEffect(() => {
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: '#14151a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: {
          color: '#2B2B43',
        },
        horzLines: {
          color: '#363c4e',
        },
      },
      crosshair: {
        mode: 1,
      },
      priceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
      },
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#00b894',
      downColor: '#d63031',
      borderDownColor: '#d63031',
      borderUpColor: '#00b894',
      wickDownColor: '#d63031',
      wickUpColor: '#00b894',
    });

    return () => {
      chartRef.current.remove();
    };
  }, []);

  const fetchData = async (symbol, interval) => {
    try {
      const limit = 5000; // 增加请求的数据点数
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }
      const data = await response.json();
      const formattedData = data.map(item => ({
        time: item[0] / 1000,
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
      }));
      candleSeriesRef.current.setData(formattedData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    if (chartRef.current && candleSeriesRef.current) {
      fetchData(symbol, interval);
      const intervalId = setInterval(() => fetchData(symbol, interval), 5000); // 每5秒更新一次价格数据
      return () => clearInterval(intervalId);
    }
  }, [symbol, interval]);

  const handleIntervalChange = (eventKey) => {
    setChartInterval(eventKey);
  };

  return (
    <div>
      <div style={{ color: 'white', marginBottom: '10px' }}>
        <strong>{symbol}/USDT</strong>
      </div>
      <DropdownButton
        id="dropdown-interval-button"
        title={intervals[interval]}
        onSelect={handleIntervalChange}
        variant="secondary"
        className="mb-3"
      >
        {Object.keys(intervals).map(key => (
          <Dropdown.Item key={key} eventKey={key}>
            {intervals[key]}
          </Dropdown.Item>
        ))}
      </DropdownButton>
      <div ref={chartContainerRef} className="tradingview-chart" />
    </div>
  );
};

export default TradingViewChart;
