document.addEventListener('DOMContentLoaded', function () {
    // Example data, replace with your actual data
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

    // Calculate total rainfall
    const currentYearTotal = currentYearRainfall.reduce((a, b) => a + b, 0);
    const previousYearTotal = previousYearRainfall.reduce((a, b) => a + b, 0);

    // Update total rainfall display
    document.getElementById('currentYearTotal').textContent = currentYearTotal + ' mm';
    document.getElementById('previousYearTotal').textContent = previousYearTotal + ' mm';
});
