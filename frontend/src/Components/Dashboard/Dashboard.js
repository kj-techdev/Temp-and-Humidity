import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import io from 'socket.io-client';
import Chart from '../Chart/Chart';
import GaugeChart from 'react-gauge-chart';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

const socket = io('http://localhost:3000');

function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerID = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerID);
  }, []);

  return (
    <ClockContainer>
      <p>{currentTime.toString()}</p>
    </ClockContainer>
  );
}

function Dashboard() {
  const [data, setData] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    fetch('http://192.168.1.23:3000/get-data')
      .then(response => response.json())
      .then(data => {
        setData(data);
        calculateForecast(data);
      })
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  useEffect(() => {
    const date = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDateTime(date.toLocaleDateString('en-US', options));
  }, []);

  useEffect(() => {
    socket.on('new-data', (newData) => {
      setData((prevData) => {
        const updatedData = [...prevData, newData];
        calculateForecast(updatedData);
        return updatedData;
      });
    });

    return () => {
      socket.off('new-data');
    };
  }, []);

  const calculateForecast = (data) => {
    const days = 7;
    const dayInMs = 24 * 60 * 60 * 1000;
    const end = new Date().getTime();
    const start = end - (days * dayInMs);
    
    const forecastData = Array.from({ length: days }, (_, i) => {
      const dayStart = start + (i * dayInMs);
      const dayEnd = dayStart + dayInMs;

      const dayData = data.filter(entry => {
        const entryTime = new Date(entry.time).getTime();
        return entryTime >= dayStart && entryTime < dayEnd;
      });

      const tempSum = dayData.reduce((sum, entry) => sum + entry.temperature, 0);
      const humiditySum = dayData.reduce((sum, entry) => sum + entry.humidity, 0);

      const avgTemp = dayData.length ? (tempSum / dayData.length).toFixed(2) : 0;
      const avgHumidity = dayData.length ? (humiditySum / dayData.length).toFixed(2) : 0;

      return {
        date: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        temperature: avgTemp,
        humidity: avgHumidity
      };
    });

    setForecast(forecastData);
  };

  const formatDate = (dateString) => {
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Date(dateString).toLocaleString('en-US', options);
  };

  const latestTemperature = data.length > 0 ? data[data.length - 1].temperature : 0;
  const latestHumidity = data.length > 0 ? data[data.length - 1].humidity : 0;

  const tempGaugeValue = latestTemperature / 50; // Assuming max temperature is 50 degrees Celsius
  const humidityGaugeValue = latestHumidity / 100; // Humidity is a percentage

  const maxTemperature = Math.max(...data.map(d => d.temperature), 0);
  const maxHumidity = Math.max(...data.map(d => d.humidity), 0);

  const maxTempGaugeValue = maxTemperature / 50; // Assuming max temperature is 50 degrees Celsius
  const maxHumidityGaugeValue = maxHumidity / 100;

  const Greeting = () => {
    const date = new Date();
    const localTime = new Date(date.getTime() + date.getTimezoneOffset() * 60000 + (8 * 3600000)); // Adjust to UTC+8
    const hours = localTime.getHours();
  
    let greeting = "Good Morning User"; // Default greeting
    if (hours >= 12 && hours < 13) {
      greeting = "Good Noon User";
    } else if (hours >= 13 && hours < 18) {
      greeting = "Good Afternoon User";
    } else if (hours >= 18 || hours < 6) {
      greeting = "Good Evening User";
    }
  
    return (
      <div className="greeting-style">
        <h1>{greeting}!</h1>
      </div>
    );
  };

  const Forecast = () => {
    return (
      <div className="forecast-con">
        <h2>7-Day Forecast</h2>
        <ul>
          {forecast.map((day, index) => (
            <li key={index}>
              <p>{day.date}</p>
              <p>Temp: {day.temperature}°C</p>
              <p>Humidity: {day.humidity}%</p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <DashboardStyled>
      <InnerLayout>
        <h2>Dashboard</h2>
        
        <Clock />
        <Greeting />
        <div className="content-con">
          <div className="forecast-con">
            <Forecast />
          </div>
        </div>
        <div className="stats-con">
          <div>
            <h2>Temperature</h2>
            <GaugeChart id="latest-temp-gauge" nrOfLevels={30} colors={["#FF5F6D", "#FFC371"]} arcWidth={0.3} percent={tempGaugeValue} style={{ width: '60%', height: '60%' }} />
            <p>{latestTemperature}&deg;C</p>
          </div>
          <div>
            <h2>Humidity</h2>
            <GaugeChart id="latest-humidity-gauge" nrOfLevels={30} colors={["#5BC0EB", "#FDE74C"]} arcWidth={0.3} percent={humidityGaugeValue} style={{ width: '60%', height: '60%' }} />
            <p>{latestHumidity}%</p>
          </div>
        </div>
        <div className="gauge-con">
          <h2>Extremes</h2>
          <div className="gauge-row">
            <div className="gauge">
              <h3>Max Temperature</h3>
              <GaugeChart id="max-temp-gauge" nrOfLevels={30} colors={["#FF5F6D", "#FFC371"]} arcWidth={0.3} percent={maxTempGaugeValue} />
              <p>{maxTemperature}&deg;C</p>
            </div>
            <div className="gauge">
              <h3>Max Humidity</h3>
              <GaugeChart id="max-humidity-gauge" nrOfLevels={30} colors={["#5BC0EB", "#FDE74C"]} arcWidth={0.3} percent={maxHumidityGaugeValue} />
              <p>{maxHumidity}%</p>
            </div>
          </div>
        </div>
        <div className="chart-con">
          <h2>Analytics</h2>
          <small>Track your temperature and humidity over time.</small>
          <Chart data={data} />
        </div>
        <div className="history-con">
          <h2>Temperature and Humidity Data</h2>
          <table>
            <thead>
              <tr>
                <th>Temperature (&deg;C)</th>
                <th>Humidity (%)</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record, index) => (
                <tr key={index}>
                  <td>{record.temperature}</td>
                  <td>{record.humidity}</td>
                  <td>{formatDate(record.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InnerLayout>
    </DashboardStyled>
  );
}


const DashboardStyled = styled.div`
  font-family: 'Segoe UI', sans-serif;
  background-color: #ffffff;
  padding: 20px;
  color: #222260; 

  .content-con {
    display: flex;
    margin-top: 2rem;
  }

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #222260; 
    }
  }

  .forecast-con {
    flex: 1;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    padding: 20px;

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #222260; 
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        margin-bottom: 10px;
        padding: 10px;
        border-bottom: 1px solid #ddd;

        p {
          margin: 0;
          font-size: 1rem;
          color: #222260;
        }
      }
    }
  }

  .stats-con {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 1rem;
    margin-bottom: 1rem;

    > div {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      margin: 1rem 0;

      h2 {
        font-size: 1.2rem;
        color: #222260;
        margin-bottom: 0.5rem;
      }
      p {
        font-size: 2.4rem;
        font-weight: bold;
        margin: 0;
        color: #222260; 
      }
      small {
        font-size: 1rem;
        color: #222260; 
      }
    }
  }

  .chart-con {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    padding: 20px;
    margin-bottom: 2rem;

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #222260; 
    }

    small {
      font-size: 1rem;
      color: #222260;
    }
  }

  .gauge-con {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    padding: 20px;
    margin-bottom: 2rem;

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #222260; 
    }

    .gauge-row {
      display: flex;
      justify-content: space-around;
    }

    .gauge {
      display: flex;
      flex-direction: column;
      align-items: center;

      h3 {
        font-size: 1.2rem;
        margin-bottom: 0.5rem;
        color: #222260;
      }

      p {
        font-size: 1.5rem;
        font-weight: bold;
        margin-top: 1rem;
        color: #222260;
      }
    }
  }

  .history-con {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    padding: 20px;
    width: 100%;
    margin-top: 2rem;

    h2 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #222260; 
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;

      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
        color: #222260; 
      }

      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }

      tr:hover {
        background-color: #f1f1f1;
      }
    }
  }

  .greeting-style {
    border: 1px solid #ddd; 
    padding: 10px;
    margin: 20px 0; 
    text-align: center;
    border-radius: 8px; 
    background-color: #fffff; 
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); 
  }  
`;

const InnerLayout = styled.div`
  padding: 0.2rem;
  color: #222260;
`;

const ClockContainer = styled.div`
  p {
    font-size: 1rem;
    color: #222260;
  }
`; 

export default Dashboard;
