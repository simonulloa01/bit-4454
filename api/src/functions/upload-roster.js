const { app } = require('@azure/functions');
const mysql = require('mysql');

app.http('upload-roster', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('JSON Upload function processed a request.');

        // Parse JSON body from the request
        const payload = JSON.parse(await request.text());
        const session_id = payload.session_id; // Assuming session_id is sent as part of the JSON payload
        const students = payload.students; // Assuming the JSON contains an array of students

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
            // Loop through the students and add them to the database
            for (let student of students) {
                // Perform the necessary query for each student
                // Make sure to handle SQL injection by escaping the input values
                let query = 'INSERT INTO student (LastName, FirstName, GroupId, Email) VALUES (?, ?, ?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(query, [student.LastName, student.FirstName, student.GroupId, student.Email], (error, results, fields) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });

                // Assuming there's a relationship between session and student
                query = 'INSERT INTO session_students (session_id, student_id) VALUES (?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(query, [session_id, student.StudentID], (error, results, fields) => { // Assuming student.StudentID is available
                        if (error) return reject(error);
                        resolve(results);
                    });
                });
            }

            return {
                status: 200,
                body: 'Data processed successfully!'
            };
        } catch (error) {
            context.log(error);
            return {
                status: 500,
                body: `Error processing request: ${error.message}`
            };
        } finally {
            db.end(); // close the database connection
        }
    }
});
