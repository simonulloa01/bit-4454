const mysql = require('mysql');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // for generating session UUID
const { app } = require('@azure/functions');

app.http('getStudentInfo', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Setup your SQL connection
        context.log('Process get student info.');
        context.log('HTTP request:', request);

        const body = JSON.parse(await request.text())
        const session_id = body.session_id


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

            // Get the FirstName of the student
            let query = 'SELECT student.FirstName,student.StudentID FROM student JOIN sessions ON student.StudentID = sessions.student_id WHERE sessions.session_id = ?';
            let [row, fields] = await new Promise((resolve, reject) => {
                db.query(query, [session_id], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            var package = {};
            var studentId = row.StudentID;
            package.studentName = row.FirstName;

            // Get the student's courses
            // for each course get the course name, course id, and the professor's name, 
            //the group id that the student is in for the course as well as all of the peer reviews 
            //not complete and add it to package object
            query = `
                SELECT 
                    section.CourseID, 
                    section.ProfessorID, 
                    section.CourseName,
                    section.CourseCode,
                    section.Semester,
                    section.Year,
                    section.CourseTime,
                    CONCAT(professor.FirstName, ' ', professor.LastName) AS ProfessorName, 
                    studentgroups.GroupID
                FROM 
                    studentgroups
                JOIN 
                    section ON studentgroups.CourseID = section.CourseID
                JOIN 
                    professor ON section.ProfessorID = professor.ProfessorID
                WHERE 
                    studentgroups.StudentID = ?
            `;
            let [courses] = await new Promise((resolve, reject) => {
                db.query(query, [studentId], function (error, results) {
                    if (error) return reject(error);
                    resolve(results);
                });
            });
            courses = Array.isArray(courses) ? courses : [courses];
            package.courses = await Promise.all(courses.map(async (course) => {
                const courseInfo = {
                    courseId: course.CourseID,
                    professorName: course.ProfessorName,
                    groupId: course.GroupID
                    // other course related info
                };

                // Get incomplete peer evaluations for this course for the student
                let peerReviewQuery = `
                SELECT 
                    s.*
                FROM 
                    schedule s
                LEFT JOIN 
                    peerevaluations p ON s.ScheduleID = p.ScheduleID AND p.WriterStudentID = ?
                WHERE 
                    s.CourseID = ? AND 
                    p.CompletionDate IS NULL;
                `;
                let [peerReviews] = await new Promise((resolve, reject) => {
                    db.query(peerReviewQuery, [studentId, courseInfo.courseId], function (error, results) {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });

                courseInfo.peerReviews = peerReviews; // add peer reviews to the course info
                return courseInfo;
            }));

        } catch (error) {
            context.log(error);
            return {
                status: 200,
                body: `Error processing request: ${error.message}`
            };
        } finally {
            db.end(); // close the database connection
            return {
                status: 200,
                body: JSON.stringify(package,null,2)
            };
        }
    }
});
