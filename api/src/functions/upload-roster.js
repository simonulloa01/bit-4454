const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');
app.http('upload-students', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Process student upload.');

        const body = JSON.parse(await request.text());
        const session_id = body.session_id;
        const section_id = body.section_id;
        const students = body.students;

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
            // First, authenticate the session_id with the professor's session
            let sessionQuery = 'SELECT professor_id FROM sessions WHERE session_id = ?';
            let [session] = await new Promise((resolve, reject) => {
                db.query(sessionQuery, [session_id], (error, results) => {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            if (!session || session.length === 0) {
                throw new Error('Session authentication failed.');
            }

            // For each student in the payload, insert or update the student in the 'student' table and insert the group data into 'studentgroups' table
            await Promise.all(students.map(async (student) => {
                let insertStudentQuery = `
                    INSERT INTO student (FirstName, LastName, Email) 
                    VALUES (?, ?, ?) 
                    ON DUPLICATE KEY UPDATE
                    Email = VALUES(Email)

                `;

                // This assumes that your student table has an auto-increment primary key (StudentID)
                let result = await new Promise((resolve, reject) => {
                    db.query(insertStudentQuery, [student.FirstName, student.LastName, student.Email], (error, results) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });

                let studentIdQuery = 'SELECT StudentID FROM student WHERE Email = ?';
                let [studentIdResult] = await new Promise((resolve, reject) => {
                    db.query(studentIdQuery, [student.Email], (error, results) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });
                let studentId = studentIdResult.StudentID;
                
                let insertStudentGroupQuery = `
                    INSERT INTO studentgroups (StudentID, CourseID, GroupID) 
                    VALUES (?, ?, ?)  
                `;

                await new Promise((resolve, reject) => {
                    db.query(insertStudentGroupQuery, [studentId, section_id, student.GroupId], (error, results) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });
            }));

            return {
                status: 200,
                body: "Students and groups information updated successfully."
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
