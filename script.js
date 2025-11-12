const showTasksBtn = document.getElementById('showTasks');
const showWeatherBtn = document.getElementById('showWeather');
const taskView = document.getElementById('taskView');
const weatherView = document.getElementById('weatherView');

showTasksBtn.addEventListener('click', () => {
  taskView.classList.add('active');
  weatherView.classList.remove('active');
});

showWeatherBtn.addEventListener('click', () => {
  weatherView.classList.add('active');
  taskView.classList.remove('active');
});
