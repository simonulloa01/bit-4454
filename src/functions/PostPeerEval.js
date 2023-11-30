const { app } = require('@azure/functions');
const { cosmosDB } = require('../../api/src/functions/post-auth');

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

        if (!session_id) {
            return { status: 400, body: session_id };
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
        //Try to post to the schedule table (ScheduleID, DueDate, CourseID) 
        try {
            const query = `
            INSERT INTO schedule (ScheduleID, DueDate, CourseID) VALUES (?, ?, ?)
            `;
            const queryData = [
                body.ScheduleID,
                body.DueDate,
                body.CourseID
            ];
            let [rows, fields] = await new Promise((resolve, reject) => {
                db.query(query, queryData, function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });
            return { status: 200, body: rows };
        } catch (error) {
            context.log(error);
            return { status: 500, body: error };
        }
    }
});
