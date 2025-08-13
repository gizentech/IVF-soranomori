// pages/api/check-env.js
export default async function handler(req, res) {
  console.log('=== Environment Check ===')
  
  const result = {
    nodeEnv: process.env.NODE_ENV,
    hasSlackUrl: !!process.env.SLACK_WEBHOOK_URL,
    slackUrlLength: process.env.SLACK_WEBHOOK_URL?.length || 0,
    slackUrlStart: process.env.SLACK_WEBHOOK_URL?.substring(0, 30) || 'not found',
    timestamp: new Date().toISOString(),
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('SLACK'))
  }
  
  console.log('Environment check result:', result)
  
  return res.status(200).json(result)
}