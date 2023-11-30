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
                    p.Phone,
                    sch.DueDates,
                    sg.TotalGroups,
                    sg.TotalStudents,
                    pe.TotalEvaluations,
                    pe.NotCompletedEvaluations
                FROM 
                    section s
                JOIN 
                    professor p ON s.ProfessorID = p.ProfessorID
                JOIN 
                    sessions se ON s.ProfessorID = se.professor_id
                LEFT JOIN (
                    SELECT 
                        CourseID, 
                        GROUP_CONCAT(DueDate ORDER BY DueDate SEPARATOR ', ') as DueDates
                    FROM (
                        SELECT 
                            CourseID, DueDate,
                            ROW_NUMBER() OVER (PARTITION BY CourseID ORDER BY DueDate) as rn
                        FROM 
                            schedule
                        WHERE 
                            DueDate >= CURRENT_DATE
                    ) as RankedDates
                    WHERE rn <= 3
                    GROUP BY CourseID
                ) sch ON s.CourseID = sch.CourseID
                LEFT JOIN (
                    SELECT 
                        CourseID,
                        COUNT(DISTINCT GroupID) as TotalGroups,
                        COUNT(DISTINCT StudentID) as TotalStudents
                    FROM 
                        studentgroups
                    GROUP BY 
                        CourseID
                ) sg ON s.CourseID = sg.CourseID
                LEFT JOIN (
                SELECT 
                        sch.CourseID,
                        COUNT(DISTINCT pe.EvaluationID) as TotalEvaluations,
                        COUNT(DISTINCT CASE WHEN pe.CompletionDate IS NULL THEN pe.EvaluationID END) as NotCompletedEvaluations
                    FROM 
                        schedule sch
                    LEFT JOIN 
                        peerevaluations pe ON sch.ScheduleID = pe.ScheduleID
                    GROUP BY 
                        sch.CourseID
                ) pe ON s.CourseID = pe.CourseID
                WHERE
                            se.session_id = ?;
            `;
            let rows = await new Promise((resolve, reject) => {
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
            console.log("Rows returned from query: ", rows); // Add this line for debugging
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
                    year: row.Year,
                    dueDates: row.DueDates,
                    totalGroups: row.TotalGroups,
                    totalStudents: row.TotalStudents,
                    totalEvaluations: row.TotalEvaluations,
                    notCompletedEvaluations: row.NotCompletedEvaluations
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
