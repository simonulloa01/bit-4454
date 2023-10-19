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

        // Check if any of the values are null
        const allValuesProvided = [
            body.DisciplinaryKnowledge,
            body.IntellectualSkills,
            body.InterpersonalSkills,
            body.GlobalCitizenship,
            body.PersonalMastery
        ].every(item => item != null);

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
            // Prepare the SQL query and data
            let query;
            let queryData;

            if (allValuesProvided) {
                // All values are provided, set CompletionDate to today
                query = `
            UPDATE peerevaluations SET 
            WriterStudentID = ?, 
            ScheduleID = ?, 
            ReceiverStudentID = ?, 
            DisciplinaryKnowledge = ?, 
            IntellectualSkills = ?, 
            InterpersonalSkills = ?, 
            GlobalCitizenship = ?, 
            PersonalMastery = ?, 
            CompletionDate = CURDATE() 
            WHERE EvaluationID = ?
        `;

                queryData = [
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
            } else {
                // Not all values are provided, don't set CompletionDate
                query = `
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

                queryData = [
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
            }

            // Execute the SQL query
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