const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');

app.http('GetPeerEvalData', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        // Setup your SQL connection
        context.log('Process get student info.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text())
        const session_id = body.session_id;
        const receiverStudentID = body.ReceiverStudentID;
        const ScheduleID = body.ScheduleID;

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

            // Get the saved data
            let query = `
            SELECT 
                p.*
            FROM 
                peerevaluations p
            JOIN 
                sessions s ON p.WriterStudentID = s.student_id
            WHERE 
                s.session_id = ? AND 
                p.ReceiverStudentID = ? AND 
                p.ScheduleID = ?;
         
            `;
            let [row, fields] = await new Promise((resolve, reject) => {
                db.query(query, [session_id,receiverStudentID,ScheduleID], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            var package = JSON.parse(JSON.stringify(row));
            return{
                status: 200,
                body: JSON.stringify(package,null,2)
            }
        }
        catch (error) {
            context.log(error);
            return {
                status: 404,
                body: `Error processing request: ${error.message}`
            };
        } finally {
            db.end(); // close the database connection
        }
    }
});
