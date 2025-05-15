// Örnek veri setleri
export const sampleData = {
  // Çubuk grafik için örnek veri
  barChart: {
    labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
    datasets: [
      {
        label: 'Satışlar',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Giderler',
        data: [8, 12, 6, 7, 4, 2],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      }
    ]
  },
  
  // Çizgi grafik için örnek veri
  lineChart: {
    labels: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran'],
    datasets: [
      {
        label: 'Web Sitesi Ziyaretçileri',
        data: [1500, 1800, 2200, 2500, 3000, 3500],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  },
  
  // Pasta grafik için örnek veri
  pieChart: {
    labels: ['Kırmızı', 'Mavi', 'Sarı', 'Yeşil', 'Mor'],
    datasets: [
      {
        data: [12, 19, 3, 5, 2],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)'
        ]
      }
    ]
  },
  
  // Dağılım grafiği için örnek veri
  scatterChart: {
    datasets: [
      {
        label: 'Dağılım A',
        data: [
          { x: 10, y: 20 },
          { x: 15, y: 10 },
          { x: 20, y: 30 },
          { x: 25, y: 15 },
          { x: 30, y: 25 }
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.5)'
      },
      {
        label: 'Dağılım B',
        data: [
          { x: 12, y: 25 },
          { x: 18, y: 15 },
          { x: 22, y: 35 },
          { x: 28, y: 20 },
          { x: 35, y: 30 }
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.5)'
      }
    ]
  },
  
  // Radar grafik için örnek veri
  radarChart: {
    labels: ['Yemek', 'İçecek', 'Ulaşım', 'Eğlence', 'Giyim', 'Teknoloji'],
    datasets: [
      {
        label: '2023 Harcamaları',
        data: [65, 59, 90, 81, 56, 55],
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgb(255, 99, 132)',
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(255, 99, 132)'
      },
      {
        label: '2024 Harcamaları',
        data: [28, 48, 40, 19, 96, 27],
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54, 162, 235)'
      }
    ]
  },
  
  // Kutu grafik için örnek veri
  boxPlotData: {
    labels: ['A', 'B', 'C', 'D', 'E'],
    datasets: [
      {
        label: 'Veri Dağılımı',
        data: [
          { min: 5, q1: 10, median: 15, q3: 20, max: 25 },
          { min: 8, q1: 12, median: 18, q3: 22, max: 28 },
          { min: 3, q1: 8, median: 12, q3: 18, max: 22 },
          { min: 7, q1: 14, median: 20, q3: 25, max: 30 },
          { min: 10, q1: 15, median: 22, q3: 28, max: 35 }
        ]
      }
    ]
  },
  
  // Isı haritası için örnek veri
  heatmapData: {
    labels: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'],
    datasets: [
      {
        label: '9:00',
        data: [20, 25, 30, 35, 40]
      },
      {
        label: '12:00',
        data: [30, 35, 40, 45, 50]
      },
      {
        label: '15:00',
        data: [25, 30, 35, 40, 45]
      },
      {
        label: '18:00',
        data: [15, 20, 25, 30, 35]
      }
    ]
  },
  
  // Zaman serisi için örnek veri
  timeSeriesData: {
    labels: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'],
    datasets: [
      {
        label: 'Stok Fiyatı',
        data: [150, 180, 220, 210, 250, 280],
        borderColor: 'rgb(75, 192, 192)',
        fill: false
      }
    ]
  }
};

// MongoDB simülasyonu için örnek veri koleksiyonları
export const mongoCollections = {
  // Ürün satış verileri
  sales: [
    { product: 'Laptop', category: 'Elektronik', month: 'Ocak', year: 2024, quantity: 120, revenue: 240000 },
    { product: 'Telefon', category: 'Elektronik', month: 'Ocak', year: 2024, quantity: 200, revenue: 180000 },
    { product: 'Tablet', category: 'Elektronik', month: 'Ocak', year: 2024, quantity: 80, revenue: 96000 },
    { product: 'Laptop', category: 'Elektronik', month: 'Şubat', year: 2024, quantity: 150, revenue: 300000 },
    { product: 'Telefon', category: 'Elektronik', month: 'Şubat', year: 2024, quantity: 220, revenue: 198000 },
    { product: 'Tablet', category: 'Elektronik', month: 'Şubat', year: 2024, quantity: 90, revenue: 108000 },
    { product: 'Laptop', category: 'Elektronik', month: 'Mart', year: 2024, quantity: 180, revenue: 360000 },
    { product: 'Telefon', category: 'Elektronik', month: 'Mart', year: 2024, quantity: 250, revenue: 225000 },
    { product: 'Tablet', category: 'Elektronik', month: 'Mart', year: 2024, quantity: 110, revenue: 132000 },
  ],
  
  // Kullanıcı istatistikleri
  userStats: [
    { date: '2024-01-01', newUsers: 120, activeUsers: 1500, sessionDuration: 15.2 },
    { date: '2024-01-08', newUsers: 150, activeUsers: 1600, sessionDuration: 14.8 },
    { date: '2024-01-15', newUsers: 180, activeUsers: 1700, sessionDuration: 16.1 },
    { date: '2024-01-22', newUsers: 200, activeUsers: 1800, sessionDuration: 15.5 },
    { date: '2024-01-29', newUsers: 220, activeUsers: 1900, sessionDuration: 15.9 },
    { date: '2024-02-05', newUsers: 240, activeUsers: 2000, sessionDuration: 16.3 },
    { date: '2024-02-12', newUsers: 260, activeUsers: 2100, sessionDuration: 16.8 },
    { date: '2024-02-19', newUsers: 280, activeUsers: 2200, sessionDuration: 17.2 },
    { date: '2024-02-26', newUsers: 300, activeUsers: 2300, sessionDuration: 17.5 },
  ],
  
  // Hava durumu verileri
  weatherData: [
    { date: '2024-01-01', city: 'İstanbul', temperature: 5, humidity: 70, precipitation: 10 },
    { date: '2024-01-02', city: 'İstanbul', temperature: 6, humidity: 75, precipitation: 15 },
    { date: '2024-01-03', city: 'İstanbul', temperature: 4, humidity: 80, precipitation: 20 },
    { date: '2024-01-04', city: 'İstanbul', temperature: 3, humidity: 85, precipitation: 25 },
    { date: '2024-01-05', city: 'İstanbul', temperature: 2, humidity: 90, precipitation: 30 },
    { date: '2024-01-06', city: 'İstanbul', temperature: 1, humidity: 85, precipitation: 20 },
    { date: '2024-01-07', city: 'İstanbul', temperature: 3, humidity: 80, precipitation: 15 },
    { date: '2024-01-01', city: 'Ankara', temperature: 0, humidity: 60, precipitation: 5 },
    { date: '2024-01-02', city: 'Ankara', temperature: -1, humidity: 65, precipitation: 10 },
    { date: '2024-01-03', city: 'Ankara', temperature: -2, humidity: 70, precipitation: 15 },
    { date: '2024-01-04', city: 'Ankara', temperature: -3, humidity: 75, precipitation: 20 },
    { date: '2024-01-05', city: 'Ankara', temperature: -4, humidity: 80, precipitation: 25 },
    { date: '2024-01-06', city: 'Ankara', temperature: -2, humidity: 75, precipitation: 15 },
    { date: '2024-01-07', city: 'Ankara', temperature: 0, humidity: 70, precipitation: 10 },
  ]
};
