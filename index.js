import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import parse from "pg-connection-string";
import pg from "pg";

const Client = pg.Client;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8658;
const ALIVE_TIME = 15 * 60;
const JWT_SECRETKEY = 'mysecretkey';

var connectionString = "postgresql://ericyu049:RCCLUkQD9CiGRGzL82diBQ@free-tier14.aws-us-east-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full&options=--cluster%3Dai-amadeus-1185";
var config = parse(connectionString);
config.port = 26257;
config.database = 'timeleapmachine';
const client = new Client(config);
(async () => {
    try {
        await client.connect();
    }
    catch (err) {
        console.log(`error connecting: ${err}`)
    }
})().catch((err) => console.log(err.stack));

function getUserByUsername(username) {
    const statement = "SELECT * FROM users WHERE username = '" + username + "';";
    return new Promise(resolve => {
        const statement = "SELECT * FROM users WHERE username = '" + username + "';";
        client.query(statement, (error, result) => {
            if (error) throw error;
            if (result.rows.length > 0) {
                resolve(result.rows[0]);
            }
        });
    });
}
function saveHouse(username, houses, house) {
    houses.push(house);
    houses.push(house);
    console.log(houses.join('\',\''));
    const statement = "UPDATE users SET houses = ARRAY['" + houses.join('\',\'') + "'] WHERE username = '" + username + "';";
    return new Promise(resolve => {
        client.query(statement, (error, result) => {
            if (error) throw error;
            if (result) {
                resolve(result);
            }
        });
    });
}
function verifyPassword(user, password) {
    return user.password === password;
}

function generateToken(user) {
    const role = user.role;
    const username = user.username;
    const type = 'access';

    const tokenPayload = { role, username, type };
    const token = jwt.sign(
        tokenPayload,
        JWT_SECRETKEY,
        { expiresIn: ALIVE_TIME }
    );
    return token;
}

function getRefreshToken(user) {
    const username = user.username;
    const role = user.role;
    const type = 'refresh';

    const password = user.password;
    const key = genKey(username, password);

    const tokenPayload = { type, username, role, key };

    const refreshToken = jwt.sign(tokenPayload, JWT_SECRETKEY);
    return refreshToken;
}

function hashHmacSha256(s) {
    return crypto
        .createHmac('sha256', JWT_SECRETKEY)
        .update(s)
        .digest('hex');
}

function genKey(id, password) {
    const rawKey = id + password;
    const key = hashHmacSha256(rawKey, JWT_SECRETKEY);
    return key;
}
app.post('/login', async (request, response) => {
    const username = request.body.username;
    const password = request.body.password;

    const user = await getUserByUsername(username);
    if (!user) {
        response.status(400).send('User not found');
        return;
    }
    const isPasswordCorrect = verifyPassword(user, password);
    if (!isPasswordCorrect) {
        response.status(400).send('Incorrect password');
        return;
    }
    const token = generateToken(user);
    const refreshToken = getRefreshToken(user);
    response.status(200).json({ rspCde: 0, rspMsg: 'Success', token, refreshToken });
})
app.post('/refreshToken', async (request, response) => {

});
app.post('/signup', async (request, response) => {
    const username = request.body.username;
    const password = request.body.password;


});
app.post('/saveHouse', async (request, response) => {
    const user = await getUserByUsername(request.body.username);
    const result = await saveHouse(user.username, user.houses, request.body.house);
    if (result) response.status(200).json({ rspCde: 0, rspMsg: 'Success'});
    else return response.status(400).send('Failed');
});
app.get('/getHouses', async (request, response) => {
    const user = await getUserByUsername(request.body.username);
    if (result) response.status(200).json({ rspCde: 0, rspMsg: 'Success', houses: user.houses});
    else return response.status(400).send('Failed');
});


app.listen(PORT, () => console.log(`Application is running on http://localhost:${PORT}`));