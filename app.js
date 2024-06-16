const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error:${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const checkToken = (request, response, next) => {
  let jwtToken
  const authHead = request.headers['authorization']
  if (authHead !== undefined) {
    jwtToken = authHead.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'secretkey', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  try {
    const isUserpresentInDB = `select * from user where username = '${username}'`
    const dbUser = await db.get(isUserpresentInDB)
    if (dbUser === undefined) {
      response.status(400)
      response.send('Invalid user')
    } else {
      const isPasswordMatch = await bcrypt.compare(password, dbUser.password)
      if (isPasswordMatch === true) {
        const payload = {username: username}
        const jwttoken = jwt.sign(payload, 'secretkey')
        response.send({jwtToken: jwttoken})
      } else {
        response.status(400)
        response.send('Invalid password')
      }
    }
  } catch (e) {
    console.log(e.message)
  }
})

app.get('/states/', checkToken, async (request, response) => {
  const api2 = `SELECT * FROM state;`
  const ans = await db.all(api2)
  const returnArray = dbObj => {
    return {
      stateId: dbObj.state_id,
      stateName: dbObj.state_name,
      population: dbObj.population,
    }
  }
  response.send(ans.map(state => returnArray(state)))
})

app.get('/states/:stateId/', checkToken, async (request, response) => {
  const {stateId} = request.params
  const api3 = `SELECT * FROM state WHERE state_id ='${stateId}';`
  const ans = await db.get(api3)
  const returnArray = dbObj => {
    return {
      stateId: dbObj.state_id,
      stateName: dbObj.state_name,
      population: dbObj.population,
    }
  }
  response.send(returnArray(ans))
})

app.post('/districts/', checkToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const api4 = `INSERT INTO district ( district_name, state_id, cases,cured,active,deaths) VALUES ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`
  await db.run(api4)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', checkToken, async (request, response) => {
  const {districtId} = request.params
  const api5 = `SELECT * FROM district WHERE district_id = '${districtId}';`
  const ans = await db.get(api5)
  const returnArray = dbObj => {
    return {
      districtId: dbObj.district_id,
      districtName: dbObj.district_name,
      stateId: dbObj.state_id,
      cases: dbObj.cases,
      cured: dbObj.cured,
      active: dbObj.active,
      deaths: dbObj.deaths,
    }
  }
  response.send(returnArray(ans))
})

app.delete('/districts/:districtId/', checkToken, async (request, response) => {
  const {districtId} = request.params
  const api6 = `DELETE FROM district WHERE district_id = '${districtId}';`
  await db.run(api6)
  response.send('District Removed')
})

app.put('/districts/:districtId/', checkToken, async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const api7 = `UPDATE district SET district_name = '${districtName}',state_id = '${stateId}',cases = '${cases}',cured = '${cured}',active = '${active}',deaths = '${deaths}' WHERE district_id = '${districtId}';`
  await db.run(api7)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', checkToken, async (request, response) => {
  const {stateId} = request.params
  const api8 = `SELECT SUM(cases) AS totalCases , SUM(cured) AS totalCured , SUM(active) AS totalActive , SUM(deaths) AS totalDeaths FROM district WHERE state_id = '${stateId}';`
  const ans = await db.get(api8)
  response.send(ans)
})

module.exports = app
