import { Chart, BarController, BarElement, LinearScale, CategoryScale } from 'chart.js'

Chart.register(BarController, BarElement, LinearScale, CategoryScale)

export default { Chart }
