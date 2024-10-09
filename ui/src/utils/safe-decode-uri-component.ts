export default (text: string) => {
  try {
    return decodeURIComponent(text)
  } catch (err) {
    return text
  }
}
