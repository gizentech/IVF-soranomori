export default function handler(req, res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
  res.status(401).json({ message: 'Authentication required' })
}