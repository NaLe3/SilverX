import { Controller } from "@hotwired/stimulus"

// Submits filter forms automatically (with a debounce for text inputs)
export default class extends Controller {
  static values = { delay: { type: Number, default: 300 } }

  connect() {
    this.timer = null
  }

  schedule() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.submit(), this.delayValue)
  }

  submit() {
    clearTimeout(this.timer)
    this.element.requestSubmit()
  }
}
