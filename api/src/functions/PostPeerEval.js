const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');

app.http('PostPeerEval', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        context.log('Processing a post peer eval request.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text())
        // const session_id = body.session_id
        const DueDate = body.DueDate;
        const CourseID = body.CourseID;


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
        //Try to post to the schedule table (ScheduleID, DueDate, CourseID) 
        try {
            const query = `
            INSERT INTO schedule (DueDate, CourseID) VALUES ( ?, ?)
            `;
            const queryData = [
                body.DueDate,
                body.CourseID
            ];
            let results = await new Promise((resolve, reject) => {
                db.query(query, queryData, function (error, results) {
                    if (error) return reject(error);
                    console.log(results); // Add this line to inspect the structure
                    resolve(results);
                });
            });
        } catch (error) {
            context.log(error);
            return { status: 550, body: error };

        } finally {
            db.end();
        }
        return { status: 200, body: "success" };
    }
});
