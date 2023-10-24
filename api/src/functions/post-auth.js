const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');

app.http('post-auth', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing a login request.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text())
        const email = body.email

        if (!email) {
            return { status: 400, body: email };
        }

        // Setup your SQL connection
        const db = mysql.createConnection({
            host: 'bitsem.mysql.database.azure.com',
            user: 'clay',
            password: 'Bit44542023',
            database: 'main',
            port: 3306,
            ssl: true
        });

        db.connect();

        try {
            var ProfessorID = null;
            var StudentID = null;
            var firstName = null;
            // Check if the email is present in the student or professor table
            let query = 'SELECT FirstName,StudentID FROM student WHERE email = ?';
            let [rows, fields] = await new Promise((resolve, reject) => {
                db.query(query, [email], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });
            // If the email is present in the student table, get the student ID
            if (rows != undefined) {
                StudentID = rows.StudentID;
                firstName = rows.FirstName;
            }

            query = 'SELECT FirstName,ProfessorID FROM professor WHERE email = ?';
            let [rowsP, fieldsP] = await new Promise((resolve, reject) => {
                db.query(query, [email], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });
            // If the email is present in the student table, get the student ID
            if (rowsP != undefined) {
                ProfessorID = rowsP.ProfessorID;
                firstName = rowsP.FirstName;
            }
            // If the email is not present in either table, return an error
            if (!ProfessorID && !StudentID || ProfessorID && StudentID) {
                return {
                    status: 200,
                    body: "Nothing found"
                };
            }
            const sessionId = uuidv4(); // Generate a unique session ID

            // Store session in the database
            query = 'INSERT INTO sessions (session_id, student_id, professor_id, created_at) VALUES (?, ?, ?, NOW())';
            await new Promise((resolve, reject) => {
                db.query(query, [sessionId, StudentID, ProfessorID], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            // Construct the payload for the external service
            const payload = {
                email: email,
                link: `https://zealous-plant-073f3f80f.4.azurestaticapps.net/${StudentID != undefined ? "StudentHome" : "techtut"}?session=${sessionId}`,
                name: firstName
            };

            // Send post request to external service
            const externalServiceUrl = 'https://prod-185.westus.logic.azure.com:443/workflows/fccb8245d6184696a7c47ada1f4fd784/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=SYL8JwelN6R7nN0n4wPA0ScH2KJM2OavL2gfv-3UtLU'; // replace with your actual URL
            await axios.post(externalServiceUrl, payload);

            // Respond with success message
            return { body: { message: 'Login successful', sessionId: sessionId } };

        } catch (error) {
            context.log(error);
            return {
                status: 200,
                body: `Error processing request: ${error.message}`
            };
        } finally {
            db.end(); // close the database connection
        }
    }
});

module.exports = app;
