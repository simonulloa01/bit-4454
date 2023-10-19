const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');
app.http('SetPeerEvalData', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Log the process initiation
        context.log('Process update peer evaluation.');
        context.log('HTTP request:', request);

        // Parse the request body
        const body = JSON.parse(await request.text());
        const session_id = body.session_id;
        // Extract other relevant information from the request body here

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
            // Construct the SQL query for the update operation
            let query = `
               UPDATE peerevaluations SET 
               WriterStudentID = ?, 
               ScheduleID = ?, 
               ReceiverStudentID = ?, 
               DisciplinaryKnowledge = ?, 
               IntellectualSkills = ?, 
               InterpersonalSkills = ?, 
               GlobalCitizenship = ?, 
               PersonalMastery = ? 
               WHERE EvaluationID = ?
           `;

            // Setup the data for the query
            let queryData = [
                body.WriterStudentID,
                body.ScheduleID,
                body.ReceiverStudentID,
                body.DisciplinaryKnowledge,
                body.IntellectualSkills,
                body.InterpersonalSkills,
                body.GlobalCitizenship,
                body.PersonalMastery,
                body.EvaluationID
            ];

            // Execute the query
            await new Promise((resolve, reject) => {
                db.query(query, queryData, function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

        } catch (error) {
            context.log(error);
            return {
                status: 500, // Internal Server Error
                body: `Error processing request: ${error.message}`
            };
        } finally {
            db.end(); // close the database connection
            return {
                status: 200, // OK
                body: "Peer evaluation updated successfully."
            };
        }
    }

});
