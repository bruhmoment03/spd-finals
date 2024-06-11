import axios from 'axios';

const BASE_URL = 'https://api.binance.com/api/v3';

// 獲取指定交易對的最新價格
export const getPrice = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}/ticker/price`, {
      params: {
        symbol: symbol
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    throw error;
  }
};
