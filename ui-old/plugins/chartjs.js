import { Chart, BarController, CategoryScale, LinearScale, BarElement, Legend, Tooltip } from 'chart.js'

export default defineNuxtPlugin(() => {
  Chart.register(BarController, CategoryScale, LinearScale, BarElement, Legend, Tooltip)
})
