export default (text) => {
  try {
    return decodeURIComponent(text)
  } catch (err) {
    return text
  }
}
