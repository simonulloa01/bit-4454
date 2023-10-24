const { app } = require('@azure/functions');
const mysql = require('mysql');

app.http('upload-json', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('JSON Upload function processed a request.');

        // Parse JSON body from the request
        const payload = JSON.parse(await request.text());
        const session_id = payload.session_id; // Professor's session_id for authentication
        const section_id = payload.section_id; // Section ID for the specific course section
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
            // First, validate the professor's session_id if necessary
            // This step depends on your authentication logic and database schema
            let authQuery = 'SELECT * FROM sessions WHERE session_id = ?'; // Adjust based on your schema
            let session = await new Promise((resolve, reject) => {
                db.query(authQuery, [session_id], (error, results) => {
                    if (error) return reject(error);
                    resolve(results[0]); // assuming the session is unique and only one record will be returned
                });
            });

            // Check if the session exists (i.e., the professor is authenticated)
            if (!session) {
                return {
                    status: 401,
                    body: 'Unauthorized: Invalid session ID'
                };
            }

            // If authenticated, proceed to process the student data
            for (let student of students) {
                // Add student to the 'student' table
                let studentQuery = 'INSERT INTO student (LastName, FirstName, GroupId, Email) VALUES (?, ?, ?, ?)';
                let studentInsertResult = await new Promise((resolve, reject) => {
                    db.query(studentQuery, [student.LastName, student.FirstName, student.GroupId, student.Email], (error, results) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });

                // If necessary, use the result of the insert operation (like the inserted ID) for further queries
                // For example, if you need to link the student with the section
                let studentSectionQuery = 'INSERT INTO student_section (student_id, section_id) VALUES (?, ?)';
                await new Promise((resolve, reject) => {
                    db.query(studentSectionQuery, [studentInsertResult.insertId, section_id], (error, results) => {
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
