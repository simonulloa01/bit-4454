const mysql = require('mysql');
const { app } = require('@azure/functions');

app.http('getProfessorInfo', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Setup your SQL connection
        context.log('Process get professor info.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text());
        const session_id = body.session_id;

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
            const query = `
                SELECT 
                    s.CourseID,
                    s.ProfessorID,
                    s.CourseName,
                    s.CourseCode,
                    s.Semester,
                    s.CourseTime,
                    s.Year,
                    p.FirstName,
                    p.LastName,
                    p.Email,
                    p.Department,
                    p.Phone
                FROM 
                    section s
                JOIN 
                    professor p ON s.ProfessorID = p.ProfessorID
                JOIN 
                    sessions se ON s.ProfessorID = se.professor_id
                WHERE 
                    se.session_id = ?;
            `;
            var [rows, fields] = await new Promise((resolve, reject) => {
                db.query(query, [session_id], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            if (!rows || rows.length === 0) {
                return {
                    status: 404,
                    body: 'Professor not found'
                };
            }
            //TODO Get amount of students
            rows = Array.isArray(rows) ? rows : [rows];
            const professor = {
                professorInfo: {
                    professorId: rows[0].ProfessorID,
                    firstName: rows[0].FirstName,
                    lastName: rows[0].LastName,
                    email: rows[0].Email,
                    department: rows[0].Department,
                    phone: rows[0].Phone,
                },
                courses: rows.map(row => ({
                    courseId: row.CourseID,
                    courseName: row.CourseName,
                    courseCode: row.CourseCode,
                    semester: row.Semester,
                    courseTime: row.CourseTime,
                    year: row.Year
                }))
            };

            return {
                status: 200,
                body: JSON.stringify(professor, null, 2)
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
