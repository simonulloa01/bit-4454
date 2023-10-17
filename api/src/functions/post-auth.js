const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID

module.exports = async function (context, req) {
    context.log('Processing a login request.');

    const email = (req.query.email || (req.body && req.body.email));

    if (!email) {
        context.res = {
            status: 400,
            body: "Email is required"
        };
        return;
    }

    // Setup your SQL connection
    const db = mysql.createConnection({
        host: 'bitsem.mysql.database.azure.com', // your host
        user: 'clay', // your username
        password: 'Bit44542023', // your password
        database: 'main' // your database name
    });

    db.connect();

    try {
        // Check if the email is present in the student or professor table
        let query = 'SELECT FirstName FROM student WHERE email = ? UNION SELECT FirstName FROM professor WHERE email = ?';
        let [rows, fields] = await new Promise((resolve, reject) => {
            db.query(query, [email, email], function (error, results) {
                if (error) return reject(error);
                resolve(results);
            });
        });

        if (!rows.length) {
            context.res = {
                status: 404,
                body: "Email not found"
            };
            return;
        }

        const firstName = rows[0].FirstName;
        const sessionId = uuidv4(); // Generate a unique session ID

        // Store session in the database
        query = 'INSERT INTO sessions (session_id, created_at) VALUES (?, NOW())';
        await new Promise((resolve, reject) => {
            db.query(query, [sessionId], function (error, results) {
                if (error) return reject(error);
                resolve(results);
            });
        });

        // Construct the payload for the external service
        const payload = {
            email: email,
            link: `https://zealous-plant-073f3f80f.azurestaticapps.net/?session=${sessionId}`,
            name: firstName
        };

        // Send post request to external service
        const externalServiceUrl = 'https://prod-185.westus.logic.azure.com:443/workflows/fccb8245d6184696a7c47ada1f4fd784/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SYL8JwelN6R7nN0n4wPA0ScH2KJM2OavL2gfv-3UtLU';
        await axios.post(externalServiceUrl, payload);

        // Respond with success message
        context.res = {
            body: { message: 'Login successful', sessionId: sessionId }
        };

    } catch (error) {
        context.res = {
            status: 500,
            body: `Error processing request: ${error.message}`
        };
    } finally {
        db.end(); // close the database connection
    }
};
