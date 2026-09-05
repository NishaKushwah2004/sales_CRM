const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
const authRoutes = require('./routes/auth.routes')
const companyRoutes = require('./routes/company.routes')
const dealRoutes = require('./routes/deal.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const app = express()
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.get('/api/health', (req, res) => res.json({ success: true, message: 'Sales CRM API is running' }))
app.use('/api/auth', authRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/deals', dealRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } }))
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' } }) })
const PORT = process.env.PORT || 5000;

console.log("DEBUG PORT:", JSON.stringify(process.env.PORT));
console.log("DEBUG JWT_EXPIRES_IN:", JSON.stringify(process.env.JWT_EXPIRES_IN));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
