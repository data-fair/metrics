import { Chart } from 'chart.js'

const ShadowBarElement = Chart.elements.Bar.extend({
  draw: function () {
    const ctx = this._chart.ctx
    const originalStroke = ctx.stroke
    ctx.stroke = function () {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 2
      ctx.shadowOffsetX = 0.5
      ctx.shadowOffsetY = 0.5
      originalStroke.apply(this, arguments)
      ctx.restore()
    }
    Chart.elements.Bar.prototype.draw.apply(this, arguments)
    ctx.stroke = originalStroke
  }
})
Chart.defaults.ShadowBar = Chart.defaults.Bar
Chart.controllers.ShadowBar = Chart.controllers.Bar.extend({
  datasetElementType: ShadowBarElement
})
