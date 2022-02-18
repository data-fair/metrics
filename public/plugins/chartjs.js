import Vue from 'vue'
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Legend, Tooltip } from 'chart.js'

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Legend, Tooltip)

Vue.prototype.$Chart = Chart
