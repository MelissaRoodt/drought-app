document.addEventListener('DOMContentLoaded', function () {
    // Dummy data for line chart
    const currentYearRainfall = [10, 20, 15, 25, 30, 40, 50, 60, 55, 45, 35, 25];
    const previousYearRainfall = [5, 15, 10, 20, 25, 35, 45, 50, 40, 35, 30, 20];

    const ctx = document.getElementById('rainfallChart').getContext('2d');
    const rainfallChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Current Year Rainfall',
                    data: currentYearRainfall,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    borderWidth: 2
                },
                {
                    label: 'Previous Year Rainfall',
                    data: previousYearRainfall,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Monthly Rainfall Comparison'
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Rainfall (mm)'
                    }
                }
            }
        }
    });

    // Dummy data for pie chart
    const pieChartData = {
        labels: ['Reserve 1', 'Reserve 2', 'Reserve 3'],
        datasets: [{
            data: [300, 450, 600],
            backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
            hoverBackgroundColor: ['#ff6384', '#36a2eb', '#ffce56']
        }]
    };

    const pieCtx = document.getElementById('pieChart').getContext('2d');
    const pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: pieChartData,
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Emergency Water Supply Reserves'
            }
        }
    });

    // Dummy data for bar chart
    const barChartData = {
        labels: ['Region A', 'Region B', 'Region C', 'Region D', 'Region E'],
        datasets: [{
            label: 'Population Facing Drought',
            data: [5000, 7000, 3000, 9000, 4000],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const barCtx = document.getElementById('barChart').getContext('2d');
    const barChart = new Chart(barCtx, {
        type: 'bar',
        data: barChartData,
        options: {
            responsive: true,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        beginAtZero: true
                    }
                },
                y: {
                    grid: {
                        display: true
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }
            },
            title: {
                display: true,
                text: 'Population Facing Drought by Region'
            }
        }
    });

    // Calculate total rainfall
    const currentYearTotal = currentYearRainfall.reduce((a, b) => a + b, 0);
    const previousYearTotal = previousYearRainfall.reduce((a, b) => a + b, 0);

    // Update total rainfall display
    document.getElementById('currentYearTotal').textContent = currentYearTotal + ' mm';
    document.getElementById('previousYearTotal').textContent = previousYearTotal + ' mm';
});
